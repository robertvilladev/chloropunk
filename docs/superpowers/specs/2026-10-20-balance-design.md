# Veggie Vendetta — Balance & progression design

Date: 2026-10-20 · Status: **awaiting owner approval**. No game data has been changed. Every number below comes from the headless simulator (`npm run sim`).
Binding intent: [MVP spec](2026-10-18-mvp-roguelike-design.md) §4 (run loop), §5 (waves, stats), §9 ("start from Brotato-like ratios and tune by play").

## 1. TL;DR

- **The loop breaks on throughput, not on scrap collection.** Wave 1 brings 28 HP of enemies per second. The starting pistol removes about 10 HP/s (14 paper DPS × ~70% of shots landing). That is a load of ρ ≈ 2.8, so the backlog grows from second one: 26 spawned, 7–8 killed, 18–20 alive at the end. Every leftover scrap is already auto-collected at wave end (`GameScene.onRoundComplete`), so "8 kills, 8 scrap" means *all* the scrap. The economy is starved because almost nothing dies.
- **The game is a queue.** While ρ (enemy HP arriving per second ÷ the build's effective kill rate) stays under about 0.9, waves clear and scrap flows. Above 1 the backlog grows without bound and the wave collapses within seconds. Live data sits at ρ 2–4 from wave 1. Balance therefore means keeping ρ in a target band per wave, which is what the proposed model does.
- **Proposal:**
  - Author waves from a **threat budget** (base enemy HP per second) instead of hand-picked counts.
  - Separate the two growth knobs: **density** (threat budget) sets income; **enemy HP/damage growth** sets difficulty.
  - Raise **shop price growth** from 10% to 25% per wave so buys stay at about one per wave as income grows.
  - Tune the starter: peas and peppers drop to 9 HP so the pistol one-shots them, and the pistol fires faster and pierces 1.
  - Add an **alive cap of 40** as a safety net.
- **Result (typical shopper, sim):**
  - Wave 1 goes from 27% kills / 7 scrap to 94% kills / 15 scrap.
  - About one buy per wave.
  - Real damage taken from wave 6.
  - One known miss: wave 9 is lethal for a pistol-stacking build (§7).

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

`src/core/sim.ts` (pure, no Phaser, ~2 ms a run) reuses the live rules: `buildSpawnSchedule`, `computeStats`, `weaponStats`, `damageTaken`, `addXp` and `addWeapon`.

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
- **Cliffs.** Near ρ ≈ 1 the queue tips over, so small knob changes can flip a wave from "fine" to "dead". The proposal was picked to hold across aim 0.6–0.8 and contact rate 0.15–0.35 (§7). Treat it as a starting point for playtests, not a final answer.

## 4. Intended feel and target metrics

Brotato is the reference:
- early waves clearable;
- the board mostly clear, so 70–90% of scrap is picked up live rather than at wave end;
- about one meaningful shop buy per wave;
- a real but survivable threat by wave 8.

These targets are implemented as `checkTargets()` in `src/core/sim.proposal.ts` and asserted by `sim.test.ts`, so later content can't silently break them.

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

## 5. Proposed model

`KNOBS` in `src/core/sim.proposal.ts` holds every number. `npm run sim` prints the live and proposed tables side by side.

| # | change | live | proposed | kind |
|---|---|---|---|---|
| 1 | **Threat budget.** Wave *n* brings `T(n) = 7 · (1 + 0.4·(n−1))` base enemy HP per second, split across the enemies unlocked by then (`MIX`). `budgetWave()` turns that into spawn groups. Density then sets income, independent of how tough enemies are. | hand-tuned counts | generated once, committed to `waves.json` | data (+ authoring helper) |
| 2 | **Enemy growth** `scaleEnemy`. HP × `1 + 0.25·(n−1) + 0.06·(n−1)²`, damage × `1 + 0.12·(n−1)`. Difficulty comes from tougher enemies, not more of them. Proposed: move the coefficients into `waves.json` (spec §5 already says waves.json holds "scaling multipliers"). | HP 0.25 linear, damage 0.15 | as stated | code + data |
| 3 | **Price curve** `waveScale`: 1 + 0.25·(n−1) (sell price follows). Income grows about 7× from wave 1 to 9, so prices must grow too or the shop stops being a decision. | 0.1 | 0.25 | code (one constant) |
| 4 | **Starter tuning.** Pea and pepper base HP 9, so the pistol's 12 damage one-shots them through wave 2. The pistol's T1–T4 cooldown becomes 0.7/0.63/0.56/0.5 with pierce 1; the pierce path exists but no weapon uses it. Shotgun and blade unchanged. | pea 20, pepper 15; pistol 0.9/0.8/0.7/0.6, pierce 0 | as stated | data |
| 5 | **Alive cap 40.** Skip spawns while 40 enemies are alive. A safety net for perf and readability: it never binds on the proposed curve (peak ≤ 27) and only matters when a player is already losing. | pool max 250 | 40 | code (`EnemyManager`) |
| 6 | **End-of-wave scrap.** Already Brotato-style: every leftover is banked at wave end. Keep it. Live pickup with the 80 px magnet only matters for feel. With the board mostly clear (peak alive ≤ 13 through wave 8), most scrap is picked up live. | auto-collect | unchanged | — |
| 7 | **XP curve** `(level+3)²`. Unchanged. The typical shopper reaches level 9 by wave 9. | | unchanged | — |

How it scales: new content gets a `MIX` share (enemies) or joins a reference build (weapons and items), and `checkTargets` says whether the curve still holds. Waves 11+, or an endless mode, are just `T(n)` and growth for a larger *n*.

**Spec deviations: none.**
- Waves stay authored JSON (spec §5). The generator only writes the first draft, which can then be hand-edited.
- All numbers are the builder's call per §9.
- Wave 10 keeps its boss role (M4).

## 6. Before and after (sim)

Typical pistol shopper:

| wave | live kill % | live peak alive | live scrap | live HP left | proposed kill % | proposed peak | proposed scrap | proposed HP left | proposed buys |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 27 | 20 | 7 | 43 | 94 | 1 | 15 | 100 | grip |
| 2 | 13 | 33 | 5 | 7 | 96 | 2 | 25 | 100 | pistol |
| 3 | 13 | 53 | 8 | **dead** | 94 | 3 | 34 | 100 | hoodie |
| 4 | — | | | | 98 | 4 | 47 | 100 | shotgun |
| 5 | | | | | 92 | 7 | 54 | 100 | visor |
| 6 | | | | | 88 | 10 | 64 | 53 | pistol |
| 7 | | | | | 94 | 8 | 83 | 100 | scope |
| 8 | | | | | 93 | 13 | 103 | 85 | rocket |
| 9 | | | | | 81 | 27 | 106 | **dead** | overclock, pistol |

Starters that never shop, under the proposal:

| starter | wave 1 kill % | waves survived (standing still) |
|---|---|---|
| pistol | 94 | 3 (live: 2) |
| shotgun | 88 | 3 (live: 2) |
| blade | 81 | 3 (live: 2) |

Proposed spawn rate: 0.8 enemies/s in wave 1, 1.5 in wave 5, 2.3 in wave 9 and 2.5 in wave 10. Live goes 1.4 → 7.5 enemies/s, at 2–4× more HP per enemy.

## 7. Known misses and risks

- **Wave 9 is lethal for the typical pistol shopper** in the sim (ρ ≈ 1.9, peak alive 27). At aim 0.7 this is the only failed target.
  - Possible fixes: lower the quadratic HP term to 0.05, or give the typical build a more AoE-heavy plan.
  - Better to decide this from a playtest, because the sim's player stands still.
- **Sensitivity.** Across aim 0.6–0.8 × contact rate 0.15–0.35, the proposal misses 1–3 targets per corner:
  - aim 0.6 dies at wave 6;
  - aim 0.8 makes wave 8 too easy.

  Measure real aim in the first playtest (kills ÷ shots, logged once) and recalibrate `DEFAULT_PARAMS`.
- **Density vs. robustness trade-off** (the owner's call):
  - A sparser curve (≤ 1.5 enemies/s late) met every target at the centre point, but it reads as "too few enemies", the problem the spec set out to fix.
  - A Brotato-like 4–7 enemies/s needs more AoE and power growth than the current content gives.
- **Pistol identity.** Pierce and a faster cooldown make it less "steady single target". The alternative is to keep the pistol and drop pea HP further.

## 8. Decisions for the owner

1. **Approve the model:** threat budget + separate HP growth + price curve, with the §4 targets as test assertions.
2. **Density:** about 2.3 enemies/s by wave 9 (proposed), or sparser but safer, or denser later once there's more AoE content.
3. **Starter tuning:** 9 HP peas/peppers and the faster, piercing pistol — yes, or an alternative.
4. **Prices:** 25% per wave (from 10%).
5. **Alive cap of 40** (code): yes or no.
6. **Wave 9:** accept and tune by playtest, or soften now (HP quadratic term 0.05).

**After approval:**
- Move the `KNOBS` numbers into `assets/data/` and `waves.ts`/`weapons.ts`.
- Paste the `budgetWave` output into `waves.json`.
- Collapse `PROPOSED` to `LIVE_DATA` and make `sim.test.ts` assert `checkTargets(LIVE_DATA)`.
- Playtest waves 1–9 and recalibrate `aim`/`contactRate`.
