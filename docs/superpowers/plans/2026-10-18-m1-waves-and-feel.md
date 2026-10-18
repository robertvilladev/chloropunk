# Veggie Vendetta — Roadmap and Milestone 1 (Waves & Feel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a single wave feel like a real game: dense, escalating vegetable waves driven by data, scrap/XP drops with a magnet, and hit/kill feedback.

**Architecture:** Game rules that don't need Phaser (RNG, wave schedules, scaling, XP curve) move into pure modules under `src/core/` with Vitest tests. Phaser managers consume them: `EnemyManager` spawns from a schedule into a pooled group and runs per-type behaviours, `PickupManager` replaces `CoinManager`, and a `Juice` helper owns all feedback effects. Content stays in `assets/data/*.json`.

**Tech Stack:** Phaser 3.90, TypeScript (strict), Vite 5, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md`

## Roadmap (one plan per milestone; only M1 is detailed here)

| Milestone | Delivers | Depends on |
|---|---|---|
| **M1 Waves & feel** (this plan) | 5 vegetable enemies with behaviours, 10 data-driven waves, pooled spawning with telegraphs, scrap + XP + levels, damage numbers / flash / shake / bursts / banner, cleanup | PR #13 |
| M2 Build-crafting | `computeStats`, items.json (~15), 6 weapon behaviours with tiers 1–4, level-up picks, shop (4 offers, reroll, lock, sell, combine), loadout pick | M1 |
| M3 Look | Sprite-grid pipeline (Claude-authored pixel data → textures), 3/4 y-sorting + shadows + glow FX, `theme.ts` applied to every screen per the mockups, Orbitron/Oxanium/Silkscreen | M1; UI tasks wait for owner review of the mockups |
| M4 Boss & run end | Wave 10 boss (no timer), victory/defeat summary, pause + settings, best-wave record, README rewrite | M2, M3 |

## Global Constraints

- Keep Phaser 3.90 + TypeScript strict + Vite + Vitest; canvas 800×600 logical, scaled to fit; keyboard WASD/arrows.
- Content is data: adding an enemy or wave is a JSON change plus at most one behaviour function. No content hardcoded in scenes.
- 60 fps with ~150 enemies + projectiles: pooled enemies/projectiles/pickups, no per-frame allocations in hot loops.
- Wave *n* lasts `20 + 4·(n−1)` s, capped at 60 s. (Wave 10's boss rules arrive in M4; in M1 wave 10 is a normal timed wave.)
- Scrap within pickup radius is pulled to the player; scrap left on the ground when the wave ends is auto-collected.
- Seeded RNG for spawn rolls.
- Feedback: damage numbers (crits highlighted), white hit flash, knockback, screen shake on player hit and big kills, death burst, scrap magnet, low-HP vignette, wave start/end banner; a reduced-screen-shake setting.
- Don't regress PR #13: reset per-run fields in `create()`, `disableBody`/`enableBody` for pooled sprites, remove scene event listeners on shutdown.
- CI (`npm run build`, `npm run test:coverage`) stays green.
- Colours come from the design system (`theme.ts`): violet `#9184d9` = state, signal `#fcee0a` = events, danger `#e3645e`.

## Review Focus

1. **Pooled enemy reuse** — a recycled enemy must not keep the previous one's HP, tint, velocity or behaviour timers. Owned by Task 4 (`createEnemyState` returns a fresh object; test).
2. **Frame boundaries and game speed** — at 2×/3× speed or uneven frame times, every scheduled spawn fires exactly once. Owned by Task 2 (`dueEvents` half-open interval test).
3. **Tab switch / long frame** — returning to a backgrounded tab must not dump a whole wave at once or skip the timer to zero. Owned by Task 4 (delta clamped to 100 ms; test on `clampDelta`).
4. **Several levels from one pickup burst** — the auto-collect at wave end can grant multiple levels; all must be counted. Owned by Task 3 (test).
5. **Wave ends with hazards in flight** — exploding tomatoes and carrot bolts must not damage or kill the player after the wave-complete banner. Owned by Task 5 (clear enemies and enemy projectiles without death effects; manual check step).

---

### Task 1: Cleanup, theme tokens and seeded RNG

**Files:**
- Delete: `coverage/` (tracked), `src/counter.ts`, `src/typescript.svg`, `public/vite.svg`
- Modify: `.gitignore` (add `coverage`), `package.json` (remove `bitecs`, `esbuild`, `fdir`, `nanoid`, `picocolors`, `picomatch`, `postcss`, `rollup`, `source-map-js`, `tinyglobby` from `dependencies`), `index.html` (`<title>Veggie Vendetta</title>`, drop the vite.svg icon), `src/scenes/MenuScene.ts` (title text `VEGGIE//VENDETTA`)
- Create: `src/config/theme.ts`, `src/core/rng.ts`
- Test: `src/core/rng.test.ts`

