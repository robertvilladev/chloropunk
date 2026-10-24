# A3 — Off-screen spawning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enemies spawn just outside the camera frame (clamped into the arena) instead of on the far map edge, with arrows on the screen edge for off-screen telegraphs, and the balance sim still matches.

**Architecture:** A pure `offscreenPoint()` in `src/core/waves.ts` replaces `edgePoint` for wave spawns: walk the camera rectangle grown by a margin with one RNG draw (same draw count as `edgePoint`, so seeds stay reproducible), clamp into the arena, and enforce the minimum player distance. `EnemyManager` passes it the camera's world view. UIScene draws pooled arrows for telegraphs outside the view.

**Tech Stack:** Phaser 3.90, TypeScript strict, Vite, Vitest.

**Spec:** [arena map addendum](../specs/2026-10-23-arena-map-addendum.md) §2.3 (amends MVP spec §4 step 2). [Balance design](../specs/2026-10-20-balance-design.md) §3 (sim `spawnDist`). Builds on [A2](2026-10-23-arena-2-camera.md).

## Global Constraints

- One RNG draw per spawn event (`rng.next()`), same as today.
- Spawn margin outside the view: **50 design px** (enemy radius ≤ 20 + headroom); `EDGE_INSET` 40 and `MIN_PLAYER_DIST` 160 unchanged.
- Telegraph `TELEGRAPH_S` 0.6 s unchanged.
- Sim `DEFAULT_PARAMS.spawnDist` stays 330 unless measured runs say otherwise (then change it with the measurement in the commit message).
- Arrows: pink (`THEME.pink`, the telegraph colour), on a 12 px inset from the screen edge, pooled, no per-frame allocation.

## Review Focus

1. Player in an arena corner: half the ring is outside the arena; clamped points pile up on the arena edge inside the view. Rule: if the clamped point is inside the view, retry the opposite side (`u + 0.5`, no new draw) like `edgePoint` does.
2. Spawn point inside `MIN_PLAYER_DIST` after clamping (corner case) → same opposite-side fallback.
3. `?arena=small` (arena = view): ring is fully outside → every point clamps to the arena edge; behaviour must equal today's edge spawning.
4. Telegraph arrows for groups that spawn while the game is paused / at 3× dev speed.
5. Dense waves (MAX_ALIVE 40) all arriving from one side because the player hugs a wall.

---

### Task 1: `offscreenPoint` (pure)

**Files:** Modify `src/core/waves.ts`, `src/core/waves.test.ts`.

**Interfaces:**
- Produces: `offscreenPoint(u: number, player: Vector2, view: {x:number,y:number,w:number,h:number}, arena: {w:number,h:number}, margin: number, inset: number, minDist: number): Vector2`.

- [ ] **Step 1: Failing tests:** `lies outside the view and inside the arena (inset)` for u in 0..1 step 0.05, player centred; `is at least minDist from the player`; `corner player: never inside the view`; `arena equal to view: same points as edgePoint for the same u` (compare to `edgePoint` with matching args); `deterministic for equal u`.
- [ ] **Step 2:** Run — FAIL (missing).
- [ ] **Step 3:** Implement (perimeter walk of the grown view, clamp, opposite-side fallback).
- [ ] **Step 4:** Run — PASS. **Commit** `feat: off-screen spawn points`.

### Task 2: EnemyManager uses it

**Files:** Modify `src/managers/EnemyManager.ts`.

- [ ] **Step 1:** `pickEdgePoint` → `pickSpawnPoint(player)` using `this.scene.cameras.main.worldView` and `ARENA`. Keep `edgePoint` exported (tests, `?arena=small` equivalence).
- [ ] **Step 2:** Browser, seed 1: no enemy appears inside the view; spawns arrive from all sides while moving.
- [ ] **Step 3: Commit** `feat: spawn waves just off-screen`.

### Task 3: Off-screen telegraph arrows

**Files:** Modify `src/scenes/UIScene.ts`; GameScene/EnemyManager expose pending telegraph positions (read-only array) via an event or getter.

**Interfaces:**
- Produces: pure `edgeArrow(target: Vector2, view: Rect, inset: number): {x:number,y:number,angle:number} | null` in `src/core/` (null when the target is inside the view), tested.

- [ ] **Step 1: Failing tests** for `edgeArrow`: inside → null; far right → x = view.w − inset, angle ≈ 0; top-left corner clamps to both insets.
- [ ] **Step 2:** Implement; UIScene keeps a pool of ~12 arrow images, updates them each frame from the pending list.
- [ ] **Step 3:** Browser screenshot with arrows visible; Canvas renderer check.
- [ ] **Step 4: Commit** `feat: arrows for off-screen spawns`.

### Task 4: Balance check, docs

- [ ] **Step 1:** Measure mean spawn distance in play (log it in the run log's wave record, or a dev console line) for waves 1–3; compare to 330.
- [ ] **Step 2:** `npm run playtest -- --seed 1 --runs 3` and `npm run runs -- runs`: kills and HP left near the sim's prediction; if `spawnDist` differs > 25%, update `DEFAULT_PARAMS.spawnDist` and re-run `npm run sim` + `sim.test.ts`.
- [ ] **Step 3:** Owner playtest waves 1–3; record verdict.
- [ ] **Step 4:** Docs: MVP spec §4 step 2 gets a pointer to the addendum; balance design §3 notes the new spawn rule; ARCHITECTURE (`waves` = spawn schedule + spawn points); ROADMAP tick A3.
- [ ] **Step 5: Commit** `docs: off-screen spawning`, open the PR.
