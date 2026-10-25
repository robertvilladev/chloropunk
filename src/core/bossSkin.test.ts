import { describe, expect, it } from "vitest";
import { createRng } from "./rng";
import { BOSS_NAMES, BOSS_SKINS, bossKey, pickBossSkin } from "./bossSkin";

describe("pickBossSkin", () => {
  it("is the same for the same seed", () => {
    for (let seed = 1; seed <= 10; seed++) expect(pickBossSkin(createRng(seed))).toBe(pickBossSkin(createRng(seed)));
  });

  it("picks all three looks over 30 seeds", () => {
    const seen = new Set(Array.from({ length: 30 }, (_, i) => pickBossSkin(createRng(i + 1))));
    expect([...seen].sort()).toEqual([...BOSS_SKINS].sort());
  });
});

describe("boss names and keys", () => {
  it("has a banner name and a texture key per look", () => {
    expect(BOSS_NAMES).toEqual({ harvester: "HARVESTER-9", onion: "THE ONION KING", greenhouse: "THE GREENHOUSE" });
    expect(bossKey("onion")).toBe("boss_onion");
  });
});
