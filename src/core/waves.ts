import type { SpawnEvent, WaveDef } from "@/types";

export function waveDuration(wave: number): number {
  return Math.min(20 + 4 * (wave - 1), 60);
}

export function buildSpawnSchedule(def: WaveDef): SpawnEvent[] {
  const limit = waveDuration(def.wave);
  const events: SpawnEvent[] = [];
  for (const g of def.groups) {
    const end = g.end ?? limit;
    // index-based to avoid float accumulation drift
    for (let i = 0, t = g.start; t < end; t = g.start + ++i * g.every) {
      events.push({ time: t, enemy: g.enemy, count: g.count });
    }
  }
  return events.sort((a, b) => a.time - b.time);
}

/**
 * Advance a cursor over a time-sorted schedule: returns the first index whose
 * event is not yet due (time >= elapsedS). Events fired are schedule[cursor..result).
 */
export function advanceCursor(
  schedule: SpawnEvent[],
  cursor: number,
  elapsedS: number
): number {
  while (cursor < schedule.length && schedule[cursor].time < elapsedS) cursor++;
  return cursor;
}

export function scaleEnemy(
  base: { hp: number; damage: number },
  wave: number
): { hp: number; damage: number } {
  return {
    hp: Math.round(base.hp * (1 + 0.25 * (wave - 1))),
    damage: Math.round(base.damage * (1 + 0.15 * (wave - 1))),
  };
}
