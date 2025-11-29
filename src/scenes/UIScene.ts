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
  private statsText!: Phaser.GameObjects.Text;
  private speedButtons: Phaser.GameObjects.Container[] = [];
  private gameSpeed: number = 1;

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

    // Top-left: Stats panel
    this.statsText = this.add.text(
      20,
      60,
      "Health: 100/100\nSpeed: 160\nDamage: 10\nCoins: 0",
      {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 8, y: 6 },
      }
    );
    this.statsText.setDepth(DEPTH.UI);

    // Top-right: Speed controls
    this.createSpeedControls();

    // Listen for game events
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    if (gameScene) {
      gameScene.events.on("playerHealthChanged", this.updateHealth, this);
      gameScene.events.on("timerUpdate", this.updateTimer, this);
      gameScene.events.on("coinCollected", this.updateCoins, this);
      gameScene.events.on("upgradePurchased", this.updateStats, this);
    }
  }

  /**
   * Create speed control buttons
   */
  private createSpeedControls(): void {
    const speeds = [1, 2, 3];
    const startX = this.cameras.main.width - 120;
    const y = this.cameras.main.height - 50;

    speeds.forEach((speed, index) => {
      const button = this.createSpeedButton(startX + index * 35, y, speed);
      this.speedButtons.push(button);
    });

    // Set up keyboard shortcuts once (outside button creation to avoid duplicates)
    speeds.forEach((speed) => {
      this.input.keyboard?.on(`keydown-${speed}`, () => {
        this.setGameSpeed(speed);
      });
    });

    // Set initial active button
    this.updateSpeedButtons();
  }

  /**
   * Create a speed control button
   */
  private createSpeedButton(
    x: number,
    y: number,
    speed: number
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, 30, 30, 0x444444);
    bg.setStrokeStyle(1, 0xffffff);

    // Speed text
    const speedText = this.add.text(0, 0, speed.toString(), {
      fontSize: "16px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    speedText.setOrigin(0.5);

    button.add([bg, speedText]);
    button.setSize(30, 30);
    button.setInteractive(
      new Phaser.Geom.Rectangle(-15, -15, 30, 30),
      Phaser.Geom.Rectangle.Contains
    );

    // Click handler
    button.on("pointerdown", () => {
      this.setGameSpeed(speed);
    });

    return button;
  }

  /**
   * Set game speed
   */
  private setGameSpeed(speed: number): void {
    this.gameSpeed = speed;
    this.updateSpeedButtons();

    // Emit event to game scene
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    if (gameScene) {
      gameScene.events.emit("speedChanged", speed);
    }
  }

  /**
   * Update speed button appearances
   */
  private updateSpeedButtons(): void {
    this.speedButtons.forEach((button, index) => {
      const speed = index + 1;
      const bg = button.list[0] as Phaser.GameObjects.Rectangle;

      if (speed === this.gameSpeed) {
        bg.setFillStyle(0x00ff00); // Active = green
      } else {
        bg.setFillStyle(0x444444); // Inactive = gray
      }
    });
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
  updateCoins(count: number): void {
    this.coinsText.setText(`💰 Coins: ${count}`);
  }

  /**
   * Update timer display
   */
  updateTimer(timeRemaining: number): void {
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

  /**
   * Update stats display
   */
  updateStats(upgrade: { stat: string; value: number }): void {
    // Fetch current player stats and update the display
    const gameScene = this.scene.get(SCENE_KEYS.GAME) as any; // Use 'any' if GameScene type is not imported
    if (gameScene && typeof gameScene.getPlayerStats === "function") {
      const stats = gameScene.getPlayerStats();
      this.statsText.setText(
        `Health: ${stats.health}/${stats.maxHealth}\nSpeed: ${stats.speed}\nDamage: ${stats.damage}\nCoins: ${stats.coins}`
      );
    } else {
      // Fallback: log the upgrade and warn about missing getPlayerStats
      console.log(`Stat upgraded: ${upgrade.stat} +${upgrade.value}`);
      console.warn("GameScene.getPlayerStats() not implemented.");
    }
  }
}
