import type { RunState } from "@/types";

export function newRun(seed: number, weaponId: string): RunState {
  return {
    wave: 1,
    scrap: 0,
    xp: 0,
    level: 1,
    pendingLevelUps: 0,
    seed,
    weapons: [{ id: weaponId, tier: 1 }],
    items: [],
    levelMods: {},
    lockedOffers: [],
  };
}
