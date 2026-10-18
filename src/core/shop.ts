import type { ItemDef, Offer, RunState, Tier, WeaponDef } from "@/types";
import itemDefs from "@assets/data/items.json";
import weaponDefs from "@assets/data/weapons.json";
import { addWeapon, weaponBuyMode } from "./inventory";
import type { Rng } from "./rng";
import { waveScale, weaponPrice } from "./weapons";

export const SHOP_SLOTS = 4;
const WEAPON_CHANCE = 0.35;

/** Chance of each tier 1–4 for a roll at this wave; luck scales tiers 2–4. */
export function rarityWeights(wave: number, luck: number): [number, number, number, number] {
  const m = Math.max(0, 1 + luck / 100);
  const p2 = wave >= 2 ? Math.min(0.08 * (wave - 1), 0.5) * m : 0;
  const p3 = wave >= 4 ? Math.min(0.04 * (wave - 3), 0.25) * m : 0;
  const p4 = wave >= 8 ? Math.min(0.02 * (wave - 7), 0.08) * m : 0;
  const p1 = Math.max(0, 1 - p2 - p3 - p4);
  const total = p1 + p2 + p3 + p4;
  return [p1 / total, p2 / total, p3 / total, p4 / total];
}

/** One draw. */
export function rollTier(rng: Rng, weights: readonly number[]): Tier {
  const u = rng.next();
  let acc = 0;
  let last: Tier = 1;
  for (let i = 0; i < 4; i++) {
    if (weights[i] <= 0) continue;
    last = (i + 1) as Tier;
    acc += weights[i];
    if (u < acc) return last;
  }
  return last; // float rounding: highest tier with weight
}

export function rerollCost(wave: number, rerolls: number): number {
  return 1 + Math.floor(wave / 2) + 2 * rerolls;
}

export function itemPrice(def: ItemDef, wave: number): number {
  return Math.round(def.price * waveScale(wave));
}

/** A random weapon (at the rolled tier) or item (rolled rarity, or the nearest lower one with items). */
export function rollOffer(
  rng: Rng,
  wave: number,
  luck: number,
  weapons: Record<string, WeaponDef> = weaponDefs,
  items: Record<string, ItemDef> = itemDefs
): Offer {
  const tier = rollTier(rng, rarityWeights(wave, luck));
  if (rng.next() < WEAPON_CHANCE) {
    const def = rng.pick(Object.values(weapons));
    return { kind: "weapon", id: def.id, tier, price: weaponPrice(def, tier, wave) };
  }
  const all = Object.values(items);
  let pool: ItemDef[] = [];
  for (let r = tier; r >= 1 && pool.length === 0; r--) pool = all.filter((d) => d.rarity === r);
  const def = rng.pick(pool);
  return { kind: "item", id: def.id, tier: def.rarity, price: itemPrice(def, wave) };
}

export interface ShopState {
  offers: (Offer | null)[];
  locked: boolean[];
  rerolls: number;
}

/** Locked offers from the last shop fill the first slots (keeping their price); the rest are rolled. */
export function openShop(run: RunState, rng: Rng, luck: number): ShopState {
  const offers: (Offer | null)[] = run.lockedOffers.slice(0, SHOP_SLOTS);
  const locked = offers.map(() => true);
  while (offers.length < SHOP_SLOTS) {
    offers.push(rollOffer(rng, run.wave, luck));
    locked.push(false);
  }
  return { offers, locked, rerolls: 0 };
}

/** Re-roll every unlocked slot. Refused (nothing changes, no RNG draw) without enough scrap. */
export function reroll(state: ShopState, run: RunState, rng: Rng, luck: number): boolean {
  const cost = rerollCost(run.wave, state.rerolls);
  if (run.scrap < cost) return false;
  run.scrap -= cost;
  for (let i = 0; i < state.offers.length; i++) {
    if (!state.locked[i]) state.offers[i] = rollOffer(rng, run.wave, luck);
  }
  state.rerolls++;
  return true;
}

export function toggleLock(state: ShopState, i: number): void {
  if (state.offers[i]) state.locked[i] = !state.locked[i];
}

export function offerStatus(
  state: ShopState,
  run: RunState,
  i: number
): "ok" | "poor" | "blocked" | "empty" {
  const o = state.offers[i];
  if (!o) return "empty";
  if (o.kind === "weapon" && weaponBuyMode(run.weapons, o.id, o.tier) === "blocked") return "blocked";
  return run.scrap < o.price ? "poor" : "ok";
}

export function buy(
  state: ShopState,
  run: RunState,
  i: number
): "add" | "merge" | "item" | "poor" | "blocked" | "empty" {
  const status = offerStatus(state, run, i);
  if (status !== "ok") return status;
  const o = state.offers[i]!;
  run.scrap -= o.price;
  state.offers[i] = null;
  state.locked[i] = false;
  if (o.kind === "item") {
    run.items.push(o.id);
    return "item";
  }
  return addWeapon(run.weapons, o.id, o.tier) as "add" | "merge";
}

/** Carry locked offers into the next shop. */
export function closeShop(state: ShopState, run: RunState): void {
  run.lockedOffers = state.offers.filter((o, i): o is Offer => o !== null && state.locked[i]);
}
