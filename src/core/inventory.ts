import type { OwnedWeapon, RunState, Tier, WeaponDef } from "@/types";
import weaponDefs from "@assets/data/weapons.json";
import { MAX_WEAPONS, sellPrice } from "./weapons";

const same = (a: OwnedWeapon, id: string, tier: Tier) => a.id === id && a.tier === tier;

/** What buying this weapon would do: take a free slot, auto-merge, or nothing. */
export function weaponBuyMode(
  weapons: OwnedWeapon[],
  id: string,
  tier: Tier
): "add" | "merge" | "blocked" {
  if (weapons.length < MAX_WEAPONS) return "add";
  if (tier < 4 && weapons.some((w) => same(w, id, tier))) return "merge";
  return "blocked";
}

/** Add a bought weapon in place; a merge upgrades the first matching copy (no chains). */
export function addWeapon(
  weapons: OwnedWeapon[],
  id: string,
  tier: Tier
): "add" | "merge" | "blocked" {
  const mode = weaponBuyMode(weapons, id, tier);
  if (mode === "add") weapons.push({ id, tier });
  else if (mode === "merge") {
    const i = weapons.findIndex((w) => same(w, id, tier));
    weapons[i] = { id, tier: (tier + 1) as Tier };
  }
  return mode;
}

/** Index pairs that can combine (same id and tier, tier < 4); each weapon in at most one pair. */
export function combinePairs(weapons: OwnedWeapon[]): [number, number][] {
  const pairs: [number, number][] = [];
  const used = new Set<number>();
  for (let i = 0; i < weapons.length; i++) {
    if (used.has(i) || weapons[i].tier === 4) continue;
    for (let j = i + 1; j < weapons.length; j++) {
      if (!used.has(j) && same(weapons[j], weapons[i].id, weapons[i].tier)) {
        pairs.push([i, j]);
        used.add(i).add(j);
        break;
      }
    }
  }
  return pairs;
}

/** Merge weapons i and j into i at tier+1; false (no change) if they aren't a valid pair. */
export function combine(weapons: OwnedWeapon[], i: number, j: number): boolean {
  const a = weapons[i];
  const b = weapons[j];
  if (i === j || !a || !b || !same(b, a.id, a.tier) || a.tier === 4) return false;
  weapons[i] = { id: a.id, tier: (a.tier + 1) as Tier };
  weapons.splice(j, 1);
  return true;
}

/** Sell weapon i for scrap; never sells the last weapon. Returns the scrap gained. */
export function sellWeapon(
  run: RunState,
  i: number,
  defs: Record<string, WeaponDef> = weaponDefs
): number {
  const w = run.weapons[i];
  if (!w || run.weapons.length <= 1) return 0;
  const gain = sellPrice(defs[w.id], w.tier, run.wave);
  run.scrap += gain;
  run.weapons.splice(i, 1);
  return gain;
}
