import { BootScene } from "@/scenes/BootScene";
import { GameScene } from "@/scenes/GameScene";
import { GameOverScene } from "@/scenes/GameOverScene";
import { MenuScene } from "@/scenes/MenuScene";
import { ShopScene } from "@/scenes/ShopScene";
import { UIScene } from "@/scenes/UIScene";
import { VictoryScene } from "@/scenes/VictoryScene";
import Phaser from "phaser";
import { GAME_CONFIG } from "./constants";

/**
 * Main Phaser game configuration
 */
export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  canvasStyle: "margin: 0 auto;",
  parent: "game-container",
  backgroundColor: "#2d2d2d",
  pixelArt: true, // Crisp pixel rendering
  roundPixels: true,
  antialias: false,

  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 }, // Top-down game = no gravity
      debug: new URLSearchParams(window.location.search).has("debug"), // ?debug in the URL
      fps: 60,
    },
  },

  scene: [
    BootScene,
    MenuScene,
    GameScene,
    ShopScene,
    UIScene,
    GameOverScene,
    VictoryScene,
  ],

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
};
