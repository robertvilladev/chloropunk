import { GAME_CONFIG, SCENE_KEYS } from "@/config/constants";
import { CoinManager } from "@/managers/CoinManager";
import { EnemyManager } from "@/managers/EnemyManager";
import { InputManager } from "@/managers/InputManager";
import { PlayerManager } from "@/managers/PlayerManager";
import { WaveManager } from "@/managers/WaveManager";
import { WeaponManager } from "@/managers/WeaponManager";
import { WorldManager } from "@/managers/WorldManager";
import type { RunState } from "@/types";
import Phaser from "phaser";

// Custom events emitted on this scene; listeners are removed on shutdown
// because Phaser keeps scene.events listeners across restarts
const GAME_EVENTS = [
  "playerDied",
  "enemyKilled",
  "coinCollected",
  "speedChanged",
  "playerHealthChanged",
  "timerUpdate",
];

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
  private coinManager!: CoinManager;

  // Round timer
  private roundTimeRemaining: number = 20; // 20 seconds for testing
  private roundDuration: number = 20;

  // Game speed control
  private gameSpeed: number = 1;

  // Stats tracking
  private enemiesKilled: number = 0;
  private isGameOver: boolean = false;

  // Persistent run state (wave, scrap, xp, upgrades)
  private run!: RunState;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  /**
   * Receive run state from the shop; no data means a fresh run
   */
  init(data: { run?: RunState }) {
    this.run = data.run ?? {
      wave: 1,
      scrap: 0,
      xp: 0,
      level: 1,
      pendingLevelUps: 0,
      bonus: { maxHealth: 0, speed: 0, damage: 0 },
      seed: Date.now(),
    };
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
    this.playerManager.create(
      100 + this.run.bonus.maxHealth,
      GAME_CONFIG.INITIAL_PLAYER_SPEED + this.run.bonus.speed
    );

    // 4. Initialize wave system
    this.waveManager = new WaveManager(this);
    this.waveManager.create();
    this.waveManager.startWave(this.run.wave);

    // 5. Initialize enemy system
    this.enemyManager = new EnemyManager(this);
    this.enemyManager.create();

    // 6. Initialize weapon system
    this.weaponManager = new WeaponManager(this);
    this.weaponManager.create(this.run.bonus.damage);

    // 7. Initialize coin system
    this.coinManager = new CoinManager(this);
    this.coinManager.create();
    this.coinManager.setCoinCount(this.run.scrap);

    // 8. Set up collision detection
    this.setupCollisions();

    // 9. Set up scene controls
    this.setupSceneControls();

    // 10. Launch UI overlay
    this.scene.launch(SCENE_KEYS.UI);

    // 10. Initialize round timer
    this.roundTimeRemaining = this.roundDuration;
    this.enemiesKilled = 0;
    this.gameSpeed = 1;
    this.isGameOver = false;

    // Listen for player death
    this.events.on("playerDied", this.onPlayerDeath, this);

    // Listen for enemy kills
    this.events.on("enemyKilled", this.onEnemyKilled, this);

    // Listen for speed changes
    this.events.on("speedChanged", this.onSpeedChanged, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    console.log("✓ GameScene: Initialized with modular architecture");
  }

  /**
   * Game loop - runs every frame (60 FPS)
   */
  update(_time: number, delta: number) {
    // Don't update if game is over
    if (this.isGameOver) return;

    // Update round timer
    this.roundTimeRemaining -= (delta / 1000) * this.gameSpeed;
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
    this.enemyManager.update(
      delta * this.gameSpeed,
      this.playerManager.getPosition()
    );

    // 4. Update weapon system
    this.weaponManager.update(
      delta * this.gameSpeed,
      this.playerManager.getPosition(),
      this.enemyManager.getEnemies()
    );

    // 5. Update wave system
    this.waveManager.update(delta * this.gameSpeed);

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

    // Player <-> Coin collisions (collect coins)
    this.physics.add.overlap(
      this.playerManager.getSprite(),
      this.coinManager.getCoinGroup(),
      (_playerObj, coinObj) => {
        const coin = coinObj as Phaser.Physics.Arcade.Sprite;
        this.coinManager.collectCoin(coin);
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
      this.scene.stop(SCENE_KEYS.UI);
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
      this.events.emit("timerUpdate", this.roundTimeRemaining);
      // Other UI updates happen via events from managers
    }
  }

  /**
   * Handle player death
   */
  private onPlayerDeath(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    console.log("Game Over!");
    this.scene.pause();
    this.scene.launch(SCENE_KEYS.GAME_OVER);
  }

  /**
   * Handle round completion
   */
  private onRoundComplete(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    console.log("Round Complete!");
    const scrap = this.coinManager.getCoinCount();
    const scrapEarned = scrap - this.run.scrap;
    this.scene.pause();
    this.scene.launch(SCENE_KEYS.VICTORY, {
      enemiesKilled: this.enemiesKilled,
      scrapEarned,
      run: { ...this.run, wave: this.run.wave + 1, scrap },
    });
  }

  /**
   * Handle enemy killed
   */
  private onEnemyKilled(
    coinValue: number,
    _expValue: number,
    enemyX: number,
    enemyY: number
  ): void {
    this.enemiesKilled++;

    // Spawn coin at enemy position
    this.coinManager.spawnCoin(enemyX, enemyY, coinValue);
  }

  /**
   * Handle speed change
   */
  private onSpeedChanged(speed: number): void {
    this.gameSpeed = speed;
    console.log(`Game speed changed to ${speed}x`);
  }

  /**
   * Cleanup when leaving scene
   */
  private cleanup(): void {
    this.playerManager?.destroy();
    this.waveManager?.destroy();
    this.worldManager?.destroy();
    this.inputManager?.destroy();
    GAME_EVENTS.forEach((event) => this.events.removeAllListeners(event));
  }

  /**
   * Current player stats for the HUD
   */
  getPlayerStats() {
    return {
      wave: this.run.wave,
      health: this.playerManager.getHealth(),
      maxHealth: this.playerManager.getMaxHealth(),
      speed: this.playerManager.getSpeed(),
      damage: this.weaponManager.getDamage(),
      scrap: this.coinManager.getCoinCount(),
    };
  }
}
