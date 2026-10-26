/**
 * Run log (balance design §9): one plain-JSON record per run, kept locally
 * and exported by hand. This shape is also the future upload contract (§9.5):
 * no Phaser objects, no personal data, a random run id. Bump `schemaVersion`
 * on any breaking change.
 */
import type { Mods, Offer, OwnedWeapon, RunState, Stats } from "@/types";
import type { UpgradeChoice } from "./levelup";
import character from "@assets/data/character.json";
import enemies from "@assets/data/enemies.json";
import items from "@assets/data/items.json";
import upgrades from "@assets/data/upgrades.json";
import waves from "@assets/data/waves.json";
import weapons from "@assets/data/weapons.json";
import pkg from "../../package.json";

export type DamageSource = "contact" | "bolt" | "blast";
export type Outcome = "died" | "won" | "quit";

/** The build in effect during a wave (it only changes between waves). */
export interface BuildLog {
  weapons: OwnedWeapon[];
  items: string[];
  levelMods: Mods;
  stats: Stats;
}

export interface WaveLog {
  wave: number;
  duration: number; // s of wave time played (shorter if died)
  spawned: number;
  spawnDist?: number; // mean px from the player to each scheduled enemy as it spawns (logs before A3 lack it)
  killed: number;
  peakAlive: number;
  aliveAtEnd: number;
  scrapDropped: number;
  scrapLive: number; // picked up during the wave
  scrapBanked: number; // auto-collected leftovers at wave end
  harvesting: number;
  shots: number; // projectile shots (WeaponManager.tally)
  hits: number; // projectiles that hit at least once
  damageDealt: number; // incl. overkill
  taken: Record<DamageSource, number>;
  contactHits: number;
  dodged: number;
  hpEnd: number;
  contactTime: number; // s with at least one enemy touching
  deathTime: number | null;
  build: BuildLog;
}

export interface ShopLog {
  afterWave: number;
  scrapBefore: number;
  scrapAfter: number;
  offers: Offer[]; // every offer seen, rerolls included
  bought: Offer[];
  sold: (OwnedWeapon & { price: number })[];
  combined: OwnedWeapon[]; // the pair's id and tier before merging
  rerolls: number;
  rerollSpent: number;
  locked: Offer[]; // carried to the next shop
}

export interface LevelUpLog {
  afterWave: number;
  offered: UpgradeChoice[]; // every card seen, rerolls included
  pick: UpgradeChoice;
  rerolls: number;
}

export interface RunLog {
  schemaVersion: 1;
  id: string;
  date: string; // ISO
  buildVersion: string;
  dataHash: string; // of assets/data, so old balance versions never mix
  seed: number;
  starter: string;
  arena?: { w: number; h: number }; // playfield size; logs before A3 lack it, and old ones may be 800x600 (the removed ?arena=small)
  result: { wave: number; outcome: Outcome; time: number } | null;
  waves: WaveLog[];
  shops: ShopLog[];
  levelups: LevelUpLog[];
}

/** FNV-1a, 8 hex digits. */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

export const DATA_HASH = hash(JSON.stringify([character, enemies, items, upgrades, waves, weapons]));

