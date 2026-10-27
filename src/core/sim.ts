/**
 * Headless balance simulator: a throughput model of one run, no Phaser, no
 * positions. Assumptions and limits: docs/superpowers/specs/2026-10-20-balance-design.md §3.
 *
 * - Enemies arrive from the spawn schedule (+ telegraph) at SPAWN_DIST and walk
 *   straight in; "distance" is SPAWN_DIST − speed·age (the player standing still).
 * - Each weapon fires at the oldest alive enemy in its range on its cooldown;
 *   a fraction `aim` of shots land (calibrated to the playtest, see design doc).
 * - Enemies that reach the player put out contact hits at `contactRate` per
 *   enemy per second, capped by the i-frames (one hit per second).
 * - All dropped scrap is banked: GameScene auto-collects leftovers at wave end.
 */
import type { EnemyDef, ItemDef, Mods, OwnedWeapon, Stats, WaveDef, WeaponBehavior, WeaponDef } from "@/types";
import enemyDefs from "@assets/data/enemies.json";
import itemDefs from "@assets/data/items.json";
import wavesData from "@assets/data/waves.json";
import weaponDefs from "@assets/data/weapons.json";
import { addWeapon } from "./inventory";
import { addXp } from "./progression";
import { rerollCost } from "./shop";
import { computeStats, damageTaken } from "./stats";
import { BOSS_ATTACKS, BOSS_INTRO_S, bossParams } from "@/entities/bossBrain";
import { CATCH_UP, MAX_ALIVE, buildSpawnSchedule, scaleEnemy, waveDuration } from "./waves";
import { CRIT_MULT, waveScale, weaponStats } from "./weapons";

export interface SimData {
  waves: WaveDef[];
  enemies: Record<string, EnemyDef>;
  weapons: Record<string, WeaponDef>;
  items: Record<string, ItemDef>;
  scale: (base: { hp: number; damage: number }, wave: number) => { hp: number; damage: number };
  duration: (wave: number) => number;
  /** Max enemies alive at once; spawns past it are dropped (Infinity = no cap). */
  maxAlive: number;
  /** Shop price of a T1 base price at a wave (weapons multiply the base by TIER_PRICE first). */
  price: (base: number, wave: number) => number;
}

export const LIVE_DATA: SimData = {
  waves: wavesData.waves,
  enemies: enemyDefs as Record<string, EnemyDef>,
  weapons: weaponDefs as Record<string, WeaponDef>,
  items: itemDefs as Record<string, ItemDef>,
  scale: scaleEnemy,
  duration: waveDuration,
  maxAlive: MAX_ALIVE,
  price: (base, wave) => Math.round(base * waveScale(wave)),
};

export interface SimParams {
  dt: number;
  aim: number; // fraction of shots that land
  spawnDist: number; // px from the player at spawn
  contactDist: number; // px at which an enemy is touching
  contactRate: number; // hits/s per touching enemy (a kiting player avoids most)
  telegraph: number; // s between the spawn event and the enemy appearing
  bossHit: number; // fraction of boss attacks that land on a kiting player
  bossCap: number; // s a boss wave may last before the sim gives up (the boss survives)
}

export const DEFAULT_PARAMS: SimParams = {
  dt: 1 / 30,
  aim: 0.7,
  spawnDist: 480, // measured mean player-to-enemy px at spawn (A3 off-screen ring, seed 1-3 autopilot playtests)
  contactDist: 30,
  contactRate: 0.25,
  telegraph: 0.6,
  bossHit: 0.3, // ponytail: a guess until boss playtests measure it (`pnpm runs` boss rows)
  bossCap: 240,
};

/** Enemies one attack hits. ponytail: fixed guesses per behaviour, replace with playtest counts if AoE weapons look off. */
const TARGETS: Record<WeaponBehavior, number> = {
  projectile: 1,
  spread: 1, // per pellet; pellets × aim land, spilling onto the next enemy
  beam: 3,
  "melee-arc": 3,
  explosive: 3,
  orbital: 1,
};

export interface Build {
  weapons: OwnedWeapon[];
  items: string[];
  levelMods: Mods;
}

export interface WaveResult {
  wave: number;
  duration: number;
  spawned: number;
  kills: number;
  peakAlive: number;
  scrap: number; // dropped (all banked), before harvesting
  dps: number; // build's paper DPS on one target
  arrivalHp: number; // enemy HP arriving per second
  damageTaken: number;
  hpLeft: number; // ≤ 0 = died
  bossLeft?: number; // boss waves: boss HP ratio at the end (0 = killed)
}

interface Foe {
  boss?: boolean;
  hp: number;
  damage: number;
  speed: number;
  scrap: number;
  born: number;
}

