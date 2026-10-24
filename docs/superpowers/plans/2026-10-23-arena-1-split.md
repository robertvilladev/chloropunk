# A1 — Arena size split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate "size of the arena" from "size of the 800×600 design space" so later PRs can grow the arena. No visible or gameplay change.

**Architecture:** `GAME_CONFIG.WIDTH/HEIGHT` keeps meaning the design space (UI layout, `view.ts`). A new `ARENA = { w, h }` constant in `src/config/constants.ts` is the playfield; every gameplay reader of WIDTH/HEIGHT switches to it. `ARENA` starts at 800×600, so behaviour is identical.

**Tech Stack:** Phaser 3.90, TypeScript strict, Vite, Vitest.

**Spec:** [arena map addendum](../specs/2026-10-23-arena-map-addendum.md) §2.1; [MVP spec](../specs/2026-10-18-mvp-roguelike-design.md). Design page: https://claude.ai/artifact/Joe6YTuK7XMsoCTbkyFs56

## Global Constraints

- Use the package manager scripts on `main` (a npm → pnpm migration was in flight on 2026-10-23; use whichever lockfile `main` has).
- `GAME_CONFIG.WIDTH/HEIGHT` stay for layout only; `view.guard.test.ts` rules stay (no `cameras.main.width`, no `setScrollFactor(0)`).
- Seeded runs must stay reproducible: no extra RNG draws.
- Docs ride along (CLAUDE.md): ARCHITECTURE.md line for `ARENA`, ROADMAP tick.

## Review Focus

1. A reader of WIDTH/HEIGHT left on the gameplay side (would break silently in A2 when ARENA grows). Task 2 adds a guard test.
2. `actorDepth`/`pickupDepth` defaulting to the design height instead of the arena height (y-sort wrong below y=600 in A2).
3. Autopilot wall pull computed against the screen, not the arena.

---

## File structure

| Path | Change |
|---|---|
| `src/config/constants.ts` | add `ARENA` |
| `src/managers/WorldManager.ts` | bounds + background use `ARENA` |
| `src/managers/EnemyManager.ts` | `pickEdgePoint`, `debugSpawn`, `updateBolts` use `ARENA` |
| `src/core/depth.ts` | default `height` = `ARENA.h` |
| `src/scenes/GameScene.ts` | autopilot gets `ARENA.w/h` |
| `src/config/arena.guard.test.ts` (new) | gameplay files don't read `GAME_CONFIG.WIDTH/HEIGHT` |

### Task 1: `ARENA` constant and gameplay readers

**Files:** Modify the files above (not the guard yet).

**Interfaces:**
- Produces: `export const ARENA = { w: 800, h: 600 } as const;` in `src/config/constants.ts` (A2 changes the values).

- [ ] **Step 1:** Add `ARENA`. Replace WIDTH/HEIGHT in `WorldManager.create/createBackground/getDimensions`, `EnemyManager` (lines using `GAME_CONFIG.WIDTH/HEIGHT`: debugSpawn, pickEdgePoint, updateBolts), `core/depth.ts` defaults, `GameScene` autopilot call. Leave `Juice` vignette/banner, `UIScene`, `ui.ts`, menus on `GAME_CONFIG` (they are screen-space; A2 moves the Juice ones).
- [ ] **Step 2:** Run type-check and the full test suite — PASS, unchanged counts.
- [ ] **Step 3: Commit** `refactor: split arena size from the design space`.

### Task 2: Guard test

**Files:** Create `src/config/arena.guard.test.ts`.

- [ ] **Step 1: Write the test** in the style of `view.guard.test.ts`: glob raw sources of `src/managers/**`, `src/core/**`, `src/entities/**` (minus tests); `expect(files.filter(f => /GAME_CONFIG\.(WIDTH|HEIGHT)/.test(src))).toEqual([])`.
- [ ] **Step 2:** Run it — PASS after Task 1 (temporarily revert one replacement to see it FAIL once).
- [ ] **Step 3: Commit** `test: guard gameplay code against the design-space size`.

### Task 3: Regression check and docs

- [ ] **Step 1:** `npm run sim` output identical to `main` (diff the tables).
- [ ] **Step 2:** `npm run playtest -- --seed 1` once; wave reached within the usual ±1–2 waves of `main` (playtests aren't frame-exact).
- [ ] **Step 3:** ARCHITECTURE.md: one line under `config/` for `ARENA` vs `GAME_CONFIG`. ROADMAP.md: tick A1 under the "Arena map" milestone.
- [ ] **Step 4: Commit** `docs: arena size split`, open the PR.
