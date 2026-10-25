import { describe, expect, it } from "vitest";
import enemies from "@assets/data/enemies.json";
import { CATCH_UP } from "@/core/waves";
import layout from "@assets/data/arena.json";
import { solidRects } from "@/core/arena";
import type { ArenaProp, Rect } from "@/types";
import { avoid, createEnemyState, steer } from "./enemyBehaviors";

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

  it("walks at CATCH_UP.mult x speed while farther than CATCH_UP.dist", () => {
    const far = { x: CATCH_UP.dist + 1, y: 0 };
    expect(mag(steer("chaser", createEnemyState(enemies.pea, 1), O, far, 0.016, { speed: 90 }))).toBeCloseTo(90 * CATCH_UP.mult);
    expect(mag(steer("chaser", createEnemyState(enemies.pea, 1), O, { x: CATCH_UP.dist, y: 0 }, 0.016, { speed: 90 }))).toBeCloseTo(90);
    const shooter = steer("shooter", createEnemyState(enemies.carrot, 1), O, far, 0.016, { speed: 60, ...enemies.carrot.params });
    expect(mag(shooter)).toBeCloseTo(60 * CATCH_UP.mult);
  });

  it("does not speed up a dash", () => {
    const params = { speed: 70, ...enemies.pepper.params };
    const s = createEnemyState(enemies.pepper, 1);
    const far = { x: 1000, y: 0 };
    expect(mag(steer("dasher", s, O, far, 2.6, params))).toBeCloseTo(320);
  });
});

describe("avoid", () => {
  const vent = { x: 100, y: -40, w: 80, h: 80 }; // left face at x=100, centred on y=0
  const run = (self: { x: number; y: number }, vx: number, vy: number, rects = [vent], nb: { x: number; y: number }[] = []) =>
    avoid(self, 14, { vx, vy }, rects, nb, { vx: 0, vy: 0 });

  it("clear path: unchanged", () => {
    expect(run({ x: 0, y: 0 }, 90, 0, [])).toEqual({ vx: 90, vy: 0 });
    expect(run({ x: -200, y: 0 }, 90, 0)).toEqual({ vx: 90, vy: 0 }); // vent far away
    expect(run({ x: 80, y: 0 }, -90, 0)).toEqual({ vx: -90, vy: 0 }); // walking away from it
  });

  it("heading straight into a rect: slides along it, nothing into it", () => {
    const r = run({ x: 80, y: 0 }, 90, 0);
    expect(r.vx).toBeLessThanOrEqual(0);
    expect(Math.abs(r.vy)).toBeGreaterThan(0);
  });

  it("slides toward the nearer corner", () => {
    expect(run({ x: 80, y: 20 }, 90, 0).vy).toBeGreaterThan(0);
    expect(run({ x: 80, y: -20 }, 90, 0).vy).toBeLessThan(0);
  });

  it("at a corner, keeps sliding around it (playtest: a potato walked away from vent 3)", () => {
    const r = run({ x: 195, y: -55 }, -65, 255); // up-right of the corner (180, -40), target below-left
    expect(r.vx).toBeGreaterThan(0); // around the right side
    expect(r.vy).toBeGreaterThan(0); // not back up
  });

  it("a crowd pressed on a face still slides (playtest: a row of peas jammed over vent 1)", () => {
    const r = run({ x: 80, y: 0 }, 90, 0, [vent], [{ x: 80, y: 10 }]);
    expect(r.vx).toBeLessThanOrEqual(0);
    expect(r.vy).toBeLessThan(-80); // mostly sideways, away from the neighbour
  });

  it("keeps the way it circles a rect until clear (re-choosing flipped crowds in place)", () => {
    const mem = { turn: 0 };
    const below = avoid({ x: 80, y: 20 }, 14, { vx: 90, vy: 0 }, [vent], [], { vx: 0, vy: 0 }, mem);
    expect(below.vy).toBeGreaterThan(0); // nearer end first
    const turn = mem.turn;
    // now just above the middle: alone it would pick the other side, but it keeps its turn
    expect(avoid({ x: 80, y: -5 }, 14, { vx: 90, vy: 0 }, [vent], [], { vx: 0, vy: 0 }, mem).vy).toBeGreaterThan(0);
    expect(mem.turn).toBe(turn);
    avoid({ x: -200, y: 0 }, 14, { vx: 90, vy: 0 }, [vent], [], { vx: 0, vy: 0 }, mem);
    expect(mem.turn).toBe(0);
  });

  it("keeps the desired speed, incl. the 2x catch-up", () => {
    expect(mag(run({ x: 80, y: 10 }, 90, 30))).toBeCloseTo(Math.hypot(90, 30));
    expect(mag(run({ x: 80, y: 0 }, 90 * CATCH_UP.mult, 0))).toBeCloseTo(90 * CATCH_UP.mult);
  });

  it("pushes overlapping enemies apart", () => {
    const r = run({ x: 0, y: 0 }, 0, 90, [], [{ x: 10, y: 0 }]);
    expect(r.vx).toBeLessThan(0);
    expect(mag(r)).toBeCloseTo(90);
  });

  it("standing enemies (shooters in range) still drift apart", () => {
    expect(run({ x: 0, y: 0 }, 0, 0, [], [{ x: 10, y: 0 }]).vx).toBeLessThan(0);
    expect(run({ x: 0, y: 0 }, 0, 0, [], [{ x: 100, y: 0 }])).toEqual({ vx: 0, vy: 0 });
  });

  it("separation never pushes into a rect", () => {
    expect(run({ x: 80, y: 0 }, 0, 90, [vent], [{ x: 70, y: 0 }]).vx).toBeLessThanOrEqual(0);
  });
});

