import type { AimTally, RunState } from "@/types";

export function newRun(seed: number, weaponId: string): RunState {
  return {
    wave: 1,
    scrap: 0,
    xp: 0,
    level: 1,
    pendingLevelUps: 0,
    seed,
    aim: { shots: 0, hits: 0, kills: 0 },
    weapons: [{ id: weaponId, tier: 1 }],
    items: [],
    levelMods: {},
    lockedOffers: [],
  };
}

/** One log line per run, to recalibrate the sim's `aim` (balance design §7, §9). */
export function aimReport(t: AimTally, wave: number): string {
  const pct = (n: number) => (t.shots > 0 ? `${Math.round((100 * n) / t.shots)}%` : "n/a");
  return `[balance] run ended wave ${wave}: ${t.shots} attacks, ${t.hits} landed (${pct(t.hits)}), ${t.kills} kills (${pct(t.kills)} of attacks)`;
}
