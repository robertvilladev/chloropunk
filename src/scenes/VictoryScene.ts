import { SCENE_KEYS } from "@/config/constants";
import Phaser from "phaser";

/**
 * VictoryScene - Displayed when player completes the round
 * Shows stats and provides options to continue or return to menu
 */
export class VictoryScene extends Phaser.Scene {
  private enemiesKilled: number = 0;
  private coinsEarned: number = 0;

  constructor() {
    super({ key: SCENE_KEYS.VICTORY });
  }

  init(data: { enemiesKilled?: number; coinsEarned?: number }) {
    this.enemiesKilled = data.enemiesKilled || 0;
    this.coinsEarned = data.coinsEarned || 0;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Semi-transparent background
    this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

    // Victory title
    const titleText = this.add.text(width / 2, height / 3, "ROUND COMPLETE!", {
      fontSize: "56px",
      color: "#00ff00",
      fontStyle: "bold",
    });
    titleText.setOrigin(0.5);

    // Stats
    const statsY = height / 2 - 40;
    this.add
      .text(width / 2, statsY, `Enemies Defeated: ${this.enemiesKilled}`, {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, statsY + 35, `Coins Earned: ${this.coinsEarned}`, {
        fontSize: "24px",
        color: "#ffd700",
      })
      .setOrigin(0.5);

    // Continue button
    const continueButton = this.createButton(
      width / 2,
      height / 2 + 80,
      "CONTINUE",
      () => {
        // Go to shop scene
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.SHOP);
      }
    );

    // Main menu button
    const menuButton = this.createButton(
      width / 2,
      height / 2 + 150,
      "MAIN MENU",
      () => {
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.MENU);
      }
    );

    // Add hover effects
    this.addButtonEffects(continueButton);
    this.addButtonEffects(menuButton);

    console.log("✓ VictoryScene: Initialized");
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, 200, 50, 0x444444);
    bg.setStrokeStyle(2, 0xffffff);

    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    buttonText.setOrigin(0.5);

    button.add([bg, buttonText]);
    button.setSize(200, 50);
    button.setInteractive(
      new Phaser.Geom.Rectangle(-100, -25, 200, 50),
      Phaser.Geom.Rectangle.Contains
    );

    button.on("pointerdown", callback);

    return button;
  }

  private addButtonEffects(button: Phaser.GameObjects.Container): void {
    button.on("pointerover", () => {
      button.setScale(1.1);
      const bg = button.list[0] as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(0x666666);
    });

    button.on("pointerout", () => {
      button.setScale(1.0);
      const bg = button.list[0] as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(0x444444);
    });
  }
}
