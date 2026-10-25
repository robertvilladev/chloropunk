import type { VoiceRule } from "@/core/voices";
import type { ZzfxParams } from "./zzfx";

/**
 * Every sound effect: a ZzFX parameter array, its voice limit and per-play pitch spread.
 * Edit/audition arrays at https://killedbyapixel.github.io/ZzFX/ (paste the array).
 * Style: triangle/saw tones through a low-pass (negative `filter`) with light bitcrush:
 * digital and gritty, but not harsh. Menus use the same palette, quieter and shorter.
 * Index 1 (randomness) stays 0: buffers are cached, sfx.ts varies pitch per play instead.
 *
 * [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide,
 *  deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush,
 *  delay, sustainVolume, decay, tremolo, filter]   shape: 0 sin 1 tri 2 saw 3 tan 4 noise 5 square
 */
type Sound = { zzfx: ZzfxParams; pitchVar: number } & VoiceRule;
const def = (zzfx: ZzfxParams, max = 2, gapMs = 60, pitchVar = 0.06): Sound => ({ zzfx, max, gapMs, pitchVar });

export const SOUNDS = {
  // combat (Juice)
  hit: def([0.3, 0, 420, 0, 0.015, 0.05, 1, 1.5, -25, 0, 0, 0, 0, 0.3, 0, 0.05, 0, 1, 0, 0, -3000], 4, 30),
  kill: def([0.7, 0, 300, 0.01, 0.05, 0.18, 2, 1, -20, 0, -80, 0.03, 0, 1.5, 0, 0.3, 0, 1, 0, 0, -4000], 4, 40),
  hurt: def([0.8, 0, 160, 0, 0.06, 0.22, 2, 2, -6, 0, 0, 0, 0, 1.2, 0, 0.15, 0, 0.7, 0, 0, -2500], 1, 150),
  lowHp: def([0.45, 0, 660, 0, 0.25, 0.05, 1, 1, 0, 0, -200, 0.06, 0.12, 0, 0, 0, 0, 1, 0, 0, -3000], 1, 1000),
  blast: def([0.9, 0, 60, 0.01, 0.12, 0.4, 4, 1, -2, 0, 0, 0, 0, 1.8, 0, 0.4, 0, 0.5, 0.05, 0, -2500], 3, 50),
  // wave banners: a short gritty saw stab jumping up a fifth, with a slap echo (louder/higher each wave)
  waveStart: def([0.7, 0, 110, 0.005, 0.12, 0.22, 2, 1, 0, 0, 55, 0.08, 0, 0.4, 0, 0.15, 0.06, 0.9, 0.03, 0, -3000], 1, 300, 0.01),
  waveClear: def([0.75, 0, 147, 0.005, 0.1, 0.25, 2, 1, 0, 0, 73, 0.06, 0.12, 0.3, 0, 0.12, 0.08, 0.9, 0.03, 0, -3500], 1, 300, 0.01),
  // economy
  pickup: def([0.35, 0, 1100, 0, 0.02, 0.07, 1, 1, 0, 0, 550, 0.02, 0, 0, 0, 0, 0, 1, 0, 0, -5000], 3, 35),
  levelUp: def([0.75, 0, 330, 0.02, 0.35, 0.3, 2, 1, 0, 0, 165, 0.07, 0.07, 0, 0, 0.03, 0.12, 0.8, 0, 0, -4000], 1, 300),
  buy: def([0.6, 0, 520, 0, 0.04, 0.14, 2, 1, 0, 0, 520, 0.04, 0, 0, 0, 0.05, 0, 1, 0, 0, -3500]),
  // legendary (T4) pick, board U3: bright triangle chime leaping E5 -> E6, slap echo, tremolo shimmer (first pass)
  legendary: def([0.6, 0, 659, 0.01, 0.22, 0.35, 1, 1, 0, 0, 660, 0.08, 0, 0.1, 0, 0, 0.09, 0.85, 0, 0.15, -1800], 1, 300, 0.01),
  deny: def([0.5, 0, 140, 0, 0.08, 0.1, 2, 1, 0, 0, -40, 0.04, 0, 0.3, 0, 0.1, 0, 1, 0, 0, -2000]),
  // menus: same filtered saw/triangle family, hover is a barely-there tick
  uiMove: def([0.08, 0, 900, 0, 0.005, 0.025, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -3000], 1, 40, 0.03),
  uiConfirm: def([0.3, 0, 440, 0, 0.02, 0.08, 2, 1, 0, 0, 220, 0.03, 0, 0, 0, 0.05, 0, 1, 0, 0, -2500], 2, 60, 0.03),
  uiBack: def([0.25, 0, 440, 0, 0.02, 0.08, 2, 1, 0, 0, -110, 0.03, 0, 0, 0, 0.05, 0, 1, 0, 0, -2500], 2, 60, 0.03),
  // run end: game over sinks and stutters; run complete = two heavier stabs, a reward without the fanfare
  gameOver: def([1, 0, 300, 0.02, 0.6, 0.6, 2, 1, -1.5, 0, 0, 0, 0.15, 0.5, 0, 0.3, 0, 0.7, 0, 0.3, -3000], 1, 500, 0.01),
  runComplete: def([0.65, 0, 98, 0.005, 0.3, 0.35, 2, 1, 0, 0, 49, 0.15, 0.15, 0.5, 0, 0.2, 0.1, 0.9, 0.03, 0, -3500], 1, 500, 0.01),
};

export type SoundName = keyof typeof SOUNDS;

/** A legendary (T4) shop buy or level-up pick replaces its normal sound with "legendary". */
export const pickSound = (tier: number, normal: SoundName): SoundName => (tier === 4 ? "legendary" : normal);
