import { describe, expect, it } from "vitest";
import { newRun } from "./run";

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
    a.items.push("visor");
    a.weapons.push({ id: "blade", tier: 1 });
    expect(b.items).toEqual([]);
    expect(b.weapons).toHaveLength(1);
  });
});
