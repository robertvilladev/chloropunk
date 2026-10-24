# Architecture

Phaser scenes orchestrate; one manager per domain does the work; rules that don't need Phaser are pure functions in `src/core/` with Vitest tests. Content is JSON in `assets/data/`.

```
src/
  main.ts, config/      Phaser config, constants (GAME_CONFIG, SCENE_KEYS, DEPTH), theme.ts tokens
  scenes/               Boot, Menu, Loadout, Game (+ UIScene HUD, PauseScene overlay), Victory, LevelUp, Shop, GameOver; ui.ts themed widget kit (button, panel, tierChip, statTile, scanlines), fonts.ts font-load gate
  managers/             Player, Input, World, Weapon, Enemy, Pickup
  entities/             enemyBehaviors.ts, weaponBehaviors.ts (pure movement/targeting geometry)
  core/                 pure logic: rng, waves (spawn schedule; spawn points just off-screen via offscreenPoint, edgePoint for an arena no bigger than the view; CATCH_UP far-enemy speed-up), edgeArrow (HUD arrows for off-screen telegraphs), progression (XP/levels), run (newRun),
                        stats (computeStats), weapons (tier stats, prices), inventory (slots, merge, sell),
                        shop (offers, reroll, lock), levelup (picks), time, settings (reduced shake, master/music/SFX volume), music (track per state, duck/crossfade constants, volume step), voices (SFX voice limit, pitch/volume variation, pickup streak pitch), menuNav (keyboard selection), depth (y-sort, facing), arena (validateArena: rooftop decor inside the arena and clear of the 160 px start circle), labels (tier names, clock, truncate),
                        sim (headless balance simulator; sim.targets = reference builds, balance targets, threat-budget wave authoring, dev `runAtWave`), autopilot (dev kiting input),
                        runlog (versioned per-run log: wave/shop/level-up records, localStorage store of the last 50, summarise + fitParams for `pnpm runs`)
scripts/runs.mjs        `pnpm runs <file|folder>` wrapper: runs src/core/runlog.report.test.ts under Vitest with RUNS_PATH set
scripts/playtest.mjs    `pnpm playtest`: Vite + Playwright Chromium autopilot run, saves localStorage `vv.runs` to runs/playtest-<seed>.json
  config/constants.ts  ARENA {w,h} = playfield, 1600×1200 (physics bounds, spawns, y-sort, autopilot; dev `?arena=small` = 800×600, config/arena.ts); GAME_CONFIG.WIDTH/HEIGHT = 800×600 design space for layout only (arena.guard.test.ts)
  config/view.ts       RENDER_SCALE = 2: canvas is 1600×1200, each scene's main camera is zoomed 2× onto the 800×600 design space (applyView, wired in gameConfig postBoot), except GameScene's, which then follows the fighter inside the arena (followView); installCrispText renders all Text at 2×. Scenes keep 800×600 coordinates, so use GAME_CONFIG.WIDTH/HEIGHT (not camera/scale size) and no setScrollFactor(0): screen-fixed things go in UIScene
  fx/glow.ts            isWebGL() guard + applyGlow() (single camera bloom, WebGL only); renderer picked via ?renderer=canvas|webgl (config/renderer.ts)
  fx/Juice.ts           world-space hit/kill feedback (numbers, flash, shake, bursts, blasts) and their SFX; the wave banner, low-HP vignette and off-screen spawn arrows live in UIScene
  fx/sfx.ts             initSfx (BootScene) + sfx(name): ZzFX buffers played on Phaser's WebAudio context through an SFX gain node; dropped while audio is locked/suspended
  fx/music.ts           initMusic (BootScene) + setMusic(state) / duckMusic(on): one streamed <audio> per track routed through a music gain node on Phaser's context; crossfades, ducks, waits for the autoplay unlock, pauses on blur; MUSIC_CREDITS for the menu overlay
  fx/sounds.ts          every SFX as a ZzFX parameter array + voice rule (one data file); fx/zzfx.ts = vendored ZzFX sample generator (MIT)
  art/                  vector.ts (sprites as SVG strings + SPRITE_META), body.ts (ART_SCALE, fitCircle/fitBox hit areas), textures.ts loads the SVGs at 2x and bakes CanvasTextures + walk anims at boot; arena.ts bakes the floor (grid, rooftop decor from arena.json, lime edge) into one texture per arena size, shown by WorldManager as one image
  types/, utils/        shared types, math helpers
assets/data/            enemies.json, waves.json, weapons.json, character.json, items.json, upgrades.json, arena.json (rooftop decor layout)
```

## Rules of the house

- **Pure first.** Anything testable without Phaser goes in `src/core/` (`*.test.ts` beside it).
- **Data-driven.** No content hardcoded in scenes. New enemy = JSON entry + (at most) one behaviour in `enemyBehaviors.ts`; new weapon = JSON entry using one of the 6 behaviours in `WeaponManager`; new item or wave = JSON.
- **Stats.** `computeStats(run)` (base + items + level-up mods, clamped) is the only place player stats are derived; HUD, shop and level-up previews call it.
- **Run state.** `RunState` (wave, scrap, XP/level, pending level-ups, seed, aim tally, weapons, items, level-up mods, locked offers) is handed between scenes; `newRun()` makes a fresh one. Phaser reuses scene instances, so reset per-run fields in `create()`.
- **Pooling.** Enemies, projectiles and pickups are pooled (`disableBody`/`enableBody`); no per-frame allocation in hot loops. Target: 60 fps with ~150 enemies.
- **Cleanup.** Remove scene event listeners on shutdown.
- **Seeded RNG** (`createRng`) for spawn, shop and level-up rolls.

## Run flow

`MenuScene` → `LoadoutScene` (pick 1 of 3 weapons) → `GameScene` runs wave *n* (spawns from the `waves.json` schedule via `EnemyManager`, drops via `PickupManager`, feedback via `Juice`) → wave ends, scrap auto-collected → `VictoryScene` (wave cleared) → `LevelUpScene` once per level gained → `ShopScene` → next wave. HP 0 → `GameOverScene` (try again → loadout). Esc/P or the window losing focus during a wave calls `GameScene.openPause`: it pauses GameScene and UIScene (physics, timers and tweens freeze and continue where they stopped) and launches `PauseScene` (resume / settings: reduced shake and master/music/SFX volume via `core/settings` / quit run with confirmation → stops UI and Game, back to the menu). Not opened once the wave is over (`isGameOver`). After wave 10 the run ends in a stopgap "RUN COMPLETE"; the boss and run summary are M4.

**Run log** ([balance design §9](docs/superpowers/specs/2026-10-20-balance-design.md#9-measuring-real-games-proposed)): `newRun` creates `RunState.log`, which rides along with the run. `GameScene` opens a wave record at `create` and fills it from its own events (kills, `enemyHit`, `scrapCollected`, `playerDodged`, damage by source via `hurt()`, `WeaponManager.tally` shots/hits, `EnemyManager.spawned` and its mean spawn distance; the run records the arena size, so `pnpm runs` reports each size apart); `ShopScene` and `LevelUpScene` push a record when they close. The log is saved to localStorage when the run ends: death, last wave cleared, quit from the pause menu, or Main Menu on the Victory screen. Dev F4 downloads `runs.json`.

What's planned next (look, boss, run summary) lives in [ROADMAP.md](ROADMAP.md); don't duplicate it here.
