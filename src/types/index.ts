/**
 * Core type definitions for the game
 */
import type { RunLog } from "@/core/runlog";

export interface Vector2 {
  x: number;
  y: number;
}

/** Axis-aligned box in arena px (top-left x/y). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type EnemyBehavior =
  | "chaser"
  | "dasher"
  | "tank"
  | "shooter"
  | "exploder"
  | "boss";

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  scrap: number;
  behavior: EnemyBehavior;
  sprite: string;
  radius: number;
  color?: string; // death-burst colour, "#rrggbb"
  shakeOnKill?: boolean; // screen shake when killed
  params?: Record<string, number>;
}

/** Spawn `count` enemies every `every` s from `start` until `end` (default: wave duration, exclusive). */
export interface SpawnGroup {
  enemy: string;
  count: number;
  every: number;
  start: number;
  end?: number;
}

export interface WaveDef {
  wave: number;
  boss?: boolean; // no timer, no groups: the boss and its pea brood (M4b)
  groups: SpawnGroup[];
}

/** Per-wave enemy growth coefficients (waves.json "scaling"). */
export interface WaveScaling {
  hp: number;
  hpQuad: number;
  damage: number;
}

export interface SpawnEvent {
  time: number;
  enemy: string;
  count: number;
}

export type StatKey =
  | "maxHp"
  | "hpRegen"
  | "armor"
  | "dodge"
  | "speed"
  | "damage"
  | "melee"
  | "ranged"
  | "elemental"
  | "attackSpeed"
  | "crit"
  | "range"
  | "pickupRadius"
  | "luck"
  | "harvesting";

export type Stats = Record<StatKey, number>;
export type Mods = Partial<Stats>;

export type Tier = 1 | 2 | 3 | 4;

export interface OwnedWeapon {
  id: string;
  tier: Tier;
}

export interface Offer {
  kind: "weapon" | "item";
  id: string;
  tier: Tier;
  price: number;
}

export type WeaponBehavior =
  | "projectile"
  | "spread"
  | "beam"
  | "melee-arc"
  | "orbital"
  | "explosive";

type DamageTag = "melee" | "ranged" | "elemental";

export interface CharacterDef {
  name: string;
  title: string;
}

export interface WeaponDef {
  id: string;
  name: string;
  blurb: string;
  behavior: WeaponBehavior;
  tags: DamageTag[];
  damage: [number, number, number, number]; // per tier
  cooldown: [number, number, number, number]; // seconds, per tier
  range: number;
  price: number;
  scaling: { stat: DamageTag; ratio: number };
  params: Record<string, number>;
}

export interface ItemDef {
  id: string;
  name: string;
  rarity: Tier;
  price: number;
  mods: Mods;
}

/** Run totals for balance calibration: attacks (projectiles, beams, swings; not drones), attacks that landed, kills. */
export interface AimTally {
  shots: number;
  hits: number;
  kills: number;
}

/** State that survives between rounds of a single run */
export interface RunState {
  wave: number;
  scrap: number;
  xp: number;
  level: number;
  pendingLevelUps: number;
  seed: number;
  aim: AimTally;
  log: RunLog; // balance design §9; saved when the run ends
  weapons: OwnedWeapon[];
  items: string[]; // item ids, repeats allowed
  levelMods: Mods; // summed level-up picks
  lockedOffers: Offer[];
}

/** Rooftop decor kinds (assets/data/arena.json); drawn by src/art/arena.ts. */
export type PropKind = "vent" | "sign" | "pad" | "puddle" | "rail" | "zone" | "crate";

/** One decor prop in arena px (top-left x/y). `solid` props block the player, enemies, bolts and scrap. */
export interface ArenaProp {
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  solid?: boolean;
}