**Interfaces:**
- Produces: `THEME` — `{ bg, surface, surface2, line, text, textMuted, violet, violet300, violet700, signal, signalInk, danger, success, tier: [t1, t2, t3, t4] }` as `number` (0xRRGGBB) plus `THEME_CSS` with the same keys as `#rrggbb` strings; values copied from the design system tokens (`#161826`, `#232532`, `#1c1e2c`, `#383946`, `#e9e9ed`, `#9397ab`, `#9184d9`, `#d2cefd`, `#5d5294`, `#fcee0a`, `#161826`, `#e3645e`, `#54b66e`, tiers `#b2b6ca #3ab7d6 #9184d9 #ff8a3d`).
- Produces: `interface Rng { next(): number; int(min: number, maxInclusive: number): number; pick<T>(items: readonly T[]): T }` and `createRng(seed: number): Rng` (mulberry32).

- [ ] **Step 1: Write failing tests** in `src/core/rng.test.ts`:
  - `same seed gives same sequence`: two `createRng(42)` produce equal arrays of 10 `next()` values.
  - `different seeds differ`: `createRng(1).next() !== createRng(2).next()`.
  - `next is in [0,1)`: 1000 draws all `>= 0 && < 1`.
  - `int is inclusive and bounded`: 1000 `int(3, 5)` draws are all in {3,4,5} and each value appears.
  - `pick returns an element`: `pick(["a","b"])` ∈ `["a","b"]`.
- [ ] **Step 2: Run** `npx vitest run src/core/rng.test.ts` — expect FAIL (module not found).
- [ ] **Step 3: Implement** `createRng` (mulberry32) in `src/core/rng.ts`, and `src/config/theme.ts`.
- [ ] **Step 4: Do the deletions and package/html/menu edits; run** `npm install` (to update the lockfile), then `npm run build && npx vitest run` — expect build OK, all tests PASS.
- [ ] **Step 5: Commit** `chore: cleanup, theme tokens and seeded rng`.

### Task 2: Wave data and spawn schedule

**Files:**
- Modify: `assets/data/waves.json` (replace), `src/types/index.ts` (replace `WaveData`), `src/types/json.d.ts` (waves module typing)
- Create: `src/core/waves.ts`
- Test: `src/core/waves.test.ts`

**Interfaces:**
- Produces (types in `src/types/index.ts`):
  - `interface SpawnGroup { enemy: string; count: number; every: number; start: number; end?: number }` — spawn `count` enemies every `every` s from `start` until `end` (default: wave duration, exclusive).
  - `interface WaveDef { wave: number; groups: SpawnGroup[] }`
  - `interface SpawnEvent { time: number; enemy: string; count: number }`
- Produces (in `src/core/waves.ts`):
  - `waveDuration(wave: number): number` → `Math.min(20 + 4 * (wave - 1), 60)`.
  - `buildSpawnSchedule(def: WaveDef): SpawnEvent[]` sorted by `time`.
  - `dueEvents(schedule: SpawnEvent[], from: number, to: number): SpawnEvent[]` — events with `from < time <= to`, except `from === 0` also includes `time === 0`. (Half-open so each event fires exactly once across consecutive frames.)
  - `scaleEnemy(base: { hp: number; damage: number }, wave: number): { hp: number; damage: number }` → `hp × (1 + 0.25·(wave−1))`, `damage × (1 + 0.15·(wave−1))`, both rounded.

`waves.json` = `{ "waves": WaveDef[] }` with 10 waves. Enemy ids are those from Task 4: `pea`, `pepper`, `potato`, `carrot`, `tomato`. Pacing (exact counts left to the builder): wave 1 peas only, roughly 2–3 enemies/second on average by wave 5, 5+/second by wave 9; `pepper` from wave 2, `tomato` from 3, `carrot` from 4, `potato` from 5.

