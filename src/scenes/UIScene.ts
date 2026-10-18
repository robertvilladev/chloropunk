import { DEPTH, SCENE_KEYS } from "@/config/constants";
import { THEME, THEME_CSS } from "@/config/theme";
import type { GameScene } from "@/scenes/GameScene";
import Phaser from "phaser";

/**
 * UIScene - Persistent UI overlay (HUD)
 * Runs parallel to GameScene to display health, scrap, xp, wave info, etc.
 */
export class UIScene extends Phaser.Scene {
  private healthText!: Phaser.GameObjects.Text;
  private scrapText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private speedButtons: Phaser.GameObjects.Container[] = [];
  private gameSpeed: number = 1;

  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  create() {
    // Phaser reuses scene instances, so reset per-run fields
    this.speedButtons = [];
    this.gameSpeed = 1;

    // Top-left: Health
    this.healthText = this.add.text(20, 20, "❤ Health: 100/100", {
      fontSize: "18px",
      color: "#ff0000",
      backgroundColor: "#000000",
      padding: { x: 8, y: 4 },
    });
    this.healthText.setDepth(DEPTH.UI);

    // Top-right: Scrap
    this.scrapText = this.add.text(
      this.cameras.main.width - 20,
      20,
      "SCRAP: 0",
      {
        fontSize: "18px",
        color: THEME_CSS.lime,
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
      }
    );
    this.scrapText.setOrigin(1, 0);
    this.scrapText.setDepth(DEPTH.UI);

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
      "",
      {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 8, y: 6 },
      }
    );
    this.statsText.setDepth(DEPTH.UI);

    // Bottom-left: XP bar (pink) with level
    const barW = 300;
    this.add
      .rectangle(20, this.cameras.main.height - 30, barW, 12, THEME.line)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.UI);
    this.xpBar = this.add
      .rectangle(20, this.cameras.main.height - 30, barW, 12, THEME.pink)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.UI);
    this.levelText = this.add
      .text(20, this.cameras.main.height - 50, "LV 1", {
        fontSize: "16px",
        color: THEME_CSS.pink,
      })
      .setDepth(DEPTH.UI);

    // Top-right: Speed controls
    this.createSpeedControls();

    // Listen for game events
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    if (gameScene) {
      gameScene.events.on("playerHealthChanged", this.updateHealth, this);
      gameScene.events.on("timerUpdate", this.updateTimer, this);
      gameScene.events.on("scrapCollected", this.refresh, this);
      this.refresh();
    }
  }

  /**
   * Pull current values from GameScene (its initial events fire before this scene exists)
   */
  private refresh = (): void => {
    const stats = (this.scene.get(SCENE_KEYS.GAME) as GameScene).getPlayerStats();
    this.updateHealth(stats.health, stats.maxHealth);
    this.scrapText.setText(`SCRAP: ${stats.scrap}`);
    this.xpBar.width = 300 * (stats.xp / stats.xpNeeded);
    this.levelText.setText(
      `LV ${stats.level}${stats.pending > 0 ? ` (+${stats.pending})` : ""}`
    );
    const s = stats.stats;
    this.statsText.setText(
      `Wave: ${stats.wave}\nHP: ${stats.health}/${stats.maxHealth}\nArmor: ${s.armor}\nDodge: ${s.dodge}%\n` +
        `Dmg: ${s.damage}%\nAtk spd: ${s.attackSpeed}%\nCrit: ${s.crit}%\nSpeed: ${s.speed}%`
    );
  };

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
}
