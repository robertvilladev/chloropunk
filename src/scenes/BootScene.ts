import { SCENE_KEYS } from "@/config/constants";
import { THEME } from "@/config/theme";
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

    this.createEnemyTextures(graphics);

    // Projectile (yellow circle)
    graphics.clear();
    graphics.fillStyle(0xffff00);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture("projectile_basic", 8, 8);

    // Scrap (lime circle)
    graphics.clear();
    graphics.fillStyle(0xc6ff3d);
    graphics.fillCircle(8, 8, 8);
    graphics.lineStyle(2, 0x7fa800);
    graphics.strokeCircle(8, 8, 8);
    graphics.generateTexture("scrap", 16, 16);

    // UI Heart (red heart shape - simplified)
    graphics.clear();
    graphics.fillStyle(0xff0000);
    graphics.fillCircle(8, 8, 6);
    graphics.generateTexture("ui_heart", 16, 16);

    graphics.destroy();
  }

  /** Placeholder shapes per enemy id (pixel-art sprites arrive later). */
  private createEnemyTextures(g: Phaser.GameObjects.Graphics) {
    const shapes: Array<[string, number, number, "rect" | "round" | "tri"]> = [
      ["pea", 0x4caf50, 28, "round"],
      ["pepper", 0xe53935, 28, "tri"],
      ["potato", 0xb07a43, 40, "rect"],
      ["carrot", 0xff7a1a, 28, "tri"],
      ["tomato", 0xe53935, 28, "round"],
    ];
    for (const [id, color, size, shape] of shapes) {
      g.clear();
      g.fillStyle(color);
      const r = size / 2;
      if (shape === "round") g.fillCircle(r, r, r);
      else if (shape === "rect") g.fillRoundedRect(0, 0, size, size, 6);
      else g.fillTriangle(r, 0, size, size, 0, size);
      g.generateTexture(`enemy_${id}`, size, size);
    }

    // Enemy bolt (small cyan dot)
    g.clear();
    g.fillStyle(THEME.tier[1]);
    g.fillCircle(4, 4, 4);
    g.generateTexture("enemy_bolt", 8, 8);

    // Spawn telegraph (danger ring + cross)
    g.clear();
    g.lineStyle(3, THEME.danger);
    g.strokeCircle(20, 20, 16);
    g.lineBetween(10, 10, 30, 30);
    g.lineBetween(30, 10, 10, 30);
    g.generateTexture("spawn_telegraph", 40, 40);
  }
}
