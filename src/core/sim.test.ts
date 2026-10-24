import enemies from "@assets/data/enemies.json";
import { describe, expect, it } from "vitest";
import { LIVE_DATA, simulateRun, simulateWave, walkIn } from "./sim";
import { REFERENCE_BUILDS, budgetWave, checkTargets, runAtWave } from "./sim.targets";
import { MAX_ALIVE } from "./waves";

const pistol = { weapons: [{ id: "pistol", tier: 1 as const }], items: [], levelMods: {} };

describe("sim", () => {
  it("walkIn: double speed down to CATCH_UP.dist, then normal", () => {
    expect(walkIn(480, 60, 0.5)).toBeCloseTo(420); // 120 px/s while far
    expect(walkIn(480, 60, 1)).toBeCloseTo(360);
    expect(walkIn(480, 60, 2)).toBeCloseTo(300);
    expect(walkIn(300, 60, 1)).toBeCloseTo(240); // spawned inside: normal speed
  });

  // Browser playtests, seed 1, pistol, standing still. Before the balance pass
  // (2026-10-20, old data) the game gave 8 kills / 40 HP and the sim 7 / 43.
  it("matches the post-balance playtest: wave 1 → 15 kills, 15 scrap, 100 HP left", () => {
    const r = simulateWave(pistol, 1);
    expect(r.kills).toBeGreaterThanOrEqual(13);
    expect(r.kills).toBeLessThanOrEqual(17);
    expect(r.scrap).toBe(r.kills);
    expect(r.hpLeft).toBeGreaterThan(90);
  });

  // Known misses: wave 8 a little easy (design doc §7); the blade starter kills 12/16 in
  // wave 1 since A3 (a standing-still melee player waits for the last group, which arrives
  // later from the off-screen ring even with CATCH_UP; the owner's blade run got 12/16 too).
  const KNOWN_MISSES = ["w8 pressure", "a starter kills 12/16 in wave 1"];
  it("the live balance meets its targets (known misses listed above)", () => {
    expect(checkTargets().filter((v) => !KNOWN_MISSES.some((k) => v.startsWith(k)))).toEqual([]);
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

describe("runAtWave", () => {
  it("starts wave N with what the sim's shopper owns after wave N-1", () => {
    const t = REFERENCE_BUILDS[1];
    const sim = simulateRun(t.start, t.plan, t.picks, t.loopFrom);
    const run = runAtWave("typical", 6, 42)!;
    expect(run).toMatchObject({ wave: 6, seed: 42, scrap: sim[4].bank, level: sim[4].level, pendingLevelUps: 0 });
    expect(run.weapons).toEqual(sim[4].build.weapons);
    expect(run.items).toEqual(sim[4].build.items);
    expect(run.weapons.length).toBeGreaterThan(1);
  });

  it("wave 1 is a fresh run; unknown builds are undefined", () => {
    expect(runAtWave("blade", 1, 1)!.weapons).toEqual([{ id: "blade", tier: 1 }]);
    expect(runAtWave("nope", 3, 1)).toBeUndefined();
  });
});