/** Distance left after walking straight in for `t` s from `from` px, with the CATCH_UP speed-up while far. */
export function walkIn(from: number, speed: number, t: number): number {
  const far = Math.max(0, from - CATCH_UP.dist);
  const tFar = far / (speed * CATCH_UP.mult);
  if (t <= tFar) return from - speed * CATCH_UP.mult * t;
  return from - far - speed * (t - tFar);
}

export function simulateWave(
  build: Build,
  wave: number,
  data: SimData = LIVE_DATA,
  p: SimParams = DEFAULT_PARAMS
): WaveResult {
  const stats = computeStats(build, data.items);
  const def = data.waves.find((w) => w.wave === wave);
  if (!def) throw new Error(`No wave ${wave}`);
  const boss = def.boss ? bossModel(data) : null;
  const duration = boss ? p.bossCap : data.duration(wave);
  const schedule = boss ? [] : buildSpawnSchedule({ ...def, wave }).filter((e) => e.time < duration);
  const guns = build.weapons.map((w) => {
    const wd = data.weapons[w.id];
    const ws = weaponStats(wd, w.tier, stats);
    const avg = ws.damage * (1 + Math.min(1, ws.critChance) * (CRIT_MULT - 1));
    const shots = wd.behavior === "spread" ? wd.params.pellets : 1;
    return { wd, ws, avg, shots, timer: 0, landed: 0 };
  });
  const dps = guns.reduce((s, g) => s + (g.avg * g.shots) / g.ws.cooldown, 0);

  let alive: Foe[] = [];
  let cursor = 0;
  let spawned = 0;
  let kills = 0;
  let scrap = 0;
  let peak = 0;
  let hp = stats.maxHp;
  let taken = 0;
  let arrivalHp = 0;
  const dist = (f: Foe, t: number) => Math.max(p.contactDist, walkIn(p.spawnDist, f.speed, t - f.born));
  const hitDamage = (raw: number) => damageTaken(raw, stats.armor) * (1 - stats.dodge / 100);
  let bossFoe: Foe | null = null;
  let brood = 0;
  let t = 0;

  for (; t < duration; t += p.dt) {
    if (boss && !bossFoe) {
      bossFoe = { boss: true, hp: boss.hp, damage: 0, speed: boss.speed, scrap: 0, born: t };
      alive.push(bossFoe);
      brood = boss.brood[0];
    }
    if (boss && bossFoe) {
      const ph = bossFoe.hp / boss.hp < boss.phase2At ? 1 : 0;
      if (t >= BOSS_INTRO_S) {
        const d = boss.dps[ph] * p.dt * hitDamage(boss.attackDamage) * p.bossHit;
        hp -= d;
        taken += d;
      }
      if ((brood -= p.dt) <= 0) {
        brood += boss.brood[ph];
        const s = data.scale(boss.pea, wave);
        for (let i = 0; i < boss.broodCount && alive.length < data.maxAlive; i++) {
          alive.push({ hp: s.hp, damage: s.damage, speed: boss.pea.speed, scrap: boss.pea.scrap, born: t + p.telegraph });
          spawned++;
          arrivalHp += s.hp;
        }
      }
    }
    while (cursor < schedule.length && schedule[cursor].time + p.telegraph <= t) {
      const ev = schedule[cursor++];
      const e = data.enemies[ev.enemy];
      const s = data.scale(e, wave);
      for (let i = 0; i < ev.count && alive.length < data.maxAlive; i++) {
        alive.push({ hp: s.hp, damage: s.damage, speed: e.speed, scrap: e.scrap, born: t });
        spawned++;
        arrivalHp += s.hp;
      }
    }
    peak = Math.max(peak, alive.length);

    for (const g of guns) {
      g.timer += p.dt;
      if (g.timer < g.ws.cooldown) continue;
      // oldest first ≈ nearest first: everyone walks the same straight line
      const inRange = alive.filter((f) => f.hp > 0 && dist(f, t) <= g.ws.range);
      if (boss) inRange.sort((a, b) => Number(!!a.boss) - Number(!!b.boss)); // ponytail: guns clear the brood first, the boss takes the rest
      if (inRange.length === 0) continue;
      g.timer = 0;
      for (let s = 0; s < g.shots; s++) {
        g.landed += p.aim;
        if (g.landed < 1) continue;
        g.landed -= 1;
        let n = TARGETS[g.wd.behavior] + (g.wd.params.pierce ?? 0); // ponytail: assumes the pierced enemies line up
        for (const f of inRange) {
          if (f.hp <= 0) continue;
          f.hp -= g.avg;
          if (f.hp <= 0 && !f.boss) {
            kills++;
            scrap += f.scrap;
          }
          if (--n === 0) break;
        }
      }
    }
    alive = alive.filter((f) => f.hp > 0);

    if (bossFoe && bossFoe.hp <= 0) break;
    if (boss && hp <= 0) break;
    const touching = alive.filter((f) => !f.boss && dist(f, t) <= p.contactDist);
    if (touching.length > 0) {
      const rate = Math.min(1, p.contactRate * touching.length); // i-frames: ≤ 1 hit/s
      const avgRaw = touching.reduce((s, f) => s + f.damage, 0) / touching.length;
      const d = rate * p.dt * hitDamage(avgRaw);
      hp -= d;
      taken += d;
    }
    hp = Math.min(stats.maxHp, hp + (stats.hpRegen / 5) * p.dt);
  }

  return {
    wave,
    duration: Math.min(t, duration),
    spawned,
    kills,
    peakAlive: peak,
    scrap,
    dps,
    arrivalHp: arrivalHp / Math.min(t, duration),
    damageTaken: taken,
    hpLeft: hp,
    ...(boss && { bossLeft: Math.max(0, bossFoe!.hp) / boss.hp }),
  };
}

