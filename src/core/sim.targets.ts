/**
 * Balance targets (design doc §4), the reference builds they are checked on,
 * and the threat-budget helper waves.json was authored with. Not read by the game.
 */
import type { EnemyDef, Mods, SpawnGroup, WaveDef } from "@/types";
import { DEFAULT_PARAMS, LIVE_DATA, simulateRun, type Buy, type SimData, type SimParams } from "./sim";

export interface ReferenceBuild {
  name: string;
  start: string;
  plan: Buy[];
  picks: Mods[];
  loopFrom?: number; // plan index the shopper repeats from once it runs out
}

const RANGED_PICKS: Mods[] = [{ damage: 5 }, { attackSpeed: 5 }, { maxHp: 3 }, { ranged: 1 }];

export const REFERENCE_BUILDS: ReferenceBuild[] = [
  { name: "pistol, never shops", start: "pistol", plan: [], picks: [] },
  {
    name: "pistol, typical shopper",
    start: "pistol",
    plan: [
      { item: "grip" },
      { weapon: "pistol" },
      { item: "hoodie" },
      { weapon: "shotgun" },
      { item: "visor" },
      { weapon: "pistol" },
      { item: "scope" },
      { weapon: "rocket" },
      { item: "overclock" },
      { weapon: "pistol" },
      { item: "glass" },
      { item: "nanopatch" },
      { weapon: "shotgun" },
      // repeated: stacking stat items once the slots are full
      { item: "plasma" },
      { item: "visor" },
      { item: "scope" },
      { item: "overclock" },
    ],
    loopFrom: 14,
    picks: RANGED_PICKS,
  },
  { name: "shotgun, never shops", start: "shotgun", plan: [], picks: [] },
  { name: "blade, never shops", start: "blade", plan: [], picks: [] },
];

// ---- wave authoring ----

/**
 * Threat points per second: base (unscaled) enemy HP arriving per s,
 * T(n) = first·(1 + linear·(n−1)). It sets income; waves.json "scaling" sets
 * difficulty. waves.json was generated from this (balance design §5); to
 * re-author, print `budgetWave(n, threat(n), enemies)` and paste.
 */
export const THREAT = { first: 7, linear: 0.35 };
export const threat = (n: number) => THREAT.first * (1 + THREAT.linear * (n - 1));

/** Share of the threat budget per enemy, from the wave it unlocks. */
export const MIX: { enemy: string; from: number; share: number; start: number }[] = [
  { enemy: "pea", from: 1, share: 1, start: 0 },
  { enemy: "pepper", from: 2, share: 0.35, start: 2 },
  { enemy: "tomato", from: 3, share: 0.3, start: 3 },
  { enemy: "carrot", from: 4, share: 0.2, start: 4 },
  { enemy: "potato", from: 5, share: 0.45, start: 5 },
];

/** Author wave n from a threat budget: each unlocked enemy gets `share` of it as a steady group. */
export function budgetWave(n: number, threat: number, enemies: Record<string, EnemyDef>): WaveDef {
  const unlocked = MIX.filter((m) => n >= m.from);
  const total = unlocked.reduce((s, m) => s + m.share, 0);
  const groups: SpawnGroup[] = unlocked.map((m) => {
    const perS = (threat * (m.share / total)) / enemies[m.enemy].hp; // enemies/s
    const count = Math.max(1, Math.round(perS * 1.5)); // batch into groups at ≥ 1.5 s spacing
    return { enemy: m.enemy, count, every: Math.round((100 * count) / perS) / 100, start: m.start };
  });
  return { wave: n, groups };
}

// ---- targets (design doc §4) ----

const BANDS = [
  { name: "onboarding", waves: [1, 2, 3], kill: [85, 100], hpLeft: [60, 100] },
  { name: "build checks", waves: [4, 5, 6, 7], kill: [75, 98], hpLeft: [25, 100] },
  { name: "pressure", waves: [8, 9], kill: [70, 95], hpLeft: [1, 85] },
] as const; // wave 10 is the boss wave (M4); its targets come with the boss

/** One wave of a typical run: simulated, or medians of real run logs (core/runlog `summarise`). */
export interface TargetRow {
  wave: number;
  killPct: number;
  hpPct: number;
  buys: number; // in the shop after the wave
}

/** Band, buy-rate and early-shop targets on per-wave rows; `who` names the rows in messages. */
export function checkRows(rows: TargetRow[], who = "typical"): string[] {
  const out: string[] = [];
  for (const band of BANDS) {
    for (const n of band.waves) {
      const r = rows.find((r) => r.wave === n);
      if (!r) {
        out.push(`${who} never reached wave ${n}`);
        return out;
      }
      if (r.killPct < band.kill[0] || r.killPct > band.kill[1]) out.push(`w${n} ${band.name}: ${who} kill ${r.killPct.toFixed(0)}% not in ${band.kill}`);
      if (r.hpPct < band.hpLeft[0] || r.hpPct > band.hpLeft[1]) out.push(`w${n} ${band.name}: ${who} hp left ${r.hpPct.toFixed(0)}% not in ${band.hpLeft}`);
    }
  }
  const buys = rows.filter((r) => r.wave <= 9).reduce((s, r) => s + r.buys, 0) / 9;
  if (buys < 0.8 || buys > 2) out.push(`${who} buys ${buys.toFixed(2)}/wave not in 0.8,2`);
  for (const n of [1, 2, 3, 4]) if (rows.find((r) => r.wave === n)?.buys === 0) out.push(`w${n}: ${who} buys nothing`);
  return out;
}

/** Every way `data` misses the balance targets; empty = on target. */
export function checkTargets(data: SimData = LIVE_DATA, p: SimParams = DEFAULT_PARAMS): string[] {
  const [bare, typical, ...starters] = REFERENCE_BUILDS.map((b) =>
    simulateRun(b.start, b.plan, b.picks, b.loopFrom, data, p)
  );
  const out = checkRows(
    typical.map((r) => ({ wave: r.wave, killPct: (100 * r.kills) / r.spawned, hpPct: (100 * r.hpLeft) / r.stats.maxHp, buys: r.bought.length }))
  );
  if (out.some((v) => v.includes("never reached"))) return out;
  // Spec §2 "dense, escalating waves": late waves bring ≥ 1.75 enemies/s
  for (const n of [8, 9]) {
    const r = typical[n - 1];
    if (r && r.spawned / r.duration < 1.75) out.push(`w${n}: only ${(r.spawned / r.duration).toFixed(1)} enemies/s`);
  }
  // A player who never shops still gets through onboarding, but fails by wave 7
  if (bare.length < 4) out.push(`never-shop pistol dies in wave ${bare.length}`);
  if (bare.length >= 7 && (100 * bare[6].kills) / bare[6].spawned > 60) out.push("never-shop pistol still fine at wave 7");
  for (const run of [bare, ...starters]) {
    if (run.length < 2) out.push("a starter dies in wave 1");
    else if (run[0].kills / run[0].spawned < 0.8) out.push(`a starter kills ${run[0].kills}/${run[0].spawned} in wave 1`);
  }
  return out;
}
