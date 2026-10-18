/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return (level + 3) ** 2;
}

/** Add XP, carrying overflow across as many levels as it covers. */
export function addXp(
  state: { level: number; xp: number },
  amount: number
): { level: number; xp: number; levelsGained: number } {
  let { level, xp } = state;
  xp += amount;
  let levelsGained = 0;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level++;
    levelsGained++;
  }
  return { level, xp, levelsGained };
}
