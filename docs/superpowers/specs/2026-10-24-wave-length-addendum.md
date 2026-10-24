# Wave length addendum (2026-10-24)

Amends [MVP spec](2026-10-18-mvp-roguelike-design.md) §4 step 2. **Owner sign-off: 2026-10-24.**

## Change

| | before | now |
|---|---|---|
| Wave *n* length | `20 + 4·(n−1)` s, capped at 60 | `32 + 2·(n−1)` s, capped at 60 |
| Waves 1 / 5 / 9 | 20 / 36 / 52 s | 32 / 40 / 48 s |
| Waves 1–9 total | 324 s | 360 s |
| Run length | 10 waves | 10 waves (unchanged; wave 10 is the untimed boss wave) |

Prices, scrap and `waves.json` are unchanged. Spawn groups already run until the wave ends, so the spawn rate (enemies/s) stays the same. Early waves get more enemies, and waves 8–9 get slightly fewer. The 60 s cap is now reached at wave 15.

## Why

The owner found rounds too short to shop and grow. Their A3b runs killed 54–77% of each wave and bought 0.61 items per wave (target 0.8–2). Wave 1 ended on 11 scrap, and the cheapest buy costs 12. In a 20 s wave, the last ~5 s of spawns are still walking in when the timer ends. Longer early waves give the owner about +32% scrap over waves 1–4 (about 18 after wave 1) without making any wave denser.

## Not done

- **Flat 45–50 s waves** (the owner's first idea): in the sim, a never-shopping pistol dies in wave 3 and waves 8–9 become trivial. It would need a full re-fit of prices and growth.
- **15 waves:** parked (ROADMAP). The boss is built for wave 10.

The options, sim numbers and decision are in the [balance design §11](2026-10-20-balance-design.md#11-wave-length-pass-2026-10-24).
