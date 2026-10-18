import { ACTORS } from "./actors";
import { gridBounds } from "./grid";

export const PIXEL = 3;
/** 16x3 wide; the extra 6 px of height holds the baked shadow. */
export const ACTOR_FRAME = { w: 48, h: 54 };
/** Row (frame px) just below the lowest opaque row of every frame. */
export const FEET_Y = 48;

/** Frame y of a grid's first row once its lowest opaque row sits at FEET_Y - 1. */
export const gridTop = (y1: number): number => FEET_Y - (y1 + 1) * PIXEL;

const find = (key: string) => {
  const a = ACTORS.find((t) => t.key === key);
  if (!a) throw new Error(`unknown actor ${key}`);
  return a;
};

/** Whole-px x shift that centres walk0's opaque bounds on the frame (applied to all three frames). */
export function actorShiftX(key: string): number {
  const b = gridBounds(find(key).walk0);
  return Math.round(ACTOR_FRAME.w / 2 - ((b.x0 + b.x1 + 1) * PIXEL) / 2);
}

/** `setCircle(radius, x, y)` offset that centres the circle on the opaque bounds of walk0. */
export function bodyOffset(key: string, radius: number): { x: number; y: number } {
  const b = gridBounds(find(key).walk0);
  const cx = ((b.x0 + b.x1 + 1) * PIXEL) / 2 + actorShiftX(key);
  const cy = gridTop(b.y1) + ((b.y0 + b.y1 + 1) * PIXEL) / 2;
  return { x: Math.floor(cx - radius), y: Math.round(cy - radius) };
}
