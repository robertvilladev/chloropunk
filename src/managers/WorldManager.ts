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
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.scene.physics.world.setBounds(0, 0, width, height);

    // Set background
    this.scene.cameras.main.setBackgroundColor(0x2d2d2d);

    // TODO: Add background tiles, decorations, etc.
    this.createBackground();

    console.log("✓ WorldManager: World created");
  }

  /**
   * Create background visuals
   */
  private createBackground(): void {
    // Simple grid background for now
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(1, 0x404040, 0.3);

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const gridSize = 50;

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      graphics.lineBetween(x, 0, x, height);
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      graphics.lineBetween(0, y, width, y);
    }

    graphics.setDepth(0); // Behind everything
  }

  /**
   * Get world dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.scene.cameras.main.width,
      height: this.scene.cameras.main.height,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Cleanup if needed
  }
}
