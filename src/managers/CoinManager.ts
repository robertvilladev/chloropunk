import Phaser from "phaser";

/**
 * CoinManager - Handles coin spawning, collection, and management
 */
export class CoinManager {
  private scene: Phaser.Scene;
  private coins: Phaser.Physics.Arcade.Group;
  private coinCount: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.coins = this.scene.physics.add.group({
      defaultKey: "coin",
      maxSize: 50,
    });
  }

  /**
   * Initialize coin system
   */
  create(): void {
    console.log("✓ CoinManager: Initialized");
  }

  /**
   * Spawn a coin at the specified position
   */
  spawnCoin(x: number, y: number, value: number = 1): void {
    const coin = this.coins.get(x, y, "coin") as Phaser.Physics.Arcade.Sprite;

    if (!coin) return;

    coin.enableBody(true, x, y, true, true);
    coin.setData("value", value);

    // Add slight random movement
    coin.setVelocity(
      Phaser.Math.Between(-50, 50),
      Phaser.Math.Between(-50, 50)
    );

    // Auto-remove after 10 seconds
    this.scene.time.delayedCall(10000, () => {
      if (coin.active) {
        this.removeCoin(coin);
      }
    });
  }

  /**
   * Collect a coin
   */
  collectCoin(coin: Phaser.Physics.Arcade.Sprite): void {
    const value = coin.getData("value") || 1;
    this.coinCount += value;

    // Emit event for UI update
    this.scene.events.emit("coinCollected", this.coinCount);

    this.removeCoin(coin);
  }

  /**
   * Remove a coin
   */
  removeCoin(coin: Phaser.Physics.Arcade.Sprite): void {
    // Disable the body too, or hidden coins keep getting collected
    coin.disableBody(true, true);
  }

  /**
   * Get coin group for collision detection
   */
  getCoinGroup(): Phaser.Physics.Arcade.Group {
    return this.coins;
  }

  /**
   * Get current coin count
   */
  getCoinCount(): number {
    return this.coinCount;
  }

  /**
   * Spend coins (returns true if successful)
   */
  spendCoins(amount: number): boolean {
    if (this.coinCount >= amount) {
      this.coinCount -= amount;
      this.scene.events.emit("coinCollected", this.coinCount);
      return true;
    }
    return false;
  }

  /**
   * Set coin count (used when transferring state between scenes)
   */
  setCoinCount(count: number): void {
    this.coinCount = count;
    this.scene.events.emit("coinCollected", this.coinCount);
  }

  /**
   * Reset coin count
   */
  resetCoins(): void {
    this.coinCount = 0;
    this.scene.events.emit("coinCollected", this.coinCount);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.coins.clear(true, true);
  }
}
