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
import { buildSpawnSchedule, scaleEnemy, waveDuration } from "./waves";
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
  maxAlive: Infinity,
  price: (base, wave) => Math.round(base * waveScale(wave)),
};

export interface SimParams {
  dt: number;
  aim: number; // fraction of shots that land
  spawnDist: number; // px from the player at spawn
  contactDist: number; // px at which an enemy is touching
  contactRate: number; // hits/s per touching enemy (a kiting player avoids most)
  telegraph: number; // s between the spawn event and the enemy appearing
}

export const DEFAULT_PARAMS: SimParams = {
  dt: 1 / 30,
  aim: 0.7,
  spawnDist: 330, // mean distance from arena centre to the spawn rectangle
  contactDist: 30,
  contactRate: 0.25,
  telegraph: 0.6,
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
}

interface Foe {
  hp: number;
  damage: number;
  speed: number;
  scrap: number;
  born: number;
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
  const duration = data.duration(wave);
  const schedule = buildSpawnSchedule({ ...def, wave }).filter((e) => e.time < duration);
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
  const dist = (f: Foe, t: number) => Math.max(p.contactDist, p.spawnDist - f.speed * (t - f.born));
  const hitDamage = (raw: number) => damageTaken(raw, stats.armor) * (1 - stats.dodge / 100);

  for (let t = 0; t < duration; t += p.dt) {
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
          if (f.hp <= 0) {
            kills++;
            scrap += f.scrap;
          }
          if (--n === 0) break;
        }
      }
    }
    alive = alive.filter((f) => f.hp > 0);

    const touching = alive.filter((f) => dist(f, t) <= p.contactDist);
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
    duration,
    spawned,
    kills,
    peakAlive: peak,
    scrap,
    dps,
    arrivalHp: arrivalHp / duration,
    damageTaken: taken,
    hpLeft: hp,
  };
}

/** A shopping list, bought in order whenever affordable (offers assumed available). */
export type Buy = { weapon: string } | { item: string };

export interface RunWave extends WaveResult {
  earned: number; // scrap + harvesting
  bank: number; // scrap after the shop
  level: number;
  bought: string[];
  stats: Stats;
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
    out.push({ ...r, earned, bank, level: prog.level, bought, stats });
    if (r.hpLeft <= 0) break;
  }
  return out;
}
