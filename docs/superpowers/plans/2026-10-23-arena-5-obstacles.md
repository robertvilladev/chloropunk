# A5 — Small obstacles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A few small solid props (the rooftop vents, plus at most two crates) that the player and enemies collide with, so the player can kite around them; enemies steer around them and stop stacking on each other.

**Architecture:** Props with `solid: true` in `assets/data/arena.json` become static Arcade bodies (one `staticGroup` built by `WorldManager`), colliding with the player, enemies and enemy bolts. Player projectiles pass over (keeps weapons and the sim unchanged). Enemies get a pure steering add-on in `src/entities/enemyBehaviors.ts`: an avoidance push from nearby obstacles plus a light separation push from nearby enemies (closes the "no enemy-to-enemy separation" carry-over).

**Tech Stack:** Phaser 3.90 Arcade physics, TypeScript strict, Vitest, pnpm.

**Spec:** [arena map addendum](../specs/2026-10-23-arena-map-addendum.md) §2.4. Builds on [A4](2026-10-23-arena-4-rooftop.md) (merged, PR #42).

## State of `main` this plan starts from (2026-10-24)

- `assets/data/arena.json` (`w`, `h`, `props`): 3 zones, 8 rails on the edges, the billboard, **4 vents** (144×54 at 128,120; 112×72 at 1152,168; 80×84 at 224,864; 128×48 at 1248,840), the helipad (1050,776, 112×112), 3 puddles. No crates placed. `ArenaProp.solid?` exists, unused.
- `src/core/arena.ts`: `validateArena(props, arena, clear)`, `CLEAR_RADIUS = 160`. `src/art/arena.ts` bakes the whole floor (incl. a `crate` drawer, Night violet `THEME_CSS.decor` tokens) into one texture at `DEPTH.BACKGROUND`.
- Spawns: `offscreenPoint` ring 50 px outside the view, clamped to the arena (`src/core/waves.ts`); far enemies (> `CATCH_UP.dist` 360 px) walk 2×. Telegraph markers and off-screen arrows are pink.
- Waves last `32 + 2·(n−1)` s (PR #40); sim `spawnDist` 480.
- `?arena=small` is unused by the owner (proposed for removal): no solids there, nothing more.

## Global Constraints

- pnpm only (`pnpm test`, `pnpm type-check`, `pnpm sim`, `pnpm playtest --seed 1 --runs 3`, `pnpm runs runs`); fresh worktree: `pnpm install`; branch `feat/arena-obstacles`; Conventional Commits.
- **Solids = the 4 vents** (`solid: true`) **+ at most 2 crates** (new props, ≤ 64×64, drawn by the existing `crate` drawer). Size rule: a solid is ≤ **144×96**. Rails, billboard, zones, helipad and puddles stay walk-over decor.
- Clearance: no solid within 160 px of the arena centre (start); gaps between a solid and the arena edge or another solid ≥ **80 px** (a potato, radius 20, passes; the boss charge stops, it doesn't need to pass).
- Solids are already drawn in the baked floor; collision only adds bodies (no new sprites). Actors y-sort over the floor as today.
- Spawn points and scrap drops never land inside a solid (pure helper, tested).
- 60 fps with 150 enemies: neighbours from a spatial hash rebuilt per frame, capped; no uncapped O(n²).
- Avoidance keeps the desired speed (incl. the 2× catch-up and dashes); dashers and the future boss charge stop on solids (they collide; no pathing).
- Pierce/AoE weapons unchanged; player shots ignore solids.

## Review Focus

1. Enemies stuck in the pocket between a vent and the arena edge (vent 1 is 120 px from the top edge): avoidance slides them along, not freezes them.
2. Player squeezed between a vent and a horde: never pushed through the vent or out of bounds.
3. Scrap dropped on a vent's footprint: pushed out on drop (decided: push out; the magnet doesn't pull through solids).
4. A spawn telegraph clamped onto a vent near the arena edge (the ring clamps to `EDGE_INSET` 40).
5. Autopilot (`core/autopilot.ts`) walking into vents forever: solids repel like walls.

---

### Task 1: Solid props

**Files:** Modify `assets/data/arena.json` (`solid: true` on the 4 vents, 0–2 crates), `src/core/arena.ts` (+ `solidRects(props): Rect[]`, extend `validateArena` with the size and 80 px gap rules for solids), `src/core/arena.test.ts`, `src/managers/WorldManager.ts` (static group, `getSolids()`), `src/scenes/GameScene.ts` (`setupCollisions`: player, enemies, enemy bolts → `removeBolt` on hit).

**Interfaces:**
- Produces: `type Rect = { x: number; y: number; w: number; h: number }` (in `src/types` if not present); `solidRects(props: readonly ArenaProp[]): Rect[]`; `WorldManager.getSolids(): Phaser.Physics.Arcade.StaticGroup`.

- [ ] **Step 1: Failing tests:** a solid over 144×96 is reported; a solid 60 px from the edge is reported; two solids 60 px apart are reported; non-solid props ignore these rules; the shipped layout passes; `solidRects` returns only solids.
- [ ] **Step 2:** `pnpm test src/core/arena.test.ts` — FAIL.
- [ ] **Step 3:** Implement; mark the vents solid; add crates only if a kiting lane needs one (owner review in Task 4).
- [ ] **Step 4:** Browser: player blocked by each vent; enemy bolts stop on vents; enemies pile against vents (expected until Task 2).
- [ ] **Step 5: Commit** `feat: solid rooftop props`.

### Task 2: Avoidance + separation steering

**Files:** Modify `src/entities/enemyBehaviors.ts`, `src/entities/enemyBehaviors.test.ts`, `src/managers/EnemyManager.ts`.

**Interfaces:**
- Produces: `avoid(self: Vector2, radius: number, desired: { vx: number; vy: number }, rects: readonly Rect[], neighbours: readonly Vector2[], out: { vx: number; vy: number }): { vx: number; vy: number }`.

- [ ] **Step 1: Failing tests:** heading straight into a rect → output has a tangential component and none into the rect; clear path → unchanged; two overlapping enemies → pushed apart; speed magnitude preserved (incl. a 2× catch-up speed).
- [ ] **Step 2:** Implement; EnemyManager applies it after `steer` (spatial hash, neighbour cap ~6).
- [ ] **Step 3:** Browser with F2 (150 peas): ≥ 60 fps; no enemy stuck > 2 s over a full wave (dev console count).
- [ ] **Step 4: Commit** `feat: enemies steer around props and each other`.

### Task 3: Spawns, scrap, autopilot

**Files:** `src/core/arena.ts` (+ `outsideSolids`), `src/managers/EnemyManager.ts` (spawn point), `src/managers/PickupManager.ts` (drop point), `src/core/autopilot.ts` (+ solids param), tests.

**Interfaces:**
- Produces: `outsideSolids(p: Vector2, rects: readonly Rect[], pad: number): Vector2` (nearest point outside every rect grown by `pad`; unchanged if already outside); `autopilot(p, enemies, scrap, w, h, solids?: readonly Rect[])`.

- [ ] **Step 1: Failing tests:** point inside a vent → moved to the nearest edge + pad; point outside → same object values; autopilot next to a vent → move vector has no component into it.
- [ ] **Step 2:** Implement and wire (spawn: after `offscreenPoint`, no extra RNG draw; scrap: on drop).
- [ ] **Step 3:** `pnpm playtest --seed 1 --runs 3` completes.
- [ ] **Step 4: Commit** `fix: nothing spawns or drops inside props`.

### Task 4: Owner check, balance, docs

- [ ] **Step 1:** `pnpm runs runs` on the fresh playtests vs. the A4 runs: contact damage, kills, deaths; the sim has no obstacles, add a factor only if drift > 25%.
- [ ] **Step 2:** Owner playtest (2 runs): kiting around vents feels useful, nothing gets stuck; decide on crates.
- [ ] **Step 3:** Docs: ROADMAP tick A5 (remove the "no enemy-to-enemy separation" carry-over), ARCHITECTURE (solids, `avoid`), ASSETS_GUIDE (`solid` in `arena.json`), addendum §2.4 outcome line.
- [ ] **Step 4: Commit** `docs: obstacles`, open the PR to `main`.
