import type { SpawnEvent, Vector2, WaveDef, WaveScaling } from "@/types";
import wavesData from "@assets/data/waves.json";

export function waveDuration(wave: number): number {
  return Math.min(32 + 2 * (wave - 1), 60); // wave-length addendum (2026-10-24)
}

export function buildSpawnSchedule(def: WaveDef): SpawnEvent[] {
  const limit = waveDuration(def.wave);
  const events: SpawnEvent[] = [];
  for (const g of def.groups) {
    const end = g.end ?? limit;
    // index-based to avoid float accumulation drift
    for (let i = 0, t = g.start; t < end; t = g.start + ++i * g.every) {
      events.push({ time: t, enemy: g.enemy, count: g.count });
    }
  }
  return events.sort((a, b) => a.time - b.time);
}

/**
 * Advance a cursor over a time-sorted schedule: returns the first index whose
 * event is not yet due (time >= elapsedS). Events fired are schedule[cursor..result).
 */
export function advanceCursor(
  schedule: SpawnEvent[],
  cursor: number,
  elapsedS: number
): number {
  while (cursor < schedule.length && schedule[cursor].time < elapsedS) cursor++;
  return cursor;
}

/**
 * Enemies farther than `dist` px from the player walk `mult`× faster, so the
 * off-screen spawn ring (~480 px out) arrives about as fast as the old 800x600
 * edge spawns did. Dashes and backing away are not sped up.
 */
export const CATCH_UP = { dist: 360, mult: 2 } as const;

/** Spawns are skipped while this many enemies are alive (balance design §5). */
export const MAX_ALIVE = 40;

/** Enemy HP × (1 + hp·w + hpQuad·w²) and damage × (1 + damage·w), w = wave − 1, rounded. */
export function scaleEnemy(
  base: { hp: number; damage: number },
  wave: number,
  k: WaveScaling = wavesData.scaling
): { hp: number; damage: number } {
  const w = wave - 1;
  return {
    hp: Math.round(base.hp * (1 + k.hp * w + k.hpQuad * w * w)),
    damage: Math.round(base.damage * (1 + k.damage * w)),
  };
}

/**
 * Map u in [0,1) onto the rectangle `inset` px inside a width×height arena
 * (clockwise from the top-left). If that point is within `minDist` of the
 * player, use the point half a perimeter further on instead, which is always
 * across the arena. One input value, so callers draw a fixed RNG count.
 */
export function edgePoint(
  u: number,
  player: Vector2,
  width: number,
  height: number,
  inset: number,
  minDist: number
): Vector2 {
  const w = width - 2 * inset;
  const h = height - 2 * inset;
  const per = 2 * (w + h);
  const p = rectWalk(inset, inset, w, h, u * per);
  if (Math.hypot(p.x - player.x, p.y - player.y) >= minDist) return p;
  return rectWalk(inset, inset, w, h, u * per + per / 2);
}

/** Point `t` px clockwise along a rectangle's perimeter from its top-left corner (wraps). */
function rectWalk(x: number, y: number, w: number, h: number, t: number): Vector2 {
  const per = 2 * (w + h);
  t = ((t % per) + per) % per;
  if (t < w) return { x: x + t, y };
  if ((t -= w) < h) return { x: x + w, y: y + t };
  if ((t -= h) < w) return { x: x + w - t, y: y + h };
  return { x, y: y + h - (t - w) };
}

/** The camera's visible rect in world px (Phaser's `worldView` fits). */
export type ViewRect = { x: number; y: number; width: number; height: number };

/**
 * Wave spawn point just off-screen (arena addendum §2.3): map u in [0,1) onto
 * the view grown by `margin`, clamped into the arena `inset` px from its walls.
 * A point the clamp pulls back within `margin` of the view, or that sits
 * within `minDist` of the player, uses the opposite side of the ring instead.
 * One input value, so callers draw a fixed RNG count.
 */
export function offscreenPoint(
  u: number,
  player: Vector2,
  view: ViewRect,
  arena: { w: number; h: number },
  margin: number,
  inset: number,
  minDist: number
): Vector2 {
  const x0 = view.x - margin;
  const y0 = view.y - margin;
  const w = view.width + 2 * margin;
  const h = view.height + 2 * margin;
  const per = 2 * (w + h);
  for (const t of [u * per, u * per + per / 2]) {
    const r = rectWalk(x0, y0, w, h, t);
    const p = {
      x: Math.min(Math.max(r.x, inset), arena.w - inset),
      y: Math.min(Math.max(r.y, inset), arena.h - inset),
    };
    const off = p.x <= x0 || p.x >= x0 + w || p.y <= y0 || p.y >= y0 + h;
    if (off && Math.hypot(p.x - player.x, p.y - player.y) >= minDist) return p;
  }
  // ponytail: unreachable on the 1600x1200 map (tested); edgePoint may land on-screen in odd arena sizes
  return edgePoint(u, player, arena.w, arena.h, inset, minDist);
}
