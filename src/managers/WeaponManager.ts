import { ART_SCALE, feetOffset, fitBox } from "@/art/body";
import { SPRITE_META, SWOOSH, weaponFrame, type SpriteKey } from "@/art/vector";
import { DEPTH, HIT_SIZE } from "@/config/constants";
import { actorDepth } from "@/core/depth";
import type { Rng } from "@/core/rng";
import { CRIT_MULT, weaponStats, type WeaponStats } from "@/core/weapons";
import { inArc, nearestInRange, onBeam, slotOffset, spreadAngles } from "@/entities/weaponBehaviors";
import type { Juice } from "@/fx/Juice";
import type { EnemyDef, OwnedWeapon, Stats, Tier, Vector2, WeaponDef } from "@/types";
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
const ARC_SHOW_S = 0.1;
const MUZZLE_S = 0.05;
const KICK_PX = 2; // weapon kick on each shot (owner board A2): back 2 px, eases back

interface Equipped {
  def: WeaponDef;
  tier: Tier;
  ws: WeaponStats;
  timer: number;
  offset: Vector2;
  sprite: Phaser.GameObjects.Image;
  pivot: [number, number]; // grip origin; y is mirrored while the weapon is flipped to aim left
  tip: number; // design px from the grip to the barrel tip (muzzle flash)
  aim: number; // last aim angle
  fired: boolean; // has shot at least once (kick)
  fx: Phaser.GameObjects.Image | null; // beam / swoosh flash
  fxLeft: number; // seconds the flash stays visible
  muzzle: Phaser.GameObjects.Image | null; // ranged weapons: flash at the barrel tip
  muzzleLeft: number;
  orbit: number; // drone angle
  hits: WeakMap<object, number>; // drone: per-spawn enemy state -> clock time of last hit (pooled sprites are reused)
}

