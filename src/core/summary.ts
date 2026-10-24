/**
 * Run summary (spec §7) and the best-wave record (§2: high score only).
 * Pure: the scene passes the run and the stored best.
 */
import type { OwnedWeapon, RunState } from "@/types";
import type { RunLog } from "./runlog";
import wavesData from "@assets/data/waves.json";

export type RunOutcome = "victory" | "defeat";

/** The best run so far; `id` is its run-log id, so the summary can tell "this run set it". */
export interface Best {
  wave: number;
  id: string;
}

export interface RunSummary {
  outcome: RunOutcome;
  wave: number; // last wave played
  waves: number; // waves in a full run
  kills: number;
  damageDealt: number;
  damageTaken: number;
  level: number;
  weapons: OwnedWeapon[];
  items: string[];
  best: number;
  newBest: boolean;
}

export function summariseRun(run: RunState, outcome: RunOutcome, best: Best): RunSummary {
  const ws = run.log.waves;
  const sum = (f: (w: RunLog["waves"][number]) => number) => ws.reduce((s, w) => s + f(w), 0);
  return {
    outcome,
    wave: ws[ws.length - 1]?.wave ?? run.wave,
    waves: wavesData.waves.length,
    kills: sum((w) => w.killed),
    damageDealt: sum((w) => w.damageDealt),
    damageTaken: sum((w) => w.taken.contact + w.taken.bolt + w.taken.blast),
    level: run.level,
    weapons: run.weapons.map((w) => ({ ...w })),
    items: [...run.items],
    best: best.wave,
    newBest: best.id === run.log.id,
  };
}

// ---- local store (guarded like core/settings.ts) ----

const KEY = "vv.best";
const NONE: Best = { wave: 0, id: "" };

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadBest(storage: Pick<Storage, "getItem"> | undefined = defaultStorage()): Best {
  try {
    const b = JSON.parse(storage?.getItem(KEY) ?? "null") as Partial<Best> | null;
    return typeof b?.wave === "number" && typeof b.id === "string" ? { wave: b.wave, id: b.id } : { ...NONE };
  } catch {
    return { ...NONE };
  }
}

/** Keep a finished run's wave if it beats the record. Quits don't count. Never throws. */
export function recordBest(
  log: RunLog,
  storage: Pick<Storage, "getItem" | "setItem"> | undefined = defaultStorage()
): void {
  if (!log.result || log.result.outcome === "quit" || log.result.wave <= loadBest(storage).wave) return;
  try {
    storage?.setItem(KEY, JSON.stringify({ wave: log.result.wave, id: log.id }));
  } catch {
    // storage full or unavailable: the record just isn't kept
  }
}
