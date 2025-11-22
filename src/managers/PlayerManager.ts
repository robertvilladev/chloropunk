import { GAME_CONFIG } from "@/config/constants";
import Phaser from "phaser";

/**
 * PlayerManager - Handles all player-related logic
 * Keeps player code separate from the main scene
 */
export class PlayerManager {
  private scene: Phaser.Scene;
  private player!: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create and initialize the player
   */
  create(): void {
    // Create player sprite at center
    this.player = this.scene.physics.add.sprite(
      GAME_CONFIG.PLAYER_START_X,
      GAME_CONFIG.PLAYER_START_Y,
      "player"
    );

    // Set player physics properties
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(50); // Above enemies

    console.log("✓ PlayerManager: Player created");
  }

  /**
   * Update player movement based on input
   */
  update(velocityX: number, velocityY: number): void {
    if (!this.player || !this.player.body) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = GAME_CONFIG.INITIAL_PLAYER_SPEED;

    // Set velocity
    body.setVelocity(velocityX * speed, velocityY * speed);

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      body.velocity.normalize().scale(speed);
    }
  }

  /**
   * Get the player sprite
   */
  getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.player;
  }

  /**
   * Get player position
   */
  getPosition(): { x: number; y: number } {
    return {
      x: this.player.x,
      y: this.player.y,
    };
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): void {
    // TODO: Implement health system
    console.log(`Player took ${amount} damage`);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.player) {
      this.player.destroy();
    }
  }
}
