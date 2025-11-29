import { SCENE_KEYS } from "@/config/constants";
import { CoinManager } from "@/managers/CoinManager";
import { ShopManager } from "@/managers/ShopManager";
import Phaser from "phaser";

/**
 * ShopScene - Between-wave shop for upgrades
 */
export class ShopScene extends Phaser.Scene {
  private coinManager!: CoinManager;
  private shopManager!: ShopManager;
  private coinText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.SHOP });
  }

  create(data: { coins?: number }) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Initialize managers
    this.coinManager = new CoinManager(this);
    this.coinManager.setCoinCount(data.coins || 0);
    this.shopManager = new ShopManager(this);

    // Title
    const title = this.add.text(width / 2, 60, "UPGRADE SHOP", {
      fontSize: "42px",
      color: "#ffd700",
      fontStyle: "bold",
    });
    title.setOrigin(0.5);

    // Coin display
    this.coinText = this.add.text(
      width - 20,
      20,
      `Coins: ${this.coinManager.getCoinCount()}`,
      {
        fontSize: "24px",
        color: "#ffd700",
        backgroundColor: "#000000",
        padding: { x: 10, y: 5 },
      }
    );
    this.coinText.setOrigin(1, 0);

    // Listen for coin updates
    this.events.on("coinCollected", (count: number) => {
      this.coinText.setText(`Coins: ${count}`);
    });

    // Create upgrade buttons
    this.createUpgradeButtons();

    // Start game button
    const startButton = this.createButton(
      width / 2,
      height - 60,
      "START NEXT ROUND",
      () => {
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.GAME, {
          upgrades: this.shopManager.getPurchasedUpgrades(),
          coins: this.coinManager.getCoinCount()
        });
      }
    );

    console.log("✓ ShopScene: Initialized");
  }

  private createUpgradeButtons(): void {
    const upgrades = this.shopManager.getAvailableUpgrades();
    const startY = 150;
    const spacing = 100;

    upgrades.forEach((upgrade, index) => {
      this.createUpgradeButton(
        this.cameras.main.width / 2,
        startY + index * spacing,
        upgrade
      );
    });
  }

  private createUpgradeButton(x: number, y: number, upgrade: any): void {
    const button = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, 300, 60, 0x444444);
    bg.setStrokeStyle(2, 0xffffff);

    // Upgrade name
    const nameText = this.add.text(0, -15, upgrade.name, {
      fontSize: "18px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    nameText.setOrigin(0.5);

    // Cost and description
    const costText = this.add.text(0, 5, `Cost: ${upgrade.cost} coins`, {
      fontSize: "14px",
      color: "#ffd700",
    });
    costText.setOrigin(0.5);

    const descText = this.add.text(0, 20, upgrade.description, {
      fontSize: "12px",
      color: "#cccccc",
    });
    descText.setOrigin(0.5);

    button.add([bg, nameText, costText, descText]);
    button.setSize(300, 60);
    button.setInteractive(
      new Phaser.Geom.Rectangle(-150, -30, 300, 60),
      Phaser.Geom.Rectangle.Contains
    );

    // Click handler
    button.on("pointerdown", () => {
      if (this.shopManager.purchaseUpgrade(upgrade.id, this.coinManager)) {
        // Success - update UI
        this.coinText.setText(`Coins: ${this.coinManager.getCoinCount()}`);
        // Could add visual feedback here
      } else {
        // Not enough coins - could add error message
        console.log("Not enough coins!");
      }
    });

    // Hover effects
    button.on("pointerover", () => {
      button.setScale(1.05);
      bg.setFillStyle(0x666666);
    });

    button.on("pointerout", () => {
      button.setScale(1.0);
      bg.setFillStyle(0x444444);
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, 200, 50, 0x228b22);
    bg.setStrokeStyle(2, 0xffffff);

    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontSize: "18px",
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

    // Hover effects
    button.on("pointerover", () => {
      button.setScale(1.05);
      bg.setFillStyle(0x32cd32);
    });

    button.on("pointerout", () => {
      button.setScale(1.0);
      bg.setFillStyle(0x228b22);
    });

    return button;
  }
}
