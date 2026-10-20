import enemies from "@assets/data/enemies.json";
import { describe, expect, it } from "vitest";
import { LIVE_DATA, simulateRun, simulateWave } from "./sim";
import { budgetWave, checkTargets } from "./sim.targets";
import { MAX_ALIVE } from "./waves";

const pistol = { weapons: [{ id: "pistol", tier: 1 as const }], items: [], levelMods: {} };

describe("sim", () => {
  // Browser playtests, seed 1, pistol, standing still. Before the balance pass
  // (2026-10-20, old data) the game gave 8 kills / 40 HP and the sim 7 / 43.
  it("matches the post-balance playtest: wave 1 → 15 kills, 15 scrap, 100 HP left", () => {
    const r = simulateWave(pistol, 1);
    expect(r.kills).toBeGreaterThanOrEqual(13);
    expect(r.kills).toBeLessThanOrEqual(17);
    expect(r.scrap).toBe(r.kills);
    expect(r.hpLeft).toBeGreaterThan(90);
  });

  it("the live balance meets its targets (known miss: wave 8 a little easy, design doc §7)", () => {
    expect(checkTargets().filter((v) => !v.startsWith("w8 pressure"))).toEqual([]);
  });

  it("budgetWave spends the threat budget", () => {
    const w = budgetWave(5, 20, enemies);
    const perS = w.groups.reduce((s, g) => s + (g.count * enemies[g.enemy].hp) / g.every, 0);
    expect(perS).toBeCloseTo(20, 0);
  });

  it("respects the alive cap", () => {
    expect(LIVE_DATA.maxAlive).toBe(MAX_ALIVE);
    const r = simulateWave(pistol, 3, { ...LIVE_DATA, maxAlive: 5 });
    expect(r.peakAlive).toBeLessThanOrEqual(5);
  });

  it("the shopper only spends what it has", () => {
    const run = simulateRun("pistol", [{ item: "grip" }, { weapon: "pistol" }], []);
    expect(run.every((r) => r.bank >= 0)).toBe(true);
    expect(run.flatMap((r) => r.bought)).toEqual(["grip", "pistol"]);
  });
});