const radiusOf = (e: Sprite): number => (e.getData("def") as EnemyDef).radius;

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
  private clock = 0; // seconds since create, for drone hit cooldowns
  /** Attacks this wave (projectiles, beams, swings) and how many touched an enemy; drones aren't counted. */
  readonly tally = { shots: 0, hits: 0 };

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
    this.tally.shots = 0;
    this.tally.hits = 0;
    this.hit = o.hit;
    this.juice = o.juice;
    this.enemyGroup = o.enemyGroup;
    this.equipped = o.weapons.map((w, i) => {
      const def = (weaponDefs as Record<string, WeaponDef>)[w.id];
      const key = `weapon_${def.id}` as SpriteKey, m = SPRITE_META[key];
      const fxKey = def.behavior === "beam" ? "fx_beam" : def.behavior === "melee-arc" ? "fx_swoosh" : null;
      const ranged = def.behavior === "projectile" || def.behavior === "spread" || def.behavior === "explosive";
      const fx = fxKey ? this.scene.add.image(0, 0, fxKey).setDepth(DEPTH.PROJECTILES).setVisible(false) : null;
      // beam: one tile stretched from its left edge; swoosh: scaled from the arc centre
      if (fx && fxKey === "fx_beam") fx.setOrigin(0, 0.5);
      if (fx && fxKey === "fx_swoosh") fx.setOrigin(SWOOSH.cx / SPRITE_META.fx_swoosh.w, SWOOSH.cy / SPRITE_META.fx_swoosh.h);
      return {
        def,
        tier: w.tier,
        ws: weaponStats(def, w.tier, o.stats),
        timer: 0,
        offset: slotOffset(i, o.weapons.length),
        sprite: this.scene.add
          .image(0, 0, key, weaponFrame(w.tier))
          .setScale(1 / ART_SCALE)
          .setOrigin((m.px ?? m.w / 2) / m.w, (m.py ?? m.h / 2) / m.h)
          .setDepth(DEPTH.ACTORS + 0.01),
        pivot: [(m.px ?? m.w / 2) / m.w, (m.py ?? m.h / 2) / m.h],
        tip: m.w - (m.px ?? m.w / 2),
        aim: 0,
        fired: false,
        fx,
        fxLeft: 0,
        muzzle: ranged ? this.scene.add.image(0, 0, "fx_muzzle").setScale(1 / ART_SCALE).setDepth(DEPTH.PROJECTILES).setVisible(false) : null,
        muzzleLeft: 0,
        orbit: (i / o.weapons.length) * Math.PI * 2,
        hits: new WeakMap(),
      };
    });
    this.scene.physics.add.overlap(this.projectiles, o.enemyGroup, (p, e) =>
      this.onProjectileHit(p as Sprite, e as Sprite)
    );
  }

  update(dtMs: number, player: Vector2, enemies: Sprite[]): void {
    const dt = dtMs / 1000;
    this.clock += dt;
    const slot = this.slot;
    const depth = actorDepth(player.y + feetOffset("player")) + 0.01; // just in front of the owner
    for (let i = 0; i < this.equipped.length; i++) {
      const w = this.equipped[i];
      if (Math.round(depth * 100) !== Math.round(w.sprite.depth * 100)) w.sprite.setDepth(depth);
      if (w.def.behavior === "orbital") {
        this.updateDrone(w, player, enemies, dt);
        continue;
      }
      this.fadeFx(w, dt);
      slot.x = player.x + w.offset.x;
      slot.y = player.y + w.offset.y;
      // kick: pushed back along the aim right after a shot, eased out over ~120 ms
      const kick = w.fired && w.timer < 0.12 ? KICK_PX * (1 - w.timer / 0.12) : 0;
      w.sprite.setPosition(slot.x - Math.cos(w.aim) * kick, slot.y - Math.sin(w.aim) * kick);
      w.timer += dt;
      this.fadeMuzzle(w, slot, dt);
      // Blades reach from the player, everything else from its slot
      const origin = w.def.behavior === "melee-arc" ? player : slot;
      const target = nearestInRange(origin, w.ws.range, enemies);
      if (!target) continue;
      const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
      this.aimAt(w, angle);
      if (w.timer < w.ws.cooldown) continue;
      w.timer = 0;
      w.fired = true;
      if (w.muzzle) w.muzzleLeft = MUZZLE_S;
      this.fire(w, origin, angle, enemies);
    }
    this.updateProjectiles();
  }

  /** Wave end: remove projectiles. */
  clear(): void {
    const list = this.projectiles.children.entries;
    for (let i = 0; i < list.length; i++) this.removeProjectile(list[i] as Sprite);
    for (const w of this.equipped) {
      w.hits = new WeakMap();
      w.fxLeft = 0;
      w.fx?.setVisible(false);
      w.muzzleLeft = 0;
      w.muzzle?.setVisible(false);
    }
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

  private fire(w: Equipped, from: Vector2, angle: number, enemies: Sprite[]): void {
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
      case "beam":
        this.beam(w, from, angle, enemies);
        break;
      case "melee-arc":
        this.swing(w, from, angle, enemies);
        break;
      default:
        break; // orbital is driven by updateDrone
    }
  }

  private directHit(w: Equipped, e: Sprite, angle: number): void {
    const crit = this.rollCrit(w);
    this.hit(e, crit ? w.ws.damage * CRIT_MULT : w.ws.damage, crit, angle, w.def.params.knockback);
  }

  /** Laser: every enemy on the line, once. */
  private beam(w: Equipped, from: Vector2, angle: number, enemies: Sprite[]): void {
    const half = w.def.params.width / 2;
    let landed = false;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.active && onBeam(from, angle, w.ws.range, half + radiusOf(e), e)) {
        this.directHit(w, e, angle);
        landed = true;
      }
    }
    this.tally.shots++;
    if (landed) this.tally.hits++;
    w.fx!.setPosition(from.x, from.y).setRotation(angle).setDisplaySize(w.ws.range, w.def.params.width).setAlpha(1).setVisible(true);
    w.fxLeft = w.def.params.duration;
  }

  /** Blade: every enemy in the front arc, once. */
  private swing(w: Equipped, from: Vector2, angle: number, enemies: Sprite[]): void {
    const arc = w.def.params.arc;
    let landed = false;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.active && inArc(from, angle, arc, w.ws.range + radiusOf(e), e)) {
        this.directHit(w, e, Math.atan2(e.y - from.y, e.x - from.x));
        landed = true;
      }
    }
    this.tally.shots++;
    if (landed) this.tally.hits++;
    // the swoosh is drawn as a 120 deg arc (weapons.json blade arc); scale its outer edge to the reach
    w.fx!.setPosition(from.x, from.y).setRotation(angle).setScale(w.ws.range / (SWOOSH.r * ART_SCALE)).setAlpha(1).setVisible(true);
    w.fxLeft = ARC_SHOW_S;
  }

  private fadeFx(w: Equipped, dt: number): void {
    if (!w.fx || w.fxLeft <= 0) return;
    w.fxLeft -= dt;
    const total = w.def.behavior === "beam" ? w.def.params.duration : ARC_SHOW_S;
    if (w.fxLeft <= 0) w.fx.setVisible(false);
    else w.fx.setAlpha(w.fxLeft / total);
  }

  /** Muzzle flash at the barrel tip for MUZZLE_S after each shot. */
  private fadeMuzzle(w: Equipped, slot: Vector2, dt: number): void {
    if (!w.muzzle) return;
    if (w.muzzleLeft <= 0) return;
    w.muzzleLeft -= dt;
    w.muzzle.setVisible(w.muzzleLeft > 0).setPosition(slot.x + Math.cos(w.aim) * w.tip, slot.y + Math.sin(w.aim) * w.tip);
  }

  /** Rotate to aim; aiming left flips the art vertically (and mirrors the grip pivot) so it stays upright. */
  private aimAt(w: Equipped, angle: number): void {
    w.aim = angle;
    const left = Math.cos(angle) < 0;
    w.sprite.setRotation(angle).setFlipY(left).setOrigin(w.pivot[0], left ? 1 - w.pivot[1] : w.pivot[1]);
  }

  /** Drone: circles the player, ticks each touched enemy at most once per cooldown. */
  private updateDrone(w: Equipped, player: Vector2, enemies: Sprite[], dt: number): void {
    w.orbit += w.def.params.orbitSpeed * dt;
    const x = player.x + Math.cos(w.orbit) * w.ws.range;
    const y = player.y + Math.sin(w.orbit) * w.ws.range;
    w.sprite.setPosition(x, y).setRotation(w.orbit);
    const reach = w.def.params.hitRadius;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const r = reach + radiusOf(e);
      if (dx * dx + dy * dy > r * r) continue;
      const state = e.getData("state") as object;
      const last = w.hits.get(state);
      if (last !== undefined && this.clock - last < w.ws.cooldown) continue;
      w.hits.set(state, this.clock);
      this.directHit(w, e, Math.atan2(dy, dx));
    }
  }

  private rollCrit(w: Equipped): boolean {
    return this.rng.next() < w.ws.critChance;
  }

  private shoot(w: Equipped, from: Vector2, angle: number, key: string): void {
    const pr = this.projectiles.get(from.x, from.y, key) as Sprite | null;
    if (!pr) return;
    this.tally.shots++;
    pr.setTexture(key);
    pr.enableBody(true, from.x, from.y, true, true);
    fitBox(pr, key as SpriteKey, ...HIT_SIZE[key as keyof typeof HIT_SIZE]);
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
    if (pr.getData("last") === null) this.tally.hits++; // first enemy this projectile touched
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
