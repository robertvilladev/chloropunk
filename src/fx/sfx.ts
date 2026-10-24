import { loadSettings } from "@/core/settings";
import { VoiceLimiter, vary } from "@/core/voices";
import Phaser from "phaser";
import { SOUNDS, type SoundName } from "./sounds";
import { zzfxSamples } from "./zzfx";

const MASTER = 0.3; // ZzFX's own default master volume; the setting scales it

let ctx: AudioContext | undefined;
let out: GainNode | undefined;
const buffers = new Map<SoundName, AudioBuffer>();
const limiter = new VoiceLimiter();

/**
 * Hook SFX into Phaser's WebAudio context (call once, at boot). SFX go through
 * Phaser's master/mute nodes, so its autoplay unlock, mute and blur-suspend apply.
 * No WebAudio (HTML5/NoAudio sound manager) → every sfx() call is a no-op.
 */
export function initSfx(sound: Phaser.Sound.BaseSoundManager): void {
  if (!(sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
  ctx = sound.context;
  out = ctx.createGain();
  out.connect(sound.destination);
  setSfxVolume(loadSettings().sfxVolume);
}

export function setSfxVolume(v: number): void {
  if (out) out.gain.value = MASTER * v;
}

/** Play a sound with a little random pitch/volume; `rate` shifts pitch (pickup streaks), `gain` scales volume. */
export function sfx(name: SoundName, rate = 1, gain = 1): void {
  // Still locked (no click/key yet) or suspended on blur: drop it rather than queue a burst
  if (!ctx || !out || ctx.state !== "running") return;
  const s = SOUNDS[name];
  let buf = buffers.get(name);
  if (!buf) {
    const samples = zzfxSamples(ctx.sampleRate, s.zzfx);
    buf = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buf.copyToChannel(samples, 0);
    buffers.set(name, buf);
  }
  const r = vary(rate, s.pitchVar);
  if (!limiter.tryStart(name, s, ctx.currentTime * 1000, (buf.duration * 1000) / r)) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = r;
  const g = ctx.createGain();
  g.gain.value = vary(gain, 0.1);
  src.connect(g).connect(out);
  src.start();
}
