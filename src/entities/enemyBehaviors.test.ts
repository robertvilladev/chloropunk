import { describe, expect, it } from "vitest";
import enemies from "@assets/data/enemies.json";
import { CATCH_UP } from "@/core/waves";
import layout from "@assets/data/arena.json";
import { solidRects } from "@/core/arena";
import type { ArenaProp, Rect } from "@/types";
import { LEAD_MAX_S, avoid, createEnemyState, leadPoint, steer, tells } from "./enemyBehaviors";

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

const STILL = { x: 0, y: 0 };
const pp = (k: keyof typeof enemies): Record<string, number> => ({ speed: enemies[k].speed, ...enemies[k].params });

describe("leadPoint", () => {
  const P = { x: 500, y: 500 };

  it("a still player is its own lead point", () => {
    expect(leadPoint({ x: 0, y: 0 }, P, STILL, 100, 1)).toEqual(P);
  });

  it("solves the intercept; k damps it", () => {
    // seeker 30 px left at 100 px/s, player crossing at 40 px/s: 900 + 1600t² = 10000t² → t = √(900/8400)
    const t = Math.sqrt(900 / 8400);
    expect(leadPoint({ x: 470, y: 500 }, P, { x: 0, y: 40 }, 100, 1).y).toBeCloseTo(500 + 40 * t);
    expect(leadPoint({ x: 470, y: 500 }, P, { x: 0, y: 40 }, 100, 0.5).y).toBeCloseTo(500 + 20 * t);
  });

  it("caps the look-ahead at LEAD_MAX_S", () => {
    // 80 px left at 100 px/s vs 60 px/s across: t = 1 s → capped
    expect(leadPoint({ x: 420, y: 500 }, P, { x: 0, y: 60 }, 100, 1).y).toBeCloseTo(500 + 60 * LEAD_MAX_S);
  });

  it("player too fast to catch: falls back to dist/speed, capped", () => {
    expect(leadPoint({ x: 400, y: 500 }, P, { x: 300, y: 0 }, 100, 0.5)).toEqual({ x: 500 + 300 * LEAD_MAX_S * 0.5, y: 500 });
  });

  it("clamps into the arena", () => {
    expect(leadPoint({ x: 100, y: 100 }, { x: 10, y: 10 }, { x: -300, y: -300 }, 50, 1)).toEqual({ x: 0, y: 0 });
  });
});

