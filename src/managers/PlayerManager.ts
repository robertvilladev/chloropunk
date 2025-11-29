import { GAME_CONFIG } from "@/config/constants";
import Phaser from "phaser";

/**
 * PlayerManager - Handles all player-related logic
 * Keeps player code separate from the main scene
 */
export class PlayerManager {
  private scene: Phaser.Scene;
  private player!: Phaser.Physics.Arcade.Sprite;
  private health: number = 100;
  private maxHealth: number = 100;
  private invulnerableTimer: number = 0;
  private invulnerableDuration: number = 1000; // 1 second invulnerability after hit

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
  update(velocityX: number, velocityY: number, delta: number): void {
    if (!this.player || !this.player.body) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = GAME_CONFIG.INITIAL_PLAYER_SPEED;

    // Set velocity
    body.setVelocity(velocityX * speed, velocityY * speed);

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      body.velocity.normalize().scale(speed);
    }

    // Update invulnerability timer
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      // Flash effect during invulnerability
      this.player.setAlpha(Math.sin(Date.now() / 100) * 0.5 + 0.5);
    } else {
      this.player.setAlpha(1);
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
    // Don't take damage if invulnerable
    if (this.invulnerableTimer > 0) return;

    this.health -= amount;
    this.invulnerableTimer = this.invulnerableDuration;

    console.log(
      `Player took ${amount} damage. Health: ${this.health}/${this.maxHealth}`
    );

    // Flash red
    this.player.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.player.clearTint();
    });

    // Check if dead
    if (this.health <= 0) {
      this.health = 0;
      this.onPlayerDeath();
    }

    // Emit event for UI update
    this.scene.events.emit("playerHealthChanged", this.health, this.maxHealth);
  }

  /**
   * Handle player death
   */
  private onPlayerDeath(): void {
    console.log('Player died!');
    this.scene.events.emit('playerDied');
  }

  /**
   * Get current health
   */
  getHealth(): number {
    return this.health;
  }

  /**
   * Get max health
   */
  getMaxHealth(): number {
    return this.maxHealth;
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
