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

/** Events with from < time <= to (from === 0 also includes time 0). */
export function dueEvents(
  schedule: SpawnEvent[],
  from: number,
  to: number
): SpawnEvent[] {
  return schedule.filter(
    (e) => (e.time > from || (from === 0 && e.time === 0)) && e.time <= to
  );
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
