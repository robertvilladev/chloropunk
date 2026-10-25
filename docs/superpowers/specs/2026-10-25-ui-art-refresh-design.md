# UI art refresh (design, owner OK 2026-10-25)

Follow-up to the [art refresh](2026-10-23-arena-map-addendum.md#4-art-refresh-direction-revised-2026-10-24) (sprites, weapons; PRs 1–2). The owner tested PR 2 and found the screens and HUD still look like the old pixel game. This design covers the rest of the look. It amends MVP spec §6 (fonts, "no weapon/item icons") and §7 (screen look; the layouts stay).

## Why

Menus, cards and HUD use the pixel font VT323 for every big number and flat boxes, so they clash with the vector sprites. Cards are hard to tell apart (no pictures). The HUD slots look empty because by M3 scope they only colour a border by tier: no icons, and no items at all.

## Goals

1. One look across sprites and UI: no pixel font anywhere. Big numbers (HP, timer, scrap, prices, level-up amounts, summary values) use Bungee; smaller text stays IBM Plex Mono. Panels get the sprites' ink outline and thin light keyline, dark fill, tier-coloured frames on anything with a tier.
2. **Every card is recognisable at a glance** (owner refs: Brotato shop cards): its own vector icon in a framed window at the card's top-left, tier readable from the frame colour plus a small tier badge (t1 grey `#a9b0b8`, t2 cyan `#3ad8ff`, t3 pink `#ff4f9a`, t4 amber `#ffb13b`). Keep today's card layouts in the shop and level-up screens; restyle, do not rebuild.
3. Icons in the same vector style as the sprites: 15 items (`visor grip synthsteak hoodie sneakers coil chip nanopatch overclock knuckles scope harvester plasma glass ghost`), 14 level-up stats (`maxHp hpRegen armor dodge speed damage melee ranged elemental attackSpeed crit range luck harvesting`, one icon per stat; the tier shows on the card, not in the icon). The 6 weapons reuse their `weapon_<id>` sprites.
4. Life on the cards: a gentle idle glow on higher tiers. **Legendary (t4) picks get their own animation and sound** (details refined later).
5. Damage numbers: bold, crisp, outlined so they read over the floor; normal hits white, crits amber and bigger with a small pop (today crits are lime VT323).
6. HUD bottom-left: smaller slots with the real weapon icons and tier borders, plus a row of owned item icons (Brotato inventory feel).
7. Same treatment for the menu, loadout, pause, summary and victory screens.

## Non-goals

- No new layouts, screens, stats or shop rules. No drag-to-combine.
- No scrap tiers / harvesting feel (still parked on the ROADMAP).
- Legendary animation and sound are a first pass; the owner refines them later.

## Constraints

- Same pipeline as the sprites: icons are SVG strings in `src/art/` (source of truth on the [sprites canvas](https://claude.ai/artifact/TnsQjaTcJEYoShEC5AyMXM), `project/vector.js`), baked at boot; no image files. No tint for any visible state (Canvas renderer).
- Works on WebGL and `?renderer=canvas`; ≥ 60 fps; boot stays inside the art refresh's 500 ms budget (measure).
- Palette roles unchanged (`theme.ts`); text contrast ≥ 4.5:1.
- Delivery: canvas boards approved by the owner first, then **one PR** (`feat/art-ui`), stacked on PR 2 (`feat/art-weapons`).

## Left to the builder

Icon designs, exact font sizes, outline treatment for text (stroke vs baked), glow timing, slot sizes, the legendary animation and sound, and how text is made crisp (e.g. Phaser text resolution). Show them on the canvas first; the owner approves there.

## Owner approval (2026-10-25)

Boards U1–U4 on the [sprites canvas](https://claude.ai/artifact/TnsQjaTcJEYoShEC5AyMXM) (v13) approved as drawn, including the builder's open choices:

- Type: Bungee for every big number with an ink stroke (3 px at 24+, 2 px below), Plex Mono 10 is the smallest text; all text at resolution 2.
- Panels: ink rim + light keyline, 3 px corners. Tier badge `T1`–`T4` on the icon window's corner; tier name in the card's kind line.
- Shop card: LOCK button moves to the top-right corner; Bungee price with the scrap bolt. Level-up card: icon window, stat name, Bungee amount, tier name.
- Glow: T3 pink pulse 1.6 s, T4 amber pulse 1.2 s + shine sweep 3.2 s (baked soft rect + alpha tween, no tint).
- Legendary pick: purchase applied at once; a copy of the card pops (1.1×, white flash, amber ring, 10 sparks, "LEGENDARY!"), non-blocking; sound `legendary` = rising triangle chime E5–G♯5–B5–E6 + shimmer, ~0.6 s, replaces the normal buy/pick sound.
- Damage numbers: Bungee 16 white, 2 px ink; crits Bungee 22 amber, 3 px ink, pop 0.6 → 1.4 → 1 in 100 ms, then the usual float.
- Icons: `icon_item_<id>` (15) and `icon_stat_<id>` (14), 32×32 design px; stat icons carry no tier; pickup radius has no stat icon (no level-up card).
- HUD: 30 px weapon slots (sprite at its tier frame, tier border, T3/T4 glow, empty slots not drawn), 22 px item chips above (rarity border, stack count, ≤ 12 per row, ≤ 2 rows, then "+N"). Scrap shows the power-bolt sprite.
- Loadout: starter cards show the T1 weapon sprite; the slot number becomes a key badge. Summary chips show sprites/icons.
