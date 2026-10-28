import { ARENA, DEPTH } from "@/config/constants";
import { THEME } from "@/config/theme";
import { bakeArena } from "@/art/arena";
import { solidRects } from "@/core/arena";
import layout from "@assets/data/arena.json";
import type { ArenaProp, Rect } from "@/types";
import Phaser from "phaser";

/**
 * WorldManager - Handles world setup, boundaries, and environment
 * Keeps world/level generation separate from gameplay logic
 */
export class WorldManager {
  private scene: Phaser.Scene;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private rects: Rect[] = [];

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
    this.createSolids();

    console.log("✓ WorldManager: World created");
  }

  /** Baked rooftop floor; the layout is authored for 1600x1200. */
  private createBackground(): void {
    const key = bakeArena(this.scene, layout.props as ArenaProp[], ARENA);
    this.scene.add.image(0, 0, key).setOrigin(0).setDepth(DEPTH.BACKGROUND);
  }

  /** Invisible static bodies over the solid props (already drawn in the floor). */
  private createSolids(): void {
    this.rects = solidRects(layout.props as ArenaProp[]);
    this.solids = this.scene.physics.add.staticGroup();
    for (const r of this.rects) this.solids.add(this.scene.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h));
  }

  getSolids(): Phaser.Physics.Arcade.StaticGroup {
    return this.solids;
  }

  /** The solids' boxes, for steering and spawn checks. */
  getSolidRects(): readonly Rect[] {
    return this.rects;
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