describe("steer", () => {
  const A = { x: 500, y: 500 }; // mid-arena, so lead points aren't clamped
  const at = (dx: number, dy: number) => ({ x: A.x + dx, y: A.y + dy });

  it("chaser near a still player walks straight at it (today's behaviour)", () => {
    const r = steer("chaser", createEnemyState(enemies.pea, 1), A, at(100, 0), STILL, 0.016, pp("pea"));
    expect(r.vx).toBeCloseTo(enemies.pea.speed);
    expect(r.vy).toBeCloseTo(0);
  });

  it("pea pack fans out by slot while far, then pursues with a lead", () => {
    const P = at(300, 0);
    const angles = [0, 1, 2, 3, 4].map((i) => {
      const r = steer("chaser", createEnemyState(enemies.pea, 1, i), A, P, STILL, 0.016, pp("pea"));
      return (Math.atan2(r.vy, r.vx) * 180) / Math.PI;
    });
    const f = pp("pea").flank;
    [0, -f, f, -f / 2, f / 2].forEach((a, i) => expect(angles[i]).toBeCloseTo(a));
    // within flankDist: no flank, leads a moving player
    const near = steer("chaser", createEnemyState(enemies.pea, 1, 1), A, at(100, 0), { x: 0, y: 100 }, 0.016, pp("pea"));
    expect(near.vx).toBeGreaterThan(0);
    expect(near.vy).toBeGreaterThan(0);
  });

  it("pepper: approach → windup (stands, tells) → attack → recover → approach", () => {
    const p = pp("pepper");
    const s = createEnemyState(enemies.pepper, 1);
    expect(mag(steer("dasher", s, A, at(400, 0), STILL, 0.1, p))).toBeCloseTo(enemies.pepper.speed * CATCH_UP.mult);
    expect(s.phase).toBe("approach");
    expect(mag(steer("dasher", s, A, at(p.dashRange, 0), STILL, 0.1, p))).toBe(0);
    expect(s.phase).toBe("windup");
    expect(tells("dasher", s, p, p.dashRange)).toBe(true);
    expect(p.windup).toBeGreaterThanOrEqual(0.4);
    expect(mag(steer("dasher", s, A, at(p.dashRange, 0), STILL, p.windup - 0.01, p))).toBe(0);
    expect(mag(steer("dasher", s, A, at(p.dashRange, 0), STILL, 0.02, p))).toBeCloseTo(p.dashSpeed);
    expect(s.phase).toBe("attack");
    expect(tells("dasher", s, p, p.dashRange)).toBe(false);
    steer("dasher", s, A, at(10, 0), STILL, p.dashTime, p);
    expect(s.phase).toBe("recover");
    expect(mag(steer("dasher", s, A, at(300, 0), STILL, p.recover - 0.01, p))).toBe(0);
    steer("dasher", s, A, at(300, 0), STILL, 0.02, p);
    expect(s.phase).toBe("approach");
  });

  it("pepper locks its dash on the predicted spot and keeps it", () => {
    const p = pp("pepper");
    const s = createEnemyState(enemies.pepper, 1);
    s.phase = "windup";
    const P = at(200, 0);
    const vel = { x: 0, y: 180 };
    steer("dasher", s, A, P, vel, p.windup, p); // dash starts
    const aim = leadPoint(A, P, vel, p.dashSpeed, p.lead);
    expect(Math.atan2(s.dirY, s.dirX)).toBeCloseTo(Math.atan2(aim.y - A.y, aim.x - A.x));
    expect(s.dirY).toBeGreaterThan(0); // ahead of the player, not at it
    const r = steer("dasher", s, at(50, 0), at(0, -200), STILL, 0.1, p); // player went elsewhere: same locked way
    expect(r.vx / p.dashSpeed).toBeCloseTo(s.dirX);
    expect(r.vy / p.dashSpeed).toBeCloseTo(s.dirY);
  });

  it("does not speed up a dash", () => {
    const p = pp("pepper");
    const s = createEnemyState(enemies.pepper, 1);
    s.phase = "windup";
    expect(mag(steer("dasher", s, A, at(1000, 0), STILL, p.windup, p))).toBeCloseTo(p.dashSpeed);
  });

  it("carrot backs off, orbits its band in its orbit way, and fires", () => {
    const p = pp("carrot");
    const cw = createEnemyState(enemies.carrot, 1, 0);
    const ccw = createEnemyState(enemies.carrot, 1, 1);
    expect([cw.orbit, ccw.orbit]).toEqual([1, -1]);
    expect(steer("shooter", cw, A, at(100, 0), STILL, 0.016, p).vx).toBeLessThan(0); // too close: back off
    const o1 = steer("shooter", cw, A, at(230, 0), STILL, 0.016, p);
    expect(o1.vx).toBeCloseTo(0);
    expect(o1.vy).toBeCloseTo(enemies.carrot.speed); // tangent (-uy, ux) · +1
    expect(steer("shooter", ccw, A, at(230, 0), STILL, 0.016, p).vy).toBeCloseTo(-enemies.carrot.speed);
    cw.timer = p.fireEvery;
    expect(steer("shooter", cw, A, at(230, 0), STILL, 0.016, p).fire).toBe(true);
    expect(cw.timer).toBe(0);
  });

  it("carrot shots lead a moving target, imperfectly (EnemyManager.fireBolt aims here)", () => {
    const p = pp("carrot");
    const P = at(230, 0);
    const vel = { x: 0, y: 180 };
    const aim = leadPoint(A, P, vel, p.boltSpeed, p.lead);
    expect(p.lead).toBeCloseTo(0.7);
    expect(aim.y).toBeGreaterThan(P.y);
    expect(aim.y).toBeLessThan(leadPoint(A, P, vel, p.boltSpeed, 1).y);
  });

  it("tomato and potato head for the predicted spot; a still player: straight at it", () => {
    for (const [b, k] of [["exploder", "tomato"], ["tank", "potato"]] as const) {
      const still = steer(b, createEnemyState(enemies[k], 1), A, at(100, 0), STILL, 0.016, pp(k));
      expect(still.vx).toBeCloseTo(enemies[k].speed);
      expect(still.vy).toBeCloseTo(0);
      const vel = { x: 0, y: 180 };
      const moving = steer(b, createEnemyState(enemies[k], 1), A, at(300, 0), vel, 0.016, pp(k));
      const aim = leadPoint(A, at(300, 0), vel, enemies[k].speed, pp(k).lead);
      expect(Math.atan2(moving.vy, moving.vx)).toBeCloseTo(Math.atan2(aim.y - A.y, aim.x - A.x));
      expect(aim.y - A.y).toBeCloseTo(180 * LEAD_MAX_S); // ~0.8 s ahead
    }
  });

  it("walks at CATCH_UP.mult x speed while farther than CATCH_UP.dist", () => {
    const far = at(CATCH_UP.dist + 1, 0);
    const pea = { ...pp("pea"), speed: 90 };
    expect(mag(steer("chaser", createEnemyState(enemies.pea, 1), A, far, STILL, 0.016, pea))).toBeCloseTo(90 * CATCH_UP.mult);
    expect(mag(steer("chaser", createEnemyState(enemies.pea, 1), A, at(CATCH_UP.dist, 0), STILL, 0.016, pea))).toBeCloseTo(90);
    const shooter = steer("shooter", createEnemyState(enemies.carrot, 1), A, far, STILL, 0.016, { ...pp("carrot"), speed: 60 });
    expect(mag(shooter)).toBeCloseTo(60 * CATCH_UP.mult);
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

describe("tells (board A2 wind-up windows)", () => {
  const P_ = (b: keyof typeof enemies) => ({ speed: enemies[b].speed, ...enemies[b].params });

  it("pepper tells for its whole wind-up, not while approaching or dashing", () => {
    const s = createEnemyState(enemies.pepper, 1), p = P_("pepper");
    expect(tells("dasher", s, p, 500)).toBe(false);
    s.phase = "windup";
    expect(tells("dasher", s, p, 500)).toBe(true);
    s.phase = "attack";
    expect(tells("dasher", s, p, 500)).toBe(false);
  });

  it("carrot aims for the last 0.5 s before a shot, only in range", () => {
    const s = createEnemyState(enemies.carrot, 1), p = P_("carrot");
    s.timer = 1.4;
    expect(tells("shooter", s, p, 200)).toBe(false);
    s.timer = 1.5;
    expect(tells("shooter", s, p, 200)).toBe(true);
    expect(tells("shooter", s, p, 261)).toBe(false);
  });

  it("tomato flares within 90 px of the fighter", () => {
    const s = createEnemyState(enemies.tomato, 1), p = P_("tomato");
    expect(tells("exploder", s, p, 90)).toBe(true);
    expect(tells("exploder", s, p, 91)).toBe(false);
  });

  it("peas and spuds have no tell", () => {
    expect(tells("chaser", createEnemyState(enemies.pea, 1), P_("pea"), 10)).toBe(false);
    expect(tells("tank", createEnemyState(enemies.potato, 1), P_("potato"), 10)).toBe(false);
  });
});
