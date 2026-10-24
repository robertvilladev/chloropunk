import { CATCH_UP, scaleEnemy } from "@/core/waves";
import type { EnemyBehavior, EnemyDef, Rect, Vector2 } from "@/types";

export interface EnemyState {
  hp: number;
  maxHp: number;
  damage: number;
  timer: number;
  phase: "move" | "dash";
  // dash direction, locked when a dash starts
  dirX: number;
  dirY: number;
  // way it circles a solid (avoid); 0 = not near one
  turn: number;
}

export interface Steer {
  vx: number;
  vy: number;
  fire: boolean;
}

export function createEnemyState(def: EnemyDef, wave: number): EnemyState {
  const { hp, damage } = scaleEnemy(def, wave);
  return { hp, maxHp: hp, damage, timer: 0, phase: "move", dirX: 0, dirY: 0, turn: 0 };
}

/**
 * Pure movement/fire decision for one enemy. `params` must include `speed`
 * (EnemyManager merges it with the def's params once per type).
 * Pass `out` to reuse an object in hot loops.
 */
export function steer(
  behavior: EnemyBehavior,
  state: EnemyState,
  self: Vector2,
  player: Vector2,
  dt: number,
  params: Record<string, number>,
  out: Steer = { vx: 0, vy: 0, fire: false }
): Steer {
  const dx = player.x - self.x;
  const dy = player.y - self.y;
  const dist = Math.hypot(dx, dy) || 1;
  let ux = dx / dist;
  let uy = dy / dist;
  let speed = params.speed;
  let dir = 1; // +1 toward player, -1 away
  out.fire = false;

  if (behavior === "dasher") {
    state.timer += dt;
    if (state.phase === "move" && state.timer >= params.dashEvery) {
      state.phase = "dash";
      state.timer = 0;
      state.dirX = ux;
      state.dirY = uy;
    } else if (state.phase === "dash" && state.timer >= params.dashTime) {
      state.phase = "move";
      state.timer = 0;
    }
    if (state.phase === "dash") {
      speed = params.dashSpeed;
      ux = state.dirX;
      uy = state.dirY;
    }
  } else if (behavior === "shooter") {
    state.timer += dt;
    if (dist < params.keepDistance) dir = -1;
    else if (dist <= params.range) speed = 0;
    if (dist <= params.range && state.timer >= params.fireEvery) {
      state.timer = 0;
      out.fire = true;
    }
  }
  // chaser, tank and exploder all just walk at the player
  if (dir === 1 && state.phase === "move" && dist > CATCH_UP.dist) speed *= CATCH_UP.mult;

  out.vx = ux * speed * dir;
  out.vy = uy * speed * dir;
  return out;
}

const LOOK = 24; // px of gap to a solid where avoidance starts
const IDLE_SEP = 40; // px/s: standing enemies (shooters in range) drift apart this fast

/**
 * Steering add-on after `steer`: separation from `neighbours` (closer than
 * 2·radius), then slide around any rect it is about to walk into. Keeps the
 * desired speed. `out` may alias `desired`.
 * `mem.turn` (per enemy, starts 0) holds the way it circles a rect, chosen on
 * first contact (toward the nearer end) and kept until clear: re-choosing each
 * frame lets a crowd or a corner flip it back and forth in place.
 * ponytail: local push only, no pathing; a deep concave pocket could still trap it.
 */
export function avoid(
  self: Vector2,
  radius: number,
  desired: { vx: number; vy: number },
  rects: readonly Rect[],
  neighbours: readonly Vector2[],
  out: { vx: number; vy: number },
  mem: { turn: number } = { turn: 0 }
): { vx: number; vy: number } {
  let vx = desired.vx;
  let vy = desired.vy;
  let speed = Math.hypot(vx, vy);

  const sepDist = radius * 2;
  let sx = 0;
  let sy = 0;
  for (const n of neighbours) {
    const dx = self.x - n.x;
    const dy = self.y - n.y;
    const d = Math.hypot(dx, dy);
    if (d === 0 || d >= sepDist) continue;
    const k = (1 - d / sepDist) / d;
    sx += dx * k;
    sy += dy * k;
  }
  if (sx !== 0 || sy !== 0) {
    if (speed === 0) {
      vx = sx * IDLE_SEP;
      vy = sy * IDLE_SEP;
      speed = Math.hypot(vx, vy);
    } else {
      vx += sx * speed;
      vy += sy * speed;
    }
  }

  let near = false;
  for (const r of rects) {
    const nx = Math.min(Math.max(self.x, r.x), r.x + r.w);
    const ny = Math.min(Math.max(self.y, r.y), r.y + r.h);
    const dx = self.x - nx;
    const dy = self.y - ny;
    const d = Math.hypot(dx, dy);
    if (d === 0 || d - radius > LOOK) continue; // inside (the collider resolves it) or far
    near = true;
    const ux = dx / d;
    const uy = dy / d;
    const into = vx * ux + vy * uy;
    if (into >= 0) continue;
    // drop the part heading into the rect, then make sure it moves around it the chosen way
    let ax = vx - into * ux;
    let ay = vy - into * uy;
    if (mem.turn === 0) {
      // toward the nearer end; from the middle of a face (ambiguous), the fixed side
      const cx = self.x - (r.x + r.w / 2);
      const cy = self.y - (r.y + r.h / 2);
      mem.turn = -uy * cx + ux * cy < -0.1 * Math.hypot(cx, cy) ? -1 : 1;
    }
    const tx = -uy * mem.turn;
    const ty = ux * mem.turn;
    const along = ax * tx + ay * ty;
    if (along < speed * 0.5) {
      ax += tx * (speed * 0.5 - along);
      ay += ty * (speed * 0.5 - along);
    }
    // full avoidance in the near half of LOOK, fading out over the far half (no on/off chatter at the edge)
    const w = Math.min(1, (2 * (LOOK - (d - radius))) / LOOK);
    vx += (ax - vx) * w;
    vy += (ay - vy) * w;
  }
  if (!near) mem.turn = 0;

  const m = Math.hypot(vx, vy);
  out.vx = m > 0 ? (vx / m) * speed : 0;
  out.vy = m > 0 ? (vy / m) * speed : 0;
  return out;
}
