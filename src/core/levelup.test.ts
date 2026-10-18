import { describe, expect, it } from "vitest";
import upgrades from "@assets/data/upgrades.json";
import { applyUpgrade, rollUpgrades } from "./levelup";
import { createRng } from "./rng";
import { newRun } from "./run";
import { STAT_KEYS, computeStats } from "./stats";

describe("rollUpgrades", () => {
  it("rolls 4 distinct stats", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const picks = rollUpgrades(createRng(seed), 6, 0);
      expect(picks).toHaveLength(4);
      expect(new Set(picks.map((p) => p.stat)).size).toBe(4);
    }
  });

  it("wave 1 rolls are tier 1", () => {
    for (let seed = 1; seed <= 20; seed++) {
      rollUpgrades(createRng(seed), 1, 0).forEach((p) => expect(p.tier).toBe(1));
    }
  });

  it("amount matches upgrades.json for the tier", () => {
    for (const p of rollUpgrades(createRng(7), 10, 50)) {
      expect(p.amount).toBe(upgrades[p.stat]![p.tier - 1]);
    }
  });
});

describe("applyUpgrade", () => {
  it("accumulates into levelMods and stats", () => {
    const run = newRun(1, "pistol");
    run.pendingLevelUps = 2;
    applyUpgrade(run, { stat: "armor", tier: 1, amount: 1 });
    applyUpgrade(run, { stat: "armor", tier: 1, amount: 1 });
    expect(run.levelMods.armor).toBe(2);
    expect(computeStats(run).armor).toBe(2);
  });

  it("three pending levels give exactly three picks", () => {
    const run = newRun(1, "pistol");
    run.pendingLevelUps = 3;
    let picks = 0;
    while (run.pendingLevelUps > 0) {
      applyUpgrade(run, { stat: "crit", tier: 1, amount: 3 });
      picks++;
    }
    expect(picks).toBe(3);
    applyUpgrade(run, { stat: "crit", tier: 1, amount: 3 });
    expect(run.pendingLevelUps).toBe(0);
  });
});

describe("upgrades.json", () => {
  it("is valid", () => {
    const entries = Object.entries(upgrades);
    expect(entries.length).toBeGreaterThanOrEqual(4);
    for (const [stat, amounts] of entries) {
      expect(STAT_KEYS).toContain(stat);
      expect(amounts).toHaveLength(4);
      for (let i = 1; i < 4; i++) expect(amounts[i]).toBeGreaterThan(amounts[i - 1]);
    }
    expect(upgrades).not.toHaveProperty("pickupRadius");
  });
});
