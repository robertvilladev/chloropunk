/** Per-sound limits: at most `max` copies playing at once, starts at least `gapMs` apart. */
export interface VoiceRule {
  max: number;
  gapMs: number;
}

/** Decides whether a sound may start now, so 40 kills on one frame don't play 40 copies. */
export class VoiceLimiter {
  private voices = new Map<string, { last: number; ends: number[] }>();

  /** Returns true (and records the voice) if `key` may start at `now` and play for `durMs`. */
  tryStart(key: string, rule: VoiceRule, now: number, durMs: number): boolean {
    let v = this.voices.get(key);
    if (!v) this.voices.set(key, (v = { last: -Infinity, ends: [] }));
    v.ends = v.ends.filter((e) => e > now);
    if (v.ends.length >= rule.max || now - v.last < rule.gapMs) return false;
    v.last = now;
    v.ends.push(now + durMs);
    return true;
  }
}

/** `base` scaled by a random factor in [1-amount, 1+amount]. */
export function vary(base: number, amount: number, rand: () => number = Math.random): number {
  return base * (1 + (rand() * 2 - 1) * amount);
}

/** Playback rate for the n-th pickup in a quick streak: up a semitone each, capped at an octave. */
export function streakRate(n: number): number {
  return 2 ** (Math.min(n, 12) / 12);
}
