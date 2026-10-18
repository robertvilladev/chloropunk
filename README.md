# Veggie Vendetta

A Brotato-style arena roguelike: a cyberpunk fighter smashes mutant vegetables in a neon city.
Built with **Phaser 3.90**, **TypeScript (strict)**, **Vite** and **Vitest**. Desktop browser, WASD/arrows; weapons auto-fire.

**Status:** MVP in progress. [ROADMAP.md](ROADMAP.md) tracks what's done and what's next; the [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md) holds the intent.

Today you can play timed waves 1–10 against five vegetable types, collect scrap and XP, and visit a placeholder shop between waves. Level-up picks, a real shop, more weapons, the boss and final art are on the roadmap.

## Run it

Needs Node 20+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build` (type-check + production build), `npm test`, `npm run test:coverage`, `npm run type-check`. CI runs build + coverage on PRs.

Dev only: `window.game` is exposed; F2 spawns 150 peas, F3 toggles an FPS readout.

## Content is data

Enemies, weapons and waves live in `assets/data/*.json`. Adding an enemy or wave is a JSON change plus at most one behaviour function. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Docs

- [ROADMAP.md](ROADMAP.md) — milestone tracker to the MVP
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the code is organised
- [ASSETS_GUIDE.md](ASSETS_GUIDE.md) — importing JSON data
- [docs/superpowers/](docs/superpowers/) — spec and per-milestone plans
