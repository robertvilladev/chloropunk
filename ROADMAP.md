# Veggie Vendetta — Roadmap to MVP

**MVP =** a full run of 10 waves ending in a boss, with build-crafting choices (level-ups, shop) and readable, punchy feedback in a coherent cyberpunk pixel-art look.
Binding source of intent: [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md). Plans: [`docs/superpowers/plans/`](docs/superpowers/plans/).

Status: ✅ done · 🚧 in progress · ⬜ planned. "(proposed)" = inferred by us, not named in the spec.

| Milestone | Status | Plan |
|---|---|---|
| M1 Waves & feel | ✅ done — merged in PR #14 | [M1 plan](docs/superpowers/plans/2026-10-18-m1-waves-and-feel.md) |
| M2 Build-crafting | ✅ done — merged in PR #16 | [M2 plan](docs/superpowers/plans/2026-10-18-m2-build-crafting.md) |
| M3 Look | ✅ done — merged in PR #17 | [M3 plan](docs/superpowers/plans/2026-10-18-m3-look.md) |
| Balance & progression | ✅ applied, in review as PR #22 (waves 1–3 playtested; 4–9 by sim only) | [balance design](docs/superpowers/specs/2026-10-20-balance-design.md) |
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
- ✅ (proposed) Deploy: Vercel Git integration (Vite preset, `npm run build` → `dist/`); `main` is protected by a GitHub ruleset requiring PRs and the CI `build-and-test` check

## M2 — Build-crafting ✅
Spec: [§4 steps 1, 4, 5; §5 stats/weapons/items](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md)

