# A2 — Follow camera on a 2× arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The arena becomes 1600×1200 and the GameScene camera follows the fighter, so moving feels like moving. Spawning still uses the old map-edge rule (A3 replaces it).

**Architecture:** `ARENA` grows to 1600×1200. GameScene's main camera keeps zoom 2 (`applyView`) and then `setBounds(0, 0, ARENA.w, ARENA.h)` + `startFollow(player, true, lerp, lerp)`. Everything screen-fixed that lives in GameScene today (wave banner, low-HP vignette) moves to `UIScene`, which has its own unscrolled camera. A dev query `?arena=small` keeps 800×600 for side-by-side comparison.

**Tech Stack:** Phaser 3.90, TypeScript strict, Vite, Vitest.

**Spec:** [arena map addendum](../specs/2026-10-23-arena-map-addendum.md) §2.1–2.2. Builds on [A1](2026-10-23-arena-1-split.md).

## Global Constraints

- Arena **1600×1200**; camera zoom stays `RENDER_SCALE` (2); visible area = 800×600 design px.
- `setScrollFactor(0)` stays banned (`view.guard.test.ts`): screen-fixed things go to `UIScene`.
- Only GameScene's camera follows; every other scene still centres on 400,300.
- 60 fps with ~150 enemies on WebGL and `?renderer=canvas`.
- Reduced-shake setting still respected (camera shake works on a following camera).

## Review Focus

1. Banner/vignette still drawn in world space (they scroll away or appear at the arena's top-left).
2. Camera jitter with `pixelArt: true` + lerp (sub-pixel scroll). Use `roundPixels` or round the follow; check at 1×/3× dev speed.
3. Pause → resume and wave restart: the camera must start centred on the player, not lerp in from 0,0 (`centerOn` before `startFollow`).
4. Enemies outside the view still collide/shoot/count (they must; nothing is culled by camera).
5. Damage numbers and bursts at world positions stay in world space (correct), not moved to UI.

---

### Task 1: Arena 1600×1200 + follow camera

**Files:** Modify `src/config/constants.ts` (`ARENA`), `src/config/view.ts`, `src/scenes/GameScene.ts`, `src/managers/WorldManager.ts`.

**Interfaces:**
- Produces: `followView(cam: Camera, target: GameObject, arena: {w,h}): void` in `src/config/view.ts` (zoom stays, `setBounds`, `centerOn(target)`, `startFollow(target, true, 0.12, 0.12)`); `arenaFromSearch(search: string): {w,h}` in `src/config/arena.ts` (new, pure: `?arena=small` → 800×600, else 1600×1200) used to set `ARENA`.

- [ ] **Step 1: Failing test** `src/config/arena.test.ts`: `arenaFromSearch("")` → `{w:1600,h:1200}`; `arenaFromSearch("?arena=small")` → `{w:800,h:600}`; in production builds the flag is ignored (pass `dev=false` param) → 1600×1200.
- [ ] **Step 2:** Implement; `ARENA` reads it once at module load.
- [ ] **Step 3:** GameScene `create()` calls `followView(this.cameras.main, player, ARENA)` after the player exists. WorldManager grid/edge drawn over the full arena.
- [ ] **Step 4:** Type-check + tests PASS; browser: walk to each corner, camera stops at the edge, lime border visible.
- [ ] **Step 5: Commit** `feat: 2x arena with a follow camera`.

### Task 2: Move banner and low-HP vignette to UIScene

**Files:** Modify `src/fx/Juice.ts`, `src/scenes/UIScene.ts`, `src/scenes/GameScene.ts`.

**Interfaces:**
- Produces: GameScene emits `"banner"` (`text, wave, sound`) and `"lowHp"` (`ratio`) on its events; UIScene listens and owns the vignette image and banner texts (code moves from Juice). Listeners removed on UIScene shutdown.

- [ ] **Step 1:** Move `banner()` and `lowHp()` bodies + the vignette image into UIScene (or a `HudFx` helper it owns); Juice keeps world-space effects only.
- [ ] **Step 2:** `BANNER_MS` hand-off in GameScene unchanged.
- [ ] **Step 3:** Browser: banner centred at wave start and clear while standing in a corner of the arena; vignette covers the screen at low HP; pause menu still on top.
- [ ] **Step 4: Commit** `refactor: screen-fixed effects live in the HUD scene`.

### Task 3: Autopilot, playtest, perf, docs

- [ ] **Step 1:** Autopilot already gets `ARENA` (A1). `npm run playtest -- --seed 1`: runs to completion, no stuck-in-corner deaths caused by the camera.
- [ ] **Step 2:** F3 FPS with F2 (150 peas) on WebGL and `?renderer=canvas`: ≥ 60 fps.
- [ ] **Step 3:** Owner check: play waves 1–3 on 1600×1200 and on `?arena=small`; record the verdict in the plan's outcome. Expect waves to feel easier here (enemies spawn at the far map edge); A3 fixes that, don't retune now.
- [ ] **Step 4:** Docs: ARCHITECTURE (camera follow in GameScene, HUD owns banner/vignette, `?arena=small`), README dev flags, ROADMAP tick A2. Update the `view.ts` comment line in ARCHITECTURE ("each scene's main camera is zoomed 2× onto the 800×600 design space" now has the GameScene exception).
- [ ] **Step 5: Commit** `docs: follow camera`, open the PR.
