import Phaser from "phaser";

interface ShopUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  stat: string;
  value: number;
}

/**
 * ShopManager - Handles shop upgrades and player progression
 */
export class ShopManager {
  private scene: Phaser.Scene;
  private purchasedUpgradeIds: Set<string> = new Set();
  private upgrades: ShopUpgrade[] = [
    {
      id: "health",
      name: "Max Health +20",
      description: "Increase maximum health",
      cost: 10,
      stat: "maxHealth",
      value: 20,
    },
    {
      id: "speed",
      name: "Speed +20",
      description: "Move faster",
      cost: 15,
      stat: "speed",
      value: 20,
    },
    {
      id: "damage",
      name: "Damage +5",
      description: "Deal more damage",
      cost: 20,
      stat: "damage",
      value: 5,
    },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Get available upgrades
   */
  getAvailableUpgrades(): ShopUpgrade[] {
    return this.upgrades;
  }

  /**
   * Purchase an upgrade
   */
  purchaseUpgrade(upgradeId: string, coinManager: any): boolean {
    const upgrade = this.upgrades.find((u) => u.id === upgradeId);
    if (!upgrade) return false;

    if (coinManager.spendCoins(upgrade.cost)) {
      // Track purchased upgrade
      this.purchasedUpgradeIds.add(upgradeId);
      // Apply the upgrade
      this.applyUpgrade(upgrade);
      console.log(`Purchased ${upgrade.name}`);
      return true;
    }

    return false;
  }

  /**
   * Get list of purchased upgrades
   */
  getPurchasedUpgrades(): ShopUpgrade[] {
    return this.upgrades.filter((u) => this.purchasedUpgradeIds.has(u.id));
  }

  /**
   * Apply upgrade to player stats
   */
  private applyUpgrade(upgrade: ShopUpgrade): void {
    // Emit event to update player stats
    this.scene.events.emit("upgradePurchased", {
      stat: upgrade.stat,
      value: upgrade.value,
    });
  }

  /**
   * Get upgrade by ID
   */
  getUpgrade(upgradeId: string): ShopUpgrade | undefined {
    return this.upgrades.find((u) => u.id === upgradeId);
  }
}
