import type { Rng } from "./rng";

/** Three looks, one fight (addendum §3): each run picks one. */
export const BOSS_SKINS = ["harvester", "onion", "greenhouse"] as const;
export type BossSkin = (typeof BOSS_SKINS)[number];

export const BOSS_NAMES: Record<BossSkin, string> = {
  harvester: "HARVESTER-9",
  onion: "THE ONION KING",
  greenhouse: "THE GREENHOUSE",
};

/** Texture key; frames idle0 idle1 hit volley charge lob. */
export const bossKey = (skin: BossSkin) => `boss_${skin}` as const;

/** Pass a stream of the run seed (like combatRng) so the same seed meets the same boss. */
export const pickBossSkin = (rng: Rng): BossSkin => rng.pick(BOSS_SKINS);
