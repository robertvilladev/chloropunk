import type { Stats, Tier, WeaponDef } from "@/types";

export const MAX_WEAPONS = 6;
export const MIN_COOLDOWN = 0.1;
export const BASE_CRIT = 0.05;
export const CRIT_MULT = 1.5;
export const TIER_PRICE = [1, 2, 4, 7] as const;

export interface WeaponStats {
  damage: number;
  cooldown: number;
  range: number;
  critChance: number;
}

/** A weapon's effective numbers at a tier for the given player stats. */
export function weaponStats(def: WeaponDef, tier: Tier, stats: Stats): WeaponStats {
  const t = tier - 1;
  const base = def.damage[t] + stats[def.scaling.stat] * def.scaling.ratio;
  return {
    damage: Math.max(1, Math.round(base * (1 + stats.damage / 100))),
    cooldown: Math.max(MIN_COOLDOWN, def.cooldown[t] / (1 + stats.attackSpeed / 100)),
    range: def.range + stats.range,
    critChance: BASE_CRIT + stats.crit / 100,
  };
}

export const PRICE_GROWTH = 0.2;
export const LATE_PRICE_GROWTH = 0.25;
export const LATE_PRICES_FROM = 8;

/** Shop prices grow 20% per wave, then 25% per wave after wave 8 (the last 3 shops of a 10-wave run). */
export function waveScale(wave: number): number {
  return (
    1 +
    PRICE_GROWTH * (Math.min(wave, LATE_PRICES_FROM) - 1) +
    LATE_PRICE_GROWTH * Math.max(0, wave - LATE_PRICES_FROM)
  );
}

export function weaponPrice(def: WeaponDef, tier: Tier, wave: number): number {
  return Math.round(def.price * TIER_PRICE[tier - 1] * waveScale(wave));
}

export function sellPrice(def: WeaponDef, tier: Tier, wave: number): number {
  return Math.floor(weaponPrice(def, tier, wave) / 2);
}
