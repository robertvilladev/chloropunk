import type { ArenaProp, PropKind, Rect, Vector2 } from "@/types";

/** Radius kept free around the arena centre (fighter start); equals MIN_PLAYER_DIST in EnemyManager. */
export const CLEAR_RADIUS = 160;
/** Solids stay small, and leave lanes a potato (radius 20) fits through. */
export const SOLID_MAX = { w: 144, h: 96 } as const;
export const SOLID_GAP = 80;

const KINDS: readonly PropKind[] = ["vent", "sign", "pad", "puddle", "rail", "zone", "crate"];

/** Gap between two boxes (0 when they touch or overlap). */
function gap(a: Rect, b: Rect): number {
  const dx = Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

/** Problems with a decor layout; empty = valid. Props must sit inside the arena and clear of the centre circle; solids must be small and spaced. */
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
    if (!p.solid) return;
    if (p.w > SOLID_MAX.w || p.h > SOLID_MAX.h) out.push(`${id}: solid over ${SOLID_MAX.w}x${SOLID_MAX.h}`);
    if (Math.min(p.x, p.y, arena.w - p.x - p.w, arena.h - p.y - p.h) < SOLID_GAP)
      out.push(`${id}: solid within ${SOLID_GAP} px of the arena edge`);
    props.forEach((q, j) => {
      if (j > i && q.solid && gap(p, q) < SOLID_GAP) out.push(`${id}: solid within ${SOLID_GAP} px of #${j}`);
    });
  });
  return out;
}

/** The solid props' boxes. */
export function solidRects(props: readonly ArenaProp[]): Rect[] {
  return props.filter((p) => p.solid).map(({ x, y, w, h }) => ({ x, y, w, h }));
}

/**
 * `p` moved to the nearest point outside every solid grown by `pad` (unchanged when already outside).
 * ponytail: one pass; fine while solids sit >= SOLID_GAP apart and pad <= SOLID_GAP / 2.
 */
export function outsideSolids(p: Vector2, rects: readonly Rect[], pad: number): Vector2 {
  let { x, y } = p;
  for (const r of rects) {
    const l = x - (r.x - pad);
    const rt = r.x + r.w + pad - x;
    const t = y - (r.y - pad);
    const b = r.y + r.h + pad - y;
    if (l <= 0 || rt <= 0 || t <= 0 || b <= 0) continue;
    const m = Math.min(l, rt, t, b);
    if (m === l) x = r.x - pad;
    else if (m === rt) x = r.x + r.w + pad;
    else if (m === t) y = r.y - pad;
    else y = r.y + r.h + pad;
  }
  return { x, y };
}
