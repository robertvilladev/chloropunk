# Veggie Vendetta

A Brotato-style arena roguelike: a cyberpunk fighter smashes mutant vegetables in a neon city.
Built with **Phaser 3.90**, **TypeScript (strict)**, **Vite** and **Vitest**. Desktop browser, WASD/arrows; weapons auto-fire.

**Status:** MVP in progress. [ROADMAP.md](ROADMAP.md) tracks what's done and what's next; the [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md) holds the intent.

Today you pick a starting weapon and play timed waves 1–10 against five vegetable types. Between waves you take level-up picks and shop: 4 offers with reroll, lock, sell and weapon merging. There are 6 weapon types (tiers 1–4, up to 6 slots) and 15 items. The boss, run summary and final art are on the roadmap.

## Run it

Needs Node 20+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build` (type-check + production build), `npm test`, `npm run test:coverage`, `npm run type-check`, `npm run sim` (per-wave balance tables, see the [balance design](docs/superpowers/specs/2026-10-20-balance-design.md)). CI runs build + coverage on PRs.

Dev only: `window.game` is exposed; F2 spawns 150 peas, F3 toggles an FPS readout. `?renderer=canvas` forces the Canvas renderer (fallback check), `?seed=N` fixes the run seed.

## Content is data

Enemies, weapons, items, level-up upgrades, the character and waves live in `assets/data/*.json`. Adding an enemy, weapon, item or wave is a JSON change plus at most one behaviour function. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Docs

- [ROADMAP.md](ROADMAP.md) — milestone tracker to the MVP
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the code is organised
- [ASSETS_GUIDE.md](ASSETS_GUIDE.md) — importing JSON data
- [docs/superpowers/](docs/superpowers/) — spec and per-milestone plans
