/**
 * Core type definitions for the game
 */

export interface Vector2 {
  x: number;
  y: number;
}

export const GameState = {
  MENU: "MENU",
  WAVE_PREPARATION: "WAVE_PREPARATION",
  WAVE_ACTIVE: "WAVE_ACTIVE",
  WAVE_COMPLETE: "WAVE_COMPLETE",
  SHOP: "SHOP",
  GAME_OVER: "GAME_OVER",
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

export interface PlayerStats {
  maxHealth: number;
  currentHealth: number;
  damage: number;
  fireRate: number;
  moveSpeed: number;
  experience: number;
  level: number;
}

export type EnemyBehavior =
  | "chaser"
  | "dasher"
  | "tank"
  | "shooter"
  | "exploder";

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

export interface WeaponData {
  type: string;
  damage: number;
  fireRate: number;
  range: number;
  projectileSpeed: number;
  spriteKey: string;
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
  groups: SpawnGroup[];
}

export interface SpawnEvent {
  time: number;
  enemy: string;
  count: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  stat: keyof PlayerStats;
  value: number;
  type: "upgrade" | "weapon";
}

export interface GameConfig {
  width: number;
  height: number;
  spawnDistance: number;
  waveInterval: number;
}

/** State that survives between rounds of a single run */
export interface RunState {
  wave: number;
  scrap: number;
  xp: number;
  level: number;
  pendingLevelUps: number;
  bonus: { maxHealth: number; speed: number; damage: number };
  seed: number;
}
