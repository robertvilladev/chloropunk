/**
 * Game constants and configuration
 */

export const GAME_CONFIG = {
  // Canvas dimensions
  WIDTH: 800,
  HEIGHT: 600,

  // Gameplay
  SPAWN_DISTANCE: 650, // Distance from center to spawn enemies
  WAVE_INTERVAL: 45, // Seconds between waves
  PLAYER_START_X: 400,
  PLAYER_START_Y: 300,

  // Balance
  INITIAL_PLAYER_HEALTH: 100,
  INITIAL_PLAYER_SPEED: 160,
  INITIAL_WEAPON_DAMAGE: 10,
  INITIAL_WEAPON_FIRE_RATE: 1, // Shots per second
  INITIAL_WEAPON_RANGE: 300,

  // Progression
  BASE_EXP_FOR_LEVEL: 100,
  EXP_SCALE_PER_LEVEL: 1.5,

  // Wave scaling
  WAVE_DIFFICULTY_SCALE: 1.2,
  BASE_ENEMIES_PER_WAVE: 10,
} as const;

export const SCENE_KEYS = {
  BOOT: "BootScene",
  MENU: "MenuScene",
  GAME: "GameScene",
  SHOP: "ShopScene",
  UI: "UIScene",
} as const;

export const ASSET_KEYS = {
  PLAYER: "player",
  ENEMY_SLIME: "enemy_slime",
  ENEMY_GOBLIN: "enemy_goblin",
  PROJECTILE_BASIC: "projectile_basic",
  COIN: "coin",
  UI_HEART: "ui_heart",
  UI_COIN: "ui_coin",
} as const;

export const DEPTH = {
  BACKGROUND: 0,
  GROUND_EFFECTS: 10,
  COINS: 20,
  PROJECTILES: 30,
  ENEMIES: 40,
  PLAYER: 50,
  UI: 100,
} as const;
