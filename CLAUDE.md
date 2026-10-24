# Chloropunk — agent notes

Phaser 3.90 + TypeScript (strict) + Vite + Vitest. Read [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [ROADMAP.md](ROADMAP.md) first; the binding intent is the [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md).

## Package manager: pnpm only

Use `pnpm` for everything (`pnpm install`, `pnpm add -D x`, `pnpm <script>`, `pnpm exec <bin>`, one-off tools with `pnpm dlx`); never `npm`/`npx`/`yarn`, and never commit a `package-lock.json`. Script args go straight after the name: `pnpm runs runs`, `pnpm playtest --seed 2` (no `--`). Dependency build scripts must be approved in `pnpm-workspace.yaml` (`allowBuilds`).

- A fresh worktree has no `node_modules`: run `pnpm install` first.
- Dev server for the preview tool: `.claude/launch.json` (git-ignored, one per worktree) with `"runtimeExecutable": "pnpm"`, `"runtimeArgs": ["dev", "--port", "<N>", "--strictPort"]` and `"port": <N>`. Pick a port no other worktree uses; `--strictPort` stops Vite from silently moving to a port another session's server owns.

## Branches and commits

- Branches: `<type>/<kebab-slug>`, e.g. `feat/arena-spawning`, `fix/shop-reroll`, `docs/roadmap-a3`. Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`. No `claude/` (or other tool) prefix.
- A session worktree created by the app starts on `wip/<name>` (older ones on `claude/<name>`): rename it before the first push (`git branch -m feat/<slug>`).
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) with the same types (`feat: far enemies catch up`). PRs target `main`.

## Docs are part of the work

Every agent working here must check the docs before finishing and update them when the change touches them:

- **ROADMAP.md** — tick/retarget feature status, add new carry-overs or known issues, move new ideas to the parking lot. Never invent features the spec doesn't name; mark inferred ones "(proposed)".
- **README.md / ARCHITECTURE.md / ASSETS_GUIDE.md** — update if you add, rename or delete scenes, managers, `src/core` modules, data files, scripts or run flow.
- **Spec / plans** under `docs/superpowers/` — the spec is binding; if the work deviates from it, say so in the plan or ask. Add a plan's outcome/carry-overs section when a milestone ends.
- Fix stale statements you notice (even outside your task) or list them in your report. Keep docs short and link instead of duplicating.

Include doc changes in the same PR as the code.
