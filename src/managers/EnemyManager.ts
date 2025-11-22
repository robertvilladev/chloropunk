import Phaser from "phaser";
import { EnemyFactory } from "@/entities/EnemyFactory";
import { MathUtils } from "@/utils/MathUtils";

/**
 * EnemyManager - Handles all enemy-related logic
 * Spawning, movement, AI, and lifecycle management
 */
export class EnemyManager {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private spawnTimer: number = 0;
  private spawnInterval: number = 2; // Spawn every 2 seconds

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.enemies = this.scene.physics.add.group();
  }

  /**
   * Initialize enemy system
   */
  create(): void {
    console.log("✓ EnemyManager: Initialized");
  }

  /**
   * Update all enemies - movement and AI
   */
  update(delta: number, playerPosition: { x: number; y: number }): void {
    // Handle spawning
    this.updateSpawning(delta);

    // Update each enemy
    this.enemies.children.entries.forEach((enemyObj) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
      this.updateEnemyMovement(enemy, playerPosition);
    });
  }

  /**
   * Handle enemy spawning over time
   */
  private updateSpawning(delta: number): void {
    this.spawnTimer += delta / 1000;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnEnemy("slime"); // Spawn a cigarette enemy
      this.spawnTimer = 0;
    }
  }

  /**
   * Spawn a new enemy
   */
  spawnEnemy(type: string): void {
    const enemy = EnemyFactory.createEnemy(this.scene, type);
    if (enemy) {
      this.enemies.add(enemy);
      console.log(`Spawned ${type} enemy`);
    }
  }

  /**
   * Update individual enemy movement toward player
   */
  private updateEnemyMovement(
    enemy: Phaser.Physics.Arcade.Sprite,
    playerPos: { x: number; y: number }
  ): void {
    const speed = enemy.getData("speed") || 60;

    // Calculate angle to player
    const angle = MathUtils.angleBetween(
      enemy.x,
      enemy.y,
      playerPos.x,
      playerPos.y
    );

    // Move toward player
    const velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };

    enemy.setVelocity(velocity.x, velocity.y);

    // Rotate sprite to face movement direction (for cigarette visual)
    enemy.setRotation(angle);
  }

  /**
   * Damage an enemy
   */
  damageEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number): void {
    const currentHealth = enemy.getData("health") || 0;
    const newHealth = currentHealth - damage;

    enemy.setData("health", newHealth);

    // Visual feedback - flash red
    enemy.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      enemy.clearTint();
    });

    // Check if dead
    if (newHealth <= 0) {
      this.killEnemy(enemy);
    }
  }

  /**
   * Kill an enemy
   */
  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    const coinValue = enemy.getData("coinValue") || 0;
    const expValue = enemy.getData("experienceValue") || 0;

    console.log(`Enemy killed! +${coinValue} coins, +${expValue} XP`);

    // TODO: Spawn coin at enemy position
    // TODO: Add death animation/particles

    enemy.destroy();
  }

  /**
   * Get all enemy sprites
   */
  getEnemies(): Phaser.Physics.Arcade.Sprite[] {
    return this.enemies.children.entries as Phaser.Physics.Arcade.Sprite[];
  }

  /**
   * Get enemy group for collision detection
   */
  getEnemyGroup(): Phaser.Physics.Arcade.Group {
    return this.enemies;
  }

  /**
   * Get count of active enemies
   */
  getEnemyCount(): number {
    return this.enemies.children.size;
  }

  /**
   * Clear all enemies
   */
  clearAllEnemies(): void {
    this.enemies.clear(true, true);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.clearAllEnemies();
  }
}
