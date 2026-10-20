/**
 * Reference builds and the proposed balance (design doc §5), as sim overrides.
 * Nothing here is read by the game; once the owner approves, the numbers move
 * into assets/data and waves.ts and PROPOSED collapses to LIVE_DATA.
 */
import type { EnemyDef, Mods, SpawnGroup, WaveDef, WeaponDef } from "@/types";
import weaponDefs from "@assets/data/weapons.json";
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

// ---- proposed model ----

export interface Knobs {
  /** Threat points per second: base (unscaled) enemy HP arriving per s, = first·(1 + linear·(n−1) + quad·(n−1)²). Sets income. */
  threat: { first: number; linear: number; quad: number };
  /** Enemy HP/damage multiplier 1 + k·(n−1) + kq·(n−1)² (live: hp 0.25, damage 0.15). Sets difficulty. */
  growth: { hp: number; hpQuad: number; damage: number };
  /** Shop prices grow `early` per wave up to wave `lateFrom`, then `late` per wave (live: 0.1 flat). */
  priceGrowth: { early: number; late: number; lateFrom: number };
  /** Max enemies alive; spawns past it are skipped. */
  maxAlive: number;
  enemyEdits: Record<string, Partial<EnemyDef>>;
  weaponEdits: Record<string, Partial<WeaponDef>>;
}

export const KNOBS: Knobs = {
  threat: { first: 7, linear: 0.35, quad: 0 },
  growth: { hp: 0.3, hpQuad: 0.07, damage: 0.15 },
  priceGrowth: { early: 0.2, late: 0.25, lateFrom: 8 }, // owner 2026-10-20: 20%/wave, 25% for the shops after waves 8–10
  maxAlive: 40,
  enemyEdits: { pea: { hp: 9 }, pepper: { hp: 9 } },
  weaponEdits: {
    pistol: { cooldown: [0.7, 0.63, 0.56, 0.5], params: { ...weaponDefs.pistol.params, pierce: 1 } },
  },
};

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

const edit = <T>(defs: Record<string, T>, edits: Record<string, Partial<T>>): Record<string, T> =>
  Object.fromEntries(Object.entries(defs).map(([id, d]) => [id, { ...d, ...edits[id] }]));

export function proposal(k: Knobs): SimData {
  const enemies = edit(LIVE_DATA.enemies, k.enemyEdits);
  const t = k.threat;
  const g = k.growth;
  return {
    ...LIVE_DATA,
    enemies,
    weapons: edit(LIVE_DATA.weapons, k.weaponEdits),
    waves: Array.from({ length: 10 }, (_, i) =>
      budgetWave(i + 1, t.first * (1 + t.linear * i + t.quad * i * i), enemies)
    ),
    scale: (base, wave) => {
      const w = wave - 1;
      return {
        hp: Math.round(base.hp * (1 + g.hp * w + g.hpQuad * w * w)),
        damage: Math.round(base.damage * (1 + g.damage * w)),
      };
    },
    maxAlive: k.maxAlive,
    price: (base, wave) => Math.round(base * priceScale(k.priceGrowth, wave)),
  };
}

export const PROPOSED = proposal(KNOBS);

export function priceScale(g: Knobs["priceGrowth"], wave: number): number {
  return 1 + g.early * (Math.min(wave, g.lateFrom) - 1) + g.late * Math.max(0, wave - g.lateFrom);
}

// ---- targets (design doc §4) ----

const BANDS = [
  { name: "onboarding", waves: [1, 2, 3], kill: [85, 100], hpLeft: [60, 100] },
  { name: "build checks", waves: [4, 5, 6, 7], kill: [75, 98], hpLeft: [25, 100] },
  { name: "pressure", waves: [8, 9], kill: [70, 95], hpLeft: [1, 85] },
] as const; // wave 10 is the boss wave (M4); its targets come with the boss

/** Every way `data` misses the balance targets; empty = on target. */
export function checkTargets(data: SimData, p: SimParams = DEFAULT_PARAMS): string[] {
  const out: string[] = [];
  const [bare, typical, ...starters] = REFERENCE_BUILDS.map((b) =>
    simulateRun(b.start, b.plan, b.picks, b.loopFrom, data, p)
  );
  for (const band of BANDS) {
    for (const n of band.waves) {
      const r = typical[n - 1];
      if (!r) {
        out.push(`typical died before wave ${n}`);
        return out;
      }
      const kill = (100 * r.kills) / r.spawned;
      const hp = (100 * r.hpLeft) / r.stats.maxHp;
      if (kill < band.kill[0] || kill > band.kill[1]) out.push(`w${n} ${band.name}: typical kill ${kill.toFixed(0)}% not in ${band.kill}`);
      if (hp < band.hpLeft[0] || hp > band.hpLeft[1]) out.push(`w${n} ${band.name}: typical hp left ${hp.toFixed(0)}% not in ${band.hpLeft}`);
    }
  }
  // Spec §2 "dense, escalating waves": late waves bring ≥ 1.75 enemies/s
  for (const n of [8, 9]) {
    const r = typical[n - 1];
    if (r && r.spawned / r.duration < 1.75) out.push(`w${n}: only ${(r.spawned / r.duration).toFixed(1)} enemies/s`);
  }
  const buys = typical.slice(0, 9).reduce((s, r) => s + r.bought.length, 0) / 9;
  if (buys < 0.8 || buys > 2) out.push(`typical buys ${buys.toFixed(2)}/wave not in 0.8,2`);
  for (const n of [1, 2, 3, 4]) if (typical[n - 1]?.bought.length === 0) out.push(`w${n}: typical buys nothing`);
  // A player who never shops still gets through onboarding, but fails by wave 7
  if (bare.length < 4) out.push(`never-shop pistol dies in wave ${bare.length}`);
  if (bare.length >= 7 && (100 * bare[6].kills) / bare[6].spawned > 60) out.push("never-shop pistol still fine at wave 7");
  for (const run of [bare, ...starters]) {
    if (run.length < 2) out.push("a starter dies in wave 1");
    else if (run[0].kills / run[0].spawned < 0.8) out.push(`a starter kills ${run[0].kills}/${run[0].spawned} in wave 1`);
  }
  return out;
}