- ✅ `computeStats(run)` pure stat block (HP, regen, armor, dodge, speed, damage types, attack speed, crit, range, pickup radius, luck, harvesting) — `src/core/stats.ts`
- ✅ `items.json`, 15 passive items with trade-offs
- ✅ 6 weapon behaviours (projectile, spread, beam, melee-arc, orbital/drone, explosive), tiers 1–4, 6 weapon slots — `weapons.json`, `WeaponManager`
- ✅ Level-up picks: 1 of 4 random stat upgrades, rarity-weighted, paid reroll, resolved after the wave — `LevelUpScene`, `upgrades.json`
- ✅ Shop: 4 weighted offers, escalating reroll cost, lock, sell, weapon merge rules, stat previews, keyboard + mouse
- ✅ Loadout pick: 1 of 3 starting weapons
- ✅ Unit tests for stats, shop rolls, rerolls, merging, weapon damage
- ✅ M1 perf/feel/seed carry-overs (dash lock, tomato farming, fixed spawn draws, pooled bursts)
- 🚧 Balance pass — see [Balance & progression](#balance--progression-)

## M3 — Look ✅
Spec: [§6 look and feel, §7 screens](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md). Mockups approved ([copies](docs/superpowers/specs/mockups/README.md)). Owner scope: fighter + 5 enemies get 2-frame walk + hit frame, pickups get sprites, no weapon/item icons, plain graphite floor, **SFX moved to M4**.

- ✅ Sprite-grid pipeline: grids in `src/art/`, baked to textures at boot (`textures.ts`); fighter, 5 enemies and scrap on screen with walk/hit frames
- ✅ 3/4 y-sorted depth (`core/depth.ts` `actorDepth`, bands in `DEPTH`): actors in [40, 50), projectiles 60, FX 70, numbers 90
- ✅ Soft shadows, neon glow FX (one camera-level bloom on WebGL; baked 1px halos on Canvas)
- ✅ "Chlorophyll" `theme.ts` applied to every screen; fonts Bungee / IBM Plex Mono / VT323
- ✅ (HUD: no stats panel, 1/2/3 speed buttons dev-only) level-up and shop screens, menu, loadout per the mockups (drag-to-combine and item/weapon icons from the shop mockup not built; (proposed) later); stat previews on hover; mouse + keyboard

## M3.1 — Readability ✅
Owner playtest: text was jaggy. Cause: an 800×600 canvas upscaled with nearest-neighbour.

- ✅ Canvas now 1600×1200 (2×); every scene keeps its 800×600 coordinates via a camera zoom of 2 centred on the design space (`src/config/view.ts`, applied on each scene start). Arena, physics bounds and spawn edges are unchanged; all `Text` is rasterised at resolution 2. Layouts stay 4:3
- ✅ Locked shop offers: pink border, pink-tinted face, pink "LOCKED" tab, padlock icon, button reads UNLOCK
- Rule since then: use `GAME_CONFIG.WIDTH/HEIGHT`, never `cameras.main.width/height` or `scale.width`; no `setScrollFactor(0)` (the zoomed camera is scrolled). Enforced by `src/config/view.guard.test.ts`
- ✅ Fixed after 2×: pause menu (PR #21); wave start/clear banners (were cropped bottom-right), menu skyline and footer (drawn off-screen), scanline overlay size

## Balance & progression 🚧
Spec: [§4, §5 waves, §9 numbers](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md). Design: [balance design](docs/superpowers/specs/2026-10-20-balance-design.md) — **approved by the owner 2026-10-20** (decisions in §8). Goal: 10 waves first, then 20, then endless.

- ✅ Diagnosis: wave 1 brings 28 enemy HP/s against ~10 HP/s from the starting pistol (load ≈ 2.8); 7–8 kills, scrap starved (leftovers were already banked)
- ✅ Headless simulator `src/core/sim.ts` + `npm run sim` report, calibrated to a playtest (wave 1: 8 kills, 40 HP left)
- ✅ Target metrics per wave band as `checkTargets()` assertions (`sim.targets.ts`, `sim.test.ts`)
- ✅ Owner decisions (design §8): threat-budget waves, enemy growth, prices +20%/wave then +25% for the last 3 shops, starter tuning (9 HP peas/peppers, pistol 0.7 s + pierce 1), alive cap 40
- ✅ Approved numbers applied: threat-budget `waves.json` + `scaling`, 9 HP peas/peppers, pistol 0.7 s + pierce 1, price curve in `weapons.ts`, `MAX_ALIVE` 40; browser playtest waves 1–3 ([design §10](docs/superpowers/specs/2026-10-20-balance-design.md#10-applied-2026-10-20))
- ✅ Real aim logged once per run (`[balance] run ended …` console line; `RunState.aim`); stationary playtest: 94% of projectiles hit
- ✅ Run log for measuring real games ([design §9](docs/superpowers/specs/2026-10-20-balance-design.md#9-measuring-real-games-proposed)): `src/core/runlog.ts` (versioned `RunLog`, wave/shop/level-up records, last 50 runs in localStorage), dev F4 exports `runs.json`, `npm run runs -- <file|folder>` prints measured medians next to the sim, the targets on them (`checkRows`) and fitted `aim`/`contactRate`. Verified with a 2-wave browser playtest
- ✅ Dev playtest tools: `?wave=N&build=<name>` starts any wave with a reference build's sim-shopped build (`runAtWave` in `sim.targets.ts`); `?autopilot` / F8 kites via `InputManager` (`core/autopilot.ts`); autopilot clears wave 1 (seed 1: 13 kills)
- ✅ (proposed) `npm run playtest` (`scripts/playtest.mjs`, `@playwright/test` Chromium): headless autopilot run at 3×, first level-up pick, no shopping, writes `runs/playtest-<seed>.json`; `--seed/--runs/--wave/--build`. Seed 1: died wave 8–9 in ~1.5 min (not in CI). Fixed on the way: dev speed keys 1/2/3 never fired (Phaser emits `keydown-THREE`)
- ⬜ (proposed) `npm run playtest` shops like a reference build (now it buys nothing, so it reads as the `never` build)
- ⬜ Playtest waves 4–9 (moving player) and recalibrate the sim's `aim`/`contactRate` with `npm run runs` (fitted values)
- ⬜ Collect real logs (owner + playtesters) and tune enemies per wave, scrap per wave and starter viability from them

## M4 — Boss & run end ⬜
Spec: [§4 steps 2, 6; §5 enemies; §7 screens](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md)

- ⬜ Wave 10 boss: no timer, 2–3 attack patterns, reduced-rate regular spawns as support
- ⬜ Victory / defeat run summary (wave reached, kills, damage dealt, build) with "one more run"; replaces the "RUN COMPLETE" stopgap
- ✅ Pause menu (resume, settings, quit run) — moved forward from M4 by the owner: Esc/P or window blur opens `PauseScene`; settings has the reduced-shake toggle; quit asks for confirmation. Volume setting still ⬜ (no audio yet)
- ⬜ Best-wave high-score record
- ➡️ SFX/music: parked as an idea (see the parking lot), no longer in M4
- ⬜ Final README pass

## Carry-overs / known issues
From the [M1 outcome](docs/superpowers/plans/2026-10-18-m1-waves-and-feel.md) and the [M2 outcome](docs/superpowers/plans/2026-10-18-m2-build-crafting.md):

- **Balance:** see [Balance & progression](#balance--progression-); wave 10 (boss) targets come with M4
- **Perf:** measured in M3 (visible pane, 6 tier-2 weapons, 90–150 peas): 72 fps (the display's refresh) on WebGL with and without bloom and on Canvas, steady 13.9 ms frames; not measured on a slower machine.
- **Canvas renderer (pre-M3):** death bursts use `particleTint` and the player hit flash uses `setTint`, which Phaser's Canvas renderer doesn't draw (bursts white, no hit tint) — unverified in a browser.
- **Feel:** no enemy-to-enemy separation
- **Weapons (M2 review):** drone hit map is keyed by pooled enemy sprites (a recycled enemy can be drone-immune ≤0.5 s); weapon textures and the starter list are hardcoded in `BootScene`/`LoadoutScene` (move colour + `starter` into `weapons.json`); pierce assumes enemies line up in the sim (pistol has pierce 1 since the balance pass)
- **Robustness:** `rng.int` unguarded for max<min; `buildSpawnSchedule` hangs if `every<=0`
- **Dev only:** `debugSpawn` draws from the spawn RNG; F2 peas aren't counted in the run log's `spawned` (kill % can pass 100)
- **Shop:** the header reads `WAVE n CLEARED` with the *next* wave's number (e.g. "WAVE 02 CLEARED" after wave 1)
- **Playtest determinism:** the same seed ends a wave or two apart between `npm run playtest` runs (variable frame deltas, 3× steps up to 300 ms)
- **Level-up (unconfirmed):** in one playtest a single `1` keypress right after a reroll applied the same pick twice (2 levels pending); a retry didn't reproduce it
- **M4:** Victory → GameOver "RUN COMPLETE" is a stopgap
- **(proposed)** `vite.config.ts` still defines aliases for the non-existent `@ecs` and `@ui` folders
- **(proposed)** `STRUCTURE.md`, `PROJECT_SUMMARY.md` and `QUICKSTART.md` describe the old prototype (ShopScene "display upgrades", 3 weapons); fold into README/ARCHITECTURE or delete

- **M3 polish carry-overs:** weapon-slot row on the HUD is 36 px at stride 42 (mockup 40 px at 46); menu/loadout fighter has no shadow ellipse; loadout tag lines come from `behavior` (mockup says SINGLE TARGET / CONE); shop `OWNED ×n` is text not a chip, items list cut at 3 lines without ellipsis; level-up focus ring uses the tier colour; HUD XP bar is 140 px (mockup ~180); `theme.guard` only scans 6-digit hex; a recycled enemy's stale hit-frame timer can end a new hit frame early; `bodyOffset` rescans grids per spawn (memoise)
- **UI:** the shop header says "WAVE 02 CLEARED" after wave 1 (it shows the next wave's number)
- **Dev only:** after editing `assets/data/*.json` with a page open, Vite HMR logs one "Failed to load module script … application/json" console error; a fresh load is clean

## Ideas parking lot (post-MVP)
Named by the spec as non-goals / later:

- Multiple playable characters (data model should allow it)
- Meta-progression and unlocks; save files beyond a high score
- Mobile/touch controls, gamepad, localization
- Audio beyond a few SFX
- **SFX / music** (moved out of M4 by the owner; owner leans towards ZzFX SFX plus one CC0 music loop). Options:
  - ZzFX procedural SFX: ~1 KB, no files
  - CC0 packs from Kenney.nl or OpenGameArt for SFX and a synthwave loop
  - AI tools (ElevenLabs SFX, Suno/Udio music); check their licences first
- Online features: leaderboards, accounts
- (proposed) Opt-in upload of finished run logs to a small endpoint (Postgres `runs` table), accounts linked to an anonymous player id — a spec change, needs the owner's call ([balance design §9.5](docs/superpowers/specs/2026-10-20-balance-design.md#95-path-to-a-server-proposed))
- (proposed) 20-wave run: extend the balance model (bands for waves 11–20, longer reference builds, more AoE content for density) — [balance design §5](docs/superpowers/specs/2026-10-20-balance-design.md#5-the-model-approved)
- Endless mode (waves generated at runtime from the threat budget), difficulty tiers
- Opt-in online upload of run logs to **Postgres** (owner, 2026-10-21: local-first now, upload later). Plan: the versioned RunLog JSON is the contract; finished runs POST to a small endpoint; a `runs` table with indexed columns (data hash, version, starter, wave reached, date) + the full log as JSONB; per-wave medians via SQL; registration later links accounts to the anonymous player id. Needs a spec amendment (spec §2 lists online features as a non-goal) — [balance design §9](docs/superpowers/specs/2026-10-20-balance-design.md#9-measuring-real-games-proposed)
- Swapping Claude-authored sprites for sheets from a pixel-art generator (PixelLab, Retro Diffusion) or an artist — no code change needed, sprites are used by key
