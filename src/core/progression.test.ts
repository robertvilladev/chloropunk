import { describe, it, expect } from "vitest";
import { xpToNext, addXp } from "./progression";

describe("progression", () => {
  it("xpToNext follows (level + 3)^2", () => {
    expect(xpToNext(1)).toBe(16);
    expect(xpToNext(2)).toBe(25);
  });
  it("addXp below threshold", () => {
    expect(addXp({ level: 1, xp: 0 }, 10)).toEqual({ level: 1, xp: 10, levelsGained: 0 });
  });
  it("addXp exact level", () => {
    expect(addXp({ level: 1, xp: 10 }, 6)).toEqual({ level: 2, xp: 0, levelsGained: 1 });
  });
  it("addXp several levels at once", () => {
    expect(addXp({ level: 1, xp: 0 }, 16 + 25 + 36 + 5)).toEqual({ level: 4, xp: 5, levelsGained: 3 });
  });
});
