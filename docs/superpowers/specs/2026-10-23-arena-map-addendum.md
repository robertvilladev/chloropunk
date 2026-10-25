# Chloropunk — Arena map, boss and art refresh addendum

Date: 2026-10-23 · Status: **approved by the owner 2026-10-23**, §3–§4 revised 2026-10-24 · Amends the [MVP spec](2026-10-18-mvp-roguelike-design.md) §4 step 2, §5 enemies, §6 look and feel.

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

## 3. Boss: three looks, one fight (revised 2026-10-24)

The owner dropped the stitched-vegetable *Compost Colossus* (2026-10-24: "looks weird"). Each run picks one of **three bosses** at random from the run seed: **Harvester-9** (a rogue cyber combine harvester, tomato pilot in the dome), **The Onion King** (a mutant onion with a neon crown), **The Greenhouse** (a walking hydroponic lab on spider legs). **Same fight, own look:** all three share the patterns, timings, HP and body below; only the art, projectile art and banner name differ. Concepts: [canvas](https://claude.ai/artifact/TnsQjaTcJEYoShEC5AyMXM), board "Boss proposals".

| Pattern | Behaviour | Telegraph (Harvester-9 / Onion King / Greenhouse) | Counter |
|---|---|---|---|
| Volley | fan of 5–7 aimed bolts | gatling arm glows / layer shards bristle / side turret glows | move sideways |
| Charge | 0.6 s telegraph line, then a straight dash across the map, stops at obstacles/walls | leg thrusters flare / roots tuck, rolls / spider legs crouch | step off the line; use obstacles |
| Barrage | 3–5 lobbed shots onto ground markers, explode like the exploder | shoulder mortar / tear-gas bulbs / roof mortar | leave the markers |
| Pea brood (support) | spawns a small pea group every few seconds; the spec's "reduced-rate regular spawns" | back hopper / sprouted seedlings / base hatch | AoE weapons |

Below 50% HP it enters phase 2: shorter cooldowns, two patterns can overlap (looks, owner 2026-10-25 option B "unleashed": Harvester-9's dome glass shatters / the Onion King's outer layer peels to a lime core / the Greenhouse's glass breaks open and vines burst out). The switch is marked by a white flash, a burst in the boss's colour, a short shake and a "PHASE 2" banner. Wave 10 has no timer and ends when the boss or the player dies (spec §4). Numbers are the builder's call, checked with the sim and playtests.

## 4. Art refresh direction (revised 2026-10-24)

- **Vector, not pixel art** (owner 2026-10-24), Brotato-inspired, own designs: thick ink outline plus a thin light **keyline** rim (reads on the dark floor), flat fill with one shade, simple angry faces, clearly different enemy sizes. Amends MVP spec §6 "Sprites: 16×16 pixel grids drawn at 3×" and the pixel-data pipeline: sprites are Claude-authored **SVG strings** (`src/art/vector.ts`), rasterised at boot at 2× and drawn at ½ scale.
- Same palette roles, same y-sorted 3/4 view, same texture keys and frame names, so game code keeps using sprites by key.
- Hit areas grow with the art: pea r12, pepper r14, carrot r15, tomato r17, potato r26; player 32×32 and scrap 16×16 unchanged.
- Scrap: **power bolt** (hex nut, lime ring core). Weapons get their own sprites with a baked tier-colour trim; animations add enemy attack tells, hit/death/spawn pops, weapon feedback and squash-and-bob movement.
- Source of truth: [canvas "Chloropunk Sprites"](https://claude.ai/artifact/TnsQjaTcJEYoShEC5AyMXM) (keyline, cast, power bolt approved 2026-10-24; weapons, animations and boss sheets approved 2026-10-25). Pixel option B (32×32 at 1.5×) was chosen first the same day and then superseded; its boards stay on the canvas's "Superseded" page.
- Delivery: four PRs, see the [art refresh plan](../plans/2026-10-23-art-refresh.md).

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
| Art refresh (canvas, then 4 PRs: cast, weapons, animations, boss sheets) | [plan](../plans/2026-10-23-art-refresh.md) | — (parallel); weapons PR after A5 |
| M4a Run end (summary, best wave) | [plan](../plans/2026-10-23-m4-run-end.md) | — (parallel) |
| M4b Boss | [plan](../plans/2026-10-23-m4-boss.md) | A5, art PR 4 (boss sheets; placeholder until then), M4a for the victory hand-off |
