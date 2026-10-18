import type { SpawnEvent, Vector2, WaveDef } from "@/types";

export function waveDuration(wave: number): number {
  return Math.min(20 + 4 * (wave - 1), 60);
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

export function scaleEnemy(
  base: { hp: number; damage: number },
  wave: number
): { hp: number; damage: number } {
  return {
    hp: Math.round(base.hp * (1 + 0.25 * (wave - 1))),
    damage: Math.round(base.damage * (1 + 0.15 * (wave - 1))),
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
  const at = (t: number): Vector2 => {
    t = ((t % per) + per) % per;
    if (t < w) return { x: inset + t, y: inset };
    if ((t -= w) < h) return { x: inset + w, y: inset + t };
    if ((t -= h) < w) return { x: inset + w - t, y: inset + h };
    return { x: inset, y: inset + h - (t - w) };
  };
  const p = at(u * per);
  if (Math.hypot(p.x - player.x, p.y - player.y) >= minDist) return p;
  return at(u * per + per / 2);
}
