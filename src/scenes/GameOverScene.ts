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

  private complete = false;

  init(data: { complete?: boolean }) {
    this.complete = !!data.complete;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Semi-transparent background
    this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

    // Game Over title
    const titleText = this.add.text(width / 2, height / 3, this.complete ? "RUN COMPLETE" : "GAME OVER", {
      fontSize: "64px",
      color: this.complete ? "#00ff00" : "#ff0000",
      fontStyle: "bold",
    });
    titleText.setOrigin(0.5);

    // Subtitle
    const subtitleText = this.add.text(
      width / 2,
      height / 3 + 70,
      this.complete ? "You cleared every wave!" : "You were defeated!",
      {
        fontSize: "24px",
        color: "#ffffff",
      }
    );
    subtitleText.setOrigin(0.5);

    // Retry button
    const retryButton = this.add.text(
      width / 2,
      height / 2 + 20,
      "TRY AGAIN",
      {
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#444444",
        padding: { x: 20, y: 10 },
        fontStyle: "bold",
      }
    );
    retryButton.setOrigin(0.5);
    retryButton.setInteractive({ useHandCursor: true });

    // Retry button hover effects
    retryButton.on("pointerover", () => {
      retryButton.setStyle({ backgroundColor: "#666666" });
    });
    retryButton.on("pointerout", () => {
      retryButton.setStyle({ backgroundColor: "#444444" });
    });

    // Retry button click
    retryButton.on("pointerdown", () => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(SCENE_KEYS.GAME, {}); // {} = fresh run (Phaser reuses old data otherwise)
    });

    // Main menu button
    const menuButton = this.add.text(
      width / 2,
      height / 2 + 90,
      "MAIN MENU",
      {
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#444444",
        padding: { x: 15, y: 8 },
      }
    );
    menuButton.setOrigin(0.5);
    menuButton.setInteractive({ useHandCursor: true });

    // Menu button hover effects
    menuButton.on("pointerover", () => {
      menuButton.setStyle({ backgroundColor: "#666666" });
    });
    menuButton.on("pointerout", () => {
      menuButton.setStyle({ backgroundColor: "#444444" });
    });

    // Menu button click
    menuButton.on("pointerdown", () => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(SCENE_KEYS.MENU);
    });

    // ESC to menu
    this.input.keyboard?.once("keydown-ESC", () => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(SCENE_KEYS.MENU);
    });

    console.log("✓ GameOverScene: Initialized");
  }
}
