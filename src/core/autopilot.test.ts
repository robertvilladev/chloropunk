import { describe, expect, it } from "vitest";
import { autopilot, planWants, shopPick } from "./autopilot";

const mid = { x: 400, y: 300 };

describe("autopilot", () => {
  it("stands still with nothing around", () => {
    expect(autopilot(mid, [], [], 800, 600)).toEqual({ x: 0, y: 0 });
  });

  it("moves away from a close enemy, sideways rather than straight back", () => {
    const m = autopilot(mid, [{ x: 450, y: 300 }], [], 800, 600);
    expect(m.x).toBeLessThan(0); // away
    expect(Math.abs(m.y)).toBeGreaterThan(0.5); // strafing
    expect(Math.hypot(m.x, m.y)).toBeCloseTo(1);
  });

  it("goes for scrap when safe, not when an enemy is close", () => {
    const scrap = [{ x: 400, y: 200 }];
    expect(autopilot(mid, [{ x: 700, y: 550 }], scrap, 800, 600)).toEqual({ x: 0, y: -1 });
    expect(autopilot(mid, [{ x: 400, y: 240 }], scrap, 800, 600).y).toBeGreaterThan(0);
  });

  it("is pulled off a wall", () => {
    expect(autopilot({ x: 10, y: 300 }, [], [], 800, 600).x).toBeGreaterThan(0.9);
  });
});

describe("autopilot with solids", () => {
  const vent = { x: 420, y: 250, w: 100, h: 100 }; // left face at x=420, 20 px right of `mid`
  it("never walks into a vent next to it (it repels like a wall)", () => {
    const m = autopilot(mid, [{ x: 340, y: 300 }], [], 800, 600, [vent]); // enemy pushes it right, into the vent
    expect(m.x).toBeLessThanOrEqual(0);
    expect(Math.hypot(m.x, m.y)).toBeCloseTo(1);
  });

  it("doesn't chase scrap through a vent", () => {
    expect(autopilot(mid, [], [{ x: 600, y: 300 }], 800, 600, [vent]).x).toBeLessThanOrEqual(0);
  });

  it("ignores far vents", () => {
    expect(autopilot(mid, [], [{ x: 600, y: 300 }], 800, 600, [{ x: 100, y: 100, w: 50, h: 50 }])).toEqual({ x: 1, y: 0 });
  });
});

describe("shopping autopilot", () => {
  const plan = [{ item: "grip" }, { weapon: "pistol" }, { item: "hoodie" }, { item: "visor" }];

  it("planWants: the next k not yet bought, in any buy order, looping from loopFrom", () => {
    expect(planWants(plan, plan.length, [], 2)).toEqual(["grip", "pistol"]);
    expect(planWants(plan, plan.length, ["pistol"], 2)).toEqual(["grip", "hoodie"]);
    expect(planWants(plan, plan.length, ["grip", "pistol", "hoodie", "visor"], 2)).toEqual([]);
    expect(planWants(plan, 2, ["grip", "pistol", "hoodie", "visor"], 3)).toEqual(["hoodie", "visor", "hoodie"]);
  });

  it("shopPick: the earliest want on offer and affordable", () => {
    const offers = [{ id: "visor", price: 20 }, null, { id: "grip", price: 90 }, { id: "hoodie", price: 30 }];
    expect(shopPick(offers, 100, ["grip", "hoodie"])).toBe(2);
    expect(shopPick(offers, 50, ["grip", "hoodie"])).toBe(3); // grip too dear
    expect(shopPick(offers, 10, ["grip", "hoodie"])).toBe(-1);
    expect(shopPick(offers, 100, ["rocket"])).toBe(-1);
  });
});
