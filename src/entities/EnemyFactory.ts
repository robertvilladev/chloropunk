import Phaser from "phaser";
import { MathUtils } from "@/utils/MathUtils";
import { GAME_CONFIG, DEPTH } from "@/config/constants";
import type { EnemyData } from "@/types";
import enemyDataJson from "@assets/data/enemies.json";

/**
 * EnemyFactory - Creates and configures enemy sprites
 * Handles enemy creation from data definitions
 */
export class EnemyFactory {
  /**
   * Create an enemy sprite at a random position around the arena edge
   */
  static createEnemy(
    scene: Phaser.Scene,
    type: string
  ): Phaser.Physics.Arcade.Sprite | null {
    // Get enemy data
    const data = enemyDataJson[type as keyof typeof enemyDataJson];
    if (!data) {
      console.warn(`Enemy type "${type}" not found in enemy data`);
      return null;
    }

    // Spawn at random position around the edge
    const spawnPos = this.getRandomSpawnPosition();

    // Create enemy sprite
    const enemy = scene.physics.add.sprite(
      spawnPos.x,
      spawnPos.y,
      data.spriteKey
    );

    // Configure physics body
    enemy.setCollideWorldBounds(true);
    enemy.setDepth(DEPTH.ENEMIES);

    // Store enemy data on the sprite
    enemy.setData("enemyType", type);
    enemy.setData("health", data.health);
    enemy.setData("maxHealth", data.health);
    enemy.setData("damage", data.damage);
    enemy.setData("speed", data.speed);
    enemy.setData("coinValue", data.coinValue);
    enemy.setData("experienceValue", data.experienceValue);

    return enemy;
  }

  /**
   * Get a random spawn position around the arena edge
   */
  private static getRandomSpawnPosition(): { x: number; y: number } {
    return MathUtils.randomPointOnCircle(
      GAME_CONFIG.PLAYER_START_X,
      GAME_CONFIG.PLAYER_START_Y,
      GAME_CONFIG.SPAWN_DISTANCE
    );
  }

  /**
   * Get enemy stats by type
   */
  static getEnemyData(type: string): EnemyData | null {
    return enemyDataJson[type as keyof typeof enemyDataJson] || null;
  }

  /**
   * Get all available enemy types
   */
  static getAllEnemyTypes(): string[] {
    return Object.keys(enemyDataJson);
  }
}
