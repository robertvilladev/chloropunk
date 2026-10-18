import type { ItemDef, Mods, RunState, StatKey, Stats } from "@/types";
import itemDefs from "@assets/data/items.json";

export const STAT_KEYS: readonly StatKey[] = [
  "maxHp",
  "hpRegen",
  "armor",
  "dodge",
  "speed",
  "damage",
  "melee",
  "ranged",
  "elemental",
  "attackSpeed",
  "crit",
  "range",
  "pickupRadius",
  "luck",
  "harvesting",
];

export const STAT_LABELS: Record<StatKey, string> = {
  maxHp: "Max HP",
  hpRegen: "HP regen",
  armor: "Armor",
  dodge: "Dodge %",
  speed: "Speed %",
  damage: "Damage %",
  melee: "Melee dmg",
  ranged: "Ranged dmg",
  elemental: "Elemental dmg",
  attackSpeed: "Attack speed %",
  crit: "Crit %",
  range: "Range",
  pickupRadius: "Pickup radius",
  luck: "Luck",
  harvesting: "Harvesting",
};

export const BASE_STATS: Stats = {
  maxHp: 100,
  hpRegen: 0,
  armor: 0,
  dodge: 0,
  speed: 0,
  damage: 0,
  melee: 0,
  ranged: 0,
  elemental: 0,
  attackSpeed: 0,
  crit: 0,
  range: 0,
  pickupRadius: 80,
  luck: 0,
  harvesting: 0,
};

function addMods(s: Stats, mods: Mods): void {
  for (const k in mods) s[k as StatKey] += mods[k as StatKey]!;
}

/** The player's stat block: base + items + level-up picks, clamped. */
export function computeStats(
  run: Pick<RunState, "items" | "levelMods">,
  items: Record<string, ItemDef> = itemDefs
): Stats {
  const s = { ...BASE_STATS };
  for (const id of run.items) addMods(s, items[id].mods);
  addMods(s, run.levelMods);
  s.maxHp = Math.max(1, s.maxHp);
  s.dodge = Math.min(60, s.dodge);
  s.speed = Math.max(-50, s.speed);
  s.attackSpeed = Math.max(-50, s.attackSpeed);
  s.crit = Math.min(100, Math.max(0, s.crit));
  s.pickupRadius = Math.max(20, s.pickupRadius);
  return s;
}

/** Damage after armor: positive armor reduces, negative armor amplifies; at least 1. */
export function damageTaken(raw: number, armor: number): number {
  const k = armor >= 0 ? 15 / (15 + armor) : (15 - armor) / 15;
  return Math.max(1, Math.round(raw * k));
}

/** Non-zero changes from `a` to `b`, in STAT_KEYS order. */
export function statDiff(a: Stats, b: Stats): [StatKey, number][] {
  const out: [StatKey, number][] = [];
  for (const k of STAT_KEYS) if (b[k] !== a[k]) out.push([k, b[k] - a[k]]);
  return out;
}
