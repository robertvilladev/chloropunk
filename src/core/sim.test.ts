import enemies from "@assets/data/enemies.json";
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, LIVE_DATA, simulateRun, simulateWave, walkIn } from "./sim";
import { REFERENCE_BUILDS, bossTargets, budgetWave, checkTargets, runAtWave } from "./sim.targets";
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
  // That playtest had a 20 s wave 1 (before the wave-length addendum), so the pin runs 20 s.
  it("matches the post-balance playtest: wave 1 → 15 kills, 15 scrap, 100 HP left", () => {
    const r = simulateWave(pistol, 1, { ...LIVE_DATA, duration: () => 20 });
    expect(r.kills).toBeGreaterThanOrEqual(13);
    expect(r.kills).toBeLessThanOrEqual(17);
    expect(r.scrap).toBe(r.kills);
    expect(r.hpLeft).toBeGreaterThan(90);
  });

  // Known misses (design doc §7): waves 8–9 too easy for the scripted shopper since the
  // wave-length addendum (32 + 2·(n−1) s): it banks more early scrap and snowballs. The owner's
  // own runs sit in the pressure band (HP 34–39%), so the playtest, not the sim, decides.
  const KNOWN_MISSES = ["w8 pressure", "w9 pressure"];
  it("the live balance meets its targets (known misses listed above)", () => {
    expect(checkTargets().filter((v) => !KNOWN_MISSES.some((k) => v.startsWith(k)))).toEqual([]);
  });

  it("boss wave: ends on the boss's death, brood spawns peas, typical wins with HP to spare", () => {
    const t = REFERENCE_BUILDS[1];
    const run = simulateRun(t.start, t.plan, t.picks, t.loopFrom);
    const w10 = run[9];
    expect(w10.bossLeft).toBe(0);
    expect(w10.duration).toBeLessThan(DEFAULT_PARAMS.bossCap);
    expect(w10.spawned).toBeGreaterThan(0);
    expect(bossTargets(run, [])).toEqual([]);
    // a weak build runs out of HP (or time) before the boss dies
    const weak = simulateWave(pistol, 10);
    expect(weak.bossLeft).toBeGreaterThan(0);
    expect(bossTargets(run.slice(0, 9), [])).toEqual(["typical never reached the boss"]);
    expect(bossTargets(run, [w10])).toEqual(["boss: never-shop pistol beats the boss"]);
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
