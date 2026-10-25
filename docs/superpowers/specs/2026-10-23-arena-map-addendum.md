# Chloropunk — Arena map, boss and art refresh addendum

Date: 2026-10-23 · Status: **approved by the owner 2026-10-23** · Amends the [MVP spec](2026-10-18-mvp-roguelike-design.md) §4 step 2, §5 enemies, §6 look and feel.

Design exploration (live sketch, code impact): https://claude.ai/artifact/Joe6YTuK7XMsoCTbkyFs56

## 1. Why

Playtests feel solid but static: the arena is exactly the 800×600 screen, so the camera never moves. The fix stays inside the spec's world ("the arena is a rooftop / street block"): one fixed, hand-made map larger than the screen, with a camera that follows the fighter. No procedural, infinite or multi-map runs (parking lot).

## 2. Owner decisions (2026-10-23)

1. **Map size 2×:** the arena is **1600×1200** design px. The screen stays the 800×600 design space at camera zoom 2 (`config/view.ts`); menus, shop and other screens don't change.
2. **Follow camera** in `GameScene` only, light smoothing, clamped to the arena bounds.
3. **Spawn rule = just off-screen.** Amends §4 step 2 ("enemies spawn in groups at the arena edges"): spawn points sit on a ring just outside the camera frame, clamped inside the arena. Telegraphs that are off-screen show as arrows on the screen edge. Keeps the balance model's spawn distance (`sim.ts` `spawnDist` 330) close to today.
4. **Small obstacles are in the MVP:** a handful of small solid props (vents, crates) that the player and enemies collide with; enemies get a simple steering push around them. Bigger level design is refined after the MVP. Outcome (A5, owner-approved 2026-10-25): the 4 vents are solid, drawn as raised blocks, no crates; enemies slide around them and keep apart (`avoid`); see the [A5 outcome](../plans/2026-10-23-arena-5-obstacles.md#outcome-2026-10-25).
5. **Rooftop decor:** one hand-made layout (floor zones, neon billboard, vents, puddles, helipad, rail), defined as data. Palette (owner pick 2026-10-24, out of Night violet / Toxic teal / Graphite + one neon, shown in game at wave 4): **Night violet**, dim indigo/violet tokens in `THEME_CSS.decor` (zones `#1a1730`, outlines `#6a4cc2`, rail posts `#7b5cff`, puddles `#5b3fd1` at ~20% with a faint pink rim); the pink billboard is the only bright decor.
6. **Boss (wave 10)** is a big humanoid built from the parts of the vegetables that spawn (see §3). Its look is refined in Claude Design before it is built.
7. **Art refresh:** today's sprites (16×16 grids drawn at 3×, then zoom 2) read too chunky. Fighter, 5 enemies, scrap and the boss get finer sprites, art direction refined in Claude Design (see §4). Amends §6 "Sprites: 16×16 pixel grids drawn at 3×".
8. **Order:** the arena work lands before the boss, because the boss's attacks depend on the arena size.

## 3. Boss: the Compost Colossus (working name)

A ~3× size humanoid stitched together from the five enemies: **potato torso** (tank: armoured, heavy), **carrot arms** (shooter), **pepper legs** (dasher), **tomato head** (exploder), **pea pods** on the shoulders (chasers). Each part maps to one attack, so the player already knows how to read it:

| Pattern | Part | Behaviour | Counter |
|---|---|---|---|
| Carrot volley | arms | fan of 5–7 aimed bolts, telegraphed by the arms glowing | move sideways |
| Pepper charge | legs | 0.6 s telegraph line, then a straight dash across the map, stops at obstacles/walls | step off the line; use obstacles |
| Tomato barrage | head | 3–5 tomatoes lobbed onto ground markers, explode like the exploder | leave the markers |
| Pea brood (support) | shoulders | spawns a small pea group every few seconds; this is the spec's "reduced-rate regular spawns" | AoE weapons |

Below 50% HP it enters phase 2: shorter cooldowns, two patterns can overlap. Wave 10 has no timer and ends when the boss or the player dies (spec §4). Numbers are the builder's call, checked with the sim and playtests.

## 4. Art refresh direction

- Same palette, same y-sorted 3/4 view, same texture keys (game code refers to sprites only by key, spec §6), so the swap needs no gameplay change.
- Finer pixels: the art session chooses between denser grids (e.g. 32×32 drawn at 1.5–2×) and PNG sheets exported from Claude Design, and records the choice here. Actor size on screen stays close to today (≈48 design px tall; boss ≈3×).
- Claude Design (Design canvas) holds the approved sheet: fighter, pea, pepper, potato, carrot, tomato, scrap, boss (idle, walk, hit; boss attack poses). The owner reviews it before the code PR.

## 5. Delivery

One PR per row, each with its own plan and session. "Depends on" = the PR builds on the merged one. Status lives in [ROADMAP.md](../../../ROADMAP.md#arena-map-) (A1–A4 merged by 2026-10-24, A5 owner-approved 2026-10-25; measured spawn distance 480 px, sim `spawnDist` updated).

| PR | Plan | Depends on |
|---|---|---|
| A1 Arena size split | [plan](../plans/2026-10-23-arena-1-split.md) | — |
| A2 Follow camera, 2× arena | [plan](../plans/2026-10-23-arena-2-camera.md) | A1 |
| A3 Off-screen spawning | [plan](../plans/2026-10-23-arena-3-spawning.md) | A2 |
| A3b Arrivals (far enemies walk 2×) | no plan (follow-up from the A3 playtest, PR #38) | A3 |
| A4 Rooftop decor | [plan](../plans/2026-10-23-arena-4-rooftop.md) | A3 |
| A5 Small obstacles | [plan](../plans/2026-10-23-arena-5-obstacles.md) | A4 |
| Art refresh (design, then sprites) | [plan](../plans/2026-10-23-art-refresh.md) | — (parallel) |
| M4a Run end (summary, best wave) | [plan](../plans/2026-10-23-m4-run-end.md) | — (parallel) |
| M4b Boss | [plan](../plans/2026-10-23-m4-boss.md) | A5, art design approved, M4a for the victory hand-off |
