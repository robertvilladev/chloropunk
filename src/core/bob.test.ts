import { describe, expect, it } from "vitest";
import { bob, popIn } from "./bob";

describe("bob", () => {
  it("is flat when standing still", () => {
    expect(bob(0.123, 0)).toEqual({ sx: 1, sy: 1, dy: 0 });
  });

  it("hops 3 times a second: squashed on landing, stretched and 3 px up at the top", () => {
    const land = bob(0, 90), top = bob(1 / 6, 90), next = bob(1 / 3, 90);
    expect(land.dy).toBeCloseTo(0);
    expect(land.sy).toBeCloseTo(0.93);
    expect(top.dy).toBeCloseTo(-3);
    expect(top.sy).toBeCloseTo(1.07);
    expect(next.sy).toBeCloseTo(land.sy);
    expect(next.dy).toBeCloseTo(land.dy);
  });

  it("grows with speed up to 90 px/s", () => {
    expect(bob(1 / 6, 45).dy).toBeCloseTo(-1.5);
    expect(bob(1 / 6, 300).dy).toBeCloseTo(-3);
  });

  it("keeps the volume (sx * sy = 1)", () => {
    for (let t = 0; t < 1; t += 0.05) {
      const b = bob(t, 90);
      expect(b.sx * b.sy).toBeCloseTo(1);
    }
  });
});

describe("popIn", () => {
  it("grows from 0.2 to 1.15 while fading in over 120 ms, then settles to 1 by 200 ms", () => {
    expect(popIn(0)).toEqual({ scale: 0.2, alpha: 0 });
    expect(popIn(0.12).scale).toBeCloseTo(1.15);
    expect(popIn(0.12).alpha).toBe(1);
    expect(popIn(0.2)).toEqual({ scale: 1, alpha: 1 });
    expect(popIn(5)).toEqual({ scale: 1, alpha: 1 });
  });

  it("only grows during the first 120 ms", () => {
    for (let t = 0.01; t <= 0.12; t += 0.01) expect(popIn(t).scale).toBeGreaterThan(popIn(t - 0.01).scale);
  });
});
