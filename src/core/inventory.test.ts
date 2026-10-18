import { describe, expect, it } from "vitest";
import weapons from "@assets/data/weapons.json";
import type { OwnedWeapon, Tier } from "@/types";
import { addWeapon, combine, combinePairs, sellWeapon, weaponBuyMode } from "./inventory";
import { newRun } from "./run";
import { sellPrice } from "./weapons";

const w = (id: string, tier: Tier = 1): OwnedWeapon => ({ id, tier });
// six weapons: `first` then tier-2 fillers that match nothing being bought
const fullWith = (...first: OwnedWeapon[]): OwnedWeapon[] => [
  ...first,
  ...["laser", "blade", "drone", "rocket", "laser", "blade"]
    .slice(0, 6 - first.length)
    .map((id, i) => w(id, (i % 2 ? 2 : 3) as Tier)),
];

describe("addWeapon", () => {
  it("adds a duplicate when a slot is free", () => {
    const ws = [w("pistol")];
    expect(addWeapon(ws, "pistol", 1)).toBe("add");
    expect(ws).toEqual([w("pistol"), w("pistol")]);
  });

  it("merges when full and a same-tier copy exists", () => {
    const ws = fullWith(w("pistol"));
    expect(addWeapon(ws, "pistol", 1)).toBe("merge");
    expect(ws).toHaveLength(6);
    expect(ws[0]).toEqual(w("pistol", 2));
  });

  it("is blocked when full and nothing matches", () => {
    const ws = fullWith(w("pistol", 2));
    expect(weaponBuyMode(ws, "pistol", 1)).toBe("blocked");
    expect(addWeapon(ws, "shotgun", 1)).toBe("blocked");
    expect(ws).toEqual(fullWith(w("pistol", 2)));
  });

  it("is blocked when full and the match is tier 4", () => {
    expect(weaponBuyMode(fullWith(w("pistol", 4)), "pistol", 4)).toBe("blocked");
  });

  it("does not chain merges", () => {
    const ws = fullWith(w("pistol", 1), w("pistol", 2));
    expect(addWeapon(ws, "pistol", 1)).toBe("merge");
    expect(ws.filter((x) => x.id === "pistol")).toEqual([w("pistol", 2), w("pistol", 2)]);
  });
});

describe("combine", () => {
  it("lists disjoint same-tier pairs", () => {
    expect(
      combinePairs([w("pistol"), w("pistol"), w("pistol"), w("shotgun"), w("shotgun")])
    ).toEqual([
      [0, 1],
      [3, 4],
    ]);
  });

  it("ignores tier-4 pairs", () => {
    expect(combinePairs([w("pistol", 4), w("pistol", 4)])).toEqual([]);
  });

  it("merges a pair into tier+1", () => {
    const ws = [w("pistol"), w("shotgun"), w("pistol")];
    expect(combine(ws, 0, 2)).toBe(true);
    expect(ws).toEqual([w("pistol", 2), w("shotgun")]);
  });

  it("rejects mismatched tiers", () => {
    const ws = [w("pistol", 1), w("pistol", 2)];
    expect(combine(ws, 0, 1)).toBe(false);
    expect(ws).toEqual([w("pistol", 1), w("pistol", 2)]);
  });
});

describe("sellWeapon", () => {
  it("adds the sell price and removes the weapon", () => {
    const run = newRun(1, "pistol");
    run.weapons.push(w("rocket", 2));
    run.scrap = 3;
    const gain = sellPrice(weapons.rocket, 2, 1);
    expect(sellWeapon(run, 1)).toBe(gain);
    expect(run.scrap).toBe(3 + gain);
    expect(run.weapons).toEqual([w("pistol")]);
  });

  it("refuses to sell the last weapon", () => {
    const run = newRun(1, "pistol");
    expect(sellWeapon(run, 0)).toBe(0);
    expect(run.weapons).toEqual([w("pistol")]);
    expect(run.scrap).toBe(0);
  });
});
