# Veggie Vendetta — Milestone 2 (Build-crafting) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each run play differently: a derived stat block, 6 weapon behaviours with tiers 1–4 in 6 slots, 15 passive items, level-up picks (1 of 4) and a real shop (4 offers, reroll, lock, sell, combine), plus a starting-weapon pick.

**Architecture:** All rules live in pure, tested modules under `src/core/` (`stats`, `weapons`, `inventory`, `shop`, `levelup`, `run`); scenes only render and forward input. `RunState` becomes the single source of the build (weapons, items, level-up mods, locked offers) and `computeStats(run)` is the only place stats are derived. `WeaponManager` is rewritten around per-behaviour fire functions that use pure geometry helpers in `src/entities/weaponBehaviors.ts`. Content is JSON under `assets/data/`.

**Tech Stack:** Phaser 3.90, TypeScript (strict), Vite 5, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md` (roadmap and M1 carry-overs: `docs/superpowers/plans/2026-10-18-m1-waves-and-feel.md`).

## Global Constraints

- Keep Phaser 3.90 + TypeScript strict + Vite + Vitest; canvas 800×600 logical; keyboard WASD/arrows.
- Content is data: adding a weapon, item or enemy is a JSON change plus at most one behaviour function. No content in scene code.
- Stats are computed by a pure function `computeStats(run)`; HUD, shop and level-up previews call it, nothing else derives stats.
- Stats: max HP, HP regen, armor, dodge %, move speed, damage %, melee/ranged/elemental damage, attack speed %, crit %, range, pickup radius, luck (rarity rolls), harvesting (bonus scrap at wave end).
- Level-up: each level gained during a wave grants one pick, resolved after the wave: 1 of 4 random stat upgrades, rarity-weighted, paid reroll.
- Shop: 4 random offers (weapons + items, weighted by wave and rarity); reroll cost starts low and rises each reroll within a visit; lock keeps an offer into the next shop; weapons sell for part of their price.
- Weapons: up to **6** slots, tiers 1–4. Only two copies of the same weapon at the same tier merge, into tier+1. Free slot + duplicate → second copy. In the shop any matching pair can be combined at any time. All slots full + a match at the same tier → buying merges automatically. No match → can't be bought until a slot is freed.
- Weapons sit around the player and each targets the nearest enemy in its range.
- Seeded RNG (`createRng`) for shop, level-up and spawn rolls; combat rolls stay on the separate combat stream.
- Shop and level-up are fully mouse- and keyboard-usable and show stat previews on hover/focus.
- 60 fps with ~150 enemies + projectiles: pooled objects, no per-frame allocations in hot loops.
- Don't regress PR #13: reset per-run fields in `create()`, `disableBody`/`enableBody` for pooled sprites, remove scene event listeners on shutdown.
- UI uses `THEME`/`THEME_CSS` colours (lime = actions/good, pink = state/owned, danger `#ff6b3d`, tier colours for rarity). Layouts are functional placeholders; M3 restyles them per the mockups.
- CI (`npm run build`, `npm run test:coverage`) stays green.

## Review Focus

1. **Stacked trade-offs** — enough `−speed`, `−attackSpeed`, `−maxHp`, `−armor` items must never give 0/negative max HP, backwards movement, or a zero/negative weapon cooldown (division by `1 + attackSpeed/100`). Owned by Task 2 (`computeStats` clamps; test) and Task 3 (cooldown floor; test).
2. **Locked offer that became unbuyable** — a weapon locked last shop whose slots are now full with no match must reappear disabled with a reason, not crash, not charge, and stay unlockable. Owned by Task 5 (test).
3. **Refused actions change nothing** — buying or rerolling without enough scrap leaves scrap, offers and the RNG untouched (no draw, so the seed stays reproducible); exact-cost purchases succeed and scrap never goes negative. Owned by Task 5 (tests).
4. **Empty roll pools** — a rarity tier with no items falls back to the nearest lower tier that has some; `rng.pick([])` throws instead of returning `undefined`. Owned by Task 5 (tests).
5. **Several pending level-ups / a new run after quitting** — 3 levels in one wave give exactly 3 picks before the shop; quitting to the menu and starting again gives fresh weapons, items, mods and locks (no shared arrays). Owned by Task 7 (pending test) and Task 2 (`newRun` freshness test).

---

### Task 1: M1 carry-overs (feel, seed, perf)

**Files:**
- Modify: `src/entities/enemyBehaviors.ts`, `src/core/waves.ts`, `src/managers/EnemyManager.ts`, `src/fx/Juice.ts`, `src/scenes/GameScene.ts`, `src/scenes/BootScene.ts` (4×4 white `pixel` texture)
- Test: `src/entities/enemyBehaviors.test.ts`, `src/core/waves.test.ts`

