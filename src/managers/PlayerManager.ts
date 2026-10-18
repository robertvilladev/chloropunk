import { GAME_CONFIG } from "@/config/constants";
import type { Rng } from "@/core/rng";
import { damageTaken } from "@/core/stats";
import type { Stats } from "@/types";
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
  private speed: number = GAME_CONFIG.INITIAL_PLAYER_SPEED;
  private invulnerableTimer: number = 0;
  private invulnerableDuration: number = 1000; // 1 second invulnerability after hit
  private stats!: Stats;
  private rng!: Rng;
  private regenAcc = 0; // fractional HP healed so far

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create and initialize the player
   */
  create(stats: Stats, rng: Rng): void {
    this.stats = stats;
    this.rng = rng;
    this.maxHealth = stats.maxHp;
    this.health = stats.maxHp;
    this.speed = GAME_CONFIG.INITIAL_PLAYER_SPEED * (1 + stats.speed / 100);
    this.invulnerableTimer = 0;
    this.regenAcc = 0;

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
    const speed = this.speed;

    // Set velocity
    body.setVelocity(velocityX * speed, velocityY * speed);

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      body.velocity.normalize().scale(speed);
    }

    // Regen: hpRegen / 5 HP per second
    if (this.stats.hpRegen > 0 && this.health > 0 && this.health < this.maxHealth) {
      this.regenAcc += (this.stats.hpRegen / 5) * (delta / 1000);
      if (this.regenAcc >= 1) {
        const heal = Math.floor(this.regenAcc);
        this.regenAcc -= heal;
        this.health = Math.min(this.maxHealth, this.health + heal);
        this.scene.events.emit("playerHealthChanged", this.health, this.maxHealth);
      }
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
  takeDamage(raw: number): void {
    // Don't take damage if invulnerable
    if (this.invulnerableTimer > 0) return;
    if (this.rng.next() < this.stats.dodge / 100) {
      this.scene.events.emit("playerDodged");
      return;
    }
    const amount = damageTaken(raw, this.stats.armor);

    this.health -= amount;
    this.invulnerableTimer = this.invulnerableDuration;

    console.log(
      `Player took ${amount} damage. Health: ${this.health}/${this.maxHealth}`
    );

    this.scene.events.emit("playerHit");

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
    console.log("Player died!");
    this.scene.events.emit("playerDied");
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
   * Get movement speed
   */
  getSpeed(): number {
    return this.speed;
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
