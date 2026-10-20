import { describe, expect, it } from "vitest";
import { LIVE_DATA, simulateRun, simulateWave } from "./sim";
import { budgetWave, checkTargets, KNOBS, PROPOSED } from "./sim.proposal";

const pistol = { weapons: [{ id: "pistol", tier: 1 as const }], items: [], levelMods: {} };

describe("sim", () => {
  it("matches the 2026-10-20 playtest: wave 1, pistol, standing still → 8 kills, 40 HP left", () => {
    const r = simulateWave(pistol, 1);
    expect(r.kills).toBeGreaterThanOrEqual(6);
    expect(r.kills).toBeLessThanOrEqual(10);
    expect(r.hpLeft).toBeGreaterThan(25);
    expect(r.hpLeft).toBeLessThan(55);
  });

  it("the live data misses the onboarding targets (the bug the design doc fixes)", () => {
    expect(checkTargets(LIVE_DATA).some((v) => v.includes("onboarding"))).toBe(true);
  });

  it("the proposed balance meets its targets (known miss: wave 9, design doc §6)", () => {
    expect(checkTargets(PROPOSED).filter((v) => !v.startsWith("w9 pressure"))).toEqual([]);
  });

  it("budgetWave spends the threat budget", () => {
    const w = budgetWave(5, 20, PROPOSED.enemies);
    const perS = w.groups.reduce((s, g) => s + (g.count * PROPOSED.enemies[g.enemy].hp) / g.every, 0);
    expect(perS).toBeCloseTo(20, 0);
  });

  it("respects the alive cap", () => {
    const r = simulateWave(pistol, 3, { ...LIVE_DATA, maxAlive: 5 });
    expect(r.peakAlive).toBeLessThanOrEqual(5);
  });

  it("the shopper only spends what it has", () => {
    const run = simulateRun("pistol", [{ item: "grip" }, { weapon: "pistol" }], [], undefined, PROPOSED);
    expect(run.every((r) => r.bank >= 0)).toBe(true);
    expect(run.flatMap((r) => r.bought)).toEqual(["grip", "pistol"]);
    expect(KNOBS.maxAlive).toBe(PROPOSED.maxAlive);
  });
});
