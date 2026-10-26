# Chloropunk

A Brotato-style arena roguelike: a cyberpunk fighter smashes mutant vegetables in a neon city.
Built with **Phaser 3.90**, **TypeScript (strict)**, **Vite** and **Vitest**. Desktop browser, WASD/arrows; weapons auto-fire; Esc or P pauses (also when the window loses focus).

**Status:** MVP in progress. [ROADMAP.md](ROADMAP.md) tracks what's done and what's next; the [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md) holds the intent.

Today you pick a starting weapon and play timed waves 1–10 against five vegetable types. Between waves you take level-up picks and shop: 4 offers with reroll, lock, sell and weapon merging. There are 6 weapon types (tiers 1–4, up to 6 slots) and 15 items. Sound effects are procedural ([ZzFX](https://github.com/KilledByAPixel/ZzFX), no audio files) with an SFX volume in the pause settings. Two CC-BY synthwave loops play on the menu and in waves ([credits](assets/audio/CREDITS.md)), with master and music volume too. A run ends in a summary screen (victory or defeat, with your build) and the main menu shows your best wave. The wave-10 boss and final art are on the roadmap.

## Run it

Needs Node 22+ and pnpm (pinned in `package.json`; `corepack enable` picks the right version). npm is blocked on purpose (`engines` + `.npmrc`) so no `package-lock.json` gets generated.

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Other scripts: `pnpm build` (type-check + production build), `pnpm test`, `pnpm test:coverage`, `pnpm type-check`, `pnpm sim` (per-wave balance tables, see the [balance design](docs/superpowers/specs/2026-10-20-balance-design.md)), `pnpm runs <file or folder>` (per-wave medians from exported run logs next to the sim's prediction, the targets on them, and fitted sim `aim`/`contactRate`; balance design §9). CI runs build + coverage on PRs; `main` is protected (PRs + green CI) and deploys to Vercel.

Dev only: `window.game` is exposed; F2 spawns 150 peas, F3 toggles an FPS readout, F4 downloads the stored run logs (last 50 runs, localStorage `vv.runs`) as `runs.json`, F8 toggles the autopilot. `?renderer=canvas` forces the Canvas renderer (fallback check), `?seed=N` fixes the run seed.

Playtesting a late wave (dev only, combine freely):
- `?wave=N&build=<name>` starts the run at wave N with the build the sim's shopper owns by then (weapons, items, level picks, scrap). `<name>` is any part of a `REFERENCE_BUILDS` name in `src/core/sim.targets.ts`: `typical` (default), `never` (pistol, no shopping), `shotgun`, `blade`. The loadout pick is ignored.
- `?autopilot` (or F8 in a wave) kites for you: circle-strafes away from nearby enemies, stays off walls, grabs scrap when safe. It drives `InputManager`, so game rules are unchanged. Use it for reproducible "moving player" runs to calibrate the sim.
- Full run headless: `pnpm playtest [--seed 1] [--runs 1] [--wave N --build typical] [--headed]` starts Vite, plays `/?seed=N&autopilot` in Playwright's Chromium at 3×, takes the first level-up pick, buys nothing in the shop, and writes the run log to `runs/playtest-<seed>.json` (git-ignored) until death or wave 10 (about 1–2 min). Then `pnpm runs runs`. First time: `pnpm exec playwright install chromium`. Runs aren't frame-exact, so the same seed can end a wave or two apart.
- Full run by hand: open `/?seed=1&autopilot`, press 3 for 3× speed, click through the shop/level-ups, F4 for the log.

## Content is data

Enemies, weapons, items, level-up upgrades, the character, waves and the rooftop decor layout live in `assets/data/*.json`. Adding an enemy, weapon, item or wave is a JSON change plus at most one behaviour function. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Docs

- [ROADMAP.md](ROADMAP.md) — milestone tracker to the MVP
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the code is organised
- [ASSETS_GUIDE.md](ASSETS_GUIDE.md) — importing JSON data, sprites, SFX
- [docs/superpowers/](docs/superpowers/) — spec and per-milestone plans
