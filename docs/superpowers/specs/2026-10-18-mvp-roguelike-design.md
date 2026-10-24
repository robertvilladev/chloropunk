# Chloropunk — MVP Design

Date: 2026-10-18 · Status: draft for approval

**Name:** *Chloropunk* (owner decision 2026-10-22, was *Veggie Vendetta*). Favicon: the pixel "Slime C" (`public/favicon.svg`); logo and marks in the [Claude Design canvas](https://claude.ai/artifact/NsAx5gUQWJPCVBDHxirktd).

## 1. Intent

Turn the current prototype into a **solid, replayable MVP** of a Brotato-style arena
roguelike. The player is a **cyberpunk fighter in a neon city overrun by mutant
vegetables**, smashing them with a growing arsenal of weapons. Brotato is the
canonical reference for the loop; the identity comes from the cyberpunk-veggie
world and a look borrowed from the owner's *Sudoku 2077* design language.

Why now: the prototype loop works (as of PR #13 the game survives multiple rounds,
carries coins and upgrades), but it feels empty: too few enemies, no feedback on
hits, and a shop with nothing to decide. The goal is a game a friend plays for
10 minutes and then hits "one more run".

**Success** = a full run of 10 waves ending in a boss, where each run plays
differently because of shop and level-up choices, with readable, punchy
feedback and a coherent cyberpunk pixel-art look.

## 2. Goals, non-goals, anti-goals

**Goals (MVP)**
- Complete run: start → 10 waves → boss on wave 10 → win/lose summary → restart.
- Real build-crafting: random shop offers, reroll, lock, weapon merging, level-up picks.
- Dense, escalating waves driven by data.
- "Juice": damage numbers, hit flash, screen shake, death bursts, pickup magnet.
- Pixel-art sprites in a top-down 3/4 perspective with depth (see §6; vector sprites since 2026-10-24).
- A small design system (colors, type, UI frames) defined in Claude Design and used
  by every screen.

**Non-goals (later, not MVP)**
- Multiple playable characters (MVP has one character; the data model allows more).
- Meta-progression / unlocks between runs, save files beyond a high score.
- Mobile/touch controls, gamepad, localization, audio beyond a few SFX (which SFX, and the planned music loops: [audio addendum](2026-10-23-audio-addendum.md)).
- Online anything (leaderboards, accounts).
- Endless mode, difficulty tiers.

**Anti-goals (would make it a failure even if it "works")**
- Copying Brotato's art, names, or exact item list. Take the loop, not the content.
- A shop where one option is always correct (no real choice).
- Visual noise that hides enemies or the player; effects must stay readable.
- Hardcoded content in scene code. Adding a weapon, item, enemy or wave must
  be a data change plus (at most) one behavior function.

## 3. Constraints and starting point

- Keep the stack: **Phaser 3.90 + TypeScript (strict) + Vite + Vitest**, web, desktop
  browser, keyboard (WASD/arrows). Canvas stays 800×600 logical, scaled to fit.
- Build on the existing manager-per-domain structure (`src/managers/*`) and the
  `RunState` hand-off introduced in PR #13 (fix/round-loop-blockers). This design
  branches from that work.
- Content lives in JSON under `assets/data/` (enemies, weapons, waves; add items,
  character, stats).
- Must hold **60 fps with ~150 enemies + projectiles** on a mid laptop: pooled
  enemies/projectiles/pickups, no per-frame allocations in hot loops.
- CI (GitHub Actions) runs build + tests; keep it green.

## 4. The run loop (decided)

1. **Menu → Start run.** One character; player picks **1 of 3 starting weapons**.
2. **Wave** (wave *n* lasts `20 + 4·(n−1)` s, capped at 60 s *(amended 2026-10-24: `32 + 2·(n−1)` s, capped at 60; [wave length addendum](2026-10-24-wave-length-addendum.md))*). **Wave 10 is the
   boss wave** *(builder's call)*: it has no timer and lasts until the boss or the
   player dies. Regular enemies keep spawning at a reduced rate as support. Enemies spawn in groups at the arena edges *(amended 2026-10-23: just outside the camera frame, with arrows for off-screen telegraphs; [arena map addendum](2026-10-23-arena-map-addendum.md) §2.3)* (with a short telegraph
   marker before they appear), spawn rate and mix come from `waves.json`.
   Weapons auto-fire; the player only moves.
3. **Drops.** Smashed vegetables drop **scrap** (currency) and give **XP**.
   Scrap within a pickup radius is pulled toward the player. Scrap still on the
   ground when the wave ends is collected automatically.
4. **Level-up.** Each level gained during a wave grants one pick, resolved after
   the wave: choose **1 of 4 random stat upgrades** (rarity-weighted), with a
   paid reroll.
5. **Shop.** 4 random offers (weapons + items, weighted by wave and rarity).
   - **Reroll**: cost starts low and increases each reroll within a shop visit.
   - **Lock**: keep an offer into the next shop.
   - **Weapons**: up to **6** slots, tiers 1–4. Merge rules *(builder's call,
     Brotato-style)*: only two copies of the **same weapon at the same tier**
     merge, into tier+1. With a free slot, buying a duplicate adds a second copy.
     In the shop the player can combine any matching pair they own at any time.
     With all slots full, buying a weapon that matches an owned one at the same
     tier merges automatically. With no match, it can't be bought until a slot
     is freed.
   - **Sell**: weapons can be sold for part of their price.
6. **Repeat** until wave 10. Boss dies → **Victory** summary. HP hits 0 →
   **Defeat** summary. Both show wave reached, kills, damage dealt, build, and a
   "one more run" button.

## 5. Systems

**Stats.** One player stat block, all derived from base + items + level-ups:
max HP, HP regen, armor (damage reduction), dodge %, move speed, damage %,
melee/ranged/elemental damage, attack speed %, crit %, range, pickup radius,
luck (affects rarity rolls), harvesting (bonus scrap at wave end).
Stats are computed by a pure function (`computeStats(run)`) so they're testable
and the HUD/shop can preview changes.

**Weapons.** Each weapon = data (base damage, cooldown, range, tier scaling,
scaling stat, tags like `ranged`/`melee`/`elemental`, price) + a behavior type.
MVP behavior types (≈6 weapons): `projectile` (pistol), `spread` (shotgun),
`beam` (laser), `melee-arc` (blade), `orbital/drone` (drone), `explosive`
(rocket). Weapons orbit/sit around the player and each targets the nearest
enemy in its range.

**Items.** ≈15 passive items, each a list of stat modifiers (some with
trade-offs, e.g. +damage −speed), rarity 1–4, price. Data-only.

**Enemies.** 5 vegetable types + 1 boss, each = data + a movement/attack
behavior: chaser (e.g. pea pod), fast dasher (pepper), tank (potato),
ranged shooter (carrot), exploder on death (tomato); boss (e.g. giant
cabbage/onion) with 2–3 attack patterns. Enemy HP/damage scale per wave.

**Waves.** `waves.json` defines per wave: duration, spawn groups (enemy type,
count, interval, start time), and scaling multipliers. Waves after the
authored ones may be generated by formula, but all 10 MVP waves are authored.

**Randomness.** A seeded RNG for shop/level-up/spawn rolls, so a run can be
reproduced in tests and debugging.

**Feedback ("juice").** Floating damage numbers (crits highlighted), white hit
flash, brief knockback, small screen shake on player hit and big kills, death
burst particles, scrap magnet, low-HP vignette, wave start/end banners.
All effects respect a settings toggle for reduced screen shake.

## 6. Look and feel

**World.** Neon cyberpunk city at night; the arena is a rooftop / street block.
Player: a cyberpunk fighter. Enemies: mutant, angry vegetables with cyber
touches (implants, glowing eyes).

**Perspective — "2D with a 3D feel"** (owner asked for a 2D/3D look; this is
the interpretation): top-down **3/4 view** pixel art, **y-sorted depth**
(lower on screen draws in front), soft drop shadows under every actor, and
neon glow/bloom via Phaser's WebGL FX on projectiles, pickups and accents.
Sprites ~32×32 for regular actors, larger for the boss, rendered with
`pixelArt: true` and integer scaling.

**Art pipeline (decided; style superseded 2026-10-24 by vector SVG sprites, [addendum §4](2026-10-23-arena-map-addendum.md)).** Sprites are **AI-generated by Claude as pixel data**:
each sprite is a character grid plus a palette key (palette = the design-system
colours), stored as data and turned into textures at boot. Animation is a few
grid frames per actor (e.g. 2–4 frame walk/idle, a hit frame); facing is done by
horizontal flip. All game code refers to sprites **only by texture key**, so
these can later be swapped for sprite sheets from a dedicated pixel-art
generator (e.g. PixelLab, Retro Diffusion) or an artist without code changes.
Priority is a game that *feels* like a game; art is good enough to be coherent
and readable, and is revisited after the loop is fun.

**Palette and type** ("Chlorophyll", chosen by the owner over the original *Sudoku 2077*-derived look, which felt too close to that app):
- Ground: neutral cool graphite `#12151b`, surfaces `#1c2029` / `#171a21`, line `#2c323d`, text `#edf2ec`, muted `#949ca3`. No colour washes on the ground.
- **Lime `#c6ff3d` = actions and good events**: primary buttons, scrap, crits, wave banner, positive deltas.
- **Pink `#ff4f9a` = state**: the player, owned/selected things, XP, offset shadows.
- **Decor (arena rooftop, owner pick 2026-10-24: Night violet)**: dim indigo/violet only (floor zones `#1a1730`, vent and helipad outlines `#6a4cc2`, rail posts `#7b5cff`, puddles `#5b3fd1` at ~20% alpha with a faint pink rim), always darker than anything that moves; tokens in `THEME_CSS.decor`. The pink billboard is the only bright decor.
- Danger `#ff6b3d` (orange-red, kept apart from pink). Rarity: grey `#a9b0b8`, cyan `#3ad8ff`, pink `#ff4f9a`, amber `#ffb13b`.
- Display font **Bungee**, UI font **IBM Plex Mono**, in-game numbers **VT323**.
- Motifs: radius 0, hard 4px pink offset shadow under primary elements, tier chips on cards, RGB-split on the logo and wave banner only, a lime slime-drip edge on the main menu, barely-visible scanlines in menus.
- Sprites: vector SVG, see [arena map addendum §4](2026-10-23-arena-map-addendum.md) (was 16×16 pixel grids at 3×), fighter in a pink hood with cyan visor; flames/fuses `#ffd23f`.

**Design system in Claude Design (decided).** Claude builds the design system
(palette, type, frames, button styles) and mockups of the key screens (HUD,
level-up, shop, run summary, main menu, loadout pick) in Claude Design, based
on *Sudoku 2077*. The owner reviews them; **screen/UI milestones wait for that
review**, gameplay milestones don't. The game's UI follows the mockups.

- Design system: https://claude.ai/artifact/9DHSn6f62spjQLXLqsCQee
- Screen mockups: https://claude.ai/artifact/273SegSV2CBPS1HX96Yr17 Tokens are mirrored in
code as a single `theme.ts`.

## 7. Screens

Boot (load) → Main menu → Loadout pick → Game + HUD (HP bar, XP bar, scrap,
wave + timer) → Level-up pick (if any) → Shop → … → Run summary
(victory/defeat). Pause menu (resume, settings, quit run). Settings: volume,
screen shake toggle. Shop and level-up are fully mouse- and keyboard-usable,
and show stat previews on hover.

## 8. Quality bar

- Pure game logic (stats, shop rolls, rerolls, merging, wave scaling, damage
  calc) lives outside Phaser scenes and is unit-tested with Vitest.
- No regressions of PR #13's fixed bugs (scene reuse resetting state, pooled
  bodies, listener cleanup).
- Remove dead weight found in the audit: committed `coverage/`, `src/counter.ts`,
  unused `bitecs` and accidental direct deps (esbuild, rollup, postcss, …).
- Update README/docs to describe the real game (drop "Brotato Experiment" name
  and "production-ready" claims).

## 9. Left to the builder

- Exact numbers (prices, stat values, HP curves, spawn counts): start from
  Brotato-like ratios and tune by play.
- Final names for weapons, items, enemies, boss (in theme).
- Internal architecture beyond the constraints above (e.g. ECS or not, file
  layout of new modules), as long as content stays data-driven.
- Choice of particle/FX implementation and SFX.
- Order of milestones, provided each milestone ends in a playable build.

## 10. Open

Nothing blocking.
