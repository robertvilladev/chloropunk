import { ARENA, DEPTH } from "@/config/constants";
import { THEME } from "@/config/theme";
import { bakeArena } from "@/art/arena";
import layout from "@assets/data/arena.json";
import type { ArenaProp } from "@/types";
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

  /** Baked rooftop floor; the layout is authored for 1600x1200, so `?arena=small` gets the plain grid. */
  private createBackground(): void {
    const fits = layout.w === ARENA.w && layout.h === ARENA.h;
    const key = bakeArena(this.scene, fits ? (layout.props as ArenaProp[]) : [], ARENA);
    this.scene.add.image(0, 0, key).setOrigin(0).setDepth(DEPTH.BACKGROUND);
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
