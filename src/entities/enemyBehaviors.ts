import { scaleEnemy } from "@/core/waves";
import type { EnemyBehavior, EnemyDef, Vector2 } from "@/types";

export interface EnemyState {
  hp: number;
  maxHp: number;
  damage: number;
  timer: number;
  phase: "move" | "dash";
}

export interface Steer {
  vx: number;
  vy: number;
  fire: boolean;
}

export function createEnemyState(def: EnemyDef, wave: number): EnemyState {
  const { hp, damage } = scaleEnemy(def, wave);
  return { hp, maxHp: hp, damage, timer: 0, phase: "move" };
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
  const ux = dx / dist;
  const uy = dy / dist;
  let speed = params.speed;
  let dir = 1; // +1 toward player, -1 away
  out.fire = false;

  if (behavior === "dasher") {
    state.timer += dt;
    if (state.phase === "move" && state.timer >= params.dashEvery) {
      state.phase = "dash";
      state.timer = 0;
    } else if (state.phase === "dash" && state.timer >= params.dashTime) {
      state.phase = "move";
      state.timer = 0;
    }
    if (state.phase === "dash") speed = params.dashSpeed;
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

  out.vx = ux * speed * dir;
  out.vy = uy * speed * dir;
  return out;
}
