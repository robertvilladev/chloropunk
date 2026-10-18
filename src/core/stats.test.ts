import { describe, expect, it } from "vitest";
import items from "@assets/data/items.json";
import {
  BASE_STATS,
  STAT_KEYS,
  computeStats,
  damageTaken,
  statDiff,
} from "./stats";

const run = (itemIds: string[] = [], levelMods = {}) => ({ items: itemIds, levelMods });

describe("computeStats", () => {
  it("base stats with nothing owned", () => {
    expect(computeStats(run())).toEqual(BASE_STATS);
  });

  it("items stack", () => {
    expect(computeStats(run(["visor", "visor"])).crit).toBe(10);
  });

  it("levelMods add to items", () => {
    const s = computeStats(run(["hoodie"], { armor: 3 }));
    expect(s.armor).toBe(5);
    expect(s.speed).toBe(-3);
  });

  it("clamps stacked trade-offs", () => {
    const s = computeStats(
      run(Array(10).fill("glass"), { speed: -80, attackSpeed: -90, dodge: 200 })
    );
    expect(s.maxHp).toBe(1);
    expect(s.speed).toBe(-50);
    expect(s.attackSpeed).toBe(-50);
    expect(s.dodge).toBe(60);
  });
});

describe("damageTaken", () => {
  it("armor reduces, negative armor increases, min 1", () => {
    expect(damageTaken(10, 0)).toBe(10);
    expect(damageTaken(10, 15)).toBe(5);
    expect(damageTaken(10, -15)).toBe(20);
    expect(damageTaken(1, 100)).toBe(1);
  });
});

describe("statDiff", () => {
  it("lists non-zero changes in stat order", () => {
    expect(statDiff(computeStats(run()), computeStats(run(["overclock"])))).toEqual([
      ["maxHp", -5],
      ["attackSpeed", 18],
    ]);
  });
});

describe("items.json", () => {
  it("is valid", () => {
    const defs = Object.entries(items);
    expect(defs).toHaveLength(15);
    for (const [key, def] of defs) {
      expect(def.id).toBe(key);
      expect(def.rarity).toBeGreaterThanOrEqual(1);
      expect(def.rarity).toBeLessThanOrEqual(4);
      expect(def.price).toBeGreaterThan(0);
      for (const stat of Object.keys(def.mods)) expect(STAT_KEYS).toContain(stat);
    }
  });
});
