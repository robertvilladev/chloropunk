/**
 * Game constants and configuration
 */

export const GAME_CONFIG = {
  // Canvas dimensions
  WIDTH: 800,
  HEIGHT: 600,

  // Gameplay
  SPAWN_DISTANCE: 650, // Distance from center to spawn enemies
  WAVE_INTERVAL: 20, // Seconds per wave (20 for testing)
  PLAYER_START_X: 400,
  PLAYER_START_Y: 300,

  // Balance
  INITIAL_PLAYER_HEALTH: 100,
  INITIAL_PLAYER_SPEED: 160,
  INITIAL_WEAPON_DAMAGE: 10,
  INITIAL_WEAPON_FIRE_RATE: 1, // Shots per second
  INITIAL_WEAPON_RANGE: 300,

  // Pickups
  MAGNET_SPEED: 420,
  MAX_PICKUPS: 300,

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
  GAME_OVER: "GameOverScene",
  VICTORY: "VictoryScene",
  LEVEL_UP: "LevelUpScene",
  LOADOUT: "LoadoutScene",
} as const;

export const ASSET_KEYS = {
  PLAYER: "player",
  PROJECTILE_BASIC: "projectile_basic",
  SCRAP: "scrap",
  UI_HEART: "ui_heart",
} as const;

export const DEPTH = {
  BACKGROUND: 0,
  GROUND_EFFECTS: 10,
  SCRAP: 20, // pickups: lowest actor layer
  ACTORS: 40, // base of the y-sorted band [40, 49.99]
  PROJECTILES: 60,
  FX: 70, // bursts, blasts
  NUMBERS: 90, // damage numbers, banner
  UI: 100,
} as const;
