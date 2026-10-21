import { describe, expect, it } from "vitest";
import { aimReport, newRun } from "./run";

describe("newRun", () => {
  it("starts with one tier-1 weapon", () => {
    const r = newRun(1, "pistol");
    expect(r.weapons).toEqual([{ id: "pistol", tier: 1 }]);
    expect(r).toMatchObject({ wave: 1, level: 1, scrap: 0, xp: 0, pendingLevelUps: 0, seed: 1 });
  });

  it("shares nothing between runs", () => {
    const a = newRun(1, "pistol");
    const b = newRun(1, "pistol");
    expect(a.weapons).not.toBe(b.weapons);
    expect(a.items).not.toBe(b.items);
    expect(a.levelMods).not.toBe(b.levelMods);
    expect(a.lockedOffers).not.toBe(b.lockedOffers);
    expect(a.aim).not.toBe(b.aim);
    a.items.push("visor");
    a.weapons.push({ id: "blade", tier: 1 });
    expect(b.items).toEqual([]);
    expect(b.weapons).toHaveLength(1);
  });
});

describe("aimReport", () => {
  it("reports hits and kills as a share of shots", () => {
    expect(aimReport({ shots: 200, hits: 140, kills: 90 }, 3)).toBe(
      "[balance] run ended wave 3: 200 shots, 140 hit (70%), 90 kills (45% of shots)"
    );
    expect(aimReport({ shots: 0, hits: 0, kills: 0 }, 1)).toContain("n/a");
  });
});
