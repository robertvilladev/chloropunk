import { describe, expect, it } from "vitest";
import { inArc, nearestInRange, onBeam, slotOffset, spreadAngles } from "./weaponBehaviors";

const O = { x: 0, y: 0 };
const deg = (d: number) => (d * Math.PI) / 180;

describe("nearestInRange", () => {
  it("picks the closer target in range", () => {
    const a = { x: 50, y: 0 };
    const b = { x: 20, y: 0 };
    expect(nearestInRange(O, 100, [a, b])).toBe(b);
  });

  it("returns null when all are out of range", () => {
    expect(nearestInRange(O, 10, [{ x: 50, y: 0 }])).toBeNull();
  });
});

describe("slotOffset", () => {
  it("spreads slots evenly on a circle", () => {
    const a = slotOffset(0, 4);
    const b = slotOffset(1, 4);
    expect(a.x).toBeCloseTo(28);
    expect(a.y).toBeCloseTo(0);
    expect(b.x).toBeCloseTo(0);
    expect(b.y).toBeCloseTo(28);
  });
});

describe("spreadAngles", () => {
  it("centres pellets over the spread", () => {
    const r = spreadAngles(0, 5, 40, []);
    [-20, -10, 0, 10, 20].forEach((d, i) => expect(r[i]).toBeCloseTo(deg(d)));
  });

  it("one pellet goes straight", () => {
    expect(spreadAngles(1, 1, 40, [])).toEqual([1]);
  });
});

describe("inArc", () => {
  it("hits inside the arc and range only", () => {
    const at = (d: number, r: number) => ({ x: Math.cos(deg(d)) * r, y: Math.sin(deg(d)) * r });
    expect(inArc(O, 0, 120, 90, at(30, 50))).toBe(true);
    expect(inArc(O, 0, 120, 90, at(90, 50))).toBe(false);
    expect(inArc(O, 0, 120, 90, at(0, 120))).toBe(false);
  });
});

describe("onBeam", () => {
  it("hits points near the segment only", () => {
    expect(onBeam(O, 0, 300, 5, { x: 100, y: 4 })).toBe(true);
    expect(onBeam(O, 0, 300, 5, { x: 100, y: 20 })).toBe(false);
    expect(onBeam(O, 0, 300, 5, { x: -50, y: 0 })).toBe(false);
  });
});
