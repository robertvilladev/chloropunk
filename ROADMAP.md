# Veggie Vendetta — Roadmap to MVP

**MVP =** a full run of 10 waves ending in a boss, with build-crafting choices (level-ups, shop) and readable, punchy feedback in a coherent cyberpunk pixel-art look.
Binding source of intent: [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md). Plans: [`docs/superpowers/plans/`](docs/superpowers/plans/).

Status: ✅ done · 🚧 in progress · ⬜ planned. "(proposed)" = inferred by us, not named in the spec.

| Milestone | Status | Plan |
|---|---|---|
| M1 Waves & feel | ✅ done — merged in PR #14 | [M1 plan](docs/superpowers/plans/2026-10-18-m1-waves-and-feel.md) |
| M2 Build-crafting | 🚧 planning | M2 plan (being written in `docs/superpowers/plans/`) |
| M3 Look | ⬜ planned (UI work waits for owner review of the mockups) | not written |
| M4 Boss & run end | ⬜ planned | not written |

## M1 — Waves & feel ✅
Spec: [§4 run loop, §5 systems](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md)

- ✅ 5 vegetable enemies with behaviours (chaser, dasher, tank, shooter, exploder) — `assets/data/enemies.json`
- ✅ 10 data-driven waves, duration `20 + 4·(n−1)` s capped at 60 — `assets/data/waves.json`, `src/core/waves.ts`
- ✅ Pooled spawning with telegraph markers; holds 60 fps with 150 enemies
- ✅ Scrap + XP drops, pickup magnet, auto-collect at wave end, XP curve and levels (`src/core/progression.ts`)
- ✅ Seeded RNG (`src/core/rng.ts`)
- ✅ Juice: damage numbers, hit flash, knockback, screen shake, death bursts, low-HP vignette, wave banners, reduced-shake setting
- ✅ Cleanup: dead files and deps removed, `theme.ts` tokens, CI green

## M2 — Build-crafting 🚧 (planning)
Spec: [§4 steps 1, 4, 5; §5 stats/weapons/items](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md)

- ⬜ `computeStats(run)` pure stat block (HP, regen, armor, dodge, speed, damage types, attack speed, crit, range, pickup radius, luck, harvesting)
- ⬜ `items.json`, ~15 passive items with trade-offs
- ⬜ 6 weapon behaviours (projectile, spread, beam, melee-arc, orbital/drone, explosive), tiers 1–4, 6 weapon slots (today: 3 prototype weapons, 1 equipped)
- ⬜ Level-up picks: 1 of 4 random stat upgrades, rarity-weighted, paid reroll, resolved after the wave (levels are tracked today, picks are not)
- ⬜ Shop: 4 weighted offers, escalating reroll cost, lock, sell, weapon merge rules (today: 3 fixed upgrades)
- ⬜ Loadout pick: 1 of 3 starting weapons
- ⬜ Unit tests for stats, shop rolls, rerolls, merging, damage calc (spec §8; wave scaling is already tested)
- ⬜ M1 perf/feel/seed/robustness carry-overs (below)

## M3 — Look ⬜
Spec: [§6 look and feel, §7 screens](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md). UI tasks wait for owner review of the mockups.

- ⬜ Sprite-grid pipeline: Claude-authored pixel data → textures at boot, sprites referenced by key only (start from `docs/superpowers/specs/sprite-grids.py`)
- ⬜ Replace placeholder shapes (generated in `BootScene`) with sprites; 3/4 y-sorting, soft shadows, neon glow FX
- ⬜ "Chlorophyll" `theme.ts` applied to every screen (Menu, Shop, Victory, UIScene still hardcode colours); fonts Bungee / IBM Plex Mono / VT323
- ⬜ HUD, level-up, shop, loadout and menu screens per the mockups; stat previews on hover; mouse + keyboard
- ⬜ A few SFX (spec: "audio beyond a few SFX" is a non-goal)

## M4 — Boss & run end ⬜
Spec: [§4 steps 2, 6; §5 enemies; §7 screens](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md)

- ⬜ Wave 10 boss: no timer, 2–3 attack patterns, reduced-rate regular spawns as support
- ⬜ Victory / defeat run summary (wave reached, kills, damage dealt, build) with "one more run"; replaces the "RUN COMPLETE" stopgap
- ⬜ Pause menu (resume, settings, quit run) and settings (volume, screen-shake toggle — the shake toggle exists, volume does not)
- ⬜ Best-wave high-score record
- ⬜ Final README pass

## Carry-overs / known issues
From the [M1 outcome](docs/superpowers/plans/2026-10-18-m1-waves-and-feel.md) (deferred to M2 unless noted):

- **Perf:** pool death-burst particles (8 rectangles + 8 tweens per kill); cache enemy colour per def; `getPosition()` allocates 3×/frame; `damageNumber` re-renders text 3×/hit
- **Feel:** pepper dash re-aims every frame (lock direction at dash start); tomato touched during i-frames gives free kills and scrap; no enemy-to-enemy separation
- **Seed:** `pickEdgePoint` draws a variable number of RNG values, so spawns depend on player movement
- **Robustness:** `rng.int`/`pick` unguarded for max<min / empty array; `buildSpawnSchedule` hangs if `every<=0`; spawns can land within 160 px after 10 retries
- **Dev only:** F3 isn't captured (opens browser find); `debugSpawn` draws from the spawn RNG
- **M3:** hardcoded colours outside `theme.ts`; wave-1 banner can show a fallback font before Google Fonts loads; vignette is flat in Canvas mode; death bursts may render under actors
- **M4:** Victory → GameOver "RUN COMPLETE" is a stopgap
- **(proposed)** `vite.config.ts` still defines aliases for the non-existent `@ecs` and `@ui` folders

## Ideas parking lot (post-MVP)
Named by the spec as non-goals / later:

- Multiple playable characters (data model should allow it)
- Meta-progression and unlocks; save files beyond a high score
- Mobile/touch controls, gamepad, localization
- Audio beyond a few SFX
- Online features: leaderboards, accounts
- Endless mode, difficulty tiers
- Swapping Claude-authored sprites for sheets from a pixel-art generator (PixelLab, Retro Diffusion) or an artist — no code change needed, sprites are used by key