- [ ] **Step 1: Write failing tests** in `src/core/waves.test.ts`:
  - `waveDuration`: `waveDuration(1) === 20`, `waveDuration(5) === 36`, `waveDuration(20) === 60`.
  - `buildSpawnSchedule expands a group`: `{wave:1, groups:[{enemy:"pea", count:3, every:2, start:0}]}` → 10 events at times `0,2,…,18`, each `count: 3`.
  - `respects start/end`: `{enemy:"pepper", count:1, every:5, start:10, end:20}` → times `[10, 15]`.
  - `merges and sorts groups`: two groups → times ascending.
  - `dueEvents fires each event once across frames` (Review Focus 2): for a schedule with events at `0, 0.5, 1.0`, summing `dueEvents` over frames `[0,0.3],[0.3,0.5],[0.5,0.51],[0.51,1.0]` returns exactly the 3 events once each; and over one big frame `[0, 1.0]` also returns all 3.
  - `scaleEnemy`: `scaleEnemy({hp:20, damage:4}, 1)` → `{hp:20, damage:4}`; wave 5 → `{hp:40, damage:6}`.
  - `every wave in waves.json is valid`: 10 waves numbered 1–10, every `enemy` id exists in `enemies.json` (import both JSONs), every `every > 0`.
- [ ] **Step 2: Run** `npx vitest run src/core/waves.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** the four functions and write `waves.json`. (The `enemies.json` check will fail until Task 4 lands the new ids; write the new `enemies.json` ids now as part of this task: `pea`, `pepper`, `potato`, `carrot`, `tomato` with the Task 4 fields.)
- [ ] **Step 4: Run** `npx vitest run src/core/waves.test.ts` — expect PASS.
- [ ] **Step 5: Commit** `feat: data-driven wave schedules`.

### Task 3: XP curve and run state

**Files:**
- Create: `src/core/progression.ts`
- Modify: `src/types/index.ts` (`RunState`), every reader of `run.coins` (`GameScene`, `VictoryScene`, `ShopScene`)
- Test: `src/core/progression.test.ts`

**Interfaces:**
- Produces: `RunState` becomes `{ wave: number; scrap: number; xp: number; level: number; pendingLevelUps: number; bonus: { maxHealth: number; speed: number; damage: number }; seed: number }` (`coins` renamed to `scrap`; new run: `level 1`, `xp 0`, `pendingLevelUps 0`, `seed = Date.now()`).
- Produces: `xpToNext(level: number): number` → `(level + 3) ** 2`.
- Produces: `addXp(state: { level: number; xp: number }, amount: number): { level: number; xp: number; levelsGained: number }` — carries overflow across multiple levels.

M2 turns `pendingLevelUps` into level-up picks; in M1 it is only counted and shown in the HUD.

- [ ] **Step 1: Write failing tests** in `src/core/progression.test.ts`:
  - `xpToNext(1) === 16`, `xpToNext(2) === 25`.
  - `addXp below threshold`: `addXp({level:1, xp:0}, 10)` → `{level:1, xp:10, levelsGained:0}`.
  - `addXp exact level`: `addXp({level:1, xp:10}, 6)` → `{level:2, xp:0, levelsGained:1}`.
  - `addXp several levels at once` (Review Focus 4): `addXp({level:1, xp:0}, 16 + 25 + 36 + 5)` → `{level:4, xp:5, levelsGained:3}`.
- [ ] **Step 2: Run** `npx vitest run src/core/progression.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `progression.ts`; update `RunState` and rename `coins`→`scrap` in the three scenes (labels say `SCRAP`).
- [ ] **Step 4: Run** `npx tsc --noEmit && npx vitest run` — expect PASS.
- [ ] **Step 5: Commit** `feat: xp curve and scrap in run state`.

### Task 4: Vegetable enemies — pooled spawning and behaviours

**Files:**
- Modify: `assets/data/enemies.json` (finalise), `src/types/index.ts` (`EnemyDef`), `src/managers/EnemyManager.ts` (rewrite), `src/scenes/BootScene.ts` (placeholder textures per enemy in theme sprite colours: pea `#4caf50`, pepper `#e53935`, potato `#b07a43`, carrot `#ff7a1a`, tomato `#e53935` round, enemy bolt, spawn telegraph), `src/scenes/GameScene.ts` (use schedule, clamp delta)
- Delete: `src/entities/EnemyFactory.ts` (folded into EnemyManager)
- Create: `src/entities/enemyBehaviors.ts`, `src/core/time.ts`
- Test: `src/core/time.test.ts`, `src/entities/enemyBehaviors.test.ts`

