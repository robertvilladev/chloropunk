import type { Rng } from "./rng";

/** Test helper: an Rng that replays `values` (cycling) and counts draws. */
export function seqRng(...values: number[]): Rng & { draws: number } {
  let i = 0;
  const r = {
    draws: 0,
    next(): number {
      r.draws++;
      return values[i++ % values.length];
    },
    int: (min: number, max: number) => min + Math.floor(r.next() * (max - min + 1)),
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(r.next() * items.length)];
    },
  };
  return r;
}
