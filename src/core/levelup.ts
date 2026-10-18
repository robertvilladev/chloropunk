import type { RunState, StatKey, Tier } from "@/types";
import upgradeTable from "@assets/data/upgrades.json";
import type { Rng } from "./rng";
import { rarityWeights, rollTier } from "./shop";

export interface UpgradeChoice {
  stat: StatKey;
  tier: Tier;
  amount: number;
}

type Table = Partial<Record<StatKey, [number, number, number, number]>>;

/** `n` level-up choices for distinct stats, each with its own rarity roll. */
export function rollUpgrades(
  rng: Rng,
  wave: number,
  luck: number,
  n = 4,
  table: Table = upgradeTable
): UpgradeChoice[] {
  const pool = Object.keys(table) as StatKey[];
  const weights = rarityWeights(wave, luck);
  const out: UpgradeChoice[] = [];
  while (out.length < n && pool.length > 0) {
    const stat = pool.splice(rng.int(0, pool.length - 1), 1)[0];
    const tier = rollTier(rng, weights);
    out.push({ stat, tier, amount: table[stat]![tier - 1] });
  }
  return out;
}

/** Take a pick: add it to the run's level-up mods and use up one pending level. */
export function applyUpgrade(run: RunState, c: UpgradeChoice): void {
  run.levelMods[c.stat] = (run.levelMods[c.stat] ?? 0) + c.amount;
  run.pendingLevelUps = Math.max(0, run.pendingLevelUps - 1);
}
