import type { ArenaProp, PropKind } from "@/types";

/** Radius kept free around the arena centre (fighter start); equals MIN_PLAYER_DIST in EnemyManager. */
export const CLEAR_RADIUS = 160;

const KINDS: readonly PropKind[] = ["vent", "sign", "pad", "puddle", "rail", "zone", "crate"];

/** Problems with a decor layout; empty = valid. Props must sit inside the arena and clear of the centre circle. */
export function validateArena(props: readonly ArenaProp[], arena: { w: number; h: number }, clear: number): string[] {
  const cx = arena.w / 2;
  const cy = arena.h / 2;
  const out: string[] = [];
  props.forEach((p, i) => {
    const id = `#${i} ${p.kind}`;
    if (!KINDS.includes(p.kind)) out.push(`${id}: unknown kind`);
    if (!(p.w > 0 && p.h > 0) || p.x < 0 || p.y < 0 || p.x + p.w > arena.w || p.y + p.h > arena.h)
      out.push(`${id}: outside the ${arena.w}x${arena.h} arena`);
    const nx = Math.min(Math.max(cx, p.x), p.x + p.w);
    const ny = Math.min(Math.max(cy, p.y), p.y + p.h);
    if (Math.hypot(nx - cx, ny - cy) < clear) out.push(`${id}: inside the ${clear} px clear circle`);
  });
  return out;
}
