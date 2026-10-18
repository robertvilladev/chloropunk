import { describe, expect, it } from "vitest";
import { DEPTH } from "@/config/constants";
import { actorDepth, facingFlip, pickupDepth } from "./depth";

describe("facingFlip", () => {
  it("faces left on negative vx", () => expect(facingFlip(-50, false)).toBe(true));
  it("faces right on positive vx", () => expect(facingFlip(50, true)).toBe(false));
  it("dead zone keeps previous", () => {
    expect(facingFlip(3, true)).toBe(true);
    expect(facingFlip(-3, false)).toBe(false);
    expect(facingFlip(0, false)).toBe(false);
  });
});

describe("y-sorted depth", () => {
  it("maps y into the actor band", () => {
    expect(actorDepth(0)).toBe(40);
    expect(actorDepth(600)).toBeLessThan(50);
    expect(actorDepth(300)).toBeGreaterThan(actorDepth(100));
  });
  it("clamps out-of-range and non-finite y", () => {
    for (const y of [-500, 5000]) {
      expect(actorDepth(y)).toBeGreaterThanOrEqual(40);
      expect(actorDepth(y)).toBeLessThan(50);
    }
    expect(actorDepth(NaN)).toBe(40);
  });
  it("keeps layers ordered", () => {
    expect(pickupDepth(600)).toBeLessThan(actorDepth(0));
    expect(DEPTH.FX).toBeGreaterThan(actorDepth(600));
    expect(DEPTH.PROJECTILES).toBeGreaterThan(actorDepth(600));
  });
});