**Interfaces:**
- Consumes: `buildSpawnSchedule`, `dueEvents`, `scaleEnemy`, `waveDuration` (Task 2), `createRng` (Task 1).
- Produces (types): `type EnemyBehavior = "chaser" | "dasher" | "tank" | "shooter" | "exploder"`; `interface EnemyDef { id: string; name: string; hp: number; damage: number; speed: number; scrap: number; behavior: EnemyBehavior; sprite: string; radius: number; params?: Record<string, number> }`. Starting values: pea 20 hp/4 dmg/90 spd chaser; pepper 15/5/70 dasher (`dashSpeed 320`, `dashEvery 2.5`, `dashTime 0.35`); potato 80/8/45 tank (immune to knockback); carrot 25/5/60 shooter (`range 260`, `fireEvery 2`, `boltSpeed 220`, keeps distance ~200); tomato 18/0/85 exploder (`blastRadius 70`, `blastDamage 12`, explodes on death and on touching the player). Scrap: 1 for pea/pepper/tomato, 2 carrot, 3 potato.
- Produces: `createEnemyState(def: EnemyDef, wave: number): EnemyState` → `{ hp, maxHp, damage, timer: 0, phase: "move" }` (hp/damage via `scaleEnemy`; new object every call).
- Produces: `steer(behavior: EnemyBehavior, state: EnemyState, self: Vector2, player: Vector2, dt: number, params: Record<string, number>): { vx: number; vy: number; fire: boolean }` — pure; `EnemyManager` applies it.
- Produces: `clampDelta(ms: number): number` → `Math.min(ms, 100)` in `src/core/time.ts`.
- Produces: `EnemyManager` API: `startWave(wave: number, rng: Rng)`, `update(dtMs: number, elapsedS: number, player: Vector2)`, `damageEnemy(enemy, amount, crit: boolean)`, `getEnemyGroup()`, `getEnemyProjectileGroup()`, `clearAll()` (no death effects, no drops). Emits on scene events: `enemyKilled(x, y, def: EnemyDef)`, `enemyExploded(x, y, radius, damage)`, `enemyHit(enemy, amount, crit)`.
- Spawning: each `SpawnEvent` places a telegraph marker at a random point inside the arena edge band (40 px in from the bounds, ≥ 160 px from the player), then spawns the enemies there after 0.6 s. Pool max 250 enemies.

- [ ] **Step 1: Write failing tests**:
  - `time.test.ts`: `clampDelta(16) === 16`, `clampDelta(5000) === 100` (Review Focus 3).
  - `enemyBehaviors.test.ts`:
    - `createEnemyState returns fresh objects` (Review Focus 1): two calls return `!==` objects; mutating one's `hp` leaves the other at `maxHp`.
    - `createEnemyState scales by wave`: pea at wave 5 → `hp 40`.
    - `chaser moves toward player`: self `(0,0)`, player `(100,0)`, speed 90 → `vx ≈ 90, vy ≈ 0`.
    - `dasher dashes after dashEvery`: after accumulated `dt` ≥ 2.5 s, returned speed magnitude ≈ 320 for 0.35 s, then back to 70.
    - `shooter keeps distance and fires`: at distance 100 it moves away; at distance 220 with timer ≥ 2 it returns `fire: true`.
