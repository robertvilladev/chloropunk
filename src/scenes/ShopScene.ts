import { SCENE_KEYS } from "@/config/constants";
import type { RunState } from "@/types";
import Phaser from "phaser";

/**
 * ShopScene - Between-wave shop for upgrades
 */
export class ShopScene extends Phaser.Scene {
  private scrapText!: Phaser.GameObjects.Text;
  private run!: RunState;

  constructor() {
    super({ key: SCENE_KEYS.SHOP });
  }

  create(data: { run: RunState }) {
    this.run = data.run;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Title
    const title = this.add.text(width / 2, 60, "SHOP", {
      fontSize: "42px",
      color: "#ffd700",
      fontStyle: "bold",
    });
    title.setOrigin(0.5);

    // Scrap display
    this.scrapText = this.add.text(
      width - 20,
      20,
      `Scrap: ${this.run.scrap}`,
      {
        fontSize: "24px",
        color: "#ffd700",
        backgroundColor: "#000000",
        padding: { x: 10, y: 5 },
      }
    );
    this.scrapText.setOrigin(1, 0);

    // Start game button
    const startButton = this.add.text(
      width / 2,
      height - 60,
      "START NEXT ROUND",
      {
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#228b22",
        padding: { x: 20, y: 10 },
        fontStyle: "bold",
      }
    );
    startButton.setOrigin(0.5);
    startButton.setInteractive({ useHandCursor: true });

    // Start button hover effects
    startButton.on("pointerover", () => {
      startButton.setStyle({ backgroundColor: "#32cd32" });
    });
    startButton.on("pointerout", () => {
      startButton.setStyle({ backgroundColor: "#228b22" });
    });

    // Start button click
    startButton.on("pointerdown", () => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(SCENE_KEYS.GAME, {
        run: { ...this.run },
      });
    });

    console.log("✓ ShopScene: Initialized");
  }
}
