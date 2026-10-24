# Chloropunk — Balance & progression design

Date: 2026-10-20 · Status: **approved by the owner and applied to the game, 2026-10-20**. The decisions are in §8; the applied changes and the playtest are in §10. Every number comes from the headless simulator (`pnpm sim`).
Binding intent: [MVP spec](2026-10-18-mvp-roguelike-design.md) §4 (run loop), §5 (waves, stats), §9 ("start from Brotato-like ratios and tune by play").
Horizon: the MVP has 10 waves. The model is meant to scale to 20 waves and then an endless mode ([ROADMAP](../../../ROADMAP.md) parking lot).

## 1. TL;DR

- **The loop breaks on throughput, not on scrap collection.** Wave 1 brings 28 HP of enemies per second. The starting pistol removes about 10 HP/s (14 paper DPS × ~70% of shots landing). That is a load of ρ ≈ 2.8, so the backlog grows from second one: 26 spawned, 7–8 killed, 18–20 alive at the end. Every leftover scrap is already auto-collected at wave end (`GameScene.onRoundComplete`), so "8 kills, 8 scrap" means *all* the scrap. The economy is starved because almost nothing dies.
- **The game is a queue.** While ρ (enemy HP arriving per second ÷ the build's effective kill rate) stays under about 0.9, waves clear and scrap flows. Above 1 the backlog grows without bound and the wave collapses within seconds. Live data sits at ρ 2–4 from wave 1. Balance therefore means keeping ρ in a target band per wave.
- **Model (approved):**
  - Author waves from a **threat budget** (base enemy HP per second) instead of hand-picked counts.
  - Separate the two growth knobs: **density** (threat budget) sets income; **enemy HP/damage growth** sets difficulty.
  - Raise **shop prices** 20% per wave, then 25% per wave for the last 3 shops.
  - Tune the starter: peas and peppers drop to 9 HP so the pistol one-shots them, and the pistol fires faster and pierces 1.
  - Add an **alive cap of 40**.
- **Result (typical shopper, sim):**
  - Wave 1 goes from 27% kills / 7 scrap to 94% kills / 15 scrap.
  - About one buy per wave.
  - Real damage taken by wave 9 (43% HP left).
  - Wave 10 (the M4 boss wave) is lethal without a boss design.
- **Next:** §9 adds measurement, a local run log (built 2026-10-21), so later tuning comes from real games and not only from the sim.

## 2. Diagnosis (live data)

Arrivals per wave, from `waves.json` and `scaleEnemy`. Prices are for a 10-scrap item in the following shop.

| wave | s | enemies | enemies/s | enemy HP/s | pea HP / dmg | 10-scrap item costs |
|---|---|---|---|---|---|---|
| 1 | 20 | 28 | 1.40 | 28 | 20 / 4 | 11 |
| 2 | 24 | 38 | 1.58 | 38 | 25 / 5 | 12 |
| 3 | 28 | 62 | 2.21 | 64 | 30 / 5 | 13 |
| 5 | 36 | 109 | 3.03 | 132 | 40 / 6 | 15 |
| 8 | 48 | 267 | 5.56 | 326 | 55 / 8 | 18 |
| 10 | 56 | 421 | 7.52 | 522 | 65 / 9 | 20 |

Against that, the reference builds deliver:
- **Pistol:** 14 paper DPS, 12 damage against 20 HP (2 shots per pea), ≤ 0.8 kills/s.
- **Shotgun:** 24 DPS.
- **Blade:** 21 DPS, up to 3 targets per swing.

The live economy:
- Wave 1 earns 7–8 scrap against a cheapest first-shop item of 11.
- XP equals scrap, and level 2 needs 16, so nobody levels in wave 1.
- Enemy HP grows 25% a wave and spawn density more than 5×, while player power can only grow with scrap the player never earns. The gap widens every wave.

What the owner felt as "scrap stranded under enemies" is real on screen. Economically, though, it's free: leftovers are banked at wave end. The fix is kill throughput.

## 3. The simulator

`src/core/sim.ts` (pure, no Phaser, a few ms per run) reuses the live rules: `buildSpawnSchedule`, `computeStats`, `weaponStats`, `damageTaken`, `addXp` and `addWeapon`.

**Model**, stepped at 30 Hz:

- **Arrivals:** schedule events plus the 0.6 s telegraph. Each enemy starts 330 px away, the mean distance from the arena centre to the spawn rectangle, and walks straight in.
- **Targeting:** each weapon fires on its cooldown at the oldest enemy in range. Oldest stands in for nearest, since everyone walks the same line.
- **Hits:** a fraction `aim` = 0.7 of shots land. Each landing shot does average damage, crits included.
- **Targets per attack:**
  - projectile: 1 + pierce;
  - spread: 1 per pellet;
  - beam, melee arc and rocket blast: 3.
- **Contact:** an enemy within 30 px hits at 0.25 hits/s, capped at 1 hit/s by the i-frames. Armor and dodge apply, and regen heals.
- **Scrap:** all dropped scrap is banked, matching the auto-collect at wave end.

**Run model** (`simulateRun`):
- A scripted shopper buys a fixed list in order whenever it can afford the next item, at next-wave prices, as `ShopScene` does.
- It rerolls once per visit if it can still afford the next buy.
- It takes level-ups from a pick list.
- HP resets each wave, as `PlayerManager.create` does.

**Calibration** (2026-10-20, browser playtest, seed 1, pistol, standing still):

| | kills | scrap | alive at end | HP left |
|---|---|---|---|---|
| Game, wave 1 | 8 | 8 | 18 | 40 |
| Sim, wave 1 | 7 | 7 | 20 (peak) | 43 |
| Game, wave 2 | 3 | 2 | 34 | died at 0.7 s left |
| Sim, wave 2 | 5 | 5 | 33 | 7 |

The wave 1 game row matches the owner's report exactly. `sim.test.ts` pins this calibration.

**Limits** (read every number with these in mind):
- **Standing-still player.** Real players kite, so the sim overstates damage taken. It is a pessimistic bound on survival and is accurate for kills and scrap.
- **Contact damage is a stand-in.** Shooters, dashers and exploders are modelled as plain contact.
- **AoE target counts are guesses**, marked `ponytail:` in the code.
- **The shopper is optimistic:** the wanted offer always rolls.
- **Cliffs.** Near ρ ≈ 1 the queue tips over, so small knob changes can flip a wave from "fine" to "dead". The knobs were picked to hold across aim 0.6–0.8 and contact rate 0.15–0.35 (§7). The run log (§9) replaces these guesses with measured values.

## 4. Intended feel and target metrics

Brotato is the reference:
- early waves clearable;
- the board mostly clear, so 70–90% of scrap is picked up live rather than at wave end;
- about one meaningful shop buy per wave;
- a real but survivable threat by wave 8.

These targets are implemented as `checkTargets()` in `src/core/sim.targets.ts` and asserted by `sim.test.ts`, so later content can't silently break them.

| band | waves | feel | typical shopper: kill % | typical: HP left |
|---|---|---|---|---|
| Onboarding | 1–3 | learn to move; board stays clear; first buys | 85–100 | ≥ 60% |
| Build checks | 4–7 | the build starts to matter; mistakes cost HP | 75–98 | ≥ 25% |
| Pressure | 8–9 | busy screen, real damage, survivable | 70–95 | 1–85% |
| Boss | 10 | M4: boss targets come with the boss | — | — |

**Run-wide targets:**

| target | why |
|---|---|
| Typical shopper buys 0.8–2 items per wave (waves 1–9), at least one in each of waves 1–4 | one meaningful buy per wave |
| A never-shopping pistol survives waves 1–3 but is failing (< 60% kills) by wave 7 | onboarding is forgiving; shopping is required |
| Every starter (pistol, shotgun, blade) kills ≥ 80% of wave 1 | no bad first pick |
| ≥ 1.75 enemies/s in waves 8–9 | spec §2 "dense, escalating waves" |

The **reference builds** live in `REFERENCE_BUILDS`:
- each starter, never shopping;
- a typical pistol shopper: grip → pistol → hoodie → shotgun → visor → pistol → scope → rocket → overclock → …, with ranged level-up picks.

## 5. The model (approved)

The numbers now live in the game data: `waves.json` (`scaling` and the generated waves), `enemies.json`, `weapons.json`, the price constants in `core/weapons.ts` and `MAX_ALIVE` in `core/waves.ts`. `THREAT` and `budgetWave` in `src/core/sim.targets.ts` re-author waves. `pnpm sim` prints the tables for the live data.

| # | change | live | approved | kind |
|---|---|---|---|---|
| 1 | **Threat budget.** Wave *n* brings `T(n) = 7 · (1 + 0.35·(n−1))` base enemy HP per second, split across the enemies unlocked by then (`MIX`). `budgetWave()` turns that into spawn groups. Density sets income, independent of how tough enemies are. | hand-tuned counts | generated once, committed to `waves.json` | data (+ authoring helper) |
| 2 | **Enemy growth** `scaleEnemy`. HP × `1 + 0.3·(n−1) + 0.07·(n−1)²`, damage × `1 + 0.15·(n−1)` (as today). Difficulty comes from tougher enemies, not more of them. The coefficients move into `waves.json`, which spec §5 says holds "scaling multipliers". | HP 0.25 linear, damage 0.15 | as stated | code + data |
| 3 | **Price curve** `waveScale`: +20% per wave through wave 8, then +25% per wave, so the last 3 shops of a 10-wave run are dearer. Sell price follows. Multiplier at wave n+1: 1.2 (shop after wave 1), 2.4 (after wave 7), 2.65 (after wave 8), 3.15 (after wave 10). Income grows about 7× from wave 1 to 9, so prices must grow too or the shop stops being a decision. | 0.1 flat | 0.2 / 0.25 from wave 8 | code |
| 4 | **Starter tuning.** Pea and pepper base HP 9, so the pistol's 12 damage one-shots them through wave 2. The pistol's T1–T4 cooldown becomes 0.7/0.63/0.56/0.5 with pierce 1; the pierce path exists but no weapon uses it. Shotgun and blade unchanged. | pea 20, pepper 15; pistol 0.9/0.8/0.7/0.6, pierce 0 | as stated | data |
| 5 | **Alive cap 40.** Skip spawns while 40 enemies are alive. A safety net for perf and readability: it never binds on this curve (peak ≤ 14) and only matters when a player is already losing. | pool max 250 | 40 | code (`EnemyManager`) |
| 6 | **End-of-wave scrap.** Already Brotato-style: every leftover is banked at wave end. Keep it. | auto-collect | unchanged | — |
| 7 | **XP curve** `(level+3)²`. Unchanged. The typical shopper reaches level 10 by wave 10. | | unchanged | — |

**Scaling past wave 10.**
- `T(n)`, the growth formula and the price curve are defined for any *n*. Wave length is already capped at 60 s from wave 11.
- **20 waves:**
  - extend `REFERENCE_BUILDS` with longer shopping plans;
  - add bands for waves 11–20 to `checkTargets`;
  - re-fit the knobs with the sim and the measured data from §9.
- **Endless mode:** waves come from `budgetWave(n)` at runtime instead of `waves.json`, which needs a code path. Both stay in the parking lot until the MVP ships.

**Spec deviations: none.**
- Waves stay authored JSON (spec §5). The generator only writes the first draft, which can then be hand-edited.
- All numbers are the builder's call per §9.
- Wave 10 keeps its boss role (M4).
- The 20-wave run and endless mode are post-MVP (proposed).

## 6. Before and after (sim)

Typical pistol shopper:

| wave | live kill % | live peak alive | live scrap | live HP left | approved kill % | approved peak | approved scrap | approved HP left | approved buys |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 27 | 20 | 7 | 43 | 94 | 1 | 15 | 100 | grip |
| 2 | 13 | 33 | 5 | 7 | 96 | 2 | 24 | 100 | pistol |
| 3 | 13 | 53 | 8 | **dead** | 97 | 3 | 32 | 100 | hoodie |
| 4 | — | | | | 98 | 4 | 44 | 100 | shotgun |
| 5 | | | | | 91 | 7 | 47 | 100 | visor, pistol |
| 6 | | | | | 95 | 5 | 65 | 100 | scope |
| 7 | | | | | 97 | 5 | 80 | 100 | rocket |
| 8 | | | | | 94 | 9 | 95 | 100 | overclock |
| 9 | | | | | 93 | 13 | 110 | 43 | pistol |
| 10 (boss, M4) | | | | | 89 | 14 | 124 | dead | glass |

Starters that never shop:

| starter | wave 1 kill % | waves survived (standing still) |
|---|---|---|
| pistol | 94 | 3 (live: 2) |
| shotgun | 88 | 3 (live: 2) |
| blade | 81 | 3 (live: 2) |

Spawn rate: 0.8 enemies/s in wave 1, 1.3 in wave 5, 2.1 in wave 9 and 2.3 in wave 10. Live goes 1.4 → 7.5 enemies/s, at 2–4× more HP per enemy.

## 7. Known misses and risks

- **Wave 8 is a little easy** (100% HP left). It is the only failed target at the calibrated centre. Leave it for the playtest.
- **Wave 10 kills the typical build** without a boss. Its targets are written with the M4 boss.
- **Sensitivity.** Across aim 0.6–0.8 × contact rate 0.15–0.35, the knobs miss 1–4 targets per corner:
  - low aim is harder mid-run;
  - high aim is easier late.

  The run log (§9) measures aim directly.
- **Pistol identity.** Pierce and a faster cooldown make it less of a "steady single target" weapon. Accepted.
- **Density ceiling.** About 2 enemies/s is what the current content can support. A Brotato-like 4–7 enemies/s needs more AoE and scaling content. Revisit for 20 waves.

## 8. Owner decisions (2026-10-20)

1. **Model and targets:** approved. Goal: reach 10 waves first, then scale to 20, then endless (parking lot).
2. **Density:** about 2 enemies/s by wave 9, as proposed.
3. **Starter tuning:** as proposed (9 HP peas/peppers, pistol 0.7 s cooldown with pierce 1).
4. **Prices:** +20% per wave, then +25% for the last 3 shops (after waves 8, 9 and 10). The enemy growth knobs were re-fitted to this curve, which also fixed the earlier wave 9 miss.
5. **Alive cap 40:** approved.
6. **Late difficulty:** as recommended. Keep the re-fitted curve and tune by playtest with §9 data.
7. **Aim logging** (relayed by the project-status session): log real aim once per run so the sim can be recalibrated. Done: see §10.

**Conflicting relay.** The project-status session relayed "prices +25%/wave". The owner's direct ruling in this session was +20% per wave, then +25% for the last 3 shops; that is what shipped.

Applied 2026-10-20 (§10).

## 9. Measuring real games (proposed)

**Status (2026-10-21): built** — the local run log (§9.1–9.4) is in `src/core/runlog.ts`; see §9.4 for what shipped and how it differs. The server path (§9.5) stays a proposal.

The sim is only as good as its guesses (aim, contact rate, the shopper). The owner wants real games to answer questions like:
- How many enemies per wave are right?
- What is the average scrap per wave?
- Can each starting weapon clear wave 1 and still afford an item?

**Spec note:** "online anything" is a non-goal (§2). So collection is **local-first**: the game records a log of each run on the player's machine, and the owner gathers logs by export. A server is a separate, later decision.

### 9.1 What to record

One `RunLog` per run, in memory while playing, then saved. These are compact per-wave summaries, not a per-frame event stream.

| record | fields | answers |
|---|---|---|
| `run` | id, date, build version, data hash of `assets/data`, seed, starter, result (wave reached, died/won), total time | which versions and starters were played, and how far they got |
| `wave` (one per wave) | wave, duration, spawned, killed, peak alive, alive at end, scrap dropped, collected live, banked at wave end, harvesting, shots fired, shots hit, damage dealt, damage taken by source (contact, bolt, blast), hits dodged, HP at end, time with an enemy in contact, death time if died | enemies per wave, kill rate, **aim** (hits ÷ shots), live-collect %, where damage comes from |
| `shop` (one per visit) | wave, scrap before/after, offers seen (id, tier, price), bought, sold, combined, rerolls and their cost, locks | buys per wave, prices players can't afford, items nobody buys |
| `levelup` | wave, choices offered, pick | which stats players value |
| `build` (at wave end) | weapons and tiers, items, `computeStats` block | power growth per wave, for comparison with the sim |

**Dropped on purpose:**
- Positions and inputs: big and not needed for balance.
- Personal data: none collected. The run id is random.

### 9.2 Where it goes

1. **Local store.** Keep the last 50 runs in `localStorage` (about 5 KB per run), using the same guarded storage helper as `core/settings.ts`. It never blocks the game and drops the oldest first.
2. **Export.** A dev-only key (F4, built) and later a settings button download `runs.json`. Playtesters send the file, and the owner drops files into a folder.
3. **Report.** `pnpm runs <file or folder>` (built; see §9.4) reads the logs and prints the same per-wave table as the sim, with measured and predicted values side by side, grouped by data hash so old balance versions don't mix with new ones.
4. **Later, optional:** an opt-in upload to a small endpoint once there are external players. That is a spec change, so it needs the owner's call.

### 9.3 How the data closes the loop

- **Calibrate the sim.**
  - Fit `aim` from shots hit ÷ shots fired.
  - Fit `contactRate` from damage taken ÷ time in contact.
  - Fit `spawnDist` from time to first hit.

  Then the sim's predictions match real players, not a player standing still.
- **Check the targets on real games.** `checkTargets` takes per-wave rows, so it can run on aggregated logs as well as on sim output, using medians across runs per starter. Examples:
  - "wave 1: ≥ 80% of runs kill ≥ 80% of spawns and can afford an item";
  - "median buys per wave 0.8–2";
  - "death wave distribution centred on 8–10 for first-time players".
- **Tune by data, not feel.**
  - Enemies per wave: from kill % and peak alive per band.
  - Average scrap per wave vs `priceScale`: does the median run make about one buy per wave?
  - Starter fairness: wave 1 kill % and survival per starter.
  - Dead content: offers seen but never bought.
- **Guard rails.** Every balance PR attaches the before/after sim table plus, once logs exist, the measured medians for the waves it touches.

### 9.4 Build steps (when scheduled)

1. `src/core/runlog.ts`: pure types, a `WaveStats` accumulator fed by game events, and `summarise(logs)` producing per-wave rows. Unit-tested.
2. Hooks: `GameScene`, `ShopScene` and `LevelUpScene` already emit the needed events (kills, hits, scrap, damage). Add shot and hit counters in `WeaponManager`. No gameplay change.
3. Storage and export (dev key first).
4. Report script, and `checkTargets` over real data.

Effort: small to medium, no new dependencies.

**As built (2026-10-21):**
- `RunLog` (`schemaVersion: 1`) is plain JSON: random id (`crypto.randomUUID`), ISO date, `buildVersion` (package.json), `dataHash` (FNV-1a of all `assets/data` JSON), seed, starter, `result`, then `waves[]`, `shops[]`, `levelups[]`. It lives in `RunState.log` and is saved on death, after the last wave, or on quit.
- Differences from the §9.1 table:
  - The `build` record sits inside each wave record and is taken at wave start. That is the build in effect for the whole wave, since it only changes between waves.
  - `result.outcome` can also be `quit` (pause-menu quit, or Main Menu on the Victory screen), so short playtests still produce a log.
  - Wave records add `contactHits` (for fitting `contactRate`). `spawned` counts scheduled spawns only (no F2 peas, no spawns dropped by `MAX_ALIVE`).
  - Shop and level-up records use `afterWave` (the wave just cleared); `offers`/`offered` include every reroll.
  - `damageDealt` includes overkill. `shots`/`hits` are `WeaponManager.tally` (projectiles only, as in §10).
  - "Time to first hit" (for `spawnDist`) is not recorded yet.
- Export: dev key **F4** downloads `runs.json` (all stored runs). There is no settings button yet.
- Report: `pnpm runs <file or folder>` reads `runs.json` files and drops duplicate run ids, since exports overlap. Per data hash it prints:
  - per-wave medians (kill %, peak alive, scrap dropped / live / banked, buys, aim, damage dealt and taken by source, HP %);
  - the sim's prediction for the *same builds* (`simulateWave` with default params, and again with the fitted ones);
  - `checkRows` (the band, buy-rate and early-shop targets, split out of `checkTargets`) on the measured medians.
- Fit helper: `fitParams(logs)` gives `aim` = Σhits ÷ Σshots and `contactRate` = contact hits ÷ seconds in contact.
  - Caveat: the sim's `aim` also absorbs overkill and idle time (§10). The measured hit rate (≈ 0.95 standing still) is therefore an upper bound for the sim knob, not a drop-in value. The report shows both columns so the gap is visible.
- Verified in a browser (seed 1, pistol, 2 waves, quit from the Victory screen). The exported log and report read:
  - wave 1: 15 of 16 kills, 15/15 hits, 15 scrap banked, HP 100;
  - wave 2: 23 of 25 kills, 22/23 hits, 23 scrap;
  - one shop visit with 1 reroll (2 scrap), 0 buys, Cyber Visor locked.

  This matches the screens and the §10 replay.

### 9.5 Path to a server (proposed)

This is a spec change, because online features are a spec non-goal (§2). It needs the owner's call, and nothing here is built.

- **Local first (now):** the `RunLog` JSON is the stable, versioned contract. Add fields freely; bump `schemaVersion` only for breaking changes.
- **Later, opt-in:** POST each finished run's log, unchanged, to one small endpoint. No personal data: the run id is random, and an anonymous player id would be generated locally.
- **Storage:** Postgres with one `runs` table.
  - Indexed columns: run id, player id, schema version, build version, data hash, starter, outcome, wave reached, date.
  - The full log is kept as `jsonb`.
  - Analysis is plain SQL (e.g. per-wave medians with `jsonb_array_elements(log->'waves')`). The same `summarise` logic can also run on an export.
- **Accounts:** when registration exists, link the account to the anonymous player id. Past runs then join without re-uploading.

## 10. Applied (2026-10-20)

**Data:**
- `waves.json`: generated from `budgetWave(n, T(n))`, plus a `scaling` block (hp 0.3, hpQuad 0.07, damage 0.15).
- `enemies.json`: pea and pepper at 9 HP.
- `weapons.json`: pistol cooldown 0.7/0.63/0.56/0.5, pierce 1.

**Code:**
- `scaleEnemy` reads `waves.json.scaling`.
- `waveScale` is +20% per wave, then +25% per wave after wave 8.
- `EnemyManager` skips spawns while `MAX_ALIVE` (40) enemies are alive. The spawn RNG draws happen first, so seeds stay reproducible. The F2 debug spawn is not capped.

**Sim:**
- `LIVE_DATA` is the game.
- `sim.test.ts` asserts `checkTargets()` on it (known miss: wave 8 a little easy) and pins the new playtest.

**Browser playtest** (seed 1, pistol, standing still, so a worst case):

| wave | build | game: kills / scrap / peak alive / HP | sim (same wave) |
|---|---|---|---|
| 1 | pistol | 15 / 15 / 2 / 100 of 100 | 15 / 15 / 1 / 100 |
| 2 | + Synth Steak (12 of 15 scrap) | 23 / 23 / 3 / 108 of 108 | 24 / 24 / 2 / 100 |
| 3 | + Mono Blade (21 of 26 scrap), HP regen pick | 30 / 29 / 6 / 88 of 108 | 32 / 32 / 3 / 100 (2-pistol shopper) |

Before this change the same wave 1 gave 8 kills, 8 scrap, 18 alive and 40 HP.

After wave 1, three of the four shop offers were affordable: Lucky Chip 14, Synth Steak 12, Mono Blade 18. Only the shotgun at 24 was out of reach. Waves 4–9 haven't been playtested yet; the run log in §9 is the next step. `pnpm playtest` (2026-10-21) produces such logs headless on autopilot (no shopping); seed 1 died at wave 8–9.

**Aim logging.** `RunState.aim` totals projectile shots, projectiles that hit at least once, and kills. `GameScene` adds each wave's numbers and prints one line when the run ends (on death, or after the last wave clears):

```
[balance] run ended wave 4: 80 attacks, 75 landed (94%), 69 kills (86% of attacks)
```

Every projectile, beam and blade swing counts as an attack; it "landed" if it touched an enemy. Drone ticks aren't counted. (First version counted projectiles only, so a blade-only run logged "0 shots"; fixed 2026-10-21.)

**After merging main** (pause menu and 2× rendering), I replayed waves 1–3 the same way. They reproduced the table above exactly. Hit rates were 15/15, 22/23 and 35/38.

**Finding:**
- A stationary player's projectiles land 94% of the time, against the sim's `aim = 0.7`.
- The sim still matches kills, because its `aim` also absorbs other losses: overkill, knockback, and time with no target in range.
- Recalibrate it from logs of real, moving players, not from this one stationary number.

