import { describe, expect, it } from "vitest";
import enemies from "@assets/data/enemies.json";
import { createEnemyState, steer } from "./enemyBehaviors";

const P = { x: 100, y: 0 };
const O = { x: 0, y: 0 };
const mag = (r: { vx: number; vy: number }) => Math.hypot(r.vx, r.vy);

describe("createEnemyState", () => {
  it("returns fresh objects", () => {
    const a = createEnemyState(enemies.pea, 1);
    const b = createEnemyState(enemies.pea, 1);
    expect(a).not.toBe(b);
    a.hp = 1;
    expect(b.hp).toBe(b.maxHp);
  });

  it("scales by wave", () => {
    expect(createEnemyState(enemies.pea, 5).hp).toBe(30); // 9 × (1 + 0.3·4 + 0.07·16)
  });
});

describe("steer", () => {
  it("chaser moves toward player", () => {
    const r = steer("chaser", createEnemyState(enemies.pea, 1), O, P, 0.016, { speed: 90 });
    expect(r.vx).toBeCloseTo(90);
    expect(r.vy).toBeCloseTo(0);
  });

  it("dasher dashes after dashEvery, then slows back", () => {
    const params = { speed: 70, ...enemies.pepper.params };
    const s = createEnemyState(enemies.pepper, 1);
    expect(mag(steer("dasher", s, O, P, 2.0, params))).toBeCloseTo(70);
    expect(mag(steer("dasher", s, O, P, 0.6, params))).toBeCloseTo(320);
    expect(mag(steer("dasher", s, O, P, 0.2, params))).toBeCloseTo(320);
    expect(mag(steer("dasher", s, O, P, 0.2, params))).toBeCloseTo(70);
  });

  it("dasher keeps its dash direction", () => {
    const params = { speed: 70, ...enemies.pepper.params };
    const s = createEnemyState(enemies.pepper, 1);
    steer("dasher", s, O, P, 2.6, params); // dash starts aimed at (100,0)
    const r = steer("dasher", s, O, { x: 0, y: 100 }, 0.1, params);
    expect(r.vx).toBeCloseTo(320);
    expect(r.vy).toBeCloseTo(0);
  });

  it("shooter keeps distance and fires", () => {
    const params = { speed: 60, ...enemies.carrot.params };
    const s = createEnemyState(enemies.carrot, 1);
    const near = steer("shooter", s, O, P, 0.016, params);
    expect(near.vx).toBeLessThan(0); // backing away from player at +x
    s.timer = 2;
    const far = steer("shooter", s, O, { x: 220, y: 0 }, 0.016, params);
    expect(far.fire).toBe(true);
    expect(s.timer).toBe(0);
  });
});
