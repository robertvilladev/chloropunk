# UI art refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Screens, cards, HUD and damage numbers match the vector sprites: no pixel font, a unique vector icon on every card, tier readable at a glance, real icons in the HUD.

**Architecture:** Icons are SVG strings in a new `src/art/icons.ts` (same helpers and keyline as `vector.ts`, ported from the canvas), loaded and baked at boot by `textures.ts` like the sprites (`icon_<kind>_<id>`, one frame each). UI helpers in `src/scenes/ui.ts` get the new panel/card/slot look and are reused by every scene, so scene code changes stay small. VT323 is removed from `FONTS`, `fonts.ts` and every `"pixel"` call.

**Tech Stack:** Claude Design canvas, Phaser 3.90, TypeScript strict, Vitest, Playwright.

**Spec:** [UI art refresh design](../specs/2026-10-25-ui-art-refresh-design.md) (binding), [addendum §4](../specs/2026-10-23-arena-map-addendum.md), MVP spec §6–§7.

## Global Constraints

- pnpm only; branch `feat/art-ui` stacked on `feat/art-weapons` (PR 2); Conventional Commits; docs in the same PR.
- Tier colours t1 `#a9b0b8`, t2 `#3ad8ff`, t3 `#ff4f9a`, t4 `#ffb13b` (`THEME_CSS.tier`); no tint for visible states; WebGL + `?renderer=canvas`; ≥ 60 fps with F2 + F3; boot measured against PR 2 (art refresh total < 500 ms).
- Keep the current card and screen layouts; no new rules or stats.
- Leave `src/art/arena.ts` alone; don't touch A5 (obstacles) files beyond what a rebase needs.
- Push / open the PR only when the owner says so.

## Review Focus

1. Every item id in `items.json` and every stat in `upgrades.json` has an icon (test both ways: no missing icon, no orphan icon).
2. HUD slots must update when weapons/items change between waves (UIScene is recreated each wave — read the run, not a cached list) and show at most 6 weapons plus all items without overflowing at 800×600.
3. Text crispness on Canvas and at camera zoom: no blurry Bungee numbers in the HUD or on cards.
4. Legendary pick animation must not block input or double-buy (one purchase per click/key).
5. No `VT323`/`FONTS.pixel` left anywhere (grep test).

---

## Phase A — Canvas boards (owner gate)

