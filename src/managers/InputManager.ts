import Phaser from "phaser";

/**
 * InputManager - Handles all keyboard/mouse input
 * Separates input logic from player/game logic
 */
export class InputManager {
  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  /** Dev: when set, replaces the keyboard as the movement source. */
  autopilot: (() => { x: number; y: number }) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Initialize input listeners
   */
  create(): void {
    // Set up cursor keys (arrow keys)
    this.cursors = this.scene.input.keyboard!.createCursorKeys();

    // Set up WASD keys
    this.wasd = {
      W: this.scene.input.keyboard!.addKey("W"),
      A: this.scene.input.keyboard!.addKey("A"),
      S: this.scene.input.keyboard!.addKey("S"),
      D: this.scene.input.keyboard!.addKey("D"),
    };

    console.log("✓ InputManager: Input initialized");
  }

  /**
   * Get movement input as normalized vector
   * Returns {x: -1 to 1, y: -1 to 1}
   */
  getMovementInput(): { x: number; y: number } {
    if (this.autopilot) return this.autopilot();
    let x = 0;
    let y = 0;

    // Horizontal input
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      x = -1;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      x = 1;
    }

    // Vertical input
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      y = -1;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      y = 1;
    }

    return { x, y };
  }

  /**
   * Check if a specific key is pressed
   */
  isKeyDown(key: string): boolean {
    const keyObj = this.scene.input.keyboard!.addKey(key);
    return keyObj.isDown;
  }

  /**
   * Register a callback for a specific key press
   */
  onKeyPress(key: string, callback: () => void): void {
    this.scene.input.keyboard!.on(`keydown-${key}`, callback);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Phaser handles cleanup automatically
  }
}
