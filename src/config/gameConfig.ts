import { BootScene } from "@/scenes/BootScene";
import { GameScene } from "@/scenes/GameScene";
import { GameOverScene } from "@/scenes/GameOverScene";
import { LevelUpScene } from "@/scenes/LevelUpScene";
import { LoadoutScene } from "@/scenes/LoadoutScene";
import { MenuScene } from "@/scenes/MenuScene";
import { PauseScene } from "@/scenes/PauseScene";
import { ShopScene } from "@/scenes/ShopScene";
import { UIScene } from "@/scenes/UIScene";
import { VictoryScene } from "@/scenes/VictoryScene";
import Phaser from "phaser";
import { rendererFromSearch } from "./renderer";
import { THEME_CSS } from "./theme";
import { CANVAS_SIZE, applyView, installCrispText } from "./view";

export { rendererFromSearch };

installCrispText(Phaser);

const RENDERER = { auto: Phaser.AUTO, canvas: Phaser.CANVAS, webgl: Phaser.WEBGL };

/**
 * Main Phaser game configuration
 */
export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: RENDERER[rendererFromSearch(window.location.search)],
  width: CANVAS_SIZE.width,
  height: CANVAS_SIZE.height,
  canvasStyle: "margin: 0 auto;",
  parent: "game-container",
  backgroundColor: THEME_CSS.bg,
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

  callbacks: {
    // every scene (re)start gets a fresh main camera: zoom it onto the 800x600 design space
    postBoot: (game) =>
      game.scene.scenes.forEach((s) => s.events.on(Phaser.Scenes.Events.START, () => applyView(s.cameras.main))),
  },

  scene: [
    BootScene,
    MenuScene,
    GameScene,
    ShopScene,
    UIScene,
    GameOverScene,
    VictoryScene,
    LevelUpScene,
    LoadoutScene,
    PauseScene,
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
