/** Move a keyboard selection by `dir` (+1/-1) through `count` items, wrapping at the ends. */
export function stepIndex(i: number, count: number, dir: 1 | -1): number {
  return (i + dir + count) % count;
}