On the [sprites canvas](https://claude.ai/artifact/TnsQjaTcJEYoShEC5AyMXM), Vector page, new boards after "7 · Boss sheets". Follow the canvas's own type instructions; extend `project/vector.js` (or add `project/icons.js`) as the art source.

- [x] **U1 UI kit:** type scale (Bungee numbers, Plex body), panel / button / tier badge / card frame per tier (idle glow on t3–t4), damage numbers (normal, crit pop), shown on the rooftop floor colour and the menu background.
- [x] **U2 Icon sheet:** 15 item + 14 stat icons at card size and HUD size, plus greyscale; each named. One board so single icons can be rejected.
- [x] **U3 Cards:** shop card (weapon and item) and level-up card restyled on today's layouts, all four tiers, legendary pick animation as a looping preview.
- [x] **U4 HUD + screens:** in-game HUD (HP, timer, scrap, bottom-left weapon + item slots with icons), plus menu, loadout, summary, pause and victory restyled.
- [x] Owner approval recorded in the design doc and in this plan, with any calls the owner makes. **Approved 2026-10-25** (canvas v13): U1–U4 as drawn incl. the open choices; details in the [design doc](../specs/2026-10-25-ui-art-refresh-design.md#owner-approval-2026-10-25).

## Task 1 — Icons in the pipeline

**Files:** create `src/art/icons.ts`, `src/art/icons.test.ts`; modify `src/art/textures.ts`, `src/art/textures.test.ts`.
**Interfaces:** `ITEM_ICONS`, `STAT_ICONS` (ids from the data files); `iconSvg(kind: "item" | "stat", id: string): string`; texture key `iconKey(kind, id) = "icon_<kind>_<id>"`; weapons use `weapon_<id>` frame `t1..t4`.
- Tests first: every `items.json` id and `upgrades.json` stat has an icon and no extra ones; every icon parses (jsdom `DOMParser`), is ASCII, has unique ids, stays under the size budget; `spriteFrameKeys` (or a sibling) lists the icon keys.

## Task 2 — Type and UI kit

**Files:** `src/config/theme.ts` (`FONTS` without `pixel`), `src/scenes/fonts.ts` (+ test), `src/scenes/ui.ts` (panel, button, tierChip/tierTab, statTile, new `card`/`slot` helpers per U1), every scene calling `"pixel"`, `src/fx/Juice.ts` (damage numbers per U1).
- Tests first: grep-style test that no source file uses `VT323` or `"pixel"` font; fonts list no longer loads VT323; damage-number style (crit = amber, larger) via a pure style function.

## Task 3 — Cards

**Files:** `src/scenes/ShopScene.ts`, `src/scenes/LevelUpScene.ts`, `src/scenes/ui.ts`, `src/fx/sounds.ts` (legendary sound), tests.
- Shop and level-up cards show the icon window, tier frame/badge, idle glow on t3–t4; legendary pick plays its animation + sound once. Test: picking a t4 card plays the legendary sound once and buys once (fake scene / pure helper).

## Task 4 — HUD slots

**Files:** `src/scenes/UIScene.ts` (+ pure layout helper `hudSlots(weapons, items, w, h)` in `src/scenes/hud.ts` with tests).
- Tests first: layout for 1–6 weapons and 0–N items fits 800×600 without overlap; icons and tier borders come from the run state each wave.

## Task 5 — Screens

**Files:** `MenuScene`, `LoadoutScene` (weapon icons on the starter cards), `PauseScene`, `SummaryScene` (item chips use icons), `VictoryScene`.

## Task 6 — Verify and docs

- Browser (Playwright headless like PR 1–2): shop, level-up, HUD in a wave with 6 weapons + several items, summary, menu; WebGL and Canvas; console clean; fps with F2; boot vs PR 2.
- Docs: ROADMAP (art refresh row: PR 5), ASSETS_GUIDE (icons section), ARCHITECTURE (`icons.ts`, `hud.ts`), MVP spec §6 note (no pixel font, icons now exist), this plan's outcome section.
- Final whole-branch review, then report to the owner with the browser screenshots; push/PR only on the owner's word.

## Outcome (2026-10-25)

- Shipped on `feat/art-ui` (on top of `feat/art-weapons`): `src/art/icons.ts` (29 icons, byte-identical to the canvas apart from the ink colour), icon textures baked at boot; VT323 gone (`FONTS`, font loading, `index.html`, a guard test); `ui.ts` kit (`num`, `drawPanel`/`panel`, `button`, `badge`/`tierBadge`, `iconWindow`/`fitImage`, `cardGlow`, `legendaryPop`); shop and level-up cards per U3; `hud.ts` + HUD strip per U4; menu, loadout, pause, round complete and summary restyled; `DAMAGE_NUMBER` white / amber crit with pop; `legendary` sound.
- Tests: 248 pass (2 skipped); `pnpm build` clean (the >500 kB chunk warning predates this branch).
- Browser (headless Chrome via Playwright, WebGL and `?renderer=canvas`): menu, loadout, shop (T3/T4 glow, legendary buy), level-up (legendary pick applies once, then the next pick), HUD with 6 weapons and 13 item ids, 150 peas, pause, round complete, summary; no console errors or warnings.
- fps with F2 (150 peas) + F3: 60 on both renderers.
- Boot to menu (dev server, warm, median of 5): WebGL 723 ms vs 609 ms on PR 2 (+114), Canvas 472 vs 447 ms (+25). With PR 1–2 (about +360 ms) the art refresh stays inside its 500 ms budget.
- Rulings (from the ledger): legendary effect overlays the card area instead of animating a card copy; level-up waits 0.9 s after a T4 pick (input ignored, one pick guaranteed); the legendary sound is one ZzFX voice (E5 leaping to E6 + echo + shimmer) rather than a 4-note arpeggio; damage-number "white" is the theme's text colour (colour guard); crisp text was already global (`installCrispText`); `getPlayerStats()` now returns `items` for the HUD; shop owned-weapon slots also show their sprite.
- Carry-overs: the shop ITEMS list is still names, (proposed) item chips; legendary animation and sound refinement (owner); small Plex text (9–10 px) reads thin in downscaled screenshots, check on the owner's screen.

