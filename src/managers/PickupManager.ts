import { fitBox } from "@/art/body";
import { GAME_CONFIG } from "@/config/constants";
import { outsideSolids } from "@/core/arena";
import { pickupDepth } from "@/core/depth";
import { streakRate } from "@/core/voices";
import { sfx } from "@/fx/sfx";
import type { Rect, Vector2 } from "@/types";
import Phaser from "phaser";

type Sprite = Phaser.Physics.Arcade.Sprite;
const PICKUP_SIZE = 16;
const STREAK_MS = 400; // pickups closer together than this raise the pickup sound's pitch

/**
 * PickupManager - pooled scrap pickups. Each scrap is worth `value` scrap
 * and `value` XP. Scrap near the player is pulled in (magnet).
 */
export class PickupManager {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;
  private streak = 0;
  private lastPickup = -Infinity;
  private solids: readonly Rect[];

  constructor(scene: Phaser.Scene, solids: readonly Rect[] = []) {
    this.solids = solids;
    this.scene = scene;
    this.group = scene.physics.add.group({
      defaultKey: "pickup_scrap",
      maxSize: GAME_CONFIG.MAX_PICKUPS,
    });
  }

  spawnScrap(dropX: number, dropY: number, amount: number): void {
    const { x, y } = outsideSolids({ x: dropX, y: dropY }, this.solids, PICKUP_SIZE / 2); // never inside a vent
    const s = this.group.get(x, y, "pickup_scrap", "0") as Sprite | null;
    if (!s) {
      // Pool exhausted: bank the value immediately rather than lose it
      this.scene.events.emit("scrapCollected", amount);
      return;
    }
    s.enableBody(true, x, y, true, true);
    fitBox(s, "pickup_scrap", PICKUP_SIZE, PICKUP_SIZE); // never the 2-frame strip base frame
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
    const now = this.scene.time.now;
    this.streak = now - this.lastPickup < STREAK_MS ? this.streak + 1 : 0;
    this.lastPickup = now;
    sfx("pickup", streakRate(this.streak));
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
