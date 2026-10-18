import { MathUtils } from "@/utils/MathUtils";
import weaponsDataJson from "@assets/data/weapons.json";
import Phaser from "phaser";

interface WeaponData {
  type: string;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  range: number;
  spriteKey: string;
  projectileCount?: number;
  spreadAngle?: number;
}

interface EquippedWeapon {
  type: string;
  data: WeaponData;
  fireTimer: number;
}

/**
 * WeaponManager - Handles all weapon and projectile logic
 * Auto-fires at nearest enemies, manages multiple equipped weapons
 */
export class WeaponManager {
  private scene: Phaser.Scene;
  private projectiles: Phaser.Physics.Arcade.Group;
  private equippedWeapons: EquippedWeapon[] = [];
  private maxWeapons: number = 5; // Can equip 3-5 weapons
  private bonusDamage: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.projectiles = this.scene.physics.add.group({
      defaultKey: "projectile_basic",
      maxSize: 100,
    });
  }

  /**
   * Initialize weapon system
   */
  create(bonusDamage: number = 0): void {
    this.bonusDamage = bonusDamage;
    // Start with a basic pistol
    this.equipWeapon("basicGun");
    console.log("✓ WeaponManager: Initialized with basic gun");
  }

  /**
   * Equip a weapon (up to maxWeapons)
   */
  equipWeapon(type: string): boolean {
    if (this.equippedWeapons.length >= this.maxWeapons) {
      console.warn("Cannot equip more weapons, max reached");
      return false;
    }

    const weaponData = weaponsDataJson as Record<string, WeaponData>;
    const weapon = weaponData[type];

    if (!weapon) {
      console.error(`Weapon type ${type} not found`);
      return false;
    }

    this.equippedWeapons.push({
      type,
      data: weapon,
      fireTimer: 0,
    });

    console.log(`Equipped ${type} weapon`);
    return true;
  }

  /**
   * Damage of the primary weapon, including upgrades
   */
  getDamage(): number {
    return (this.equippedWeapons[0]?.data.damage ?? 0) + this.bonusDamage;
  }

  /**
   * Update all weapons - auto-fire at nearest enemies
   */
  update(
    delta: number,
    playerPos: { x: number; y: number },
    enemies: Phaser.Physics.Arcade.Sprite[]
  ): void {
    // Update each weapon's fire timer
    this.equippedWeapons.forEach((weapon) => {
      weapon.fireTimer += delta / 1000;

      // Check if weapon is ready to fire
      const fireInterval = 1 / weapon.data.fireRate;
      if (weapon.fireTimer >= fireInterval) {
        this.fireWeapon(weapon, playerPos, enemies);
        weapon.fireTimer = 0;
      }
    });

    // Update projectiles (remove out of range)
    this.updateProjectiles();
  }

  /**
   * Fire a weapon at the nearest enemy
   */
  private fireWeapon(
    weapon: EquippedWeapon,
    playerPos: { x: number; y: number },
    enemies: Phaser.Physics.Arcade.Sprite[]
  ): void {
    // Find nearest enemy
    const nearestEnemy = this.findNearestEnemy(playerPos, enemies);
    if (!nearestEnemy) return;

    // Calculate angle to enemy
    const angle = MathUtils.angleBetween(
      playerPos.x,
      playerPos.y,
      nearestEnemy.x,
      nearestEnemy.y
    );

    // Handle weapons with multiple projectiles (shotgun)
    const projectileCount = weapon.data.projectileCount || 1;
    const spreadAngle = weapon.data.spreadAngle || 0;

    for (let i = 0; i < projectileCount; i++) {
      // Calculate spread for each projectile
      let projectileAngle = angle;
      if (projectileCount > 1) {
        const spread = (spreadAngle * Math.PI) / 180;
        const offset =
          (i - (projectileCount - 1) / 2) * (spread / projectileCount);
        projectileAngle += offset;
      }

      this.createProjectile(playerPos, projectileAngle, weapon.data);
    }
  }

  /**
   * Create a projectile
   */
  private createProjectile(
    startPos: { x: number; y: number },
    angle: number,
    weaponData: WeaponData
  ): void {
    // Get or create projectile from pool
    const projectile = this.projectiles.get(
      startPos.x,
      startPos.y,
      weaponData.spriteKey
    ) as Phaser.Physics.Arcade.Sprite;

    if (!projectile) return;

    // Pooled sprites keep a disabled body; reset it at the spawn point
    projectile.enableBody(true, startPos.x, startPos.y, true, true);

    // Set projectile velocity
    const velocity = {
      x: Math.cos(angle) * weaponData.projectileSpeed,
      y: Math.sin(angle) * weaponData.projectileSpeed,
    };

    projectile.setVelocity(velocity.x, velocity.y);
    projectile.setRotation(angle);

    // Store weapon data on projectile
    projectile.setData("damage", weaponData.damage + this.bonusDamage);
    projectile.setData("knockback", 50); // Default knockback
    projectile.setData("range", weaponData.range);
    projectile.setData("startX", startPos.x);
    projectile.setData("startY", startPos.y);
  }

  /**
   * Update projectiles - remove out of range
   */
  private updateProjectiles(): void {
    this.projectiles.children.entries.forEach((projObj) => {
      const projectile = projObj as Phaser.Physics.Arcade.Sprite;
      if (!projectile.active) return;

      // Check if projectile is out of range
      const startX = projectile.getData("startX");
      const startY = projectile.getData("startY");
      const range = projectile.getData("range");

      const distance = MathUtils.distance(
        startX,
        startY,
        projectile.x,
        projectile.y
      );

      if (distance > range) {
        this.removeProjectile(projectile);
      }
    });
  }

  /**
   * Find nearest enemy to a position
   */
  private findNearestEnemy(
    pos: { x: number; y: number },
    enemies: Phaser.Physics.Arcade.Sprite[]
  ): Phaser.Physics.Arcade.Sprite | null {
    if (enemies.length === 0) return null;

    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let minDistance = Infinity;

    enemies.forEach((enemy) => {
      const dist = MathUtils.distance(pos.x, pos.y, enemy.x, enemy.y);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = enemy;
      }
    });

    return nearest;
  }

  /**
   * Remove a projectile
   */
  removeProjectile(projectile: Phaser.Physics.Arcade.Sprite): void {
    // Disable the body too, or hidden projectiles keep hitting enemies
    projectile.disableBody(true, true);
  }

  /**
   * Get projectile group for collision detection
   */
  getProjectileGroup(): Phaser.Physics.Arcade.Group {
    return this.projectiles;
  }

  /**
   * Get equipped weapons
   */
  getEquippedWeapons(): EquippedWeapon[] {
    return this.equippedWeapons;
  }

  /**
   * Remove a weapon by index
   */
  removeWeapon(index: number): void {
    if (index >= 0 && index < this.equippedWeapons.length) {
      const weapon = this.equippedWeapons.splice(index, 1)[0];
      console.log(`Removed ${weapon.type} weapon`);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.projectiles.clear(true, true);
    this.equippedWeapons = [];
  }
}
