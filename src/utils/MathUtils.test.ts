import { describe, expect, it } from "vitest";
import { MathUtils } from "./MathUtils";

describe("MathUtils", () => {
  it("should calculate distance correctly", () => {
    expect(MathUtils.distance(0, 0, 3, 4)).toBe(5);
    expect(MathUtils.distance(0, 0, 0, 0)).toBe(0);
  });

  it("should calculate squared distance correctly", () => {
    expect(MathUtils.distanceSquared(0, 0, 3, 4)).toBe(25);
  });

  it("should calculate angle between points", () => {
    expect(MathUtils.angleBetween(0, 0, 1, 1)).toBeCloseTo(Math.PI / 4);
    expect(MathUtils.angleBetween(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
  });

  it("should normalize vector", () => {
    const vec = { x: 3, y: 4 };
    const normalized = MathUtils.normalize(vec);
    expect(normalized.x).toBeCloseTo(0.6);
    expect(normalized.y).toBeCloseTo(0.8);
  });

  it("should handle zero vector normalization", () => {
    const vec = { x: 0, y: 0 };
    const normalized = MathUtils.normalize(vec);
    expect(normalized).toEqual({ x: 0, y: 0 });
  });
});
