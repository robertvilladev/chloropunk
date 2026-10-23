# Chloropunk — Audio addendum

Date: 2026-10-23 · Status: owner decision · Amends: [MVP spec §2](2026-10-18-mvp-roguelike-design.md#2-goals-non-goals-anti-goals) ("audio beyond a few SFX" stays a non-goal; this addendum names what "a few SFX" are)

## Decision (owner, 2026-10-23)

1. **SFX are in scope now** (they were parked after M3). They are procedural, made with [ZzFX](https://github.com/KilledByAPixel/ZzFX) (MIT, ~1 KB of code). There are no audio files to license or load.
2. **Music comes next, still unbuilt:** 1–2 free-licence (CC0 or similar) cyberpunk/synthwave loops picked by the owner. Each track's source, author and licence goes in `assets/audio/CREDITS.md` when it lands. A music volume setting comes with it.

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
