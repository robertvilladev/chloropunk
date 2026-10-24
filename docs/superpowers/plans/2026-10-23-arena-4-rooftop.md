# A4 — Rooftop decor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The 1600×1200 arena looks like a neon rooftop with landmarks (billboard, vents, puddles, helipad, rail, floor zones), so the player can read their own movement. Decor only: nothing collides yet (A5).

**Architecture:** A data file `assets/data/arena.json` lists decor props (`kind`, `x`, `y`, `w`, `h`, optional `label`) in arena px for the 1600×1200 arena. `WorldManager.createBackground` bakes the floor grid, the props and the lime edge into one CanvasTexture once (like `src/art/textures.ts` bakes sprites) and shows it as one image at `DEPTH.BACKGROUND`. Pure validation of the layout lives in `src/core/arena.ts`.

**Tech Stack:** Phaser 3.90, TypeScript strict, Vite, Vitest, pnpm.

**Spec:** [arena map addendum](../specs/2026-10-23-arena-map-addendum.md) §2.5; MVP spec §6 (world, palette). Overrides M3 owner decision 3 ("plain graphite floor, no decorative blocks"). Builds on A3/A3b (merged: PR #37, #38). Layout sketch: https://claude.ai/artifact/Joe6YTuK7XMsoCTbkyFs56

## State of `main` this plan starts from (2026-10-24)

- `ARENA` comes from `arenaFromSearch` (`src/config/arena.ts`): 1600×1200, or 800×600 with dev `?arena=small`. The fighter starts at the arena centre (800, 600).
- `WorldManager.createBackground` draws the grid (48 px) and the lime edge as live `Graphics` each wave.
- Spawns: `offscreenPoint` ring 50 px outside the view; telegraphs are pink markers, off-screen ones pink arrows on the screen edge (UIScene); enemies beyond 360 px walk 2× (`CATCH_UP`).
- Balance: the wave-length/economy pass is a separate open item (ROADMAP, proposed). A4 changes nothing the sim or the run log measures.

## Global Constraints

- pnpm only (`pnpm test`, `pnpm type-check`, `pnpm playtest --seed 1`); fresh worktree needs `pnpm install`; branch `feat/arena-rooftop` (rename the `wip/`/`claude/` branch before the first push, CLAUDE.md).
- Colours only via `THEME` (`theme.guard` forbids hex literals outside `theme.ts`/`src/art`). No colour washes on the ground: decor is dark fills, outlines and low-alpha accents.
- Decor never competes with gameplay colours: **pink is the telegraph colour** (markers and arrows), so pink on the floor is limited to the billboard text on the top edge; no X shapes, no pink near the play area. Lime stays for the arena edge.
- Decor sits below `DEPTH.SCRAP`; one baked texture (key per arena size, built once, reused across wave restarts); no per-prop game objects.
- `?arena=small` (dev, 800×600) shows today's plain grid floor: the layout is authored for 1600×1200 only.
- Keep a clear circle of **160 px** around the arena centre (player start, matches `MIN_PLAYER_DIST`) and the helipad off-centre.
- Content is data: the layout is JSON; A5 adds `solid: true` to some props.

## Review Focus

1. Readability: every enemy type (dark greens/reds) and scrap over a puddle and a vent, and a pink telegraph marker over the busiest decor, must read at a glance (screenshot each).
2. Canvas renderer (`?renderer=canvas`) draws the baked texture the same.
3. Texture rebuilt every wave (scene restart) or leaked: bake once per key, `textures.exists` guard.
4. `?arena=small` still works and shows the plain floor.
5. Large texture limits: 1600×1200 is fine for WebGL/Canvas; do not bake at 2× resolution.

---

### Task 1: Layout data + validation

**Files:** Create `assets/data/arena.json`, `src/core/arena.ts`, `src/core/arena.test.ts`; add the types in `src/types/index.ts`.

**Interfaces:**
- Produces: `type PropKind = "vent" | "sign" | "pad" | "puddle" | "rail" | "zone" | "crate"`; `interface ArenaProp { kind: PropKind; x: number; y: number; w: number; h: number; label?: string; solid?: boolean }`; `validateArena(props: readonly ArenaProp[], arena: { w: number; h: number }, clear: number): string[]` (empty = valid).

- [ ] **Step 1: Failing tests:** a prop outside the arena is reported; a prop overlapping the 160 px clear circle at the centre is reported; an unknown kind is reported; the shipped `arena.json` validates clean against `{ w: 1600, h: 1200 }`.
- [ ] **Step 2:** Run `pnpm test src/core/arena.test.ts` — FAIL (missing module).
- [ ] **Step 3:** Implement; author the layout from the design-page sketch (its fractions × 1600/1200): 4 vents, billboard "CHLOROPUNK" on the top edge, helipad off-centre, 2–3 puddles, a few floor zones (lighter graphite panels), rail segments along the edge.
- [ ] **Step 4:** PASS. **Commit** `feat: rooftop layout data`.

### Task 2: Bake and draw

**Files:** Create `src/art/arena.ts` (`bakeArena(scene, props, arena): string` returns the texture key, e.g. `arena_floor_1600x1200`); modify `src/managers/WorldManager.ts`.

- [ ] **Step 1:** `createBackground` → `bakeArena` (grid + zones + props per kind + lime edge) for the 1600×1200 arena, plain grid + edge for `?arena=small`; add one `image` at `DEPTH.BACKGROUND`.
- [ ] **Step 2:** Screenshots: full map (dev-only temporary camera zoom-out, not committed) and the play view on WebGL and `?renderer=canvas`; the Review Focus 1 readability shots.
- [ ] **Step 3:** F2 (150 peas) + F3: ≥ 60 fps; `pnpm playtest --seed 1` completes (decor must not change the outcome beyond the usual ±1–2 waves).
- [ ] **Step 4: Commit** `feat: rooftop arena art`.

### Task 3: Owner review, docs

- [ ] **Step 1:** Owner reviews the screenshots in the browser; adjust layout data only.
- [ ] **Step 2:** Docs: ASSETS_GUIDE (`arena.json`), ARCHITECTURE (`core/arena`, `art/arena`, WorldManager bakes the floor), README "content is data" list, ROADMAP tick A4 with the owner's verdict, M3 plan decision 3 gets a "superseded by the arena addendum" note.
- [ ] **Step 3: Commit** `docs: rooftop arena`, open the PR to `main`.
