import { THEME } from "@/config/theme";
import type { Rng } from "./rng";

/** Three looks, one fight (addendum §3): each run picks one. */
export const BOSS_SKINS = ["harvester", "onion", "greenhouse"] as const;
export type BossSkin = (typeof BOSS_SKINS)[number];

export const BOSS_NAMES: Record<BossSkin, string> = {
  harvester: "HARVESTER-9",
  onion: "THE ONION KING",
  greenhouse: "THE GREENHOUSE",
};

/** Per-look art (art refresh A3): volley bolt, lobbed shot, and the colour of its phase-switch burst. */
export const BOSS_ART: Record<BossSkin, { bolt: string; lob: string; color: number }> = {
  harvester: { bolt: "bproj_round", lob: "bproj_tomato", color: THEME.tier[3] },
  onion: { bolt: "bproj_shard", lob: "bproj_bulb", color: THEME.lime },
  greenhouse: { bolt: "bproj_cbolt", lob: "bproj_tomato", color: THEME.tier[1] },
};

/** Texture key; frames idle0 idle1 hit volley charge lob. */
export const bossKey = (skin: BossSkin) => `boss_${skin}` as const;

/** Pass a stream of the run seed (like combatRng) so the same seed meets the same boss. */
export const pickBossSkin = (rng: Rng): BossSkin => rng.pick(BOSS_SKINS);
