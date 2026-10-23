# Chloropunk — agent notes

Phaser 3.90 + TypeScript (strict) + Vite + Vitest. Read [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [ROADMAP.md](ROADMAP.md) first; the binding intent is the [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md).

## Package manager: pnpm only

Use `pnpm` for everything (`pnpm install`, `pnpm add -D x`, `pnpm <script>`, `pnpm exec <bin>`); never `npm`/`npx`/`yarn`, and never commit a `package-lock.json`. Script args go straight after the name: `pnpm runs runs`, `pnpm playtest --seed 2` (no `--`). Dependency build scripts must be approved in `pnpm-workspace.yaml` (`allowBuilds`).

## Docs are part of the work

Every agent working here must check the docs before finishing and update them when the change touches them:

- **ROADMAP.md** — tick/retarget feature status, add new carry-overs or known issues, move new ideas to the parking lot. Never invent features the spec doesn't name; mark inferred ones "(proposed)".
- **README.md / ARCHITECTURE.md / ASSETS_GUIDE.md** — update if you add, rename or delete scenes, managers, `src/core` modules, data files, scripts or run flow.
- **Spec / plans** under `docs/superpowers/` — the spec is binding; if the work deviates from it, say so in the plan or ask. Add a plan's outcome/carry-overs section when a milestone ends.
- Fix stale statements you notice (even outside your task) or list them in your report. Keep docs short and link instead of duplicating.

Include doc changes in the same PR as the code.
