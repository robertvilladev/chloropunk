import Phaser from "phaser";
import type { RunState } from "@/types";

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

  constructor(_scene: Phaser.Scene) {}

  /**
   * Get available upgrades
   */
  getAvailableUpgrades(): ShopUpgrade[] {
    return this.upgrades;
  }

  /**
   * Purchase an upgrade
   */
  purchaseUpgrade(upgradeId: string, run: RunState): boolean {
    const upgrade = this.upgrades.find((u) => u.id === upgradeId);
    if (!upgrade) return false;

    if (run.scrap < upgrade.cost) return false;
    run.scrap -= upgrade.cost;
    console.log(`Purchased ${upgrade.name}`);
    return true;
  }

  /**
   * Get upgrade by ID
   */
  getUpgrade(upgradeId: string): ShopUpgrade | undefined {
    return this.upgrades.find((u) => u.id === upgradeId);
  }
}
