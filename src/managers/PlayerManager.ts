import { feetOffset, fitBox } from "@/art/body";
import { ARENA, GAME_CONFIG } from "@/config/constants";
import { actorDepth, facingFlip } from "@/core/depth";
import type { Rng } from "@/core/rng";
import { damageTaken } from "@/core/stats";
import type { Stats } from "@/types";

const DODGE_IFRAMES_MS = 500;
const PLAYER_BODY = 32; // pre-M3 32x32 square body
const PLAYER_FEET = feetOffset("player");
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
      ARENA.w / 2,
      ARENA.h / 2,
      "player"
    );

    // Set player physics properties
    this.player.setCollideWorldBounds(true);
    fitBox(this.player, "player", PLAYER_BODY, PLAYER_BODY);
    this.player.play("player_walk");
    this.player.setDepth(actorDepth(this.player.y + PLAYER_FEET));

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
    this.player.flipX = facingFlip(velocityX * speed, this.player.flipX);
    const d = actorDepth(this.player.y + PLAYER_FEET);
    if (Math.round(d * 100) !== Math.round(this.player.depth * 100)) this.player.setDepth(d);

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
   * Take damage; returns the HP lost (0 when invulnerable or dodged)
   */
  takeDamage(raw: number): number {
    // Don't take damage if invulnerable
    if (this.invulnerableTimer > 0) return 0;
    // A dodge also grants short i-frames: contact overlaps fire every physics
    // step, so without them the next frame would simply re-roll
    if (this.stats.dodge > 0 && this.rng.next() < this.stats.dodge / 100) {
      this.invulnerableTimer = DODGE_IFRAMES_MS;
      this.scene.events.emit("playerDodged");
      return 0;
    }
    const amount = damageTaken(raw, this.stats.armor);

    this.health -= amount;
    this.invulnerableTimer = this.invulnerableDuration;

    console.log(
      `Player took ${amount} damage. Health: ${this.health}/${this.maxHealth}`
    );

    this.scene.events.emit("playerHit");

    // Hit frame for 100 ms (board A2): a baked frame, since the Canvas renderer can't draw tints
    this.player.anims.pause();
    this.player.setFrame("hit");
    this.scene.time.delayedCall(100, () => {
      if (!this.player.active || this.player.frame.name !== "hit") return;
      this.player.anims.resume();
      this.player.setFrame(this.player.anims.currentFrame?.textureFrame ?? "walk0");
    });

    // Check if dead
    if (this.health <= 0) {
      this.health = 0;
      this.onPlayerDeath();
    }

    // Emit event for UI update
    this.scene.events.emit("playerHealthChanged", this.health, this.maxHealth);
    return amount;
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
