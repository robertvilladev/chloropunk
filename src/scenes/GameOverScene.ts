import { SCENE_KEYS } from "@/config/constants";
import Phaser from "phaser";

/**
 * GameOverScene - Displayed when player dies
 * Provides options to retry or return to main menu
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Semi-transparent background
    this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

    // Game Over title
    const titleText = this.add.text(width / 2, height / 3, "GAME OVER", {
      fontSize: "64px",
      color: "#ff0000",
      fontStyle: "bold",
    });
    titleText.setOrigin(0.5);

    // Subtitle
    const subtitleText = this.add.text(
      width / 2,
      height / 3 + 70,
      "You were defeated!",
      {
        fontSize: "24px",
        color: "#ffffff",
      }
    );
    subtitleText.setOrigin(0.5);

    // Retry button
    const retryButton = this.createButton(
      width / 2,
      height / 2 + 20,
      "TRY AGAIN",
      () => {
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.GAME);
      }
    );

    // Main menu button
    const menuButton = this.createButton(
      width / 2,
      height / 2 + 90,
      "MAIN MENU",
      () => {
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.MENU);
      }
    );

    // Add hover effects
    this.addButtonEffects(retryButton);
    this.addButtonEffects(menuButton);

    // ESC to menu
    this.input.keyboard?.once("keydown-ESC", () => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(SCENE_KEYS.MENU);
    });

    console.log("✓ GameOverScene: Initialized");
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
