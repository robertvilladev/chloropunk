import { ARENA, DEPTH } from "@/config/constants";
import { THEME } from "@/config/theme";
import Phaser from "phaser";

/**
 * WorldManager - Handles world setup, boundaries, and environment
 * Keeps world/level generation separate from gameplay logic
 */
export class WorldManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create and initialize the game world
   */
  create(): void {
    // Set world bounds (arena size)
    const { w: width, h: height } = ARENA;

    this.scene.physics.world.setBounds(0, 0, width, height);

    // Set background
    this.scene.cameras.main.setBackgroundColor(THEME.bg);

    this.createBackground();

    console.log("✓ WorldManager: World created");
  }

  /**
   * Create background visuals
   */
  private createBackground(): void {
    const { w: width, h: height } = ARENA;
    const g = this.scene.add.graphics().setDepth(DEPTH.BACKGROUND);
    g.fillStyle(THEME.bg).fillRect(0, 0, width, height);
    g.lineStyle(1, THEME.line, 0.25);
    for (let x = 0; x <= width; x += 48) g.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 48) g.lineBetween(0, y, width, y);
    g.lineStyle(2, THEME.lime, 0.8).strokeRect(1, 1, width - 2, height - 2);
  }

  /**
   * Get world dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: ARENA.w,
      height: ARENA.h,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Cleanup if needed
  }
}
