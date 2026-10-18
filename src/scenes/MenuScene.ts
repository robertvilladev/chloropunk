import { SCENE_KEYS } from "@/config/constants";
import Phaser from "phaser";

/**
 * MenuScene - Main menu for the game
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    const title = this.add.text(width / 2, height / 3, "VEGGIE//VENDETTA", {
      fontSize: "48px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(
      width / 2,
      height / 3 + 60,
      "A Roguelike Adventure",
      {
        fontSize: "24px",
        color: "#cccccc",
      }
    );
    subtitle.setOrigin(0.5);

    // Start button
    const startButton = this.add.text(
      width / 2,
      height / 2 + 50,
      "START GAME",
      {
        fontSize: "32px",
        color: "#00ff00",
        backgroundColor: "#004400",
        padding: { x: 20, y: 10 },
      }
    );
    startButton.setOrigin(0.5);
    startButton.setInteractive({ useHandCursor: true });

    // Button hover effect
    startButton.on("pointerover", () => {
      startButton.setStyle({ color: "#ffffff", backgroundColor: "#00aa00" });
    });

    startButton.on("pointerout", () => {
      startButton.setStyle({ color: "#00ff00", backgroundColor: "#004400" });
    });

    // Start game on click
    startButton.on("pointerdown", () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => {
        this.scene.start(SCENE_KEYS.GAME, {}); // {} = fresh run (Phaser reuses old data otherwise)
      });
    });

    // Instructions
    const instructions = this.add.text(
      width / 2,
      height - 100,
      "Use WASD or Arrow Keys to move\nWeapons auto-fire at nearby enemies\nCollect scrap to buy upgrades",
      {
        fontSize: "16px",
        color: "#888888",
        align: "center",
      }
    );
    instructions.setOrigin(0.5);

    // Fade in
    this.cameras.main.fadeIn(300);

    console.log("✓ MenuScene: Ready");
  }
}