/**
 * The boss as the sim sees it: one big foe walking in, plus its attacks as a steady
 * damage rate. Phase 1 runs one attack per (attack length + gap); phase 2 up to two
 * at once, one per gap. Every attack deals its own hit (one volley bolt, the charge,
 * one blast) and `bossHit` of them land. ponytail: no positions, no dodging model.
 */
function bossModel(data: SimData) {
  const def = data.enemies.boss;
  const f = def.params!;
  const bp = bossParams(f);
  const len = BOSS_ATTACKS.reduce((s, a) => s + bp.telegraph[a] + bp.recover[a], 0) / BOSS_ATTACKS.length;
  return {
    hp: def.hp,
    speed: def.speed,
    phase2At: bp.phase2At,
    brood: bp.broodEvery,
    broodCount: bp.broodCount,
    pea: data.enemies.pea,
    attackDamage: (f.boltDamage + f.chargeDamage + f.blastDamage) / 3,
    dps: [1 / (len + bp.gap[0]), Math.min(2 / len, 1 / bp.gap[1])],
  };
}

/** A shopping list, bought in order whenever affordable (offers assumed available). */
export type Buy = { weapon: string } | { item: string };

export interface RunWave extends WaveResult {
  earned: number; // scrap + harvesting
  bank: number; // scrap after the shop
  level: number;
  xp: number;
  bought: string[];
  stats: Stats;
  build: Build; // after the shop: what the next wave starts with
}

/**
 * Waves 1..last with a scripted shopper: one reroll per visit if it can still
 * afford the next buy, then the
 * plan in order while affordable; once the plan runs out it repeats from
 * `loopFrom`. Level-ups take `picks` in order (cycling). The shop after wave n
 * prices at wave n+1, like ShopScene. ponytail: the wanted offer always rolls
 * after that one reroll; real shops are luckier or unluckier.
 */
export function simulateRun(
  start: string,
  plan: Buy[],
  picks: Mods[],
  loopFrom = plan.length,
  data: SimData = LIVE_DATA,
  p: SimParams = DEFAULT_PARAMS,
  last = 10
): RunWave[] {
  const build: Build = { weapons: [{ id: start, tier: 1 }], items: [], levelMods: {} };
  let prog = { level: 1, xp: 0 };
  let bank = 0;
  let pick = 0;
  const queue = [...plan];
  const out: RunWave[] = [];
  for (let wave = 1; wave <= last; wave++) {
    const r = simulateWave(build, wave, data, p);
    const stats = computeStats(build, data.items);
    const gained = addXp(prog, r.scrap);
    prog = { level: gained.level, xp: gained.xp };
    for (let i = 0; i < gained.levelsGained && picks.length > 0; i++, pick++) {
      for (const [k, v] of Object.entries(picks[pick % picks.length])) {
        const key = k as keyof Mods;
        build.levelMods[key] = (build.levelMods[key] ?? 0) + v!;
      }
    }
    const earned = r.scrap + stats.harvesting;
    bank += earned;
    const bought: string[] = [];
    const priceOf = (b: Buy) =>
      data.price("weapon" in b ? data.weapons[b.weapon].price : data.items[b.item].price, wave + 1);
    // reroll once when it doesn't cost the next buy
    const reroll = rerollCost(wave + 1, 0);
    if (queue.length > 0 && bank - reroll >= priceOf(queue[0])) bank -= reroll;
    while (queue.length > 0) {
      const b = queue[0];
      const price = priceOf(b);
      if (price > bank) break;
      if ("weapon" in b && addWeapon(build.weapons, b.weapon, 1) === "blocked") {
        queue.shift();
        continue;
      }
      if ("item" in b) build.items.push(b.item);
      bank -= price;
      bought.push("weapon" in b ? b.weapon : b.item);
      queue.shift();
      if (queue.length === 0 && loopFrom < plan.length) queue.push(...plan.slice(loopFrom));
    }
    out.push({ ...r, earned, bank, level: prog.level, xp: prog.xp, bought, stats, build: structuredClone(build) });
    if (r.hpLeft <= 0) break;
  }
  return out;
}
