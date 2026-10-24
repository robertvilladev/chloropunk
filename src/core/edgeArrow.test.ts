import { describe, expect, it } from "vitest";
import { edgeArrow } from "./edgeArrow";

describe("edgeArrow", () => {
  const view = { x: 400, y: 300, width: 800, height: 600 };

  it("is null for a target inside the view", () => {
    expect(edgeArrow({ x: 800, y: 600 }, view, 12)).toBeNull();
    expect(edgeArrow({ x: 400, y: 300 }, view, 12)).toBeNull(); // on the border counts as visible
  });

  it("points right from the right edge, in screen px", () => {
    const a = edgeArrow({ x: 1500, y: 600 }, view, 12)!;
    expect(a.x).toBe(800 - 12);
    expect(a.y).toBe(300);
    expect(a.angle).toBeCloseTo(0);
  });

  it("clamps to both insets in a corner and points that way", () => {
    const a = edgeArrow({ x: -1000, y: -1000 }, view, 12)!;
    expect([a.x, a.y]).toEqual([12, 12]);
    expect(a.angle).toBeCloseTo(Math.atan2(-1600, -1800));
  });
});
