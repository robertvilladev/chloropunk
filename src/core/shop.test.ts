import { describe, expect, it } from "vitest";
import items from "@assets/data/items.json";
import type { ItemDef, Offer } from "@/types";
import { createRng } from "./rng";
import { newRun } from "./run";
import {
  buy,
  closeShop,
  offerStatus,
  openShop,
  rarityWeights,
  reroll,
  rerollCost,
  rollOffer,
  toggleLock,
  type ShopState,
} from "./shop";
import { seqRng } from "./testRng";

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const offer = (o: Partial<Offer> = {}): Offer => ({
  kind: "item",
  id: "visor",
  tier: 1,
  price: 5,
  ...o,
});
const shop = (offers: (Offer | null)[], locked = [false, false, false, false]): ShopState => ({
  offers,
  locked,
  rerolls: 0,
});
const itemDefs = items as Record<string, ItemDef>;

describe("rarityWeights", () => {
  it("wave 1 is all tier 1", () => {
    expect(rarityWeights(1, 0)).toEqual([1, 0, 0, 0]);
  });

  it("wave 10 has every tier and sums to 1", () => {
    const w = rarityWeights(10, 0);
    expect(sum(w)).toBeCloseTo(1);
    w.forEach((p) => expect(p).toBeGreaterThan(0));
  });

  it("luck raises tier 4", () => {
    expect(rarityWeights(10, 100)[3]).toBeGreaterThan(rarityWeights(10, 0)[3]);
  });

  it("huge luck removes tier 1 and still sums to 1", () => {
    const w = rarityWeights(10, 1000);
    expect(w[0]).toBe(0);
    expect(sum(w)).toBeCloseTo(1);
  });

  it("very negative luck gives only tier 1", () => {
    expect(rarityWeights(10, -200)).toEqual([1, 0, 0, 0]);
  });
});

describe("rerollCost", () => {
  it("starts low and rises each reroll", () => {
    expect([0, 1, 2].map((n) => rerollCost(1, n))).toEqual([1, 3, 5]);
    expect(rerollCost(6, 0)).toBe(4);
  });
});

describe("rollOffer", () => {
  it("a tier-4 item roll gives the rarity-4 item", () => {
    expect(rollOffer(seqRng(0.999, 0.9, 0.5), 10, 0)).toMatchObject({
      kind: "item",
      id: "ghost",
      tier: 4,
    });
  });

  it("falls back to a lower rarity when a tier has no items", () => {
    const noRare3 = Object.fromEntries(
      Object.entries(itemDefs).filter(([, d]) => d.rarity !== 3)
    );
    const o = rollOffer(seqRng(0.8, 0.9, 0.5), 10, 0, undefined, noRare3);
    expect(o.kind).toBe("item");
    expect(itemDefs[o.id].rarity).toBe(2);
    expect(o.tier).toBe(2);
  });

  it("a weapon roll uses the rolled tier", () => {
    expect(rollOffer(seqRng(0.999, 0.1, 0), 10, 0)).toMatchObject({ kind: "weapon", tier: 4 });
  });
});

describe("shop session", () => {
  it("openShop keeps locked offers first with their price", () => {
    const run = newRun(1, "pistol");
    run.lockedOffers = [offer({ id: "grip", price: 3 }), offer({ id: "coil", price: 4 })];
    const s = openShop(run, createRng(5), 0);
    expect(s.offers).toHaveLength(4);
    expect(s.offers.slice(0, 2)).toEqual(run.lockedOffers);
    expect(s.locked).toEqual([true, true, false, false]);
    expect(s.offers[2]).not.toBeNull();
    expect(s.offers[3]).not.toBeNull();
  });

  it("refused reroll changes nothing and draws nothing", () => {
    const run = newRun(1, "pistol");
    const s = openShop(run, createRng(5), 0);
    const before = [...s.offers];
    const rng = seqRng(0.5);
    expect(reroll(s, run, rng, 0)).toBe(false);
    expect(s.offers).toEqual(before);
    expect(run.scrap).toBe(0);
    expect(rng.draws).toBe(0);
    expect(s.rerolls).toBe(0);
  });

  it("reroll keeps locked slots and refills bought ones", () => {
    const run = newRun(1, "pistol");
    run.scrap = 1000;
    const s = openShop(run, createRng(5), 0);
    const kept = s.offers[0];
    toggleLock(s, 0);
    buy(s, run, 1);
    const scrap = run.scrap;
    expect(reroll(s, run, createRng(9), 0)).toBe(true);
    expect(run.scrap).toBe(scrap - rerollCost(1, 0));
    expect(s.offers[0]).toBe(kept);
    expect(s.offers[1]).not.toBeNull();
    expect(s.rerolls).toBe(1);
  });

  it("an exact-cost buy succeeds and a poor buy changes nothing", () => {
    const run = newRun(1, "pistol");
    const s = shop([offer({ price: 5 }), offer({ price: 6 }), null, null]);
    run.scrap = 5;
    expect(buy(s, run, 1)).toBe("poor");
    expect(run.scrap).toBe(5);
    expect(s.offers[1]).not.toBeNull();
    expect(buy(s, run, 0)).toBe("item");
    expect(run.scrap).toBe(0);
    expect(run.items).toEqual(["visor"]);
    expect(s.offers[0]).toBeNull();
    expect(buy(s, run, 0)).toBe("empty");
  });

  it("buying a locked offer unlocks the slot", () => {
    const run = newRun(1, "pistol");
    run.scrap = 10;
    const s = shop([offer(), null, null, null], [true, false, false, false]);
    buy(s, run, 0);
    expect(s.locked[0]).toBe(false);
  });

  it("a locked weapon that became unbuyable shows blocked", () => {
    const run = newRun(1, "pistol");
    run.scrap = 1000;
    const s = shop([offer({ kind: "weapon", id: "shotgun", price: 20 }), null, null, null]);
    toggleLock(s, 0);
    closeShop(s, run);
    run.weapons = ["pistol", "laser", "blade", "drone", "rocket", "laser"].map((id) => ({
      id,
      tier: 1 as const,
    }));
    const next = openShop(run, createRng(3), 0);
    expect(next.offers[0]).toEqual(s.offers[0]);
    expect(offerStatus(next, run, 0)).toBe("blocked");
    expect(buy(next, run, 0)).toBe("blocked");
    expect(run.scrap).toBe(1000);
    toggleLock(next, 0);
    expect(next.locked[0]).toBe(false);
  });

  it("closeShop stores only locked, non-empty offers", () => {
    const run = newRun(1, "pistol");
    const a = offer({ id: "grip" });
    closeShop(shop([a, offer(), null, offer()], [true, false, true, false]), run);
    expect(run.lockedOffers).toEqual([a]);
  });

  it("toggleLock ignores empty slots", () => {
    const s = shop([null, null, null, null]);
    toggleLock(s, 0);
    expect(s.locked[0]).toBe(false);
  });
});
