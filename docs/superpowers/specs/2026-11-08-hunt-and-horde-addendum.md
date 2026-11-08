# Chloropunk — Hunt & horde addendum

Date: 2026-11-08 · Status: **owner decisions 2026-11-08**; PRs 1 (pacing and horde) and 2 (enemy roles) applied, PR 3 planned.
Amends: [MVP spec](2026-10-18-mvp-roguelike-design.md) §4 (spawn groups) and §5 (enemies), [balance design](2026-10-20-balance-design.md) §5 (the model's numbers), [arena map addendum](2026-10-23-arena-map-addendum.md) §3 (boss movement, PR 3).

## 1. Why

The owner played several full runs (2026-11-08):

- **Enemies don't hunt.** Every enemy walked straight at the player's current position, slower than the player (pea 90, pepper 70, carrot 60, potato 45 px/s vs 160), so circling always won.
- **The boss kites easily.** It walked at 40 px/s, stopped 200 px away and aimed each attack at where the player stood when its telegraph started.
- **Waves were thin and slow.** Every group spawned one enemy at a time (0.8 enemies/s in wave 1, ≤ 14 alive), the game felt slow, and there was little to collect.

The goal is a Brotato-like feel: packs that surround you, enemies that cut you off, faster everything, more pickups. The game should be no harder: the [balance targets](2026-10-20-balance-design.md#4-targets) stay the contract.

## 2. Owner decisions (2026-11-08)

| Topic | Decision |
|---|---|
| Enemy AI | Give the existing 5 enemies smarter roles; no new enemy types (spec §5 unchanged) |
| Density | Packs plus 2–3× enemies per wave; lift the alive cap; re-tune with the sim |
| Pacing | Faster player, enemies and projectiles (wave lengths unchanged); scrap drops split into pieces |
| Boss | Pursues, strafes and leads its aim; same three patterns + brood, same art |
| Difficulty | Same targets, more action: the player's power rises with the pressure |
| Scrap | Split only, no currency rescale: a kill worth *n* scrap drops *n* pieces of 1 |

## 3. PR 1 — pacing and horde (applied)

**Speeds: enemies and projectiles ×≈1.3, player ×1.125.**

- Player: 160 → 180 px/s (`INITIAL_PLAYER_SPEED`). It was 210 at first, but in the owner's playtest of the preview (2026-11-08) they could still dodge almost everything, so the player gets less of the speed-up than the enemies. Magnet pull: 420 → 550 px/s.
- Player projectiles: pistol 520 → 680, shotgun 480 → 620, rocket 360 → 470.
- Enemies:
  - pea 90 → 120
  - pepper 70 → 90 (dash 320 → 420)
  - carrot 60 → 80 (bolt 220 → 290)
  - tomato 85 → 110
  - potato 45 → 60
- The boss's speeds change in PR 3.

**Packs.** `MIX` in `sim.targets.ts` gives each enemy a pack size: pea 5, pepper 3, tomato 2, carrot 2, potato 1. `budgetWave` emits one telegraph per pack, spaced so the HP/s budget is unchanged. A pack spreads ±`16·√count` px around its telegraph (a 5-pack: ±36), so `SPAWN_MARGIN` went 50 → 64. Each pack picks its own point on the off-screen ring, so packs arrive from several sides.

**Density ×2.** The threat budget is `T(n) = 14 · (1 + 0.35·(n−1))` base HP/s (was 7). That makes 50 enemies in wave 1 (was 25) and 201 in wave 9 (was 100), or 1.6 → 4.2 enemies/s. `MAX_ALIVE` goes 40 → 120, under the spec's 150-enemy perf budget. The late-wave density target goes from ≥ 1.75 to ≥ 3.5 enemies/s in waves 8–9.

**Player power to match** (judged by `pnpm sim`):

- **Pistol:** damage 12/18/26/38 → 18/27/39/57, cooldown 0.7…0.5 → 0.42/0.38/0.34/0.3. It one-shots peas through wave 3, where it used to need 2 shots from wave 3.
- **Shotgun:** cooldown 1.3…1.0 → 0.65/0.6/0.55/0.5.
- **Blade:** cooldown 1.0…0.7 → 0.55/0.5/0.44/0.39.

**Economy.**

- Twice the kills means twice the scrap and XP. All shop prices are ×1.8 (`PRICE_BASE` in `waveScale`), which keeps the typical shopper at 1.67 buys/wave (target 0.8–2).
- Reroll costs are unchanged, so rerolls are relatively cheaper. This is a deliberate builder's call; revisit it if the playtests show reroll spam.
- XP follows scrap, so players level faster: the typical build reaches level 12 by wave 10 (was 9).

**Boss HP** 6500 → 18000: the typical build kills it about 2.75× faster than before. The sim puts the typical build at 41% HP left (target 20–60%). PR 3 re-tunes it with the new movement.

**Scrap pieces.** `PickupManager.spawnScrap` drops one pickup per scrap point, fanned 12 px around the kill: a potato bursts into 3, a carrot into 2. The pool overflow (300) still banks.

**Enemy bolt pool:** 100 → 160 (more carrots).

### Sim, typical shopper (after PR 1)

| wave | spawned | kill % | peak alive | scrap | HP left | buys |
|---|---|---|---|---|---|---|
| 1 | 50 | 100 | 5 | 50 | 100 | grip |
| 3 | 89 | 96 | 10 | 85 | 103 | shotgun, visor |
| 5 | 108 | 95 | 10 | 113 | 103 | scope |
| 7 | 153 | 94 | 11 | 158 | 106 | overclock, pistol |
| 9 | 201 | 97 | 13 | 214 | 101 | glass, nanopatch |
| 10 (boss) | 33 | 91 | 4 | 30 | 41% | boss killed |

The known misses are unchanged from before: waves 8–9 are too easy for the scripted shopper (balance design §7). Never-shop starters die in the same waves as before (pistol in 4, shotgun in 3, blade in 4).

### Playtest (autopilot, never shops, seeds 1–3)

- **Outcome:** all three runs reached wave 10 and died to the boss. Since A5 they had won it, and the target says a never-shop build should not beat the boss.
- **Waves 1–3:** kills 93–100%, peak alive 10–15.
- **Waves 7–9:** kills collapse (9–19%) and the build sits at the 120-alive cap. That is expected for a build that never shops.
- **Spawn distance:** about 500 px (sim 480).
- **Perf:** headless software rendering is not a perf measurement; it showed about 41 fps with 29 alive and about 31 fps at 120. Per-enemy cost is unchanged, and 150 peas held 64–67 fps in the visible pane at A5. **Owner check:** a real wave 9 at the cap in a visible window.

## 4. PR 2 — enemy roles (applied)

`steer()` becomes a small pure state machine (approach → wind-up → attack → recover). It reads the player's velocity, and every tunable lives in the enemy's `params` in `enemies.json`:

| Enemy | Role | Behaviour |
|---|---|---|
| pea | pack hunter | Fans out around the player (a per-enemy flank offset), then pursues with a short lead |
| pepper | charger | Stops for a readable wind-up, dashes at your *predicted* position, then recovers (punishable) |
| carrot | kiter | Orbits at its range instead of standing still; leads its shots (imperfectly) |
| tomato | interceptor | Heads for where you will be in about 0.8 s |
| potato | herder | Pursues your predicted position, blocking the lane you run into |

The per-enemy variation comes from the spawn index, never from extra spawn RNG draws.

**As built.** `steer(behavior, state, self, player, playerVel, dt, params)`; `EnemyState.phase` is `approach | windup | attack | recover` (only the pepper leaves `approach`). One helper, `leadPoint(self, player, vel, speed, k)`, gives the intercept point of a player moving at `vel` (dist/speed if there is none), capped at 0.8 s ahead (`LEAD_MAX_S`), times `k`, clamped into the arena. `EnemyManager` counts every spawn in a wave (`serial`, reset per wave); that index sets `slot` (a pack of 5 gets 0, −1, +1, −½, +½) and `orbit` (alternating ±1). A still player gets no lead, so tomatoes, potatoes, near peas and pepper dashes aim straight at it as before; far peas still spiral in and carrots still orbit. `CATCH_UP` applies only while approaching (not while orbiting, never to a dash); `avoid` is unchanged and still skipped during a dash.

| Enemy | Params (`enemies.json`) | Notes |
|---|---|---|
| pea | `flankDist` 150, `flank` 45°, `lead` 0.5 | Farther than 150 px it heads 45°·`slot` off the line to you, a spiral, so a pack closes from up to 90° apart |
| pepper | `dashRange` 220, `windup` 0.5, `dashSpeed` 420, `dashTime` 0.35, `recover` 0.4, `lead` 0.8 | Stands in its `tell` frame for the whole wind-up, locks the dash on the predicted spot, stands 0.4 s after. Replaces `dashEvery` 2.5 |
| carrot | `keepDistance` 200, `range` 260, `fireEvery` 2, `boltSpeed` 290, `lead` 0.7 | In the band it strafes at full speed (80 px/s) in its `orbit` way; `fireBolt` aims at `leadPoint(…, boltSpeed, 0.7)`. Within 40 px of the arena edge it reverses its orbit instead of grinding along the wall; `avoid` slides it round the vents |
| tomato | `lead` 1 (+ blast unchanged) | Up to 0.8 s ahead of you |
| potato | `lead` 1 | Same aim, at 60 px/s |

**Sim.** Unchanged (it models straight walk-ins): the same known misses (waves 8–9 too easy for the scripted shopper). `contactRate` 0.25 → 1.52, the fit from the playtest below (PR 1 fitted 3.44 but kept 0.25). It changes no target and no death wave in `pnpm sim`: the typical shopper takes no contact damage, and the never-shop builds die in the same waves.

### Playtest (autopilot, never shops, seeds 1–3)

| | PR 1 | PR 2 |
|---|---|---|
| Outcome | all reach wave 10, die to the boss | all die in wave 4 (49–53 s into it) |
| Kill % waves 1–3 | 100 / 93 / 93 | 90 / 92 / 88 |
| Wave 4 | kill 57%, HP 92% | kill 56%, HP 0%: 75 contact, 28 bolt, 24 blast damage |
| Aim (hits ÷ shots) | 0.99 | 0.86 (73% in wave 1: the peas fan out) |
| Fitted contactRate | 3.44 | 1.52 |

**Owner playtest of the PR preview (2026-11-08):** "way better, more aggressive and fun", but the fighter's movement looked slow and flickery, like a ghost at times. Two causes, both fixed in this PR:

- Arcade physics stepped at a fixed 60 Hz while the display ran at 120+ Hz. Bodies moved only every 2nd–3rd frame, but the camera lerped every frame, so the fighter jittered 1–2 px on screen about 40 times a second (a double image). At 1× the world now steps once per rendered frame (`fixedStep` off). 2× and 3× keep the fixed step, because Arcade's variable step ignores `timeScale`.
- The i-frame flash faded the fighter to fully transparent on a wall-clock sine. It now blinks between 100% and 55% alpha every 100 ms of game time.

The wave-1 standing pin in `sim.test.ts` was re-checked in the browser: seed 1, pistol, 20 s standing still gives 30 kills and 96 HP; the sim says 30.

The autopilot no longer dodges everything: it now dies where `pnpm sim` has always put a never-shop pistol (wave 4, sim kill 51%). Damage comes from all three sources, not just contact. In the preview (wave 5 with dev spawns), peppers stop and show their tell frame before each dash, and carrots in their band move only sideways at 80 px/s, each in its `orbit` way.

## 5. PR 3 — boss movement and aim (planned)

- **Movement:** the boss pursues at about 0.8× player speed when it is out of its 220–320 px band, and strafes inside the band. It stands still during telegraphs.
- **Aim:** each telegraph tracks the player with a lead, then locks for its last ≥ 0.3 s. The total telegraph stays ≥ 0.5 s (the spec rule).
- **Charge:** in phase 2 it chains 2 charges.
- **Tuning:** re-tune with `?wave=10&build=typical` against `bossTargets`.
