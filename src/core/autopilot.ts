/**
 * Dev autopilot: a reproducible "moving player" for calibrating the sim
 * (balance design §3). Kites by circle-strafing away from nearby enemies,
 * bends toward the arena centre near walls, and grabs scrap when no enemy is close.
 * ponytail: naive potential field, no pathing; corners can still pin it in dense waves.
 */
type P = { x: number; y: number };

const DANGER = 220; // px: enemies inside this push the player
const SAFE = 140; // px: nearest enemy farther than this = safe to collect scrap
const WALL = 120; // px from an edge where the centre pull starts

/** Unit move vector (or 0,0 to stand still) for the player at `p`. */
export function autopilot(p: P, enemies: P[], scrap: P[], w: number, h: number): P {
  let ax = 0;
  let ay = 0;
  let nearest = Infinity;
  for (const e of enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    nearest = Math.min(nearest, d);
    if (d > DANGER) continue;
    ax += dx / (d * d); // 1/d weight, on the unit direction
    ay += dy / (d * d);
  }

  const cx = w / 2 - p.x;
  const cy = h / 2 - p.y;
  const edge = Math.min(p.x, w - p.x, p.y, h - p.y);
  const pull = Math.max(0, 1 - edge / WALL) * 2;

  let mx = 0;
  let my = 0;
  if (nearest > SAFE && scrap.length > 0) {
    let best = scrap[0];
    for (const s of scrap) if (Math.hypot(s.x - p.x, s.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y)) best = s;
    mx = best.x - p.x;
    my = best.y - p.y;
  } else if (ax !== 0 || ay !== 0) {
    const a = Math.hypot(ax, ay);
    ax /= a;
    ay /= a;
    // tangent (perpendicular to "away"), turning whichever way faces the centre
    let tx = -ay;
    let ty = ax;
    if (tx * cx + ty * cy < 0) {
      tx = -tx;
      ty = -ty;
    }
    mx = ax * 0.6 + tx * 0.8;
    my = ay * 0.6 + ty * 0.8;
  }
  const c = Math.hypot(cx, cy) || 1;
  mx += (cx / c) * pull;
  my += (cy / c) * pull;

  const m = Math.hypot(mx, my);
  return m < 1e-6 ? { x: 0, y: 0 } : { x: mx / m, y: my / m };
}
