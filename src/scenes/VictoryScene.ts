import wavesData from "@assets/data/waves.json";
import { SCENE_KEYS } from "@/config/constants";
import type { RunState } from "@/types";
import Phaser from "phaser";
/**
 * VictoryScene - Displayed when player completes the round
 * Shows stats and provides options to continue or return to menu
 */
export class VictoryScene extends Phaser.Scene {
  private enemiesKilled: number = 0;
  private scrapEarned: number = 0;
  private run?: RunState;
  constructor() {
    super({ key: SCENE_KEYS.VICTORY });
  }
  init(data: { enemiesKilled?: number; scrapEarned?: number; run?: RunState }) {
    this.run = data.run;
    this.enemiesKilled = data.enemiesKilled || 0;
    this.scrapEarned = data.scrapEarned || 0;
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
      .text(width / 2, statsY + 35, `Scrap Earned: ${this.scrapEarned}`, {
        fontSize: "24px",
        color: "#ffd700",
      })
      .setOrigin(0.5);
    // Continue button
    const continueButton = this.add.text(
      width / 2,
      height / 2 + 80,
      "CONTINUE",
      {
        fontSize: "24px",
        color: "#00ff00",
        backgroundColor: "#004400",
        padding: { x: 20, y: 10 },
        fontStyle: "bold",
      }
    );
    continueButton.setOrigin(0.5);
    continueButton.setInteractive({ useHandCursor: true });
    // Continue button hover effects
    continueButton.on("pointerover", () => {
      continueButton.setStyle({ color: "#ffffff", backgroundColor: "#00aa00" });
    });
    continueButton.on("pointerout", () => {
      continueButton.setStyle({ color: "#00ff00", backgroundColor: "#004400" });
    });
    // Continue button click
    continueButton.on("pointerdown", () => {
      this.scene.stop(SCENE_KEYS.UI);
      // Past the last defined wave the run is over (real end flow lands in M4)
      if (this.run && this.run.wave > wavesData.waves.length) {
        this.scene.start(SCENE_KEYS.GAME_OVER, { complete: true });
        return;
      }
      // One pick per level gained, then the shop
      const next = this.run && this.run.pendingLevelUps > 0 ? SCENE_KEYS.LEVEL_UP : SCENE_KEYS.SHOP;
      this.scene.start(next, { run: this.run });
    });
    // Main menu button
    const menuButton = this.add.text(width / 2, height / 2 + 150, "MAIN MENU", {
      fontSize: "20px",
      color: "#ffffff",
      backgroundColor: "#444444",
      padding: { x: 15, y: 8 },
    });
    menuButton.setOrigin(0.5);
    menuButton.setInteractive({ useHandCursor: true });
    // Menu button hover effects
    menuButton.on("pointerover", () => {
      menuButton.setStyle({ color: "#ffffff", backgroundColor: "#666666" });
    });
    menuButton.on("pointerout", () => {
      menuButton.setStyle({ color: "#ffffff", backgroundColor: "#444444" });
    });
    // Menu button click
    menuButton.on("pointerdown", () => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(SCENE_KEYS.MENU);
    });
    console.log("✓ VictoryScene: Initialized");
  }
}
