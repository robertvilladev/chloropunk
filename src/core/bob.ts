/** Walking squash-and-bob (board A2): one hop per walk cycle, 3 per second, full at 90 px/s and up. */
export interface Bob { sx: number; sy: number; dy: number }

const HOPS = 3; // per second
const FULL_SPEED = 90; // px/s
const LIFT = 3; // design px at the top of a hop
const SQUASH = 0.07;

/** `t` seconds (any clock), `speed` px/s. dy < 0 is up; sx * sy = 1 keeps the volume. */
export function bob(t: number, speed: number): Bob {
  const k = Math.min(1, speed / FULL_SPEED);
  if (k <= 0) return { sx: 1, sy: 1, dy: 0 };
  const p = (t * HOPS) % 1;
  const sy = 1 - SQUASH * k * Math.cos(2 * Math.PI * p);
  return { sx: 1 / sy, sy, dy: -LIFT * k * Math.sin(Math.PI * p) };
}

const easeOut = (x: number) => 1 - (1 - x) * (1 - x);

/** Spawn pop-in, `age` s after the telegraph ends: 0.2 -> 1.15 fading in over 120 ms, settle to 1 by 200 ms. */
export function popIn(age: number): { scale: number; alpha: number } {
  if (age >= 0.2) return { scale: 1, alpha: 1 };
  if (age >= 0.12) return { scale: 1.15 - 0.15 * easeOut((age - 0.12) / 0.08), alpha: 1 };
  const e = easeOut(age / 0.12);
  return { scale: 0.2 + 0.95 * e, alpha: age > 0 ? Math.min(1, e) : 0 };
}
