import { SCENE_KEYS } from "@/config/constants";
import Phaser from "phaser";

/**
 * ShopScene - Between-wave shop for upgrades
 */
export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.SHOP });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Title
    const title = this.add.text(width / 2, 80, "SHOP", {
      fontSize: "42px",
      color: "#ffd700",
      fontStyle: "bold",
    });
    title.setOrigin(0.5);

    // Placeholder text
    const text = this.add.text(
      width / 2,
      height / 2,
      "Shop UI\n(Coming Soon)",
      {
        fontSize: "24px",
        color: "#ffffff",
        align: "center",
      }
    );
    text.setOrigin(0.5);

    console.log("✓ ShopScene: Initialized");
  }
}
