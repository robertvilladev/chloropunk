/** Which music plays when, and the volume maths behind the mixer (fx/music.ts plays it). */
export type MusicState = "menu" | "game";
export type TrackId = "nlv" | "spring";

export const TRACK_FOR: Record<MusicState, TrackId> = { menu: "nlv", game: "spring" };
/** Music level under an overlay (pause, round complete, game over). */
export const DUCK = 0.3;
/** Crossfade / duck ramp length, seconds. */
export const FADE_S = 1.5;

/** Target gain per track: the state's track at its loudness trim (× DUCK if ducked), the rest silent. */
export function trackGains(
  state: MusicState | undefined,
  ducked: boolean,
  trim: Record<TrackId, number>
): Record<TrackId, number> {
  const on = state && TRACK_FOR[state];
  const k = ducked ? DUCK : 1;
  return { nlv: on === "nlv" ? trim.nlv * k : 0, spring: on === "spring" ? trim.spring * k : 0 };
}

/** Settings volume row: 0% → 100% in 20% steps, wrapping. */
export function nextVolume(v: number): number {
  return v >= 0.99 ? 0 : Math.min(1, Math.round(v * 5 + 1) / 5);
}
