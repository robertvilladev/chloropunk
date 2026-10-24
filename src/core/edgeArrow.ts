import type { Vector2 } from "@/types";
import type { ViewRect } from "./waves";

/**
 * Screen-edge arrow for a world point outside the camera view (arena addendum
 * §2.3): the nearest screen point `inset` px in from the edge, in screen px
 * (view-relative; the HUD's 800x600 design space matches the view 1:1), and
 * the angle from the screen centre to the target. Null when the target is visible.
 */
export function edgeArrow(target: Vector2, view: ViewRect, inset: number): { x: number; y: number; angle: number } | null {
  const sx = target.x - view.x;
  const sy = target.y - view.y;
  if (sx >= 0 && sx <= view.width && sy >= 0 && sy <= view.height) return null;
  return {
    x: Math.min(Math.max(sx, inset), view.width - inset),
    y: Math.min(Math.max(sy, inset), view.height - inset),
    angle: Math.atan2(sy - view.height / 2, sx - view.width / 2),
  };
}
