# A5 — Small obstacles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A few small solid props (vents, crates) that the player and enemies collide with, so the player can kite around them; enemies steer around them and stop stacking on each other.

**Architecture:** Props with `solid: true` in `arena.json` become static Arcade bodies (one `staticGroup`), colliding with the player and enemies. Enemy projectiles/bolts stop on them; player projectiles pass over (proposed; keeps weapons and the sim unchanged). Enemies get a pure steering add-on in `src/entities/enemyBehaviors.ts`: an avoidance push from nearby obstacles plus a light separation push from nearby enemies (closes the "no enemy-to-enemy separation" carry-over).

**Tech Stack:** Phaser 3.90 Arcade physics, TypeScript strict, Vitest.

**Spec:** [arena map addendum](../specs/2026-10-23-arena-map-addendum.md) §2.4. Builds on [A4](2026-10-23-arena-4-rooftop.md).

## Global Constraints

- **Small:** 4–6 solid props, each ≤ 96×64 px, none within 160 px of the player start, gaps between props and walls ≥ 80 px (a potato, radius 20, fits).
- Spawn points (A3) never land inside a solid prop: `offscreenPoint` callers nudge out (pure helper, tested).
- 60 fps with 150 enemies: separation uses a coarse grid or neighbour cap, no O(n²) over all enemies every frame without a cap.
- Dashers (pepper) and the future boss charge stop on obstacles (they collide; no pathing).
- Pierce/AoE weapons unchanged.

## Review Focus

1. Enemies stuck behind a prop (concave pocket between prop and wall): avoidance must slide them along, not freeze them.
2. Player squeezed between a prop and an enemy horde: collision must not push the player through the prop or out of bounds.
3. Scrap dropped inside a prop's body is unreachable → push drops out of solids (or let the magnet pull through; decide and test).
4. Spawn telegraph on top of a prop.
5. Autopilot walking into props forever (it has no pathing): add props as "walls" in its field.

---

### Task 1: Solid props

**Files:** Modify `assets/data/arena.json` (`solid: true` on 4–6 props), `src/core/arena.ts` (+ `solidRects(props)`, extend `validateArena` with the size/gap rules above), `src/managers/WorldManager.ts` (static group), `src/scenes/GameScene.ts` (colliders: player, enemies, enemy bolts).

- [ ] **Step 1: Failing tests** in `arena.test.ts`: solid props respect max size, start clearance and the 80 px gap rule; shipped layout passes.
- [ ] **Step 2:** Implement; colliders added in `setupCollisions`.
- [ ] **Step 3:** Browser: player blocked; bolts stop; enemies pile against props (expected until Task 2).
- [ ] **Step 4: Commit** `feat: solid rooftop props`.

### Task 2: Avoidance + separation steering

**Files:** Modify `src/entities/enemyBehaviors.ts`, `src/entities/enemyBehaviors.test.ts`, `src/managers/EnemyManager.ts`.

**Interfaces:**
- Produces: `avoid(self: Vector2, radius: number, desired: {vx,vy}, rects: readonly Rect[], neighbours: readonly Vector2[], out: {vx,vy}): {vx,vy}` — keeps speed, bends direction.

- [ ] **Step 1: Failing tests:** heading straight into a rect → output has a tangential component and no component into the rect; clear path → unchanged; two overlapping enemies → pushed apart; speed magnitude preserved.
- [ ] **Step 2:** Implement; EnemyManager applies it after `steer` (neighbours from a simple spatial hash rebuilt per frame, capped).
- [ ] **Step 3:** Browser with F2 (150 peas): fps ≥ 60; no permanently stuck enemies over a 60 s wave.
- [ ] **Step 4: Commit** `feat: enemies steer around props and each other`.

### Task 3: Spawns, scrap, autopilot

- [ ] **Step 1:** Pure `outsideSolids(p, rects, pad)` used by spawn points and scrap drops; tests.
- [ ] **Step 2:** Autopilot treats solid rects as walls (extend its repulsion); `npm run playtest -- --seed 1 --runs 3` completes.
- [ ] **Step 3: Commit** `fix: nothing spawns or drops inside props`.

### Task 4: Balance + docs

- [ ] **Step 1:** `npm run runs` on fresh playtests: contact damage and kills vs. sim; note any drift (sim has no obstacles; add a factor only if drift > 25%).
- [ ] **Step 2:** Docs: ROADMAP tick A5 and remove the "no enemy-to-enemy separation" carry-over; ARCHITECTURE; addendum §2.4 outcome line.
- [ ] **Step 3: Commit** `docs: obstacles`, open the PR.
