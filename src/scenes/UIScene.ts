import { DEPTH, SCENE_KEYS } from "@/config/constants";
import Phaser from "phaser";

/**
 * UIScene - Persistent UI overlay (HUD)
 * Runs parallel to GameScene to display health, coins, wave info, etc.
 */
export class UIScene extends Phaser.Scene {
  private healthText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  create() {
    // Top-left: Health
    this.healthText = this.add.text(20, 20, "❤ Health: 100/100", {
      fontSize: "18px",
      color: "#ff0000",
      backgroundColor: "#000000",
      padding: { x: 8, y: 4 },
    });
    this.healthText.setDepth(DEPTH.UI);

    // Top-right: Coins
    this.coinsText = this.add.text(
      this.cameras.main.width - 20,
      20,
      "💰 Coins: 0",
      {
        fontSize: "18px",
        color: "#ffd700",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
      }
    );
    this.coinsText.setOrigin(1, 0);
    this.coinsText.setDepth(DEPTH.UI);

    // Bottom-center: Wave info
    this.waveText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 30,
      "Wave 1 - 0:30",
      {
        fontSize: "20px",
        color: "#00ff00",
        backgroundColor: "#000000",
        padding: { x: 12, y: 6 },
      }
    );
    this.waveText.setOrigin(0.5);
    this.waveText.setDepth(DEPTH.UI);

    console.log("✓ UIScene: HUD initialized");
  }

  /**
   * Update health display
   */
  updateHealth(current: number, max: number) {
    this.healthText.setText(`❤ Health: ${current}/${max}`);
  }

  /**
   * Update coins display
   */
  updateCoins(amount: number) {
    this.coinsText.setText(`💰 Coins: ${amount}`);
  }

  /**
   * Update wave display
   */
  updateWave(waveNumber: number, timeRemaining: number) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    this.waveText.setText(`Wave ${waveNumber} - ${timeStr}`);
  }
}
