# Veggie Vendetta — Roadmap to MVP

**MVP =** a full run of 10 waves ending in a boss, with build-crafting choices (level-ups, shop) and readable, punchy feedback in a coherent cyberpunk pixel-art look.
Binding source of intent: [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md). Plans: [`docs/superpowers/plans/`](docs/superpowers/plans/).

Status: ✅ done · 🚧 in progress · ⬜ planned. "(proposed)" = inferred by us, not named in the spec.

| Milestone | Status | Plan |
|---|---|---|
| M1 Waves & feel | ✅ done — merged in PR #14 | [M1 plan](docs/superpowers/plans/2026-10-18-m1-waves-and-feel.md) |
| M2 Build-crafting | 🚧 in review — branch `feat/m2-build-crafting` | [M2 plan](docs/superpowers/plans/2026-10-18-m2-build-crafting.md) |
| M3 Look | ⬜ planned — mockups approved 2026-10-18; plan awaiting owner review | [M3 plan](docs/superpowers/plans/2026-10-18-m3-look.md) |
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

## M2 — Build-crafting 🚧 (in review)
Spec: [§4 steps 1, 4, 5; §5 stats/weapons/items](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md)

- ✅ `computeStats(run)` pure stat block (HP, regen, armor, dodge, speed, damage types, attack speed, crit, range, pickup radius, luck, harvesting) — `src/core/stats.ts`
- ✅ `items.json`, 15 passive items with trade-offs
- ✅ 6 weapon behaviours (projectile, spread, beam, melee-arc, orbital/drone, explosive), tiers 1–4, 6 weapon slots — `weapons.json`, `WeaponManager`
- ✅ Level-up picks: 1 of 4 random stat upgrades, rarity-weighted, paid reroll, resolved after the wave — `LevelUpScene`, `upgrades.json`
- ✅ Shop: 4 weighted offers, escalating reroll cost, lock, sell, weapon merge rules, stat previews, keyboard + mouse
- ✅ Loadout pick: 1 of 3 starting weapons
- ✅ Unit tests for stats, shop rolls, rerolls, merging, weapon damage
- ✅ M1 perf/feel/seed carry-overs (dash lock, tomato farming, fixed spawn draws, pooled bursts)
- ⬜ Balance pass by playtest (see carry-overs)

## M3 — Look ⬜
Spec: [§6 look and feel, §7 screens](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md). Mockups approved ([copies](docs/superpowers/specs/mockups/README.md)). Owner scope: fighter + 5 enemies get 2-frame walk + hit frame, pickups get sprites, no weapon/item icons, plain graphite floor, **SFX moved to M4**.

- ✅ Sprite-grid pipeline: grids in `src/art/`, baked to textures at boot (`textures.ts`); fighter, 5 enemies and scrap on screen with walk/hit frames
- ✅ 3/4 y-sorted depth (`core/depth.ts` `actorDepth`, bands in `DEPTH`): actors in [40, 50), projectiles 60, FX 70, numbers 90
- ⬜ Soft shadows, neon glow FX
- ⬜ "Chlorophyll" `theme.ts` applied to every screen (Menu, Shop, Victory, UIScene still hardcode colours); fonts Bungee / IBM Plex Mono / VT323
- ⬜ HUD, level-up, shop, loadout and menu screens per the mockups; stat previews on hover; mouse + keyboard

## M4 — Boss & run end ⬜
Spec: [§4 steps 2, 6; §5 enemies; §7 screens](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md)

- ⬜ Wave 10 boss: no timer, 2–3 attack patterns, reduced-rate regular spawns as support
- ⬜ Victory / defeat run summary (wave reached, kills, damage dealt, build) with "one more run"; replaces the "RUN COMPLETE" stopgap
- ⬜ Pause menu (resume, settings, quit run) and settings (volume, screen-shake toggle — the shake toggle exists, volume does not)
- ⬜ Best-wave high-score record
- ⬜ A few SFX (moved from M3 by the owner; spec: "audio beyond a few SFX" is a non-goal)
- ⬜ Final README pass

## Carry-overs / known issues
From the [M1 outcome](docs/superpowers/plans/2026-10-18-m1-waves-and-feel.md) and the [M2 outcome](docs/superpowers/plans/2026-10-18-m2-build-crafting.md):

- **Balance:** economy untested by a human; a standing pistol earns ~8 scrap in wave 1 vs first-shop prices 11–22. Tune in JSON after a playtest.
- **Perf:** fps with 6 weapons measured only by frame-time proxy (≈1 ms/frame at 150 enemies); confirm with F3 in a visible window.
- **Feel:** no enemy-to-enemy separation
- **Weapons (M2 review):** drone hit map is keyed by pooled enemy sprites (a recycled enemy can be drone-immune ≤0.5 s); weapon textures and the starter list are hardcoded in `BootScene`/`LoadoutScene` (move colour + `starter` into `weapons.json`); the pierce path is unused (no weapon has `pierce > 0`)
- **Input:** `ShopScene` captures Tab/Space globally and never releases them
- **Robustness:** `rng.int` unguarded for max<min; `buildSpawnSchedule` hangs if `every<=0`
- **Dev only:** F3 isn't captured (opens browser find); `debugSpawn` draws from the spawn RNG
- **M3:** hardcoded colours outside `theme.ts` (Menu, Victory, GameOver, UIScene); shop / level-up / loadout are placeholder layouts; wave-1 banner can show a fallback font before Google Fonts loads
- **M4:** Victory → GameOver "RUN COMPLETE" is a stopgap
- **(proposed)** `vite.config.ts` still defines aliases for the non-existent `@ecs` and `@ui` folders
- **(proposed)** `STRUCTURE.md`, `PROJECT_SUMMARY.md` and `QUICKSTART.md` describe the old prototype (ShopScene "display upgrades", 3 weapons); fold into README/ARCHITECTURE or delete

## Ideas parking lot (post-MVP)
Named by the spec as non-goals / later:

- Multiple playable characters (data model should allow it)
- Meta-progression and unlocks; save files beyond a high score
- Mobile/touch controls, gamepad, localization
- Audio beyond a few SFX
- Online features: leaderboards, accounts
- Endless mode, difficulty tiers
- Swapping Claude-authored sprites for sheets from a pixel-art generator (PixelLab, Retro Diffusion) or an artist — no code change needed, sprites are used by key
