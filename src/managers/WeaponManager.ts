import { DEPTH } from "@/config/constants";
import type { Rng } from "@/core/rng";
import { CRIT_MULT, weaponStats, type WeaponStats } from "@/core/weapons";
import { nearestInRange, slotOffset, spreadAngles } from "@/entities/weaponBehaviors";
import type { Juice } from "@/fx/Juice";
import type { OwnedWeapon, Stats, Tier, Vector2, WeaponDef } from "@/types";
import weaponDefs from "@assets/data/weapons.json";
import Phaser from "phaser";

type Sprite = Phaser.Physics.Arcade.Sprite;

export type HitFn = (
  enemy: Sprite,
  damage: number,
  crit: boolean,
  angle: number,
  knockback: number
) => void;

const MAX_PROJECTILES = 200;

interface Equipped {
  def: WeaponDef;
  tier: Tier;
  ws: WeaponStats;
  timer: number;
  offset: Vector2;
  sprite: Phaser.GameObjects.Image;
}

/**
 * WeaponManager - owned weapons sit around the player; each fires at the
 * nearest enemy in its range using its behaviour.
 */
export class WeaponManager {
  private scene: Phaser.Scene;
  private projectiles: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private equipped: Equipped[] = [];
  private rng!: Rng;
  private hit!: HitFn;
  private juice!: Juice;
  private angles: number[] = [];
  private slot: Vector2 = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.projectiles = scene.physics.add.group({
      defaultKey: "projectile_basic",
      maxSize: MAX_PROJECTILES,
    });
  }

  create(o: {
    weapons: OwnedWeapon[];
    stats: Stats;
    rng: Rng;
    enemyGroup: Phaser.Physics.Arcade.Group;
    hit: HitFn;
    juice: Juice;
  }): void {
    this.rng = o.rng;
    this.hit = o.hit;
    this.juice = o.juice;
    this.enemyGroup = o.enemyGroup;
    this.equipped = o.weapons.map((w, i) => {
      const def = (weaponDefs as Record<string, WeaponDef>)[w.id];
      return {
        def,
        tier: w.tier,
        ws: weaponStats(def, w.tier, o.stats),
        timer: 0,
        offset: slotOffset(i, o.weapons.length),
        sprite: this.scene.add.image(0, 0, `weapon_${def.id}`).setDepth(DEPTH.PLAYER + 1),
      };
    });
    this.scene.physics.add.overlap(this.projectiles, o.enemyGroup, (p, e) =>
      this.onProjectileHit(p as Sprite, e as Sprite)
    );
  }

  update(dtMs: number, player: Vector2, enemies: Sprite[]): void {
    const dt = dtMs / 1000;
    const slot = this.slot;
    for (let i = 0; i < this.equipped.length; i++) {
      const w = this.equipped[i];
      slot.x = player.x + w.offset.x;
      slot.y = player.y + w.offset.y;
      w.sprite.setPosition(slot.x, slot.y);
      w.timer += dt;
      const target = nearestInRange(slot, w.ws.range, enemies);
      if (!target) continue;
      const angle = Math.atan2(target.y - slot.y, target.x - slot.x);
      w.sprite.setRotation(angle);
      if (w.timer < w.ws.cooldown) continue;
      w.timer = 0;
      this.fire(w, slot, angle);
    }
    this.updateProjectiles();
  }

  /** Wave end: remove projectiles. */
  clear(): void {
    const list = this.projectiles.children.entries;
    for (let i = 0; i < list.length; i++) this.removeProjectile(list[i] as Sprite);
  }

  getProjectileGroup(): Phaser.Physics.Arcade.Group {
    return this.projectiles;
  }

  removeProjectile(projectile: Sprite): void {
    // Disable the body too, or hidden projectiles keep hitting enemies
    projectile.disableBody(true, true);
  }

  /** Scene shutdown: Phaser destroys the game objects. */
  destroy(): void {
    this.equipped = [];
  }

  // ---- behaviours ----

  private fire(w: Equipped, from: Vector2, angle: number): void {
    const p = w.def.params;
    switch (w.def.behavior) {
      case "projectile":
        this.shoot(w, from, angle, "projectile_basic");
        break;
      case "spread":
        for (const a of spreadAngles(angle, p.pellets, p.spread, this.angles)) {
          this.shoot(w, from, a, "proj_pellet");
        }
        break;
      case "explosive":
        this.shoot(w, from, angle, "proj_rocket");
        break;
      default:
        break; // beam, melee-arc, orbital: Task 4
    }
  }

  private rollCrit(w: Equipped): boolean {
    return this.rng.next() < w.ws.critChance;
  }

  private shoot(w: Equipped, from: Vector2, angle: number, key: string): void {
    const pr = this.projectiles.get(from.x, from.y, key) as Sprite | null;
    if (!pr) return;
    pr.setTexture(key);
    pr.enableBody(true, from.x, from.y, true, true);
    pr.setDepth(DEPTH.PROJECTILES);
    const speed = w.def.params.speed;
    pr.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    pr.setRotation(angle);
    const crit = this.rollCrit(w);
    pr.setData("w", w);
    pr.setData("damage", crit ? w.ws.damage * CRIT_MULT : w.ws.damage);
    pr.setData("crit", crit);
    pr.setData("pierce", w.def.params.pierce ?? 0);
    pr.setData("last", null);
    pr.setData("startX", from.x);
    pr.setData("startY", from.y);
  }

  private onProjectileHit(pr: Sprite, enemy: Sprite): void {
    if (!pr.active || !enemy.active || pr.getData("last") === enemy) return;
    const w = pr.getData("w") as Equipped;
    if (w.def.behavior === "explosive") {
      this.explode(pr, w);
      return;
    }
    const body = pr.body as Phaser.Physics.Arcade.Body;
    this.hit(
      enemy,
      pr.getData("damage"),
      pr.getData("crit"),
      Math.atan2(body.velocity.y, body.velocity.x),
      w.def.params.knockback
    );
    const pierce = pr.getData("pierce") as number;
    if (pierce <= 0) this.removeProjectile(pr);
    else {
      pr.setData("pierce", pierce - 1);
      pr.setData("last", enemy);
    }
  }

  /** Rocket blast: every enemy within blastRadius takes the hit once. */
  private explode(pr: Sprite, w: Equipped): void {
    const { x, y } = pr;
    const r = w.def.params.blastRadius;
    const damage = pr.getData("damage") as number;
    const crit = pr.getData("crit") as boolean;
    this.removeProjectile(pr);
    this.juice.blast(x, y, r);
    const list = this.enemyGroup.children.entries;
    for (let i = 0; i < list.length; i++) {
      const e = list[i] as Sprite;
      if (!e.active) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= r * r) {
        this.hit(e, damage, crit, Math.atan2(dy, dx), w.def.params.knockback);
      }
    }
  }

  /** Out of range: rockets explode, everything else disappears. */
  private updateProjectiles(): void {
    const list = this.projectiles.children.entries;
    for (let i = 0; i < list.length; i++) {
      const pr = list[i] as Sprite;
      if (!pr.active) continue;
      const w = pr.getData("w") as Equipped;
      const dx = pr.x - pr.getData("startX");
      const dy = pr.y - pr.getData("startY");
      if (dx * dx + dy * dy <= w.ws.range * w.ws.range) continue;
      if (w.def.behavior === "explosive") this.explode(pr, w);
      else this.removeProjectile(pr);
    }
  }
}
