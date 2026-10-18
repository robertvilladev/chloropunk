import type { Vector2 } from "@/types";

/** Closest element of `list` within `range` of `from`, or null. */
export function nearestInRange<T extends Vector2>(
  from: Vector2,
  range: number,
  list: readonly T[]
): T | null {
  let best: T | null = null;
  let bestD2 = range * range;
  for (let i = 0; i < list.length; i++) {
    const dx = list[i].x - from.x;
    const dy = list[i].y - from.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) {
      bestD2 = d2;
      best = list[i];
    }
  }
  return best;
}

/** Where weapon `index` of `count` sits around the player. */
export function slotOffset(index: number, count: number, radius = 28): Vector2 {
  const a = (index / count) * Math.PI * 2;
  return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
}

/** Pellet angles (radians) centred on `base`, evenly over `spreadDeg`. */
export function spreadAngles(base: number, pellets: number, spreadDeg: number, out: number[]): number[] {
  out.length = 0;
  if (pellets <= 1) {
    out.push(base);
    return out;
  }
  const spread = (spreadDeg * Math.PI) / 180;
  for (let i = 0; i < pellets; i++) out.push(base - spread / 2 + (spread * i) / (pellets - 1));
  return out;
}

/** Is `p` within `range` of `origin` and within ±arcDeg/2 of `facing`? */
export function inArc(origin: Vector2, facing: number, arcDeg: number, range: number, p: Vector2): boolean {
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  if (dx * dx + dy * dy > range * range) return false;
  let d = Math.atan2(dy, dx) - facing;
  d = Math.atan2(Math.sin(d), Math.cos(d)); // wrap to [-π, π]
  return Math.abs(d) <= ((arcDeg / 2) * Math.PI) / 180;
}

/** Is `p` within `halfWidth` of the segment from `origin` along `angle` for `length`? */
export function onBeam(origin: Vector2, angle: number, length: number, halfWidth: number, p: Vector2): boolean {
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  const along = dx * Math.cos(angle) + dy * Math.sin(angle);
  if (along < 0 || along > length) return false;
  const across = -dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.abs(across) <= halfWidth;
}
