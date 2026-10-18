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

    // Enemy Cigarette (white with orange filter and burn tip)
    graphics.clear();
    // Cigarette body (white)
    graphics.fillStyle(0xffffff);
    graphics.fillRoundedRect(2, 6, 28, 12, 2);
    // Orange filter section
    graphics.fillStyle(0xff8833);
    graphics.fillRoundedRect(18, 6, 12, 12, 2);
    // Black tip line
    graphics.lineStyle(1, 0x000000);
    graphics.lineBetween(18, 6, 18, 18);
    // Burn mark at tip (this is the front)
    graphics.fillStyle(0x8b4513);
    graphics.fillCircle(3, 12, 2);
    graphics.generateTexture("enemy_cigarette", 32, 24);

    // Enemy Slime (green circle)
    graphics.clear();
    graphics.fillStyle(0x00ff00);
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

    // Placeholder veggie textures (Task 4 replaces these)
    const veggies: Array<[string, number, number]> = [
      ["pea", 0x4caf50, 28],
      ["pepper", 0xe53935, 28],
      ["potato", 0xb07a43, 40],
      ["carrot", 0xff7a1a, 28],
      ["tomato", 0xe53935, 28],
    ];
    for (const [id, color, size] of veggies) {
      graphics.clear();
      graphics.fillStyle(color);
      graphics.fillRect(0, 0, size, size);
      graphics.generateTexture(`enemy_${id}`, size, size);
    }

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
