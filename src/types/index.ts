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
  coins: number;
  experience: number;
  level: number;
}

export interface EnemyData {
  type: string;
  health: number;
  damage: number;
  speed: number;
  coinValue: number;
  experienceValue: number;
  spriteKey: string;
}

export interface WeaponData {
  type: string;
  damage: number;
  fireRate: number;
  range: number;
  projectileSpeed: number;
  spriteKey: string;
}

export interface WaveData {
  waveNumber: number;
  duration: number;
  enemyTypes: Array<{
    type: string;
    weight: number;
    count: number;
  }>;
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
  coins: number;
  bonus: { maxHealth: number; speed: number; damage: number };
}
