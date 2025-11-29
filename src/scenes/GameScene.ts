import { SCENE_KEYS } from "@/config/constants";
import { EnemyManager } from "@/managers/EnemyManager";
import { InputManager } from "@/managers/InputManager";
import { PlayerManager } from "@/managers/PlayerManager";
import { WaveManager } from "@/managers/WaveManager";
import { WeaponManager } from "@/managers/WeaponManager";
import { WorldManager } from "@/managers/WorldManager";
import Phaser from "phaser";

/**
 * GameScene - Main gameplay scene
 * This scene orchestrates all managers and systems
 *
 * Architecture:
 * - Managers handle specific domains (player, input, waves, etc.)
 * - GameScene coordinates between managers
 * - Keep create() clean and focused on initialization
 */
export class GameScene extends Phaser.Scene {
  // Managers - each handles a specific domain
  private playerManager!: PlayerManager;
  private inputManager!: InputManager;
  private waveManager!: WaveManager;
  private worldManager!: WorldManager;
  private enemyManager!: EnemyManager;
  private weaponManager!: WeaponManager;

  // Round timer
  private roundTimeRemaining: number = 20; // 20 seconds for testing
  private roundDuration: number = 20;
  
  // Stats tracking
  private enemiesKilled: number = 0;
  private coinsEarned: number = 0;
  private isGameOver: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  /**
   * Initialize the game - create all managers and systems
   */
  create() {
    // 1. Create world/environment
    this.worldManager = new WorldManager(this);
    this.worldManager.create();

    // 2. Initialize input handling
    this.inputManager = new InputManager(this);
    this.inputManager.create();

    // 3. Create player
    this.playerManager = new PlayerManager(this);
    this.playerManager.create();

    // 4. Initialize wave system
    this.waveManager = new WaveManager(this);
    this.waveManager.create();
    this.waveManager.startWave(1); // Start first wave

    // 5. Initialize enemy system
    this.enemyManager = new EnemyManager(this);
    this.enemyManager.create();

    // 6. Initialize weapon system
    this.weaponManager = new WeaponManager(this);
    this.weaponManager.create();

    // 7. Set up collision detection
    this.setupCollisions();

    // 8. Set up scene controls
    this.setupSceneControls();

    // 9. Launch UI overlay
    this.scene.launch(SCENE_KEYS.UI);

    // 10. Initialize round timer
    this.roundTimeRemaining = this.roundDuration;
    this.enemiesKilled = 0;
    this.coinsEarned = 0;
    this.isGameOver = false;

    // Listen for player death
    this.events.on('playerDied', this.onPlayerDeath, this);
    
    // Listen for enemy kills
    this.events.on('enemyKilled', this.onEnemyKilled, this);

    console.log("✓ GameScene: Initialized with modular architecture");
  }

  /**
   * Game loop - runs every frame (60 FPS)
   */
  update(_time: number, delta: number) {
    // Don't update if game is over
    if (this.isGameOver) return;

    // Update round timer
    this.roundTimeRemaining -= delta / 1000;
    if (this.roundTimeRemaining <= 0) {
      this.roundTimeRemaining = 0;
      this.onRoundComplete();
      return;
    }

    // 1. Get input
    const movement = this.inputManager.getMovementInput();

    // 2. Update player
    this.playerManager.update(movement.x, movement.y, delta);

    // 3. Update enemy system
    this.enemyManager.update(delta, this.playerManager.getPosition());

    // 4. Update weapon system
    this.weaponManager.update(
      delta,
      this.playerManager.getPosition(),
      this.enemyManager.getEnemies()
    );

    // 5. Update wave system
    this.waveManager.update(delta);

    // 6. Update UI (via events)
    this.updateUI();
  }

  /**
   * Set up collision detection between game entities
   */
  private setupCollisions(): void {
    // Player <-> Enemy collisions (player takes damage)
    this.physics.add.overlap(
      this.playerManager.getSprite(),
      this.enemyManager.getEnemyGroup(),
      (_playerObj, enemyObj) => {
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
        const damage = enemy.getData("damage") || 5;
        this.playerManager.takeDamage(damage);
      },
      undefined,
      this
    );

    // Projectile <-> Enemy collisions (enemy takes damage)
    this.physics.add.overlap(
      this.weaponManager.getProjectileGroup(),
      this.enemyManager.getEnemyGroup(),
      (projectileObj, enemyObj) => {
        const projectile = projectileObj as Phaser.Physics.Arcade.Sprite;
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;

        const damage = projectile.getData("damage") || 10;
        const knockback = projectile.getData("knockback") || 0;

        // Apply knockback
        if (knockback > 0) {
          const angle = Math.atan2(
            enemy.y - projectile.y,
            enemy.x - projectile.x
          );
          enemy.setVelocity(
            Math.cos(angle) * knockback,
            Math.sin(angle) * knockback
          );
        }

        // Damage enemy
        this.enemyManager.damageEnemy(enemy, damage);

        // Remove projectile
        this.weaponManager.removeProjectile(projectile);
      },
      undefined,
      this
    );
  }

  /**
   * Set up scene-level controls (ESC to menu, etc.)
   */
  private setupSceneControls(): void {
    this.inputManager.onKeyPress("ESC", () => {
      this.cleanup();
      this.scene.start(SCENE_KEYS.MENU);
    });
  }

  /**
   * Update UI scene with current game state
   */
  private updateUI(): void {
    const uiScene = this.scene.get(SCENE_KEYS.UI);
    if (uiScene && uiScene.scene.isActive()) {
      // Send timer update
      this.events.emit('timerUpdate', this.roundTimeRemaining);
      // Other UI updates happen via events from managers
    }
  }

  /**
   * Handle player death
   */
  private onPlayerDeath(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    
    console.log('Game Over!');
    this.scene.pause();
    this.scene.launch(SCENE_KEYS.GAME_OVER);
  }

  /**
   * Handle round completion
   */
  private onRoundComplete(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    console.log('Round Complete!');
    this.scene.pause();
    this.scene.launch(SCENE_KEYS.VICTORY, {
      enemiesKilled: this.enemiesKilled,
      coinsEarned: this.coinsEarned,
    });
  }

  /**
   * Handle enemy killed
   */
  private onEnemyKilled(coinValue: number, _expValue: number): void {
    this.enemiesKilled++;
    this.coinsEarned += coinValue;
  }

  /**
   * Cleanup when leaving scene
   */
  private cleanup(): void {
    this.playerManager?.destroy();
    this.waveManager?.destroy();
    this.worldManager?.destroy();
    this.inputManager?.destroy();
  }

  /**
   * Called when scene is shut down
   */
  shutdown(): void {
    this.cleanup();
  }
}