**Interfaces:**
- Produces: `EnemyState` gains `dirX: number; dirY: number` (0 in `createEnemyState`). While `phase === "dash"`, `steer` moves along the direction locked at dash start.
- Produces: `edgePoint(u: number, player: Vector2, width: number, height: number, inset: number, minDist: number): Vector2` in `src/core/waves.ts` — maps `u ∈ [0,1)` onto the rectangle `inset` px inside the arena (perimeter walk as in today's `pickEdgePoint`); if the point is closer than `minDist` to the player, returns the point half a perimeter further on. `EnemyManager.pickEdgePoint` becomes one `rng.next()` draw + `edgePoint`, so each telegraph draws exactly `1 + 2·count` values.
- Produces: `EnemyManager.killEnemy(enemy: Sprite, drops = true)`; `enemyKilled` gains a 4th arg `drops: boolean`. Tomato contact detonation calls `killEnemy(enemy, false)`: it still explodes and counts as a kill but drops no scrap/XP (ends i-frame farming).

- [ ] **Step 1: Write failing tests**:
  - `enemyBehaviors.test.ts` → `dasher keeps its dash direction`: start a dash with player at `(100,0)`, then move the player to `(0,100)` mid-dash; `vx ≈ 320, vy ≈ 0` until `dashTime` ends.
  - `waves.test.ts` → `edgePoint is on the inset rectangle`: for `u` in `[0, 0.1, …, 0.9]` with player far away, each point has `x ∈ {40, 760}` or `y ∈ {40, 560}`.
  - `waves.test.ts` → `edgePoint keeps minDist`: for 50 `u` values and player positions on a 9×9 grid over 800×600 (`inset 40`, `minDist 160`), every result is ≥ 160 from the player.
- [ ] **Step 2: Run** `npx vitest run src/entities/enemyBehaviors.test.ts src/core/waves.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** the three interface changes. Perf items in the same step:
  - `Juice.deathBurst(x, y, color)` uses one `scene.add.particles(0, 0, "pixel", { emitting: false, speed: 80, lifespan: 350, alpha: { start: 1, end: 0 } })` emitter: set `particleTint = color`, then `explode(8, x, y)`. Depth `DEPTH.ENEMIES + 1` (fixes bursts under actors).
  - `GameScene` caches burst colours in a `Map<string, number>` built once in `create()` from `enemies.json` (`HexStringToColor` no longer per kill).
  - `GameScene.update` reads the player sprite once per frame and passes it (it is a `Vector2`) instead of calling `getPosition()` three times.
  - `Juice.damageNumber` keeps two pools (normal 24 px text colour, crit 36 px lime), styled once at creation, so a hit only calls `setText`.
- [ ] **Step 4: Run** `npx tsc --noEmit && npx vitest run` — expect PASS. `npm run dev`: peppers dash in a straight line; walking into a tomato during i-frames drops nothing; F2 still holds ≥ 55 fps.
- [ ] **Step 5: Commit** `fix: m1 carry-overs (dash lock, tomato farming, fixed spawn draws, pooled bursts)`.

### Task 2: Stats, items and run state

**Files:**
- Create: `src/core/stats.ts`, `src/core/run.ts`, `assets/data/items.json`
- Modify: `src/types/index.ts`, `src/types/json.d.ts`, `src/managers/PlayerManager.ts`, `src/managers/PickupManager.ts`, `src/scenes/GameScene.ts`, `src/scenes/UIScene.ts`, `src/scenes/ShopScene.ts` (remove the 3 hardcoded upgrades; it keeps only "START NEXT ROUND" until Task 6)
- Delete: `src/managers/ShopManager.ts`; unused types `PlayerStats`, `ShopItem`, `WeaponData`, `GameConfig`
- Test: `src/core/stats.test.ts`, `src/core/run.test.ts`

**Interfaces:**
- Produces (types):
  - `type StatKey = "maxHp" | "hpRegen" | "armor" | "dodge" | "speed" | "damage" | "melee" | "ranged" | "elemental" | "attackSpeed" | "crit" | "range" | "pickupRadius" | "luck" | "harvesting"`; `type Stats = Record<StatKey, number>`; `type Mods = Partial<Stats>`.
  - `type Tier = 1 | 2 | 3 | 4`; `interface OwnedWeapon { id: string; tier: Tier }`; `interface Offer { kind: "weapon" | "item"; id: string; tier: Tier; price: number }`.
  - `interface ItemDef { id: string; name: string; rarity: Tier; price: number; mods: Mods }`.
  - `RunState` = `{ wave; scrap; xp; level; pendingLevelUps; seed; weapons: OwnedWeapon[]; items: string[]; levelMods: Mods; lockedOffers: Offer[] }` (`bonus` removed; `items` repeats allowed).
- Produces (`src/core/stats.ts`): `BASE_STATS: Stats` (`maxHp 100`, `pickupRadius 80`, all else 0); `computeStats(run: Pick<RunState, "items" | "levelMods">, items: Record<string, ItemDef> = itemDefs): Stats` = base + Σ item mods + `levelMods`, then clamps `maxHp ≥ 1`, `dodge ≤ 60`, `speed ≥ −50`, `attackSpeed ≥ −50`, `crit ∈ [0, 100]`, `pickupRadius ≥ 20`; `damageTaken(raw: number, armor: number): number` = `max(1, round(raw × (armor ≥ 0 ? 15/(15+armor) : (15−armor)/15)))`; `statDiff(a: Stats, b: Stats): [StatKey, number][]` (non-zero `b−a`, in `StatKey` order); `STAT_LABELS: Record<StatKey, string>`.
- Produces (`src/core/run.ts`): `newRun(seed: number, weaponId: string): RunState` — wave 1, level 1, `weapons: [{ id: weaponId, tier: 1 }]`, empty `items`/`levelMods`/`lockedOffers`, all new objects.
- Produces: `PlayerManager.create(stats: Stats, rng: Rng)` — move speed `160 × (1 + speed/100)`; `takeDamage(raw)` rolls dodge (`rng.next() < dodge/100` → no damage, emits `playerDodged`) then applies `damageTaken`; regen heals `hpRegen / 5` HP per second (fractional accumulator, capped at max). `PickupManager.update(player: Vector2, radius: number)`.
- Wave end, after the `addXp` call: `run.scrap += stats.harvesting` and add it to the `scrapEarned` passed to Victory (scrap only, never XP).
- `items.json` = `Record<string, ItemDef>`, exactly these 15 (rarity, base price, mods):

| id | name | r | price | mods |
|---|---|---|---|---|
| visor | Cyber Visor | 1 | 12 | crit +5 |
| grip | Grip Tape | 1 | 10 | attackSpeed +8 |
| synthsteak | Synth Steak | 1 | 10 | maxHp +8 |
| hoodie | Kevlar Hoodie | 1 | 14 | armor +2, speed −3 |
| sneakers | Neon Sneakers | 1 | 12 | speed +6 |
| coil | Magnet Coil | 1 | 10 | pickupRadius +30 |
| chip | Lucky Chip | 1 | 12 | luck +10 |
| nanopatch | Nano Patch | 2 | 25 | hpRegen +3 |
| overclock | Overclock Chip | 2 | 30 | attackSpeed +18, maxHp −5 |
| knuckles | Brass Knuckles | 2 | 25 | melee +4 |
| scope | Scope Lens | 2 | 25 | ranged +3, range +40 |
| harvester | Scrap Harvester | 2 | 30 | harvesting +6 |
| plasma | Plasma Cell | 3 | 50 | elemental +6, damage +5 |
| glass | Glass Cannon Implant | 3 | 55 | damage +25, maxHp −20, armor −2 |
| ghost | Ghost Module | 4 | 90 | dodge +15, speed +10, maxHp −10 |

- [ ] **Step 1: Write failing tests**:
  - `stats.test.ts`: `base stats with nothing owned` → equals `BASE_STATS`; `items stack`: `items: ["visor","visor"]` → `crit 10`; `levelMods add`: `levelMods {armor: 3}` + `hoodie` → `armor 5, speed −3`; `clamps stacked trade-offs` (Review Focus 1): 10× `glass` + `levelMods {speed: −80, attackSpeed: −90, dodge: 200}` → `maxHp 1, speed −50, attackSpeed −50, dodge 60`; `damageTaken`: `(10, 0) → 10`, `(10, 15) → 5`, `(10, −15) → 20`, `(1, 100) → 1`; `statDiff`: adding `overclock` → `[["maxHp", −5], ["attackSpeed", 18]]`; `items.json is valid`: 15 entries, `id` matches key, every mod key is a `StatKey`, rarity 1–4, price > 0.
  - `run.test.ts` (Review Focus 5): two `newRun(1, "pistol")` results share no array/object (`!==` on `weapons`, `items`, `levelMods`, `lockedOffers`); pushing to one leaves the other empty.
- [ ] **Step 2: Run** `npx vitest run src/core/stats.test.ts src/core/run.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** the modules and types, write `items.json`, wire `computeStats(run)` into `GameScene.create()` (player, pickup radius, harvesting), `GameScene.init` falls back to `newRun(seed, "pistol")`. The old `WeaponManager` stays as is until Task 3 (call `create(combatRng, 0)`). `getPlayerStats()` drops `speed`/`damage` and adds `stats: Stats`; the HUD stats panel shows `HP`, `Armor`, `Dodge`, `Dmg %`, `Atk spd %`, `Crit %`, `Speed` from it.
- [ ] **Step 4: Run** `npx tsc --noEmit && npx vitest run` — expect PASS; `npm run dev`: a run plays wave 1 → shop (empty) → wave 2.
- [ ] **Step 5: Commit** `feat: computeStats, items and build run state`.

### Task 3: Weapon data, weapon stats and projectile weapons

**Files:**
- Create: `src/core/weapons.ts`, `src/entities/weaponBehaviors.ts`
- Modify: `assets/data/weapons.json` (replace), `src/types/index.ts`, `src/types/json.d.ts`, `src/managers/WeaponManager.ts` (rewrite), `src/scenes/GameScene.ts` (drop its projectile↔enemy overlap), `src/scenes/BootScene.ts` (placeholder textures `weapon_<id>` 12×6, `proj_pellet`, `proj_rocket`), `src/fx/Juice.ts` (`blast`)
- Test: `src/core/weapons.test.ts`, `src/entities/weaponBehaviors.test.ts`

**Interfaces:**
- Produces (types): `type WeaponBehavior = "projectile" | "spread" | "beam" | "melee-arc" | "orbital" | "explosive"`; `interface WeaponDef { id: string; name: string; behavior: WeaponBehavior; tags: ("melee" | "ranged" | "elemental")[]; damage: [number, number, number, number]; cooldown: [number, number, number, number]; range: number; price: number; scaling: { stat: "melee" | "ranged" | "elemental"; ratio: number }; params: Record<string, number> }`.
- Produces (`src/core/weapons.ts`): `MAX_WEAPONS = 6`; `MIN_COOLDOWN = 0.1`; `BASE_CRIT = 0.05`; `CRIT_MULT = 1.5`; `TIER_PRICE = [1, 2, 4, 7]`;
  `weaponStats(def: WeaponDef, tier: Tier, stats: Stats): { damage: number; cooldown: number; range: number; critChance: number }` — `damage = max(1, round((def.damage[t] + stats[def.scaling.stat] × ratio) × (1 + stats.damage/100)))`, `cooldown = max(MIN_COOLDOWN, def.cooldown[t] / (1 + stats.attackSpeed/100))`, `range = def.range + stats.range`, `critChance = BASE_CRIT + stats.crit/100`;
  `waveScale(wave: number): number` = `1 + 0.1·(wave−1)`; `weaponPrice(def, tier, wave): number` = `round(def.price × TIER_PRICE[tier−1] × waveScale(wave))`; `sellPrice(def, tier, wave): number` = `floor(weaponPrice(...) / 2)`.
- Produces (`src/entities/weaponBehaviors.ts`, pure): `nearestInRange<T extends Vector2>(from: Vector2, range: number, list: readonly T[]): T | null`; `slotOffset(index: number, count: number, radius = 28): Vector2` (evenly on a circle, slot 0 at angle 0); `spreadAngles(base: number, pellets: number, spreadDeg: number, out: number[]): number[]` (centred, `pellets 1 → [base]`); `inArc(origin: Vector2, facing: number, arcDeg: number, range: number, p: Vector2): boolean`; `onBeam(origin: Vector2, angle: number, length: number, halfWidth: number, p: Vector2): boolean`.
- Produces: `type HitFn = (enemy: Sprite, damage: number, crit: boolean, angle: number, knockback: number) => void`; `WeaponManager.create(o: { weapons: OwnedWeapon[]; stats: Stats; rng: Rng; enemyGroup: Phaser.Physics.Arcade.Group; hit: HitFn })` (registers its own projectile↔enemy overlap); `update(dtMs: number, player: Vector2, enemies: Sprite[])`; `clear()` (wave end). One equipped entry per owned weapon with a precomputed `weaponStats`, a sprite at `player + slotOffset(i, n)`, and a cooldown timer; it fires only when `nearestInRange` from its slot finds a target. `Juice.blast(x: number, y: number, radius: number)` — pooled `Arc` (max 8), scale 0.3→1, fade 200 ms.
- Behaviours in this task: `projectile` (one bolt, `params.pierce` extra hits), `spread` (`params.pellets` bolts over `params.spread`°), `explosive` (rocket; on first enemy hit or at max range, every enemy within `params.blastRadius` takes the damage once; `Juice.blast`). Projectile pool max 200. Crit rolls use the combat RNG. `GameScene`'s `hit` = `enemyManager.knockback` + `damageEnemy`.
- `weapons.json` = `Record<string, WeaponDef>`, exactly:

| id | name | behaviour | tags | damage t1–t4 | cooldown t1–t4 (s) | range | price | scaling | params |
|---|---|---|---|---|---|---|---|---|---|
| pistol | Neon Pistol | projectile | ranged | 12 18 26 38 | 0.9 0.8 0.7 0.6 | 320 | 15 | ranged×1 | speed 520, pierce 0, knockback 50 |
| shotgun | Scrap Shotgun | spread | ranged | 6 9 13 18 | 1.3 1.2 1.1 1.0 | 220 | 20 | ranged×0.6 | speed 480, pellets 5, spread 40, knockback 70 |
| laser | Photon Laser | beam | elemental | 9 14 20 30 | 1.6 1.5 1.3 1.1 | 360 | 25 | elemental×1 | width 10, duration 0.15, knockback 0 |
| blade | Mono Blade | melee-arc | melee | 20 30 44 64 | 1.0 0.9 0.8 0.7 | 90 | 15 | melee×1.5 | arc 120, knockback 120 |
| drone | Hover Drone | orbital | ranged | 8 12 17 25 | 0.5 0.45 0.4 0.35 | 70 | 25 | ranged×0.5 | orbitSpeed 3, hitRadius 14, knockback 30 |
| rocket | Pulse Rocket | explosive | elemental | 16 24 35 50 | 1.8 1.7 1.5 1.3 | 380 | 30 | elemental×0.8 | speed 360, blastRadius 60, knockback 90 |

- [ ] **Step 1: Write failing tests**:
  - `weapons.test.ts`: `tier 1 pistol, base stats` → `{damage 12, cooldown 0.9, range 320, critChance 0.05}`; `scaling and damage %`: pistol t2 with `ranged 4, damage 50` → `damage 33`; `cooldown floor` (Review Focus 1): blade t4 with `attackSpeed 1000` → `cooldown 0.1`, and with `attackSpeed −50` → `1.4`; `weaponPrice`: pistol t1 wave 1 → 15, t3 wave 6 → 90; `sellPrice` pistol t1 wave 1 → 7; `weapons.json is valid`: 6 entries, `id` matches key, all six behaviours appear once, `damage`/`cooldown` have 4 entries, damage strictly increasing.
  - `weaponBehaviors.test.ts`: `nearestInRange` picks the closer of two, returns `null` when all are beyond range; `slotOffset(0, 4)` ≈ `(28, 0)`, `slotOffset(1, 4)` ≈ `(0, 28)`; `spreadAngles(0, 5, 40, [])` → `[−20°, −10°, 0, 10°, 20°]` in radians, `pellets 1` → `[0]`; `inArc` true at 30° off-facing within range, false at 90° with `arcDeg 120`, false beyond range; `onBeam` true for a point 4 px off the line inside length, false 20 px off, false behind the origin.
- [ ] **Step 2: Run** `npx vitest run src/core/weapons.test.ts src/entities/weaponBehaviors.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** the modules, `weapons.json`, and the `WeaponManager` rewrite for the three behaviours above (`beam`, `melee-arc`, `orbital` log once and don't fire until Task 4). `GameScene` passes `run.weapons`; `clear()` runs in `onRoundComplete` next to `enemyManager.clearAll()`.
- [ ] **Step 4: Run** `npx tsc --noEmit && npx vitest run` — expect PASS; `npm run dev` with `run.weapons` set from the console to pistol + shotgun + rocket: each fires from its own slot at the nearest enemy in range; rockets blast.
- [ ] **Step 5: Commit** `feat: weapon data, tiers and projectile weapons`.

### Task 4: Beam, melee-arc and orbital weapons

**Files:**
- Modify: `src/managers/WeaponManager.ts`, `src/scenes/BootScene.ts` (`weapon_drone` texture)

**Interfaces:**
- Consumes: `weaponStats`, `HitFn`, `inArc`, `onBeam`, `nearestInRange` (Task 3).
- `beam`: on fire, every active enemy with `onBeam(slot, angleToTarget, range, width/2 + enemy radius)` is hit once; one `Graphics` per laser draws the line in `THEME.tier[1]`, alpha fades over `params.duration`.
- `melee-arc`: fires when a target is within range of the player; every enemy `inArc(player, angleToTarget, arc, range)` is hit once; one `Graphics` per blade draws the arc slice for 100 ms.
- `orbital`: the drone sprite circles the player at radius `range` at `orbitSpeed` rad/s (each drone phase-offset by its slot); an enemy within `hitRadius + enemy radius` of the drone is hit at most once per `cooldown` per drone (per-enemy timestamp in the drone's `Map<Sprite, number>`, cleared on `clear()`).
- No per-frame allocations: reuse scratch vectors and the `Graphics` objects.

- [ ] **Step 1: Implement** the three behaviours.
- [ ] **Step 2: Run** `npx tsc --noEmit && npx vitest run` — expect PASS.
- [ ] **Step 3: Manual check** `npm run dev` with 6 weapons set from the console (one of each): laser pierces a line of peas, blade hits only the front arc and knocks back, drones circle and tick enemies, no enemy takes more than one hit per drone per cooldown. Then F2 (150 peas) on wave 5 with all 6: F3 readout ≥ 55 fps for 20 s.
- [ ] **Step 4: Commit** `feat: beam, melee-arc and orbital weapons`.

### Task 5: Inventory and shop rules

**Files:**
- Create: `src/core/inventory.ts`, `src/core/shop.ts`
- Modify: `src/core/rng.ts` (`pick` throws `Error("pick from empty list")` on `[]`)
- Test: `src/core/inventory.test.ts`, `src/core/shop.test.ts`, `src/core/rng.test.ts`

**Interfaces:**
- Consumes: `Offer`, `OwnedWeapon`, `RunState`, `ItemDef` (Task 2); `WeaponDef`, `MAX_WEAPONS`, `weaponPrice`, `sellPrice`, `waveScale` (Task 3).
- Produces (`src/core/inventory.ts`, mutate `weapons` in place):
  - `weaponBuyMode(weapons: OwnedWeapon[], id: string, tier: Tier): "add" | "merge" | "blocked"` — free slot → `add`; full and a same id+tier copy with tier < 4 → `merge`; else `blocked`.
  - `addWeapon(weapons, id, tier): "add" | "merge" | "blocked"` — merge upgrades the first matching copy to tier+1 (no chain merges).
  - `combinePairs(weapons): [number, number][]` — index pairs of same id+tier, tier < 4, each weapon in at most one pair.
  - `combine(weapons, i, j): boolean` — `i` becomes tier+1, `j` removed; false if not a valid pair.
  - `sellWeapon(run: RunState, i: number, defs?): number` — adds `sellPrice(def, tier, run.wave)` to scrap and removes it; returns 0 and does nothing when it is the last weapon.
- Produces (`src/core/shop.ts`):
  - `rarityWeights(wave: number, luck: number): [number, number, number, number]` — with `m = max(0, 1 + luck/100)`: `p2 = wave ≥ 2 ? min(0.08·(wave−1), 0.5)·m : 0`, `p3 = wave ≥ 4 ? min(0.04·(wave−3), 0.25)·m : 0`, `p4 = wave ≥ 8 ? min(0.02·(wave−7), 0.08)·m : 0`, `p1 = max(0, 1 − p2 − p3 − p4)`, then normalised to sum 1.
  - `rollTier(rng: Rng, weights): Tier` — exactly one `rng.next()`.
  - `rerollCost(wave: number, rerolls: number): number` = `1 + floor(wave/2) + 2·rerolls`.
  - `itemPrice(def: ItemDef, wave: number): number` = `round(def.price × waveScale(wave))`.
  - `rollOffer(rng, wave, luck): Offer` — tier via `rollTier`; weapon with probability 0.35 (any weapon def at that tier), else an item of that rarity, falling back to the nearest lower rarity with items (Review Focus 4).
  - `interface ShopState { offers: (Offer | null)[]; locked: boolean[]; rerolls: number }`
  - `openShop(run, rng, luck): ShopState` — `run.lockedOffers` fill the first slots (locked, keeping their price), the rest rolled; 4 slots.
  - `reroll(state, run, rng, luck): boolean` — refused (no scrap change, no RNG draw) if `run.scrap < rerollCost`; else charges, re-rolls every unlocked slot (bought slots too), `rerolls++`.
  - `toggleLock(state, i): void` (no-op on an empty slot).
  - `offerStatus(state, run, i): "ok" | "poor" | "blocked" | "empty"` — `blocked` when a weapon offer's `weaponBuyMode` is `blocked`.
  - `buy(state, run, i): "add" | "merge" | "item" | "poor" | "blocked" | "empty"` — on success charges `price`, applies `addWeapon` or `run.items.push`, empties the slot and unlocks it.
  - `closeShop(state, run): void` — `run.lockedOffers` = the locked, non-empty offers.

- [ ] **Step 1: Write failing tests**:
  - `rng.test.ts`: `pick([])` throws (Review Focus 4).
  - `inventory.test.ts`: `add with a free slot` (duplicate pistol t1 → 2 copies); `merge when full` (6 weapons incl. pistol t1, buy pistol t1 → `merge`, still 6, one pistol t2); `blocked when full and no match` and `blocked when full and match is tier 4`; `no chain merge` (full with pistol t1 + pistol t2, buying pistol t1 → one pistol t2 + one pistol t2, no t3); `combinePairs` on `[p1, p1, p1, s1, s1]` → `[[0,1],[3,4]]`; `combine rejects mismatched tiers`; `sellWeapon` adds `sellPrice` and removes it; `cannot sell the last weapon` → returns 0, weapons unchanged.
  - `shop.test.ts`: `rarityWeights(1, 0)` → `[1,0,0,0]`; wave 10 sums to 1 with all four > 0; luck 100 gives a larger `p4` than luck 0 at wave 10; luck 1000 → `p1 0`, sum 1; luck −200 → wave 10 `[1,0,0,0]`. `rerollCost(1, 0..2)` → `1, 3, 5`; `rerollCost(6, 0)` → 4. `rollOffer` with a fake rng forcing tier 4 and the item branch returns `ghost`; with item defs stripped of rarity 3 and a forced tier 3, returns a rarity-2 item (Review Focus 4). `openShop` keeps two locked offers in slots 0–1 with their old price and rolls slots 2–3. `refused reroll changes nothing` (Review Focus 3): scrap below cost → returns false, same offers, same `scrap`, and a spy rng's `next` is not called. `reroll keeps locked slots and refills bought ones`. `exact-cost buy succeeds` → scrap 0; `poor buy changes nothing`. `locked weapon that became unbuyable` (Review Focus 2): lock a `shotgun` t1 offer, close, fill `run.weapons` to 6 non-shotguns, reopen → slot 0 is that offer, `offerStatus` → `blocked`, `buy` → `blocked` and scrap unchanged, `toggleLock` still works. `closeShop` stores only locked non-empty offers.
- [ ] **Step 2: Run** `npx vitest run src/core` — expect FAIL.
- [ ] **Step 3: Implement** `inventory.ts`, `shop.ts`, the `pick` guard. Defs default to the JSON imports and are injectable for tests (last optional parameter).
- [ ] **Step 4: Run** `npx vitest run src/core` — expect PASS.
- [ ] **Step 5: Commit** `feat: shop rolls, reroll, lock, merge and sell rules`.

### Task 6: Shop scene

**Files:**
- Modify: `src/scenes/ShopScene.ts` (rewrite)

**Interfaces:**
- Consumes: `openShop`, `reroll`, `toggleLock`, `offerStatus`, `buy`, `closeShop`, `rerollCost` (Task 5); `combinePairs`, `combine`, `sellWeapon` (Task 5); `computeStats`, `statDiff`, `STAT_LABELS` (Task 2); `weaponStats`, `sellPrice` (Task 3).
- Shop RNG: `createRng(run.seed + run.wave * 1009)`; luck from `computeStats(run).luck`.
- Layout (800×600, placeholder): scrap top-right; 4 offer cards (name, tier chip in `THEME.tier[tier−1]`, price in lime or danger when `poor`, `NO SLOT` when `blocked`, mods or weapon damage/cooldown, lock state in pink); owned weapons row (6 slots, each with `SELL +n` and `COMBINE` when it is in a `combinePairs` pair); stats panel; `REROLL (n)` and `NEXT WAVE` buttons.
- Preview: hovering or focusing an item offer shows `statDiff(current, withItem)` lines (positive lime, negative danger); a weapon offer shows its `weaponStats` at that tier and whether it will merge.
- Keyboard (`keydown` on `event.code`): `Digit1`–`Digit4` buy; with Shift, toggle lock; `KeyR` reroll; `Tab` cycles focus over owned weapons, `KeyS` sells and `KeyC` combines the focused one; `Enter`/`Space` next wave. Remove all listeners on shutdown.
- `NEXT WAVE` → `closeShop` → `scene.start(GAME, { run })`.

- [ ] **Step 1: Implement** the scene.
- [ ] **Step 2: Run** `npx tsc --noEmit && npx vitest run` — expect PASS.
- [ ] **Step 3: Manual check** `npm run dev` (use `?seed=123`): buy an item and see the stats panel change; reroll twice and see the cost go 1→3→5 on wave 2; lock an offer, play the wave, see it in slot 1 of the next shop; buy a duplicate weapon and combine it; with 6 weapons a matching buy merges and a non-matching one shows `NO SLOT`; sell a weapon; do the whole visit with the keyboard only.
- [ ] **Step 4: Commit** `feat: shop with offers, reroll, lock, sell and combine`.

### Task 7: Level-up picks

**Files:**
- Create: `src/core/levelup.ts`, `assets/data/upgrades.json`, `src/scenes/LevelUpScene.ts`
- Modify: `src/config/constants.ts` (`SCENE_KEYS.LEVEL_UP`), `src/config/gameConfig.ts` (register scene), `src/scenes/VictoryScene.ts` (continue → level-up when `pendingLevelUps > 0`, else shop), `src/types/json.d.ts`
- Test: `src/core/levelup.test.ts`

**Interfaces:**
- Consumes: `rollTier`, `rarityWeights`, `rerollCost` (Task 5); `StatKey`, `computeStats`, `statDiff` (Task 2).
- `upgrades.json` = `Record<StatKey, [number, number, number, number]>` (amount per tier), exactly: `maxHp 3 6 9 12`, `hpRegen 1 2 3 4`, `armor 1 2 3 4`, `dodge 3 6 9 12`, `speed 3 6 9 12`, `damage 5 8 12 16`, `melee 2 3 4 6`, `ranged 1 2 3 4`, `elemental 1 2 3 4`, `attackSpeed 5 10 15 20`, `crit 3 5 7 9`, `range 15 30 45 60`, `luck 5 10 15 20`, `harvesting 5 8 10 12` (`pickupRadius` is items-only).
- Produces: `interface UpgradeChoice { stat: StatKey; tier: Tier; amount: number }`; `rollUpgrades(rng: Rng, wave: number, luck: number, n = 4): UpgradeChoice[]` — `n` distinct stats; `applyUpgrade(run: RunState, c: UpgradeChoice): void` — adds `amount` to `run.levelMods[stat]` and decrements `pendingLevelUps` (never below 0).
- `LevelUpScene` (`init({ run })`): title `LEVEL UP` with `n left`; 4 cards (stat label, `+amount`, tier chip); hover/focus shows the `statDiff` preview; `Digit1`–`Digit4` or click picks; `KeyR` / button rerolls for `rerollCost(run.wave, rerolls)` scrap (refused when short; `rerolls` resets after each pick). RNG `createRng(run.seed + run.wave * 1013 + run.pendingLevelUps)`. After a pick: `pendingLevelUps > 0` → `scene.restart({ run })`, else `scene.start(SHOP, { run })`.

- [ ] **Step 1: Write failing tests** in `src/core/levelup.test.ts`: `rolls 4 distinct stats` (100 seeds); `wave 1 rolls are tier 1`; `amount matches upgrades.json for the tier`; `applyUpgrade accumulates` (two `armor` t1 picks → `levelMods.armor 2`, `computeStats(...).armor 2`); `three pending levels give exactly three picks` (Review Focus 5): starting at `pendingLevelUps 3`, apply until 0 → 3 calls, and a 4th leaves it at 0; `upgrades.json is valid` (every key a `StatKey`, 4 increasing amounts, no `pickupRadius`).
- [ ] **Step 2: Run** `npx vitest run src/core/levelup.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `levelup.ts`, `upgrades.json`, `LevelUpScene`, the Victory routing.
- [ ] **Step 4: Run** `npx tsc --noEmit && npx vitest run` — expect PASS; `npm run dev`: gain 2 levels in wave 1–2 → two picks in a row, then the shop; reroll costs scrap; keyboard-only works.
- [ ] **Step 5: Commit** `feat: level-up picks`.

### Task 8: Starting-weapon pick

**Files:**
- Create: `src/scenes/LoadoutScene.ts`
- Modify: `src/config/constants.ts` (`SCENE_KEYS.LOADOUT`), `src/config/gameConfig.ts`, `src/scenes/MenuScene.ts` (START → loadout), `src/scenes/GameScene.ts` (`init` requires `data.run`; the URL `?seed` logic moves to `LoadoutScene`)

**Interfaces:**
- Consumes: `newRun` (Task 2), `weaponStats` (Task 3).
- Offers exactly `pistol`, `shotgun`, `blade` as 3 cards (name, tags, tier-1 damage/cooldown/range). `Digit1`–`Digit3` or click → `scene.start(GAME, { run: newRun(seed, id) })` with `seed` = `?seed` if a non-zero integer, else `Date.now()`; log `Run seed: n`.

- [ ] **Step 1: Implement** the scene and routing.
- [ ] **Step 2: Run** `npx tsc --noEmit && npx vitest run` — expect PASS; `npm run dev`: each of the 3 picks starts a run with that weapon; ESC → menu → START gives a fresh run (no items, one weapon).
- [ ] **Step 3: Commit** `feat: starting weapon pick`.

### Task 9: Full-run check and outcome

**Files:**
- Modify: this plan (append `## M2 outcome and carry-overs`), any tuning in `assets/data/*.json`

- [ ] **Step 1: Play** two full runs to wave 10 with `?seed=1` and `?seed=2` (different starting weapons). Check: the shop offers different things per seed; at least two distinct builds feel viable; no shop where one offer is always the obvious pick (tune prices/mods in JSON only); same seed + same choices reproduce the same first shop.
- [ ] **Step 2: Run** `npm run build && npm run test:coverage` — expect PASS.
- [ ] **Step 3: Write** the outcome section: what shipped, fps measured with 6 weapons, and the deferred list (from reviews plus the remaining M1 robustness items: `rng.int` with `max<min`, `buildSpawnSchedule` with `every<=0`, F3 capture, `debugSpawn` RNG, no enemy separation).
- [ ] **Step 4: Commit** `docs: record m2 outcome and carry-overs`.
