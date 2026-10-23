import type { VoiceRule } from "@/core/voices";
import type { ZzfxParams } from "./zzfx";

/**
 * Every sound effect: a ZzFX parameter array plus its voice limit.
 * Edit/audition arrays at https://killedbyapixel.github.io/ZzFX/ (paste the array).
 * Style: square/saw blips, pitch jumps and bitcrush for a glitchy digital feel.
 * Index 1 (randomness) stays 0: buffers are cached, sfx.ts varies pitch per play instead.
 *
 * [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide,
 *  deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush,
 *  delay, sustainVolume, decay, tremolo, filter]   shape: 0 sin 1 tri 2 saw 3 tan 4 noise 5 square
 */
const def = (zzfx: ZzfxParams, max = 2, gapMs = 60): { zzfx: ZzfxParams } & VoiceRule => ({ zzfx, max, gapMs });

export const SOUNDS = {
  // combat (Juice)
  hit: def([0.35, 0, 700, 0, 0.02, 0.04, 5, 1, -30, 0, 0, 0, 0, 0, 0, 0.2], 4, 30),
  kill: def([0.7, 0, 300, 0.01, 0.05, 0.18, 2, 1, -20, 0, -80, 0.03, 0, 1.5, 0, 0.5], 4, 40),
  hurt: def([1, 0, 140, 0, 0.08, 0.2, 3, 2, -5, 0, 0, 0, 0, 1, 20, 0.3, 0, 0.7], 1, 150),
  lowHp: def([0.6, 0, 880, 0, 0.25, 0.05, 5, 1, 0, 0, -300, 0.06, 0.12, 0, 0, 0.1], 1, 1000),
  blast: def([1, 0, 60, 0.01, 0.12, 0.4, 4, 1, -2, 0, 0, 0, 0, 1.8, 0, 0.6, 0, 0.5, 0.05], 3, 50),
  waveStart: def([0.8, 0, 220, 0.01, 0.25, 0.2, 5, 1, 0, 0, 110, 0.06, 0.06, 0, 0, 0.1], 1, 300),
  waveClear: def([0.8, 0, 440, 0, 0.3, 0.3, 1, 1, 0, 0, 220, 0.08, 0.08, 0, 0, 0.05, 0.1, 0.8], 1, 300),
  // economy
  pickup: def([0.4, 0, 1200, 0, 0.02, 0.06, 5, 1, 0, 0, 600, 0.02, 0, 0, 0, 0.1], 3, 35),
  levelUp: def([1, 0, 330, 0.02, 0.35, 0.3, 2, 1, 0, 0, 165, 0.07, 0.07, 0, 0, 0.08, 0.12, 0.8], 1, 300),
  buy: def([0.7, 0, 600, 0, 0.04, 0.12, 5, 1, 0, 0, 600, 0.04, 0, 0, 0, 0.15]),
  deny: def([0.6, 0, 150, 0, 0.08, 0.08, 5, 1, 0, 0, -50, 0.04, 0, 0, 0, 0.3]),
  // menus
  uiMove: def([0.25, 0, 1500, 0, 0.005, 0.02, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0.1], 1, 40),
  uiConfirm: def([0.4, 0, 800, 0, 0.02, 0.06, 5, 1, 0, 0, 400, 0.03, 0, 0, 0, 0.1]),
  uiBack: def([0.4, 0, 600, 0, 0.02, 0.06, 5, 1, 0, 0, -250, 0.03, 0, 0, 0, 0.1]),
  // run end
  gameOver: def([1, 0, 300, 0.02, 0.6, 0.6, 2, 1, -1.5, 0, 0, 0, 0.15, 0.5, 0, 0.4, 0, 0.7, 0, 0.3], 1, 500),
  runComplete: def([1, 0, 262, 0.02, 0.6, 0.5, 5, 1, 0, 0, 131, 0.1, 0.1, 0, 0, 0.05, 0.15, 0.8], 1, 500),
};

export type SoundName = keyof typeof SOUNDS;
