# Architecture

Phaser scenes orchestrate; one manager per domain does the work; rules that don't need Phaser are pure functions in `src/core/` with Vitest tests. Content is JSON in `assets/data/`.

```
src/
  main.ts, config/      Phaser config, constants (GAME_CONFIG, SCENE_KEYS, DEPTH), theme.ts tokens
  scenes/               Boot, Menu, Loadout, Game (+ UIScene HUD), Victory, LevelUp, Shop, GameOver; ui.ts themed widget kit (button, panel, tierChip, statTile, scanlines), fonts.ts font-load gate
  managers/             Player, Input, World, Weapon, Enemy, Pickup
  entities/             enemyBehaviors.ts, weaponBehaviors.ts (pure movement/targeting geometry)
  core/                 pure logic: rng, waves (spawn schedule), progression (XP/levels), run (newRun),
                        stats (computeStats), weapons (tier stats, prices), inventory (slots, merge, sell),
                        shop (offers, reroll, lock), levelup (picks), time, settings, depth (y-sort, facing), labels (tier names, clock, truncate)
  fx/glow.ts            isWebGL() guard + applyGlow() (single camera bloom, WebGL only); renderer picked via ?renderer=canvas|webgl (config/renderer.ts)
  fx/Juice.ts           all hit/kill feedback (numbers, flash, shake, bursts, vignette, banners)
  art/                  sprite grids (actors, pickups, palette), body.ts (pure hitbox offset), textures.ts bakes CanvasTextures + walk anims at boot
  types/, utils/        shared types, math helpers
assets/data/            enemies.json, waves.json, weapons.json, character.json, items.json, upgrades.json
```

## Rules of the house

- **Pure first.** Anything testable without Phaser goes in `src/core/` (`*.test.ts` beside it).
- **Data-driven.** No content hardcoded in scenes. New enemy = JSON entry + (at most) one behaviour in `enemyBehaviors.ts`; new weapon = JSON entry using one of the 6 behaviours in `WeaponManager`; new item or wave = JSON.
- **Stats.** `computeStats(run)` (base + items + level-up mods, clamped) is the only place player stats are derived; HUD, shop and level-up previews call it.
- **Run state.** `RunState` (wave, scrap, XP/level, pending level-ups, seed, weapons, items, level-up mods, locked offers) is handed between scenes; `newRun()` makes a fresh one. Phaser reuses scene instances, so reset per-run fields in `create()`.
- **Pooling.** Enemies, projectiles and pickups are pooled (`disableBody`/`enableBody`); no per-frame allocation in hot loops. Target: 60 fps with ~150 enemies.
- **Cleanup.** Remove scene event listeners on shutdown.
- **Seeded RNG** (`createRng`) for spawn, shop and level-up rolls.

## Run flow

`MenuScene` → `LoadoutScene` (pick 1 of 3 weapons) → `GameScene` runs wave *n* (spawns from the `waves.json` schedule via `EnemyManager`, drops via `PickupManager`, feedback via `Juice`) → wave ends, scrap auto-collected → `VictoryScene` (wave cleared) → `LevelUpScene` once per level gained → `ShopScene` → next wave. HP 0 → `GameOverScene` (try again → loadout). After wave 10 the run ends in a stopgap "RUN COMPLETE"; the boss and run summary are M4.

What's planned next (look, boss, run summary) lives in [ROADMAP.md](ROADMAP.md); don't duplicate it here.
