import { ARENA } from "@/config/constants";
import { CATCH_UP, scaleEnemy } from "@/core/waves";
import type { EnemyBehavior, EnemyDef, Rect, Vector2 } from "@/types";

/** approach → windup → attack → recover (only the dasher leaves "approach"). */
export type EnemyPhase = "approach" | "windup" | "attack" | "recover";

export interface EnemyState {
  hp: number;
  maxHp: number;
  damage: number;
  timer: number;
  phase: EnemyPhase;
  // dash direction, locked when a dash starts
  dirX: number;
  dirY: number;
  // way it circles a solid (avoid); 0 = not near one
  turn: number;
  // flank offset in [-1, 1] (pea: × params.flank degrees) and orbit way ±1 (carrot), from the spawn index
  slot: number;
  orbit: number;
}

export interface Steer {
  vx: number;
  vy: number;
  fire: boolean;
}

const SLOTS = [0, -1, 1, -0.5, 0.5]; // a 5-pack fans out centre-first

/** `index` = a deterministic per-spawn counter (never a spawn-RNG draw). */
export function createEnemyState(def: EnemyDef, wave: number, index = 0): EnemyState {
  const { hp, damage } = scaleEnemy(def, wave);
  return {
    hp, maxHp: hp, damage, timer: 0, phase: "approach", dirX: 0, dirY: 0, turn: 0,
    slot: SLOTS[index % SLOTS.length],
    orbit: index % 2 === 0 ? 1 : -1,
  };
}

/** No enemy predicts further ahead than this (s). */
export const LEAD_MAX_S = 0.8;

/**
 * Where to aim to meet a player moving at `vel`, coming at `speed`: the intercept
 * time (or dist/speed when there is none), capped at LEAD_MAX_S, damped by `k`
 * (0 = the player's position, 1 = the full intercept), clamped into ARENA.
 */
export function leadPoint(self: Vector2, player: Vector2, vel: Vector2, speed: number, k: number): Vector2 {
  const dx = player.x - self.x;
  const dy = player.y - self.y;
  // |d + v·t| = speed·t  →  (v·v − s²)t² + 2(d·v)t + d·d = 0
  const a = vel.x * vel.x + vel.y * vel.y - speed * speed;
  const b = 2 * (dx * vel.x + dy * vel.y);
  const c = dx * dx + dy * dy;
  let t = Math.sqrt(c) / speed;
  if (Math.abs(a) < 1e-6) {
    if (b < 0) t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const r = Math.sqrt(disc);
      const t1 = (-b - r) / (2 * a);
      const t2 = (-b + r) / (2 * a);
      const best = Math.min(t1 > 0 ? t1 : Infinity, t2 > 0 ? t2 : Infinity);
      if (best < Infinity) t = best;
    }
  }
  t = Math.min(t, LEAD_MAX_S) * k;
  return {
    x: Math.min(ARENA.w, Math.max(0, player.x + vel.x * t)),
    y: Math.min(ARENA.h, Math.max(0, player.y + vel.y * t)),
  };
}

/**
 * Pure movement/fire decision for one enemy (a small state machine per role,
 * tunables in `params`; must include `speed`, EnemyManager merges it with the
 * def's params once per type). A still player (vel 0) gets no lead.
 * Pass `out` to reuse an object in hot loops.
 */
export function steer(
  behavior: EnemyBehavior,
  state: EnemyState,
  self: Vector2,
  player: Vector2,
  playerVel: Vector2,
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
  let catchUp = true;
  out.fire = false;
  // head for a led point instead of the player
  const toward = (k: number, s: number) => {
    const p = leadPoint(self, player, playerVel, s, k);
    const lx = p.x - self.x;
    const ly = p.y - self.y;
    const l = Math.hypot(lx, ly);
    if (l > 1) {
      ux = lx / l;
      uy = ly / l;
    }
    return p;
  };

  switch (behavior) {
    case "chaser": {
      // pack hunter: far, fan out by slot (a spiral in from its own angle); near, pursue with a short lead
      if (dist > params.flankDist) {
        const a = (state.slot * params.flank * Math.PI) / 180;
        const c = Math.cos(a);
        const s = Math.sin(a);
        [ux, uy] = [ux * c - uy * s, ux * s + uy * c];
      } else toward(params.lead, speed);
      break;
    }
    case "dasher": {
      // charger: approach to dashRange, stand and tell, dash at the predicted spot, stand (punishable)
      state.timer += dt;
      if (state.phase === "approach" && dist <= params.dashRange) {
        state.phase = "windup";
        state.timer = 0;
      } else if (state.phase === "windup" && state.timer >= params.windup) {
        state.phase = "attack";
        state.timer = 0;
        toward(params.lead, params.dashSpeed);
        state.dirX = ux;
        state.dirY = uy;
      } else if (state.phase === "attack" && state.timer >= params.dashTime) {
        state.phase = "recover";
        state.timer = 0;
      } else if (state.phase === "recover" && state.timer >= params.recover) {
        state.phase = "approach";
        state.timer = 0;
      }
      if (state.phase === "attack") {
        speed = params.dashSpeed;
        ux = state.dirX;
        uy = state.dirY;
        catchUp = false;
      } else if (state.phase !== "approach") speed = 0;
      break;
    }
    case "shooter": {
      // kiter: back off inside keepDistance, orbit in the band, close in beyond range
      state.timer += dt;
      if (dist < params.keepDistance) dir = -1;
      else if (dist <= params.range) {
        // ponytail: fixed orbit way; a wall just makes it slide (avoid / world bounds), no flip
        [ux, uy] = [-uy * state.orbit, ux * state.orbit];
        catchUp = false;
      }
      if (dist <= params.range && state.timer >= params.fireEvery) {
        state.timer = 0;
        out.fire = true;
      }
      break;
    }
    case "exploder": // interceptor: where the player will be (≤ LEAD_MAX_S ahead)
    case "tank": // herder: the predicted spot, blocking the lane
      toward(params.lead, speed);
      break;
  }
  if (catchUp && dir === 1 && dist > CATCH_UP.dist) speed *= CATCH_UP.mult;

  out.vx = ux * speed * dir;
  out.vy = uy * speed * dir;
  return out;
}

// Attack tells (board A2): the dasher's whole wind-up, the last part of a shot, a close tomato
const TELL = { shotLead: 0.5, fuseDist: 90 };

/** True while an enemy should show its tell frame. Read after `steer` for the frame (same state). */
export function tells(behavior: EnemyBehavior, state: EnemyState, params: Record<string, number>, dist: number): boolean {
  if (behavior === "dasher") return state.phase === "windup";
  if (behavior === "shooter") return dist <= params.range && state.timer >= params.fireEvery - TELL.shotLead;
  return behavior === "exploder" && dist <= TELL.fuseDist;
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
