import { GAME_CONFIG } from "@/config/constants";
import { pickupDepth } from "@/core/depth";
import type { Vector2 } from "@/types";
import Phaser from "phaser";

type Sprite = Phaser.Physics.Arcade.Sprite;
const PICKUP_SIZE = 24;

/**
 * PickupManager - pooled scrap pickups. Each scrap is worth `value` scrap
 * and `value` XP. Scrap near the player is pulled in (magnet).
 */
export class PickupManager {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.group({
      defaultKey: "pickup_scrap",
      maxSize: GAME_CONFIG.MAX_PICKUPS,
    });
  }

  spawnScrap(x: number, y: number, amount: number): void {
    const s = this.group.get(x, y, "pickup_scrap", "0") as Sprite | null;
    if (!s) {
      // Pool exhausted: bank the value immediately rather than lose it
      this.scene.events.emit("scrapCollected", amount);
      return;
    }
    s.enableBody(true, x, y, true, true);
    (s.body as Phaser.Physics.Arcade.Body).setSize(PICKUP_SIZE, PICKUP_SIZE); // never the 48x24 strip base frame
    s.setDepth(pickupDepth(y));
    s.setVelocity(0, 0);
    s.setData("value", amount);
    s.play("pickup_scrap_spin", true);
  }

  /** Pull pickups within `radius` toward the player. */
  update(player: Vector2, radius: number): void {
    const r2 = radius * radius;
    const list = this.group.children.entries;
    for (let i = 0; i < list.length; i++) {
      const s = list[i] as Sprite;
      if (!s.active) continue;
      const dx = player.x - s.x;
      const dy = player.y - s.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 <= r2) {
        const k = GAME_CONFIG.MAGNET_SPEED / Math.sqrt(d2);
        s.setVelocity(dx * k, dy * k);
      }
    }
  }

  collect(s: Sprite): void {
    if (!s.active) return;
    const value = s.getData("value") as number;
    s.disableBody(true, true);
    this.scene.events.emit("scrapCollected", value);
  }

  /** Remove all pickups and return their total value (no events). */
  collectAll(): number {
    let total = 0;
    const list = this.group.children.entries;
    for (let i = 0; i < list.length; i++) {
      const s = list[i] as Sprite;
      if (!s.active) continue;
      total += s.getData("value") as number;
      s.disableBody(true, true);
    }
    return total;
  }

  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }
}
