import { SCENE_KEYS } from "@/config/constants";
import { InputManager } from "@/managers/InputManager";
import { PlayerManager } from "@/managers/PlayerManager";
import { WaveManager } from "@/managers/WaveManager";
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

    // 5. Set up scene controls
    this.setupSceneControls();

    // 6. Launch UI overlay
    this.scene.launch(SCENE_KEYS.UI);

    console.log("✓ GameScene: Initialized with modular architecture");
  }

  /**
   * Game loop - runs every frame (60 FPS)
   */
  update(_time: number, delta: number) {
    // 1. Get input
    const movement = this.inputManager.getMovementInput();

    // 2. Update player
    this.playerManager.update(movement.x, movement.y);

    // 3. Update wave system
    this.waveManager.update(delta);

    // 4. Update UI (via events)
    this.updateUI();

    // TODO: Add more systems here as needed:
    // - Enemy AI updates
    // - Weapon system updates
    // - Collision checks
    // - Particle effects
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
      // Send updates to UI
      // uiScene.events.emit('updateHealth', currentHealth, maxHealth);
      // uiScene.events.emit('updateCoins', coins);
      // uiScene.events.emit('updateWave', waveNumber, timeRemaining);
    }
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
