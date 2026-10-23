import nlvUrl from "@assets/audio/nlv-cyberpunk.ogg";
import springUrl from "@assets/audio/spring-synthwave.ogg";
import { FADE_S, trackGains, type MusicState, type TrackId } from "@/core/music";
import { loadSettings } from "@/core/settings";
import Phaser from "phaser";

/** Per-track loudness trim, so both sit at the same level (NLV measured ~2.5 dB hotter). */
const TRIM: Record<TrackId, number> = { nlv: 0.75, spring: 1 };
const SRC: Record<TrackId, string> = { nlv: nlvUrl, spring: springUrl };

/** CC-BY 4.0 attribution, shown on MenuScene's credits overlay (also in assets/audio/CREDITS.md). */
export const MUSIC_CREDITS = [
  {
    line: '"Cyberpunk/Synthwave project track" by NLV',
    source: "opengameart.org/content/cyberpunksynthwave-project-track",
    changes: "Trimmed trailing silence, 2 s fade-out, re-encoded to OGG",
  },
  {
    line: '"06-06-19 Synthwave" by Spring',
    source: "opengameart.org/content/06-06-19-synthwave",
    changes: "Unmodified",
  },
];
export const MUSIC_LICENCE = "Licensed CC-BY 4.0 · creativecommons.org/licenses/by/4.0/";

interface Voice {
  el: HTMLAudioElement;
  gain: GainNode;
  stopTimer?: number;
}

let ctx: AudioContext | undefined;
let bus: GainNode | undefined;
const voices = new Map<TrackId, Voice>(); // one <audio> per track, ever: copies can't stack
let state: MusicState | undefined;
let ducked = false;
let blurred = false;

/**
 * Music bus on Phaser's AudioContext (call once, at boot, next to initSfx).
 * Tracks stream from <audio> elements routed into the context, so they go
 * through Phaser's master volume/mute and nothing is decoded up front.
 */
export function initMusic(sound: Phaser.Sound.BaseSoundManager): void {
  if (!(sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
  ctx = sound.context;
  bus = ctx.createGain();
  bus.connect(sound.destination);
  setMusicVolume(loadSettings().musicVolume);
  // Autoplay lock: play() is refused until the first click/key; retry once Phaser unlocks
  sound.once(Phaser.Sound.Events.UNLOCKED, apply);
  // Match SFX: Phaser suspends the context on blur; pause the elements too so they don't run on silently
  sound.game.events.on(Phaser.Core.Events.BLUR, () => ((blurred = true), apply()));
  sound.game.events.on(Phaser.Core.Events.FOCUS, () => ((blurred = false), apply()));
}

export function setMusicVolume(v: number): void {
  if (bus) bus.gain.value = v;
}

/** Crossfade to the state's track; also lifts any duck. Same state again is a no-op. */
export function setMusic(next: MusicState): void {
  state = next;
  ducked = false;
  apply();
}

/** Lower (or restore) the current track under an overlay. */
export function duckMusic(on: boolean): void {
  ducked = on;
  apply();
}

function voice(id: TrackId): Voice {
  let v = voices.get(id);
  if (!v) {
    const el = new Audio(SRC[id]);
    el.loop = true;
    el.preload = "auto";
    const gain = ctx!.createGain();
    gain.gain.value = 0;
    ctx!.createMediaElementSource(el).connect(gain).connect(bus!);
    v = { el, gain };
    voices.set(id, v);
  }
  return v;
}

function apply(): void {
  if (!ctx || !bus) return;
  const now = ctx.currentTime;
  const targets = trackGains(state, ducked, TRIM);
  for (const id of Object.keys(targets) as TrackId[]) {
    const target = targets[id];
    if (target === 0 && !voices.has(id)) continue; // never loaded, nothing to fade
    const v = voice(id);
    const g = v.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(target, now + FADE_S);
    clearTimeout(v.stopTimer);
    if (target > 0 && !blurred) {
      // Rejected while still locked (or not loaded yet); the UNLOCKED retry or the next state change plays it
      if (v.el.paused) v.el.play().catch(() => {});
    } else if (blurred) {
      v.el.pause();
    } else {
      // Faded out: stop after the ramp and rewind, so the track restarts from its top next time
      v.stopTimer = window.setTimeout(() => {
        v.el.pause();
        v.el.currentTime = 0;
      }, FADE_S * 1000);
    }
  }
}
