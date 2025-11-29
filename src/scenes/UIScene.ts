import { DEPTH, SCENE_KEYS } from "@/config/constants";
import Phaser from "phaser";

/**
 * UIScene - Persistent UI overlay (HUD)
 * Runs parallel to GameScene to display health, coins, wave info, etc.
 */
export class UIScene extends Phaser.Scene {
  private healthText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

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

    // Top-center: Timer
    this.timerText = this.add.text(
      this.cameras.main.width / 2,
      20,
      "Time: 0:20",
      {
        fontSize: "24px",
        color: "#00ff00",
        backgroundColor: "#000000",
        padding: { x: 12, y: 6 },
      }
    );
    this.timerText.setOrigin(0.5, 0);
    this.timerText.setDepth(DEPTH.UI);

    // Listen for game events
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    if (gameScene) {
      gameScene.events.on('playerHealthChanged', this.updateHealth, this);
      gameScene.events.on('timerUpdate', this.updateTimer, this);
    }

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
   * Update timer display
   */
  updateTimer(timeRemaining: number) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    
    // Change color to red when less than 5 seconds
    if (timeRemaining <= 5) {
      this.timerText.setColor("#ff0000");
    } else {
      this.timerText.setColor("#00ff00");
    }
    
    this.timerText.setText(`Time: ${timeStr}`);
  }
}
