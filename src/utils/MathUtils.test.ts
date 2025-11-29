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

  it("should clamp values correctly", () => {
    expect(MathUtils.clamp(5, 0, 10)).toBe(5);
    expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
    expect(MathUtils.clamp(15, 0, 10)).toBe(10);
  });

  it("should lerp values correctly", () => {
    expect(MathUtils.lerp(0, 10, 0.5)).toBe(5);
    expect(MathUtils.lerp(0, 10, 0)).toBe(0);
    expect(MathUtils.lerp(0, 10, 1)).toBe(10);
  });

  it("should generate random int within range", () => {
    const min = 1;
    const max = 10;
    for (let i = 0; i < 20; i++) {
      const val = MathUtils.randomInt(min, max);
      expect(val).toBeGreaterThanOrEqual(min);
      expect(val).toBeLessThanOrEqual(max);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it("should generate random float within range", () => {
    const min = 1.5;
    const max = 5.5;
    for (let i = 0; i < 20; i++) {
      const val = MathUtils.randomFloat(min, max);
      expect(val).toBeGreaterThanOrEqual(min);
      expect(val).toBeLessThan(max); // Math.random() is exclusive of 1
    }
  });

  it("should select weighted random item", () => {
    const items = ["a", "b", "c"];
    const weights = [100, 0, 0]; // Always 'a'
    expect(MathUtils.weightedRandom(items, weights)).toBe("a");

    const weights2 = [0, 100, 0]; // Always 'b'
    expect(MathUtils.weightedRandom(items, weights2)).toBe("b");
  });

  it("should generate random point on circle", () => {
    const center = { x: 10, y: 10 };
    const radius = 5;
    for (let i = 0; i < 10; i++) {
      const point = MathUtils.randomPointOnCircle(center.x, center.y, radius);
      const dist = MathUtils.distance(center.x, center.y, point.x, point.y);
      expect(dist).toBeCloseTo(radius);
    }
  });
});