- [ ] **Step 2: Run** `npx vitest run src/core/time.test.ts src/entities/enemyBehaviors.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `time.ts`, `enemyBehaviors.ts`; rewrite `EnemyManager` (pooled group via `get()` + `enableBody`, state stored with `setData("state", createEnemyState(...))`, knockback ignored for `tank`, carrot bolts in an enemy projectile pool of 100); in `GameScene.update` use `clampDelta(delta) * gameSpeed` and drive `EnemyManager.update` with elapsed wave time; round length from `waveDuration(run.wave)`; wire overlaps for enemy bolts → player and `enemyExploded` → player damage if within radius.
- [ ] **Step 4: Run** `npx tsc --noEmit && npx vitest run` — expect PASS. Then `npm run dev`, play wave 1 and wave 5 (set `run.wave` via `window.game` in the console): enemies appear after a telegraph at the edges, peppers dash, carrots shoot and keep distance, tomatoes explode.
- [ ] **Step 5: Commit** `feat: vegetable enemies with pooled spawning and behaviours`.

### Task 5: Scrap, XP pickups and wave end

**Files:**
- Create: `src/managers/PickupManager.ts`
- Delete: `src/managers/CoinManager.ts`
- Modify: `src/scenes/GameScene.ts`, `src/scenes/UIScene.ts` (XP bar + level + scrap), `src/scenes/ShopScene.ts` (use `run.scrap`, no CoinManager), `src/config/constants.ts` (`PICKUP_RADIUS: 80`, `MAGNET_SPEED: 420`)

**Interfaces:**
- Consumes: `enemyKilled(x, y, def)` (Task 4), `addXp` (Task 3).
- Produces: `PickupManager` with `spawnScrap(x: number, y: number, amount: number)`, `update(player: Vector2)` (pulls pickups within `PICKUP_RADIUS` toward the player at `MAGNET_SPEED`), `collectAll(): number` (returns total value and clears), `getGroup()`. Emits `scrapCollected(value)`. Each scrap gives `value` scrap and `value` XP. Pool max 300.
- Wave end in `GameScene.onRoundComplete`: `enemyManager.clearAll()` and clear enemy bolts first (Review Focus 5), then `collectAll()`, apply XP via `addXp` (adds `levelsGained` to `run.pendingLevelUps`), then show the summary.

- [ ] **Step 1: Implement** `PickupManager` and the wiring above; HUD shows XP bar (violet), `LV n`, scrap count.
- [ ] **Step 2: Run** `npx tsc --noEmit && npx vitest run` — expect PASS.
- [ ] **Step 3: Manual check** with `npm run dev`: scrap is pulled in when close; at wave end leftover scrap is added to the counter; a tomato killed in the last second does not damage the player after the banner (Review Focus 5); scrap and level carry into the next wave.
- [ ] **Step 4: Commit** `feat: scrap and xp pickups with magnet`.

### Task 6: Juice

**Files:**
- Create: `src/fx/Juice.ts`, `src/core/settings.ts`
- Modify: `src/scenes/GameScene.ts`, `src/managers/EnemyManager.ts`, `src/managers/PlayerManager.ts`, `src/managers/WeaponManager.ts` (crit roll: 5% base, ×1.5 damage, using the run RNG)
- Test: `src/core/settings.test.ts`

**Interfaces:**
- Consumes: `THEME` (Task 1), `enemyHit` / `enemyKilled` (Task 4).
- Produces: `class Juice { constructor(scene: Phaser.Scene); damageNumber(x: number, y: number, amount: number, crit: boolean): void; hitFlash(sprite: Phaser.GameObjects.Sprite): void; shake(kind: "hit" | "kill"): void; deathBurst(x: number, y: number, color: number): void; lowHp(ratio: number): void; banner(text: string): void }`.
- Produces: `interface Settings { reducedShake: boolean }`, `loadSettings(storage?: Pick<Storage, "getItem">): Settings`, `saveSettings(s: Settings, storage?: Pick<Storage, "setItem">): void` — key `vv.settings`; wraps storage access in try/catch and falls back to `{ reducedShake: false }`.
- Values: damage numbers float up 24 px and fade over 600 ms (pooled Text objects, max 60), crits in `signal` at 1.5× size; hit flash = white tint 60 ms; shake `hit` = 120 ms / 0.006, `kill` = 80 ms / 0.003 only for potato kills; `reducedShake` disables both; death burst = 8 pixel particles in the enemy colour; low-HP vignette = `danger` edge overlay pulsing under 25% HP; banner = `WAVE 07` at wave start and `WAVE CLEARED` at wave end, Orbitron-style big text in `signal`.

- [ ] **Step 1: Write failing tests** in `src/core/settings.test.ts`:
  - `defaults when storage empty`: `loadSettings({getItem: () => null})` → `{reducedShake: false}`.
  - `defaults when storage throws`: a `getItem` that throws → `{reducedShake: false}`.
  - `round trip`: saving `{reducedShake: true}` into a Map-backed fake, then loading it → `{reducedShake: true}`.
  - `defaults on bad JSON`: `getItem` returns `"{oops"` → defaults.
- [ ] **Step 2: Run** `npx vitest run src/core/settings.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `settings.ts` and `Juice.ts`; call it from the hit/kill/player-damage/wave-start/wave-end points.
- [ ] **Step 4: Run** `npx tsc --noEmit && npx vitest run` — expect PASS; manual check in `npm run dev` that numbers, crits, flash, shake, bursts, vignette and banners all show, and that setting `localStorage["vv.settings"] = '{"reducedShake":true}'` stops the shake.
- [ ] **Step 5: Commit** `feat: hit and kill feedback`.

### Task 7: Performance pass

**Files:**
- Modify: `src/scenes/GameScene.ts` (dev-only: `F2` spawns 150 peas in one go; `F3` toggles an FPS readout), `src/config/gameConfig.ts` (`physics.arcade.debug` off by default, on with `?debug` in the URL)

- [ ] **Step 1: Implement** the dev keys behind `import.meta.env.DEV`, and the `?debug` switch.
- [ ] **Step 2: Measure** in `npm run dev`: press `F2` on wave 5 with the pistol firing; FPS readout stays ≥ 55 for 20 s. If not, profile (Chrome Performance) and remove per-frame allocations in `EnemyManager.update`, `steer` callers and `PickupManager.update` (reuse vectors, iterate `children.entries` with index loops).
- [ ] **Step 3: Run** `npm run build && npx vitest run` — expect PASS.
- [ ] **Step 4: Commit** `perf: hold 60fps with 150 enemies`.
