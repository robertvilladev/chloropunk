import { describe, expect, it } from "vitest";
import weapons from "@assets/data/weapons.json";
import { BASE_STATS } from "./stats";
import { sellPrice, waveScale, weaponPrice, weaponStats } from "./weapons";

const stats = (mods = {}) => ({ ...BASE_STATS, ...mods });

describe("weaponStats", () => {
  it("tier 1 pistol with base stats", () => {
    expect(weaponStats(weapons.pistol, 1, stats())).toEqual({
      damage: 18,
      cooldown: 0.42,
      range: 320,
      critChance: 0.05,
    });
  });

  it("adds scaling stat and damage %", () => {
    expect(weaponStats(weapons.pistol, 2, stats({ ranged: 4, damage: 50 })).damage).toBe(47); // (27 + 4) × 1.5
  });

  it("floors the cooldown", () => {
    expect(weaponStats(weapons.blade, 4, stats({ attackSpeed: 1000 })).cooldown).toBe(0.1);
    expect(weaponStats(weapons.blade, 4, stats({ attackSpeed: -50 })).cooldown).toBeCloseTo(0.78);
  });
});

describe("prices", () => {
  it("weaponPrice scales by tier and wave", () => {
    expect(weaponPrice(weapons.pistol, 1, 1)).toBe(27); // 15 × 1.8
    expect(weaponPrice(weapons.pistol, 3, 6)).toBe(216); // 15 × 4 × 1.8 × 2.0
  });

  it("waveScale: ×1.8, +20% per wave, +25% per wave after wave 8", () => {
    expect(waveScale(1)).toBeCloseTo(1.8);
    expect(waveScale(8)).toBeCloseTo(1.8 * 2.4);
    expect(waveScale(9)).toBeCloseTo(1.8 * 2.65);
    expect(waveScale(11)).toBeCloseTo(1.8 * 3.15);
  });

  it("sellPrice is half, rounded down", () => {
    expect(sellPrice(weapons.pistol, 1, 1)).toBe(13);
  });
});

describe("weapons.json", () => {
  it("is valid", () => {
    const defs = Object.entries(weapons);
    expect(defs).toHaveLength(6);
    expect(new Set(defs.map(([, d]) => d.behavior))).toEqual(
      new Set(["projectile", "spread", "beam", "melee-arc", "orbital", "explosive"])
    );
    for (const [key, d] of defs) {
      expect(d.id).toBe(key);
      expect(d.damage).toHaveLength(4);
      expect(d.cooldown).toHaveLength(4);
      for (let i = 1; i < 4; i++) expect(d.damage[i]).toBeGreaterThan(d.damage[i - 1]);
    }
  });
});

describe("blurbs", () => {
  it("every weapon has a non-empty blurb", () => {
    for (const w of Object.values(weapons)) expect((w as { blurb?: string }).blurb?.trim()).toBeTruthy();
  });
});
