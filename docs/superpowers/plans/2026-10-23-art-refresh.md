# Art refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finer, less chunky sprites for the fighter, 5 enemies, scrap and the boss, designed and approved in Claude Design first, then swapped in by texture key with no gameplay change.

**Architecture:** Two phases. **Phase A (design, no code):** a Claude Design canvas (Design artifact type) with the art direction and every sprite's frames, reviewed by the owner. **Phase B (code PR):** the sprite pipeline in `src/art/` produces the same texture keys and frame names (`walk0`, `walk1`, `hit`) at the new resolution; body hit areas stay the same size (`src/art/body.ts`), so collisions and balance don't change.

**Tech Stack:** Claude Design (Artifact "Design" type), Phaser 3.90, TypeScript strict, Vitest.

**Spec:** [arena map addendum](../specs/2026-10-23-arena-map-addendum.md) §2.7, §3 (boss parts), §4; MVP spec §6 (art pipeline, palette). Existing design system: https://claude.ai/artifact/9DHSn6f62spjQLXLqsCQee, screens: https://claude.ai/artifact/273SegSV2CBPS1HX96Yr17, logo canvas: https://claude.ai/artifact/NsAx5gUQWJPCVBDHxirktd

## Global Constraints

- Palette and roles unchanged (`theme.ts`, `src/art/palette.ts`): fighter pink hood + cyan visor; enemies keep their death-burst colours from `enemies.json`.
- Same texture keys (`player`, `enemy_pea`, `enemy_pepper`, `enemy_potato`, `enemy_carrot`, `enemy_tomato`, `pickup_scrap`) and frame names; new: `boss` (frames `idle0`, `idle1`, `hit`, `volley`, `charge`, `lob`).
- On-screen size close to today: regular actors ≈48 design px tall; boss ≈3× (≈144 px).
- Integer scaling against the 2× canvas: each art pixel is a whole number of canvas pixels (e.g. 32×32 grid at 1.5 design px = 3 canvas px is fine; 48×48 at 1 design px = 2 canvas px).
- Keep the 3/4 view and the baked soft shadow under the feet.
- Body sizes: player 32×32, pickups 16×16, enemy circles = `radius` from `enemies.json`; `body.test.ts` must still pass with the new art.

## Review Focus

1. Readability at 150 enemies: each enemy type must be told apart at a glance by silhouette, not only colour (colour-blind check: greyscale screenshot).
2. Hit frame still reads as a flash on the new art.
3. Canvas renderer: same frames, no tint-only hit frame (tint doesn't draw on Canvas, see ROADMAP carry-over).
4. Boss parts recognisably the five enemies (owner's intent).
5. Bundle size if PNG sheets are chosen (keep sprite assets < 300 KB total).

---

### Phase A — Design in Claude Design (owner gate)

- [ ] **Step 1:** Create a Design artifact "Chloropunk Sprites" from the Design type, using the existing design system. Boards: (1) direction: resolution options side by side at real game size on the graphite floor (today 16×16@3× vs 32×32@1.5× vs 48×48@1×), (2) fighter + 5 enemies, frames walk0/walk1/hit, (3) scrap, (4) the Compost Colossus: idle, hit and the three attack poses, assembled from the enemy parts (addendum §3).
- [ ] **Step 2:** Owner review; iterate until approved. Record the chosen resolution and the artifact link in the addendum §4.
- [ ] **Step 3:** Export: either grid data (if a grid resolution was chosen) or PNG frames (if sheets). Commit them under `src/art/` (grids) or `public/sprites/` (PNG).

### Phase B — Pipeline + swap (code PR)

**Files:** Modify `src/art/grid.ts`, `src/art/actors.ts`, `src/art/pickups.ts`, `src/art/body.ts`, `src/art/textures.ts` (or a `BootScene` preload for PNG sheets); tests beside them.

- [ ] **Step 1: Failing tests** (`grid.test.ts` / `body.test.ts`): new grids validate at the chosen size; `bodyOffset` keeps bodies centred on the opaque bounds; frame size constant matches the chosen resolution.
- [ ] **Step 2:** Make `PIXEL` / `ACTOR_FRAME` follow the chosen size; port the approved art; keep keys and frame names.
- [ ] **Step 3:** Browser: menu, loadout, a wave with every enemy type; WebGL + Canvas screenshots; greyscale screenshot for silhouette check; F2 + F3 ≥ 60 fps.
- [ ] **Step 4:** Boss texture baked too (used by M4b; harmless until then).
- [ ] **Step 5:** Docs: MVP spec §6 sprite line points to the addendum; ARCHITECTURE `art/` line; ROADMAP tick; M3 plan's 16×16 constraint gets a "superseded" note.
- [ ] **Step 6: Commit** `feat: refreshed sprites`, open the PR.