const randomId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function newRunLog(seed: number, starter: string, date = new Date(), id = randomId()): RunLog {
  return {
    schemaVersion: 1,
    id,
    date: date.toISOString(),
    buildVersion: pkg.version,
    dataHash: DATA_HASH,
    seed,
    starter,
    result: null,
    waves: [],
    shops: [],
    levelups: [],
  };
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Start a wave record (appended to the log) for the build fighting it. */
export function startWave(log: RunLog, run: Pick<RunState, "wave" | "weapons" | "items" | "levelMods">, stats: Stats): WaveLog {
  const w: WaveLog = {
    wave: run.wave,
    duration: 0,
    spawned: 0,
    spawnDist: 0,
    killed: 0,
    peakAlive: 0,
    aliveAtEnd: 0,
    scrapDropped: 0,
    scrapLive: 0,
    scrapBanked: 0,
    harvesting: 0,
    shots: 0,
    hits: 0,
    damageDealt: 0,
    taken: { contact: 0, bolt: 0, blast: 0 },
    contactHits: 0,
    dodged: 0,
    hpEnd: 0,
    contactTime: 0,
    deathTime: null,
    build: clone({ weapons: run.weapons, items: run.items, levelMods: run.levelMods, stats }),
  };
  log.waves.push(w);
  return w;
}

export function endRun(log: RunLog, outcome: Outcome): void {
  const last = log.waves[log.waves.length - 1];
  log.result = { wave: last?.wave ?? 0, outcome, time: log.waves.reduce((s, w) => s + w.duration, 0) };
}

// ---- local store (guarded like core/settings.ts) ----

const KEY = "vv.runs";
export const MAX_RUNS = 50;

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadRuns(storage: Pick<Storage, "getItem"> | undefined = defaultStorage()): RunLog[] {
  try {
    const parsed = JSON.parse(storage?.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Append a finished run; keeps the newest MAX_RUNS. Never throws. */
export function saveRun(
  log: RunLog,
  storage: Pick<Storage, "getItem" | "setItem"> | undefined = defaultStorage()
): void {
  try {
    storage?.setItem(KEY, JSON.stringify([...loadRuns(storage), log].slice(-MAX_RUNS)));
  } catch {
    // storage full or unavailable: this run just isn't kept
  }
}

// ---- report ----

export interface WaveRow {
  wave: number;
  runs: number; // runs that played this wave
  deaths: number;
  killPct: number; // medians from here on, unless noted
  peakAlive: number;
  spawned: number;
  spawnDist: number; // 0 when no log has it
  scrapDropped: number;
  scrapLive: number;
  scrapBanked: number;
  buys: number; // in the shop after this wave
  aim: number; // Σhits ÷ Σshots over all runs
  damageDealt: number;
  taken: Record<DamageSource, number>;
  hpEnd: number;
  hpEndPct: number;
}

export interface Summary {
  dataHash: string;
  arena: string; // "1600x1200", or "?" for logs without it

  runs: number;
  rows: WaveRow[];
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Drop duplicate runs (exports overlap: each holds the last 50). */
export function dedupe(logs: RunLog[]): RunLog[] {
  return [...new Map(logs.map((l) => [l.id, l])).values()];
}

/** Playfield label for grouping ("?" for logs from before A3). */
export const arenaOf = (l: RunLog): string => (l.arena ? `${l.arena.w}x${l.arena.h}` : "?");

/** Per-wave rows, one summary per data hash and arena size (newest data first). */
export function summarise(logs: RunLog[]): Summary[] {
  const groups = new Map<string, RunLog[]>();
  for (const l of dedupe(logs)) {
    const k = `${l.dataHash} ${arenaOf(l)}`;
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  return [...groups.values()]
    .map((runs) => ({ dataHash: runs[0].dataHash, arena: arenaOf(runs[0]), runs: runs.length, rows: waveRows(runs) }))
    .sort((a, b) => (a.dataHash === DATA_HASH ? -1 : b.dataHash === DATA_HASH ? 1 : 0));
}

function waveRows(runs: RunLog[]): WaveRow[] {
  const max = Math.max(0, ...runs.flatMap((r) => r.waves.map((w) => w.wave)));
  const rows: WaveRow[] = [];
  for (let n = 1; n <= max; n++) {
    const ws = runs.flatMap((r) => r.waves.filter((w) => w.wave === n));
    if (ws.length === 0) continue;
    const med = (f: (w: WaveLog) => number) => median(ws.map(f));
    const shots = ws.reduce((s, w) => s + w.shots, 0);
    const shops = runs.flatMap((r) => r.shops.filter((s) => s.afterWave === n));
    rows.push({
      wave: n,
      runs: ws.length,
      deaths: ws.filter((w) => w.deathTime !== null).length,
      killPct: med((w) => (100 * w.killed) / Math.max(1, w.spawned)),
      peakAlive: med((w) => w.peakAlive),
      spawned: med((w) => w.spawned),
      spawnDist: median(ws.flatMap((w) => (w.spawnDist ? [w.spawnDist] : []))),
      scrapDropped: med((w) => w.scrapDropped),
      scrapLive: med((w) => w.scrapLive),
      scrapBanked: med((w) => w.scrapBanked),
      buys: median(shops.map((s) => s.bought.length)),
      aim: shots > 0 ? ws.reduce((s, w) => s + w.hits, 0) / shots : 0,
      damageDealt: med((w) => w.damageDealt),
      taken: { contact: med((w) => w.taken.contact), bolt: med((w) => w.taken.bolt), blast: med((w) => w.taken.blast) },
      hpEnd: med((w) => w.hpEnd),
      hpEndPct: med((w) => (100 * w.hpEnd) / w.build.stats.maxHp),
    });
  }
  return rows;
}

/**
 * Measured values for the sim's `aim`, `contactRate` and `spawnDist` (design §9.3; spawnDist 0 = not logged).
 * ponytail: contactRate counts landed contact hits per second touching; dodged
 * hits and several enemies touching at once are not separated out.
 */
export function fitParams(logs: RunLog[]): { aim: number; contactRate: number; spawnDist: number } | null {
  const ws = dedupe(logs).flatMap((l) => l.waves);
  const shots = ws.reduce((s, w) => s + w.shots, 0);
  const touch = ws.reduce((s, w) => s + w.contactTime, 0);
  if (shots === 0) return null;
  return {
    aim: ws.reduce((s, w) => s + w.hits, 0) / shots,
    contactRate: touch > 0 ? ws.reduce((s, w) => s + w.contactHits, 0) / touch : 0,
    spawnDist: weightedSpawnDist(ws),
  };
}

/** Mean spawn distance over every logged spawn (0 when no wave logged it). */
function weightedSpawnDist(ws: WaveLog[]): number {
  const logged = ws.filter((w) => w.spawnDist);
  const n = logged.reduce((s, w) => s + w.spawned, 0);
  return n > 0 ? logged.reduce((s, w) => s + w.spawnDist! * w.spawned, 0) / n : 0;
}
