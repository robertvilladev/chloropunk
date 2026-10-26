# Chloropunk — agent notes

Phaser 3.90 + TypeScript (strict) + Vite + Vitest. Read [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [ROADMAP.md](ROADMAP.md) first; the binding intent is the [MVP spec](docs/superpowers/specs/2026-10-18-mvp-roguelike-design.md).

## Package manager: pnpm only

Use `pnpm` for everything (`pnpm install`, `pnpm add -D x`, `pnpm <script>`, `pnpm exec <bin>`, one-off tools with `pnpm dlx`); never `npm`/`npx`/`yarn`, and never commit a `package-lock.json`. Script args go straight after the name: `pnpm runs runs`, `pnpm playtest --seed 2` (no `--`). A dependency that needs a build script must be approved in `pnpm-workspace.yaml` (`allowBuilds`); none does today, so the file is absent.

- A fresh worktree has no `node_modules`: run `pnpm install` first.
- Dev server for the preview tool: `.claude/launch.json` (git-ignored, one per worktree) with `"runtimeExecutable": "pnpm"`, `"runtimeArgs": ["dev", "--port", "<N>", "--strictPort"]` and `"port": <N>`. Pick a port no other worktree uses; `--strictPort` stops Vite from silently moving to a port another session's server owns.

## Branches and commits

- Branches: `<type>/<kebab-slug>`, e.g. `feat/arena-spawning`, `fix/shop-reroll`, `docs/roadmap-a3`. Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`. No `claude/` (or other tool) prefix.
- A session worktree created by the app starts on `wip/<name>` (older ones on `claude/<name>`): rename it before the first push (`git branch -m feat/<slug>`).
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) with the same types (`feat: far enemies catch up`). PRs target `main`.

## Docs are part of the work

This is a rule, not a suggestion. Every change, however small, goes through these steps:

1. **Before you start:** make sure your branch is up to date with `origin/main` (`git fetch` first), then read the docs your change touches. Docs on a stale branch are stale by definition.
2. **Before you finish:** go through the list below and update every doc the change touches, in the same PR as the code.
3. **Check consistency, don't assume it.** When a doc disagrees with the code, with git, or with another doc, check the source of truth (the code, `git log`, `gh pr list`) and fix the doc. If you can't tell which side is right, or the fix would change intent (the spec, an owner decision, a feature's scope), **ask the user** instead of guessing.

What to update:

- **ROADMAP.md** — tick/retarget feature status, add new carry-overs or known issues, move new ideas to the parking lot. Never invent features the spec doesn't name; mark inferred ones "(proposed)". Keep section headers (✅/🚧/⬜) and the milestone table in sync with the bullets under them.
- **README.md / ARCHITECTURE.md / ASSETS_GUIDE.md** — update if you add, rename or delete scenes, managers, `src/core` modules, data files, scripts, dev flags or run flow.
- **CLAUDE.md** — update if you change tooling, scripts, branch/commit conventions or files it names.
- **Spec / plans** under `docs/superpowers/` — the spec is binding; if the work deviates from it, say so in the plan or ask. Add a plan's outcome/carry-overs section when a milestone ends.

How to write them:

- Don't write states that go stale on merge ("not merged yet", "on branch X", "this PR"). Write what is true once the PR lands, and link the plan or PR.
- Fix stale statements you notice, even outside your task, or list them in your report. Keep docs short and link instead of duplicating.
- Say in your final report which docs you updated, or why none needed it.
