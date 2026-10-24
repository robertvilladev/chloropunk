# Chloropunk — Roadmap to MVP

**MVP =** a full run of 10 waves ending in a boss, with build-crafting choices (level-ups, shop) and readable, punchy feedback in a coherent cyberpunk pixel-art look.
Binding source of intent: [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md). Plans: [`docs/superpowers/plans/`](docs/superpowers/plans/).

Status: ✅ done · 🚧 in progress · ⬜ planned. "(proposed)" = inferred by us, not named in the spec.

| Milestone | Status | Plan |
|---|---|---|
| M1 Waves & feel | ✅ done — merged in PR #14 | [M1 plan](docs/superpowers/plans/2026-10-18-m1-waves-and-feel.md) |
| M2 Build-crafting | ✅ done — merged in PR #16 | [M2 plan](docs/superpowers/plans/2026-10-18-m2-build-crafting.md) |
| M3 Look | ✅ done — merged in PR #17 | [M3 plan](docs/superpowers/plans/2026-10-18-m3-look.md) |
| Balance & progression | ✅ applied (PR #22; waves 1–3 playtested, 4–9 by sim only) | [balance design](docs/superpowers/specs/2026-10-20-balance-design.md) |
| Arena map (A1–A5) | 🚧 A1–A3 done (owner-approved 2026-10-23) | [arena addendum](docs/superpowers/specs/2026-10-23-arena-map-addendum.md) §5 |
| M4 Boss & run end | ⬜ planned | not written |

## M1 — Waves & feel ✅
Spec: [§4 run loop, §5 systems](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md)

- ✅ 5 vegetable enemies with behaviours (chaser, dasher, tank, shooter, exploder) — `assets/data/enemies.json`
- ✅ 10 data-driven waves, duration `32 + 2·(n−1)` s capped at 60 (was `20 + 4·(n−1)` until the [wave length addendum](docs/superpowers/specs/2026-10-24-wave-length-addendum.md)) — `assets/data/waves.json`, `src/core/waves.ts`
- ✅ Pooled spawning with telegraph markers; holds 60 fps with 150 enemies
- ✅ Scrap + XP drops, pickup magnet, auto-collect at wave end, XP curve and levels (`src/core/progression.ts`)
- ✅ Seeded RNG (`src/core/rng.ts`)
- ✅ Juice: damage numbers, hit flash, knockback, screen shake, death bursts, low-HP vignette, wave banners, reduced-shake setting
- ✅ Cleanup: dead files and deps removed, `theme.ts` tokens, CI green
- ✅ (proposed) Deploy: Vercel Git integration (Vite preset, `pnpm build` → `dist/`); `main` is protected by a GitHub ruleset requiring PRs and the CI `build-and-test` check
- ✅ (proposed) pnpm instead of npm: `pnpm-lock.yaml` imported from the npm lockfile (same versions), CI on `pnpm install --frozen-lockfile` + Node 24, npm blocked via `engines.npm` + `engine-strict`

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
- ✅ Headless simulator `src/core/sim.ts` + `pnpm sim` report, calibrated to a playtest (wave 1: 8 kills, 40 HP left)
- ✅ Target metrics per wave band as `checkTargets()` assertions (`sim.targets.ts`, `sim.test.ts`)
- ✅ Owner decisions (design §8): threat-budget waves, enemy growth, prices +20%/wave then +25% for the last 3 shops, starter tuning (9 HP peas/peppers, pistol 0.7 s + pierce 1), alive cap 40
- ✅ Approved numbers applied: threat-budget `waves.json` + `scaling`, 9 HP peas/peppers, pistol 0.7 s + pierce 1, price curve in `weapons.ts`, `MAX_ALIVE` 40; browser playtest waves 1–3 ([design §10](docs/superpowers/specs/2026-10-20-balance-design.md#10-applied-2026-10-20))
- ✅ Real aim logged once per run (`[balance] run ended …` console line; `RunState.aim`); stationary playtest: 94% of projectiles hit
- ✅ Run log for measuring real games ([design §9](docs/superpowers/specs/2026-10-20-balance-design.md#9-measuring-real-games-proposed)): `src/core/runlog.ts` (versioned `RunLog`, wave/shop/level-up records, last 50 runs in localStorage), dev F4 exports `runs.json`, `pnpm runs <file|folder>` prints measured medians next to the sim, the targets on them (`checkRows`) and fitted `aim`/`contactRate`. Verified with a 2-wave browser playtest
- ✅ Dev playtest tools: `?wave=N&build=<name>` starts any wave with a reference build's sim-shopped build (`runAtWave` in `sim.targets.ts`); `?autopilot` / F8 kites via `InputManager` (`core/autopilot.ts`); autopilot clears wave 1 (seed 1: 13 kills)
- ✅ (proposed) `pnpm playtest` (`scripts/playtest.mjs`, `@playwright/test` Chromium): headless autopilot run at 3×, first level-up pick, no shopping, writes `runs/playtest-<seed>.json`; `--seed/--runs/--wave/--build`. Seed 1: died wave 8–9 in ~1.5 min (not in CI). Fixed on the way: dev speed keys 1/2/3 never fired (Phaser emits `keydown-THREE`)
- ⬜ (proposed) `pnpm playtest` shops like a reference build (now it buys nothing, so it reads as the `never` build)
- ⬜ Playtest waves 4–9 (moving player) and recalibrate the sim's `aim`/`contactRate` with `pnpm runs` (fitted values)
- ⬜ Collect real logs (owner + playtesters) and tune enemies per wave, scrap per wave and starter viability from them
- ✅ Wave length pass (owner 2026-10-24: rounds too short to shop and grow): waves last `32 + 2·(n−1)` s (32 → 48 s by wave 9), prices unchanged, 10 waves; owner-approved, [wave length addendum](docs/superpowers/specs/2026-10-24-wave-length-addendum.md), options and sim numbers in [balance design §11](docs/superpowers/specs/2026-10-20-balance-design.md#11-wave-length-pass-2026-10-24). Sim: blade wave-1 miss gone; waves 8–9 now too easy for the scripted shopper (known misses). Autopilot `pnpm playtest --seed 1 --runs 3` (never shops): all 3 won, as with A3b; wave 1–5 kills 92/97/67/52/30% (A3b 88/92/67/58/36), scrap dropped 23 in wave 1 and 180 over the run (A3b 158).
- ⬜ Owner playtest of the longer waves with `pnpm runs`: target 0.8–2 buys/wave and kills in band; if waves 8–9 play too easy, prices ×1.1 (balance design §11)

## Arena map 🚧
Spec: [arena map addendum](docs/superpowers/specs/2026-10-23-arena-map-addendum.md) (owner decisions 2026-10-23; [design page](https://claude.ai/artifact/Joe6YTuK7XMsoCTbkyFs56)). One PR each, in order.

- ✅ A1 Arena size split from the 800×600 design space, no visible change: `ARENA` in `src/config/constants.ts`, guarded by `src/config/arena.guard.test.ts` — [plan](docs/superpowers/plans/2026-10-23-arena-1-split.md)
- ✅ A2 Arena 1600×1200 with a follow camera (GameScene only, zoom 2, clamped); the fighter starts at the arena centre; the wave banner and low-HP vignette moved to UIScene; dev `?arena=small` keeps 800×600. Enemies still spawn at the map edges until A3, so waves play easier (seed-1 playtest: won wave 10, vs dying at wave 6–8 before). Owner played both sizes (2026-10-24): camera and big arena work; spawns too far and too few kills, so scrap can't keep up with shop prices (full run: ~90 scrap earned, 4–17 kills a wave, 40 alive at every wave end from wave 6). A3 fixes the spawn distance; tune the economy after it — [plan](docs/superpowers/plans/2026-10-23-arena-2-camera.md)
- ✅ A3 Waves spawn just off-screen: a ring 50 px outside the camera view, clamped into the arena, one RNG draw per spawn (`offscreenPoint`; `?arena=small` keeps the old edge rule); pooled arrows on the screen edge for off-screen telegraphs (`edgeArrow`, UIScene). Run log records the mean spawn distance (`spawnDist`, shown by `pnpm runs`). Measured 480 px (seed 1–3 autopilot: won, died in wave 10, won), so the sim's `spawnDist` went 330 → 480; the sim's typical build now dies in wave 8, a known miss in `sim.test.ts` until the economy pass. Spawns can enter the view when the player walks onto a telegraph (it is visible first). Owner playtest 2026-10-24 (1 run per size, `pnpm runs`, which now splits by arena size): big map, shotgun, died in wave 10 with 41–89% HP left through wave 9, measured spawn distance 513, kills 65–82% in waves 1–5 (onboarding target 85–100%); small map, blade, 75–88%, died in wave 5. Verdict: works, but enemies take too long to arrive and the big map yields less scrap — the follow-up below — [plan](docs/superpowers/plans/2026-10-23-arena-3-spawning.md)
- ✅ A3b Arrivals: enemies farther than 360 px from the player walk 2× (`CATCH_UP`, sim `walkIn`), so the off-screen ring arrives like the old edge spawns. Sim back on its targets (wave-8 death gone; the blade starter's 12/16 in wave 1 is the one new known miss). Seed 1–3 autopilot vs A3: all won (A3: 2/3), wave 1–5 kills 88/92/67/58/36% (A3 81/88/64/42/32), scrap dropped +19%. Owner playtest 2026-10-24 (2 big-map runs): blade won wave 10, shotgun died in wave 9; spawning reads well, no bugs, corners fine. Kills 54–77% a wave and 0.6 buys/wave (target 0.8–2): the economy is still tight, moved to the wave-length/economy pass below

## M4 — Boss & run end ⬜
Spec: [§4 steps 2, 6; §5 enemies; §7 screens](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md)

- ⬜ Wave 10 boss: no timer, 2–3 attack patterns, reduced-rate regular spawns as support
- ⬜ Victory / defeat run summary (wave reached, kills, damage dealt, build) with "one more run"; replaces the "RUN COMPLETE" stopgap
- ✅ Pause menu (resume, settings, quit run) — moved forward from M4 by the owner: Esc/P or window blur opens `PauseScene`; settings has the reduced-shake toggle and master / music / SFX volume; quit asks for confirmation
- ⬜ Best-wave high-score record
- ✅ SFX — back in scope by the owner (2026-10-23, [audio addendum](docs/superpowers/specs/2026-10-23-audio-addendum.md), [plan](docs/superpowers/plans/2026-10-23-sfx.md)): 16 procedural ZzFX sounds (hits, kills, hurt, low HP, blasts, waves, pickup streaks, level up, buy/deny, UI move/confirm/back, game over / run complete) on Phaser's AudioContext, voice limiting + pitch variation (`core/voices.ts`), SFX volume in pause settings. Every keyboard and mouse menu action blips once (move / confirm / back); every shop refusal and a level-up reroll without enough scrap play deny; Enter/Space now confirms the loadout pick. Verified in the browser (no console errors); level-up and run-complete sounds not triggered in that session
- ✅ Music ([plan](docs/superpowers/plans/2026-10-23-music.md)): 2 CC-BY 4.0 synthwave loops (NLV on menu/loadout, Spring in waves/level-up/shop) streamed through a music bus on Phaser's AudioContext, 1.5 s crossfade on state change, duck to 30% under pause / round complete / game over, master + music volume in pause settings, credits in `assets/audio/CREDITS.md` and a menu CREDITS overlay. Verified in the browser (crossfade, duck, no duplicate tracks, settings persist); not yet listened to by the owner
- ⬜ Final README pass

## Carry-overs / known issues
From the [M1 outcome](docs/superpowers/plans/2026-10-18-m1-waves-and-feel.md) and the [M2 outcome](docs/superpowers/plans/2026-10-18-m2-build-crafting.md):

- **Balance:** see [Balance & progression](#balance--progression-); wave 10 (boss) targets come with M4
- **Perf:** measured in M3 (visible pane, 6 tier-2 weapons, 90–150 peas): 72 fps (the display's refresh) on WebGL with and without bloom and on Canvas, steady 13.9 ms frames; not measured on a slower machine. A2 (2026-10-24, follow camera, 1600×1200, ~130–150 peas): 117–140 fps on WebGL and Canvas.
- **Canvas renderer (pre-M3):** death bursts use `particleTint` and the player hit flash uses `setTint`, which Phaser's Canvas renderer doesn't draw (bursts white, no hit tint) — unverified in a browser.
- **Feel:** no enemy-to-enemy separation
- **Weapons (M2 review):** drone hit map is keyed by pooled enemy sprites (a recycled enemy can be drone-immune ≤0.5 s); weapon textures and the starter list are hardcoded in `BootScene`/`LoadoutScene` (move colour + `starter` into `weapons.json`); pierce assumes enemies line up in the sim (pistol has pierce 1 since the balance pass)
- **Robustness:** `rng.int` unguarded for max<min; `buildSpawnSchedule` hangs if `every<=0`
- **Dev only:** `debugSpawn` draws from the spawn RNG; F2 peas aren't counted in the run log's `spawned` (kill % can pass 100)
- **Shop:** the header reads `WAVE n CLEARED` with the *next* wave's number (e.g. "WAVE 02 CLEARED" after wave 1)
- **Playtest determinism:** the same seed ends a wave or two apart between `pnpm playtest` runs (variable frame deltas, 3× steps up to 300 ms)
- **Level-up (unconfirmed):** in one playtest a single `1` keypress right after a reroll applied the same pick twice (2 levels pending); a retry didn't reproduce it
- **M4:** Victory → GameOver "RUN COMPLETE" is a stopgap
- **Rename to Chloropunk (2026-10-22):** title, favicon, menu logo, doc headings and `package.json` `name` done. Still `veggie-vendetta`: the GitHub repo and Vercel project (owner renames them by hand), the local folder. `vv.runs` / `vv.settings` localStorage keys stay on purpose (renaming loses saved settings and run logs). Old plans and `docs/superpowers/specs/mockups/` keep the old name as history
- **(proposed)** `vite.config.ts` still defines aliases for the non-existent `@ecs` and `@ui` folders
- **(proposed)** `STRUCTURE.md`, `PROJECT_SUMMARY.md` and `QUICKSTART.md` describe the old prototype (ShopScene "display upgrades", 3 weapons); fold into README/ARCHITECTURE or delete

- **M3 polish carry-overs:** weapon-slot row on the HUD is 36 px at stride 42 (mockup 40 px at 46); menu/loadout fighter has no shadow ellipse; loadout tag lines come from `behavior` (mockup says SINGLE TARGET / CONE); shop `OWNED ×n` is text not a chip, items list cut at 3 lines without ellipsis; level-up focus ring uses the tier colour; HUD XP bar is 140 px (mockup ~180); `theme.guard` only scans 6-digit hex; a recycled enemy's stale hit-frame timer can end a new hit frame early; `bodyOffset` rescans grids per spawn (memoise)
- **UI:** the shop header says "WAVE 02 CLEARED" after wave 1 (it shows the next wave's number)
- **SFX:** first listening pass by the owner (2026-10-23) applied: softer combat sounds (low-pass, less bitcrush), menu sounds redone in the game's palette with a very quiet hover, punkier wave/run-end stabs, and wave banners grow slightly each wave (`waveBoost`). Next: another listening pass
- **Music (proposed):** neither track loops seamlessly (NLV fades out then restarts on its drop; Spring cuts from full level back to its start) and the levels were matched by meter (NLV trimmed to 0.7): the owner should listen. Safari before 18.4 can't play Ogg and gets no music; an M4A fallback is the fix if that matters. The autoplay-unlock path (music starting on the first click) couldn't be exercised in the preview, which allows autoplay
- **Dev only:** after editing `assets/data/*.json` with a page open, Vite HMR logs one "Failed to load module script … application/json" console error; a fresh load is clean

## Ideas parking lot (post-MVP)
Named by the spec as non-goals / later:

- Multiple playable characters (data model should allow it)
- Meta-progression and unlocks; save files beyond a high score
- Mobile/touch controls, gamepad, localization
- Audio beyond two music loops and a few SFX
- Online features: leaderboards, accounts
- (proposed) Opt-in upload of finished run logs to a small endpoint (Postgres `runs` table), accounts linked to an anonymous player id — a spec change, needs the owner's call ([balance design §9.5](docs/superpowers/specs/2026-10-20-balance-design.md#95-path-to-a-server-proposed))
- (proposed) 20-wave run: extend the balance model (bands for waves 11–20, longer reference builds, more AoE content for density) — [balance design §5](docs/superpowers/specs/2026-10-20-balance-design.md#5-the-model-approved)
- (proposed, owner 2026-10-24) 15-wave run as a step towards 20; after the MVP, because the boss (M4b) is built for wave 10
- (proposed, owner 2026-10-24) Enemy variety after Brotato-style play: spawn some groups as tight clusters, not every enemy straight at the player (wanderers, flankers, chargers that pause), tune enemy size and how far out they appear
- Endless mode (waves generated at runtime from the threat budget), difficulty tiers
- Opt-in online upload of run logs to **Postgres** (owner, 2026-10-21: local-first now, upload later). Plan: the versioned RunLog JSON is the contract; finished runs POST to a small endpoint; a `runs` table with indexed columns (data hash, version, starter, wave reached, date) + the full log as JSONB; per-wave medians via SQL; registration later links accounts to the anonymous player id. Needs a spec amendment (spec §2 lists online features as a non-goal) — [balance design §9](docs/superpowers/specs/2026-10-20-balance-design.md#9-measuring-real-games-proposed)
- Swapping Claude-authored sprites for sheets from a pixel-art generator (PixelLab, Retro Diffusion) or an artist — no code change needed, sprites are used by key
