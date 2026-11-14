# Chloropunk

A top-down arena roguelike: a cyberpunk fighter smashes mutant vegetables on a neon rooftop. Desktop browser, keyboard and mouse.
Built with **Phaser 3.90**, **TypeScript (strict)**, **Vite** and **Vitest**; deployed to Vercel from `main`.

**Status:** the MVP is built (10 waves, a boss, build-crafting, run summary). [ROADMAP.md](ROADMAP.md) tracks what's done and what's next; the [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md) holds the intent.

## A run

1. **Menu** → START RUN. The menu also has SETTINGS, CREDITS and your best wave.
2. **Loadout:** pick 1 of 3 starting weapons.
3. **Waves 1–9:** timed waves (32 s, +2 s per wave) on a 1600×1200 rooftop with a follow camera. Five vegetable enemies arrive in packs from just off-screen, telegraphed first; kills drop scrap (money) and XP. Weapons aim and fire on their own; you move.
4. **After each wave:** ROUND COMPLETE, then one **level-up** pick (1 of 4 stat upgrades, paid reroll) per level gained, then the **shop**: 4 offers of weapons and items with reroll, lock, sell and merging two equal weapons into the next tier. 6 weapon types (tiers 1–4, up to 6 slots), 15 items.
5. **Wave 10 is the boss:** one of three looks per run (Harvester-9, The Onion King, The Greenhouse), same fight: no timer, an HP bar, three telegraphed attacks, pea support spawns and a phase 2 below half HP.
6. **Summary:** VICTORY or FLATLINED with wave reached, kills, damage, level, your final build and best wave. ONE MORE RUN goes back to the loadout.

Sound effects are procedural ([ZzFX](https://github.com/KilledByAPixel/ZzFX), no audio files); two CC-BY synthwave loops play on the menu and in waves ([credits](assets/audio/CREDITS.md)).

## Controls

| Where | Keys |
|---|---|
| Wave | WASD / arrows move; Esc or P pauses (so does the window losing focus) |
| Pause | resume, settings (reduced shake, master / music / SFX volume), quit run (asks first) |
| Loadout | 1–3 or ←/→ + Enter/Space pick; Esc back |
| Level-up | 1–4 pick, ←/→ focus, R reroll |
| Shop | 1–4 buy, Shift+1–4 lock, ←/→ focus, R reroll, Tab picks an owned weapon, S sell it, C combine it; Enter/Space next wave |
| Summary | Enter one more run, Esc menu |

Every screen also works with the mouse.

## Run it

Needs Node 22+ and pnpm (pinned in `package.json`; `corepack enable` picks the right version). npm is blocked on purpose (`engines` + `.npmrc`) so no `package-lock.json` gets generated.

```bash
pnpm install
```

```bash
pnpm dev
```

`pnpm dev` serves on http://localhost:3000.

| Script | What it does |
|---|---|
| `pnpm dev` / `pnpm preview` | Vite dev server / serve the production build |
| `pnpm build` | type-check + production build to `dist/` |
| `pnpm test`, `pnpm test:coverage`, `pnpm type-check` | Vitest (watch), coverage run, `tsc --noEmit` |
| `pnpm sim` | headless balance simulator: per-wave tables ([balance design](docs/superpowers/specs/2026-10-20-balance-design.md)) |
| `pnpm runs <file or folder>` | per-wave medians from exported run logs next to the sim's prediction, the targets on them and fitted sim `aim`/`contactRate` (balance design §9) |
| `pnpm playtest [--seed 1] [--runs 1] [--wave N --build typical] [--headed]` | headless autopilot run in Playwright's Chromium at 3× (first level-up pick, buys nothing) until the summary; writes `runs/playtest-<seed>.json` (git-ignored). First time: `pnpm exec playwright install chromium`. The same seed can end a wave or two apart |

CI runs `pnpm build` and `pnpm test:coverage` on PRs; `main` is protected (PRs + green CI).

### Dev flags

Any build:
- `?seed=N` fixes the run seed; `?renderer=canvas` forces the Canvas renderer (fallback check); `?debug` shows Arcade physics bodies.

`pnpm dev` only:
- Starts muted (master volume 0) until you raise it in Settings, since each dev port has its own saved settings. `window.game` is exposed.
- In a wave: F2 spawns 150 peas, F3 toggles an FPS readout, F8 toggles the autopilot, 1/2/3 set game speed. F4 (anywhere) downloads the stored run logs (last 50 runs, localStorage `vv.runs`) as `runs.json`.
- `?wave=N&build=<name>` starts at wave N with the build the sim's shopper owns by then; `<name>` matches part of a `REFERENCE_BUILDS` name in `src/core/sim.targets.ts`: `typical` (default), `never`, `shotgun`, `blade`. `?wave=10&build=typical` goes straight to the boss.
- `?autopilot` kites for you through `InputManager` (game rules unchanged), for reproducible "moving player" runs. By hand: `/?seed=1&autopilot`, press 3, click through, F4 for the log.

## Project layout

```
src/scenes/    one Phaser scene per screen (Boot, Menu, Loadout, Game + UI HUD, Pause, Victory, LevelUp, Shop, Summary)
src/managers/  one manager per domain (Player, Input, World, Weapon, Enemy, Pickup, Boss)
src/core/      pure, tested game rules (waves, stats, shop, inventory, sim, run log, ...)
src/entities/  pure enemy, weapon and boss behaviour
src/art/       vector sprites as SVG strings, baked to textures at boot
src/fx/        juice, SFX, music, glow
assets/data/   content as JSON: enemies, waves, weapons, items, upgrades, character, arena
scripts/       pnpm runs / pnpm playtest
```

Content is data: adding an enemy, weapon, item or wave is a JSON change plus at most one behaviour function. Details in [ARCHITECTURE.md](ARCHITECTURE.md).

## Docs

- [ROADMAP.md](ROADMAP.md) — milestones, known issues, ideas
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the code is organised, run flow, house rules
- [ASSETS_GUIDE.md](ASSETS_GUIDE.md) — JSON data, sprites, SFX, music
- [docs/superpowers/](docs/superpowers/) — spec, addenda and per-milestone plans
- [CLAUDE.md](CLAUDE.md) — conventions for agents (pnpm, branches, docs rule)
