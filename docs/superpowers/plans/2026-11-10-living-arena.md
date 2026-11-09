# Living arena & HUD — plan

Spec: [living arena addendum](../specs/2026-11-10-living-arena-addendum.md) (owner decisions 2026-11-10). One PR per step, in order. Every PR updates the docs it touches.

## Steps

### 1. `refactor/hud-theme-kit` (no intended visual change)
- `src/config/theme.ts`: role tokens the HUD needs (`hpFill`, `hpLow`, `xp`, `bossBar`, `telegraph`, `positive`/`negative`), HUD type sizes (min 10 px) and spacing constants. Existing tokens keep their values.
- `src/scenes/ui.ts`: add `bar`, `slot`/`chip`, `scrapAmount`, `toast`. Existing helpers keep their output, so other screens do not change.
- Replace the HUD's raw rectangles (XP bar, HP and boss fills) with the kit.
- Tighten `src/config/theme.guard.test.ts` (3- and 8-digit hex, `rgba()`).

### 2. `feat/hud-redesign`
- `src/scenes/UIScene.ts` and `src/scenes/hud.ts` (pure layout, tested): the HUD in addendum §6.
- New `GameScene` getters and events for cooldowns, buffs and toasts (extend `GAME_EVENTS`).
- Check the `pixelArt` / CSS `pixelated` settings against the LINEAR-filtered vector art (`src/config/gameConfig.ts`, `src/style.css`) and fix if they blur or alias the HUD.

### 3. `feat/arena-interactables` (core and breakables)
- `assets/data/interactables.json`, typed in `src/types/json.d.ts`, added to `DATA_HASH` (`src/core/runlog.ts`), with a guard test like `arena.test.ts`.
- `src/core/interactables.ts`: `rollWaveLayout(rng, wave, table, solids)` on its own stream; placement reuses `outsideSolids` and `CLEAR_RADIUS` (`src/core/arena.ts`). Tested with `seqRng`.
- `src/entities/interactableBehaviors.ts`: one behaviour function per kind.
- `src/managers/InteractableManager.ts`: pooled live sprites, created in `GameScene.create`, colliders in `setupCollisions`.
- `WeaponManager`: fallback targets when no enemy is in range, and projectile overlap with the breakable group (not the enemy group).
- `PickupManager`: pickup kinds (scrap, heal can); `PlayerManager.heal()`.
- Sprites in `src/art/vector.ts`, approved on the Sprites canvas first.

### 4. `feat/arena-hazards`
- Propane Tank, Compost Spill, Arc Vent; a new `DamageSource`; enemies take hazard damage through the existing damage path.

### 5. `feat/arena-shrines`
- Wave-scoped buffs folded into `computeStats` (`src/core/stats.ts`, still the only place stats are derived) and an `applyStats()` on `PlayerManager` and `WeaponManager` so a buff takes effect mid-wave.
- Cursed Cache ambush through `enemyManager.telegraphAt`; Scrap Slots on the interactables stream.

### 6. `feat/wave-modifiers`
- `assets/data/modifiers.json` and `src/core/modifiers.ts`: `rollModifier` and pure transforms on the spawn schedule, wave duration and interactable roll; announced through the `banner` event and the HUD chip.

### 7. `chore/living-arena-balance`
- Model interactable and modifier income in `src/core/sim.ts`; keep `checkTargets` green.
- `WaveLog` fields (broken, used, scrap from the arena, modifier); bump `schemaVersion` if the format breaks.
- Docs sweep (README, ARCHITECTURE, ASSETS_GUIDE) and this plan's outcome section.

## Verification

- Every PR: `pnpm test`, `pnpm build`. Gameplay PRs also `pnpm sim` and `pnpm playtest --seed 2 --runs 3`.
- In the browser: `?seed=7&wave=5&build=typical` for each object, hazard, shrine and a modifier wave; the HUD against the [preview](https://claude.ai/artifact/DJk42FZn9i8XJkw6Uz1fFt), at the boss wave and at low HP; shop, level-up, round complete and summary unchanged.
- Determinism: `rollWaveLayout` is stable for a fixed seed, and the spawn and combat streams draw the same counts as before.
