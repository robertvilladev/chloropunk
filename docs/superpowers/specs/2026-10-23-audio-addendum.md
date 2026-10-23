# Chloropunk — Audio addendum

Date: 2026-10-23 · Status: owner decision · Amends: [MVP spec §2](2026-10-18-mvp-roguelike-design.md#2-goals-non-goals-anti-goals) ("audio beyond a few SFX" stays a non-goal; this addendum names what "a few SFX" are)

## Decision (owner, 2026-10-23)

1. **SFX are in scope now** (they were parked after M3). They are procedural, made with [ZzFX](https://github.com/KilledByAPixel/ZzFX) (MIT, ~1 KB of code). There are no audio files to license or load.
2. **Music:** 2 free-licence cyberpunk/synthwave loops picked by the owner (CC-BY 4.0, see Music below). Each track's source, author and licence is in `assets/audio/CREDITS.md`. Master and music volume settings come with it.

## SFX scope

About 10 events, in a glitchy/digital/bitcrushed cyberpunk style. No weapon-fire sound, because guns fire constantly and would drown everything else.

| Event | Where it fires |
|---|---|
| Enemy hit, enemy death, player hurt, low-HP warning, rocket blast, wave start / wave cleared | `Juice` (all hit/kill feedback) |
| Scrap pickup (pitch rises on quick streaks) | `PickupManager` |
| Level up | `LevelUpScene` |
| Shop buy (deny on not enough scrap) | `ShopScene` |
| UI move / confirm / back | `ui.ts` `button()` / `onKeys()` |
| Game over / run complete | `GameOverScene` |

## Rules

- **One AudioContext.** SFX play through Phaser's own (`this.sound.context`) into Phaser's master output. Phaser's autoplay unlock, mute and blur handling therefore apply to SFX and, later, to music.
- **Voice limiting.** Each sound has a cap on how many copies play at once and a minimum gap between repeats. 40 enemies dying on one frame then sound like a crunch, not a wall of noise.
- **Variation.** Each play gets about ±6% random pitch and ±10% volume, so repeats don't sound robotic. This uses `Math.random`, never the seeded run RNG, so seeds stay deterministic.
- **Setting.** The pause menu has an SFX volume setting (0–100% in 20% steps, saved with the other settings). A scene pause freezes gameplay SFX; window blur suspends the AudioContext.
- **Readability.** The same rule as visual FX: sounds must not mask each other. Hits are quiet and short, and big events (wave, level up, death) are louder and rarer.

## Music (owner approved 2026-10-23)

Two CC-BY 4.0 tracks, picked by the owner (licences checked 2026-10-23; full attribution goes in `assets/audio/CREDITS.md` and in the game):

| Track | Author | Source | Length | Proposed use |
|---|---|---|---|---|
| "Cyberpunk/Synthwave project track" (WIP) | NLV | [OGA](https://opengameart.org/content/cyberpunksynthwave-project-track) | 4:42 WAV (music ends ~4:31, silence after ~4:36) | Menu + Loadout |
| "06-06-19 Synthwave" | Spring | [OGA](https://opengameart.org/content/06-06-19-synthwave) | 5:22 OGG | Waves, level-up, shop |

Rules (the owner took every recommendation in the [music plan](../plans/2026-10-23-music.md#open-questions-for-the-owner)):

- **Mixer.** Master = Phaser's own `sound.volume`; a music bus and the existing SFX bus are gain nodes under it. Each has a 0–100% setting (20% steps) in Pause → Settings.
- **One track at a time.** Changing state crossfades (~1.5 s). Requesting the track that's already playing does nothing, so scene restarts can't stack copies.
- **Ducking.** Pause, game over and victory overlays lower music to ~30%; resuming restores it.
- **Streaming, not decoding.** Music plays from an `<audio>` element routed into Phaser's AudioContext (`createMediaElementSource`), so a 5-minute track isn't decoded into ~120 MB of RAM and startup isn't blocked. It still goes through Phaser's master gain, unlock and blur suspend.
- **Loops.** Neither track is a seamless loop. Trailing silence is trimmed and a short fade baked in at the end, so a loop sounds like the song restarting.
- **Format.** OGG Vorbis only (Safari 18.4+ plays Ogg); older Safari just gets no music.