describe("avoid: crowds walk around the shipped vents", () => {
  // Euler sim of 24 mixed enemies (pea/potato/pepper radius + speed) chasing a still player past
  // one vent, with a push-out standing in for the collider. Caught jams the unit cases missed.
  function arrived(player: { x: number; y: number }, vent: Rect, sx: number, sy: number): number {
    const es = Array.from({ length: 24 }, (_, i) => ({
      x: sx + (i % 8) * 16,
      y: sy + Math.floor(i / 8) * 22,
      r: i >= 12 && i < 18 ? 20 : 14,
      s: i < 12 ? 90 : i < 18 ? 45 : 70,
      mem: { turn: 0 },
    }));
    const out = { vx: 0, vy: 0 };
    for (let f = 0; f < 900; f++) {
      for (const e of es) {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const nb = es.filter((o) => o !== e && Math.abs(o.x - e.x) < e.r * 2 && Math.abs(o.y - e.y) < e.r * 2).slice(0, 6);
        avoid(e, e.r, { vx: (dx / d) * e.s, vy: (dy / d) * e.s }, [vent], nb, out, e.mem);
        e.x += out.vx / 60;
        e.y += out.vy / 60;
        const nx = Math.min(Math.max(e.x, vent.x), vent.x + vent.w);
        const ny = Math.min(Math.max(e.y, vent.y), vent.y + vent.h);
        const od = Math.hypot(e.x - nx, e.y - ny);
        if (od > 0 && od < e.r) {
          e.x = nx + ((e.x - nx) / od) * e.r;
          e.y = ny + ((e.y - ny) / od) * e.r;
        }
        e.y = Math.max(e.r, e.y);
      }
    }
    return es.filter((e) => Math.hypot(e.x - player.x, e.y - player.y) <= 90).length;
  }

  const vents = solidRects(layout.props as ArenaProp[]);
  const dirs = [[-1, 0], [1, 0], [0, 1], [1, 1], [-1, 1], [1, -1]];
  it.each(vents.flatMap((v) => dirs.map(([ax, ay]) => [v, ax, ay] as const)))("vent %o from (%i, %i)", (v, ax, ay) => {
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const player = { x: Math.max(30, cx + ax * 160), y: Math.max(30, cy + ay * 150) };
    expect(arrived(player, v, Math.max(16, cx - ax * 150 - 56), Math.max(16, cy - ay * 130 - 22))).toBeGreaterThanOrEqual(23);
  });
});
