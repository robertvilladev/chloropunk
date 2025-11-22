import { SCENE_KEYS } from "@/config/constants";
import Phaser from "phaser";

/**
 * BootScene - Handles initial asset loading
 * This scene runs first and loads all game assets
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload() {
    // Create loading bar
    this.createLoadingBar();

    // TODO: Load assets here when we have them
    // For now, we'll use placeholder graphics
    this.loadPlaceholderAssets();
  }

  create() {
    console.log("✓ BootScene: Assets loaded");

    // Start the menu scene
    this.scene.start(SCENE_KEYS.MENU);
  }

  private createLoadingBar() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Loading text
    const loadingText = this.add.text(
      width / 2,
      height / 2 - 50,
      "Loading...",
      {
        fontSize: "32px",
        color: "#ffffff",
      }
    );
    loadingText.setOrigin(0.5);

    // Progress bar background
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 10, 320, 30);

    // Progress bar
    const progressBar = this.add.graphics();

    // Loading events
    this.load.on("progress", (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(width / 2 - 150, height / 2, 300 * value, 10);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  private loadPlaceholderAssets() {
    // Create placeholder graphics for MVP
    // In production, these would be actual sprite files

    // For now, just create some colored rectangles as placeholders
    this.createPlaceholderSprites();
  }

  private createPlaceholderSprites() {
    // Create simple colored rectangles as temporary sprites
    const graphics = this.add.graphics();

    // Player (blue square)
    graphics.fillStyle(0x4444ff);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture("player", 32, 32);

    // Enemy Slime (green blob)
    graphics.clear();
    graphics.fillStyle(0x44ff44);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture("enemy_slime", 32, 32);

    // Enemy Goblin (red square)
    graphics.clear();
    graphics.fillStyle(0xff4444);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture("enemy_goblin", 32, 32);

    // Enemy Orc (dark red)
    graphics.clear();
    graphics.fillStyle(0xaa0000);
    graphics.fillRect(0, 0, 40, 40);
    graphics.generateTexture("enemy_orc", 40, 40);

    // Projectile (yellow circle)
    graphics.clear();
    graphics.fillStyle(0xffff00);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture("projectile_basic", 8, 8);

    // Coin (gold circle)
    graphics.clear();
    graphics.fillStyle(0xffd700);
    graphics.fillCircle(8, 8, 8);
    graphics.lineStyle(2, 0xffaa00);
    graphics.strokeCircle(8, 8, 8);
    graphics.generateTexture("coin", 16, 16);

    // UI Heart (red heart shape - simplified)
    graphics.clear();
    graphics.fillStyle(0xff0000);
    graphics.fillCircle(8, 8, 6);
    graphics.generateTexture("ui_heart", 16, 16);

    graphics.destroy();
  }
}
