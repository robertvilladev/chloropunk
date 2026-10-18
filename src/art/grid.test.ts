import { describe, expect, it } from "vitest";
import { ACTORS } from "./actors";
import { gridBounds, parseGrid, validateActor, type ActorArt } from "./grid";
import { PICKUPS } from "./pickups";

const ok: ActorArt = { key: "t", walk0: ["..kk", "..kk"], walk1: ["..kk", "..kk"], hit: [".kk.", "..kk"] };

describe("sprite grids", () => {
  it("every actor validates", () => {
    expect(ACTORS.map((a) => a.key)).toEqual(["player", "enemy_pea", "enemy_pepper", "enemy_potato", "enemy_carrot", "enemy_tomato"]);
    for (const a of ACTORS) expect(validateActor(a), a.key).toEqual([]);
  });
  it("validateActor accepts a minimal actor", () => expect(validateActor(ok)).toEqual([]));
  it("validateActor rejects a row of 17 chars", () => {
    expect(validateActor({ ...ok, walk0: ["k".repeat(17)] })).not.toEqual([]);
  });
  it("rejects an unknown palette letter", () => {
    expect(validateActor({ ...ok, walk1: ["..zz", "..kk"] })).not.toEqual([]);
  });
  it("rejects a hit frame identical to walk0", () => {
    expect(validateActor({ ...ok, hit: ok.walk0 })).not.toEqual([]);
  });
  it("rejects walk frames whose feet rows differ by more than 1", () => {
    expect(validateActor({ ...ok, walk1: ["..kk", "..kk", "..kk", "..kk"] })).not.toEqual([]);
  });
  it("gridBounds on a 3x2 sample", () => {
    expect(gridBounds(parseGrid("\n.k.\n..k\n"))).toEqual({ x0: 1, y0: 0, x1: 2, y1: 1 });
  });
  it("pickup frames are 8x8", () => {
    for (const p of PICKUPS) for (const f of p.frames) {
      expect(f).toHaveLength(8);
      for (const r of f) expect(r).toHaveLength(8);
    }
  });
});
