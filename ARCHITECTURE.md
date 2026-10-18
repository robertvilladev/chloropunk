# Architecture

Phaser scenes orchestrate; one manager per domain does the work; rules that don't need Phaser are pure functions in `src/core/` with Vitest tests. Content is JSON in `assets/data/`.

```
src/
  main.ts, config/      Phaser config, constants (GAME_CONFIG, SCENE_KEYS, DEPTH), theme.ts tokens
  scenes/               Boot, Menu, Game (+ UIScene HUD), Victory, Shop, GameOver
  managers/             Player, Input, World, Weapon, Enemy, Pickup, Shop
  entities/             enemyBehaviors.ts (per-type movement/attack functions)
  core/                 pure logic: rng, waves (spawn schedule), progression (XP/levels), time, settings
  fx/Juice.ts           all hit/kill feedback (numbers, flash, shake, bursts, vignette, banners)
  types/, utils/        shared types, math helpers
assets/data/            enemies.json, waves.json, weapons.json
```

## Rules of the house

- **Pure first.** Anything testable without Phaser goes in `src/core/` (`*.test.ts` beside it).
- **Data-driven.** No content hardcoded in scenes. New enemy = JSON entry + (at most) one behaviour in `enemyBehaviors.ts`; new wave = JSON.
- **Run state.** `RunState` (scrap, level, XP, wave, ...) is handed between scenes. Phaser reuses scene instances, so reset per-run fields in `create()`.
- **Pooling.** Enemies, projectiles and pickups are pooled (`disableBody`/`enableBody`); no per-frame allocation in hot loops. Target: 60 fps with ~150 enemies.
- **Cleanup.** Remove scene event listeners on shutdown.
- **Seeded RNG** (`createRng`) for spawn, shop and level-up rolls.

## Run flow

`MenuScene` → `GameScene` runs wave *n* (spawns from the `waves.json` schedule via `EnemyManager`, drops via `PickupManager`, feedback via `Juice`) → wave ends, scrap auto-collected → `VictoryScene` (wave cleared) → `ShopScene` → next wave. HP 0 → `GameOverScene`. After wave 10 the run ends in a stopgap "RUN COMPLETE"; the boss and run summary are M4.

What's planned next (stats, items, real shop, boss) lives in [ROADMAP.md](ROADMAP.md); don't duplicate it here.
