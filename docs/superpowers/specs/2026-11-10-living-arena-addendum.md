# Chloropunk — Living arena & HUD addendum

Date: 2026-11-10 · Status: **owner decisions 2026-11-10**; nothing built yet. Post-MVP: none of this is named in the MVP spec.
Amends: [MVP spec](2026-10-18-mvp-roguelike-design.md) §4 (run loop: what is in the arena during a wave), §5 (pickups, stats) and §6 (colour roles: HP), [arena map addendum](2026-10-23-arena-map-addendum.md) §2.4 (props are baked and static), [UI art refresh design](2026-10-25-ui-art-refresh-design.md) (HUD layout).

Design preview (HUD in play, every object, the modifier pool): https://claude.ai/artifact/DJk42FZn9i8XJkw6Uz1fFt
Delivery: [living arena plan](../plans/2026-11-10-living-arena.md).

## 1. Why

After several full runs the owner finds the loop solid but the arena inert: one baked floor, four solid vents, nothing to interact with, and the same wave script every run. Runs feel alike. The in-run HUD also reads as unpolished: the HP bar is always danger-orange so it cannot warn by colour, bars are built by hand in four different ways, there are no weapon cooldowns, no XP or boss numbers, no notifications, and some text is under the 10 px minimum.

The goal is the Brotato-like feel of a map that offers small choices during a wave, different each run, without making the game harder: the [balance targets](2026-10-20-balance-design.md#4-targets) stay the contract.

## 2. Owner decisions (2026-11-10)

| Topic | Decision |
|---|---|
| Interactables | Breakables, risk/reward shrines and hazards. No quests or timed objectives |
| Wave modifiers | Light: about 40% of waves from wave 3 roll one modifier; never the boss wave |
| Breakable targeting | Weapons aim at breakables only when no enemy is in range |
| Shrine activation | Stand in the ring for 1.5 s. No new key |
| Blood Graft | +20% damage until the wave ends, for 20% of max HP |
| HP bar | Lime while healthy, danger-orange under 30% (amends spec §6 "Danger = HP") |
| UI scope | The in-run HUD only. Shop, level-up, round complete, summary, pause, menu and loadout keep their look |
| Sprites | Weapon, item and stat sprites stay as they are |
| Order | HUD first, then the arena |
| Content | All nine objects and five modifiers below are in |

## 3. Interactables

Each wave rolls its own set and positions from the run seed on **its own RNG stream**, so existing seeds keep their spawns, crits, shops and level-ups. Objects are live sprites on top of the baked floor; `arena.json` stays the fixed layout. Nothing is placed inside the start circle (`CLEAR_RADIUS`) or a solid, and objects keep a minimum distance from each other. Numbers are starting values, the builder's call, checked with the sim and playtests.

| Kind | Object | Behaviour | Reward | Risk | Appears |
|---|---|---|---|---|---|
| Breakable | Scrap Crate | breaks after a few hits | 4–8 scrap | none | 2–4 every wave |
| Breakable | Juice-o-Matic | tough vending machine | 10 scrap + a heal can (15% max HP) | slow to break | about 1 wave in 3 |
| Breakable | Loot Drone | arrives mid-wave, flees for 12 s | 20–30 scrap | chasing it | about 1 wave in 4 |
| Shrine | Blood Graft | stand in the ring | +20% damage this wave | −20% max HP now | from wave 2 |
| Shrine | Cursed Cache | stand in the ring | 25–40 scrap | a telegraphed pack of the wave's enemies spawns around the player | from wave 3 |
| Shrine | Scrap Slots | stand in the ring, pays scrap | 3× back, or a random item | about half the pulls pay nothing | from wave 4 |
| Hazard | Propane Tank | explodes on any hit | damages enemies in the blast | damages the player too | 1–2 most waves |
| Hazard | Compost Spill | slows and damages what stands in it | weakens crossing enemies | slows the player | 0–2 per wave |
| Hazard | Arc Vent | telegraphed pulse on a timer | zaps enemies in the ring | zaps the player | from wave 4 |

Rules:
- At most one shrine per wave. The boss wave gets crates only.
- The Loot Drone is a breakable, not an enemy: it does not count towards `MAX_ALIVE`, kills or the run log's spawn counts. No new enemy types (spec §5 unchanged).
- The heal can is a second pickup kind; scrap stays the only currency and 1 scrap is still 1 XP.
- Adding an object is a data change plus at most one behaviour function (spec anti-goal: no hardcoded content in scene code).
- **Colour:** lime marks what pays out, pink what is a deal you choose, danger what hurts. Objects are brighter than decor and avoid cyan and amber, which stay reserved for projectiles. Final sprites go through the [Sprites canvas](https://claude.ai/artifact/TnsQjaTcJEYoShEC5AyMXM).

## 4. Wave modifiers

One per rolled wave, named on the wave banner and shown as a HUD chip for the wave.

| Modifier | Effect |
|---|---|
| Scrap Rain | scrap drops at random spots during the wave |
| Rush Hour | wave 25% shorter, spawns faster, scrap bonus on clearing it |
| Overgrown | one existing enemy arrives scaled up (far more HP, big scrap drop); not a new type |
| Supply Drop | a Juice-o-Matic is guaranteed and two extra crates land |
| Toxic Spill | twice the hazards |

## 5. Economy

Scrap from interactables and modifiers is budgeted at about **+10–15% of a wave's income**. The sim models it so `checkTargets` still guards the 0.8–2 buys-per-wave target, and the run log records it per wave.

## 6. HUD

- **HP:** larger bar with the value as a number, quarter ticks and a trail showing the last hit; lime while healthy, danger under 30% with the existing vignette.
- **XP:** framed bar with numbers and a level badge.
- **Clock:** wave "n / total", timer, modifier chip under it. The boss bar shows numbers.
- **Scrap:** counter that rolls up, with a "+N" pop.
- **Inventory:** larger weapon slots with tier trim and a cooldown sweep, empty slots drawn, item chips with stack counts.
- **New:** buff chips with a draining timer, a toast stack for arena events, edge markers for off-screen objects, an `ESC PAUSE` hint.
- No text under 10 px. Screen-fixed UI stays in `UIScene` (no `setScrollFactor(0)`).

Other screens are out of scope; their open items stay in the ROADMAP carry-overs.
