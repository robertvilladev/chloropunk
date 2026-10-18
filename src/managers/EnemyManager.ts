import { DEPTH, GAME_CONFIG } from "@/config/constants";
import type { Rng } from "@/core/rng";
import { buildSpawnSchedule, dueEvents } from "@/core/waves";
import {
  createEnemyState,
  steer,
  type EnemyState,
  type Steer,
} from "@/entities/enemyBehaviors";
import type { EnemyDef, SpawnEvent, Vector2 } from "@/types";
import enemyDefs from "@assets/data/enemies.json";
import wavesData from "@assets/data/waves.json";
import Phaser from "phaser";

type Sprite = Phaser.Physics.Arcade.Sprite;

const TELEGRAPH_S = 0.6;
const EDGE_INSET = 40;
const MIN_PLAYER_DIST = 160;
const MAX_ENEMIES = 250;
const MAX_BOLTS = 100;
const KNOCK_DECAY = 8; // per second
const BOLT_MARGIN = 20;

interface Pending {
  x: number;
  y: number;
  left: number;
  def: EnemyDef;
  count: number;
  marker: Phaser.GameObjects.Image;
}

/**
 * EnemyManager - pooled enemy + enemy-bolt spawning, applying behaviour
 * output (see enemyBehaviors.ts), damage and death.
 */
export class EnemyManager {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private bolts: Phaser.Physics.Arcade.Group;
  private markers: Phaser.GameObjects.Group;
  private pending: Pending[] = [];
  private schedule: SpawnEvent[] = [];
  private params = new Map<string, Record<string, number>>();
  private activeBuf: Sprite[] = [];
  private out: Steer = { vx: 0, vy: 0, fire: false };
  private wave = 1;
  private prevElapsed = 0;
  private rng!: Rng;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.enemies = scene.physics.add.group({
      defaultKey: "enemy_pea",
      maxSize: MAX_ENEMIES,
    });
    this.bolts = scene.physics.add.group({
      defaultKey: "enemy_bolt",
      maxSize: MAX_BOLTS,
    });
    this.markers = scene.add.group({ defaultKey: "spawn_telegraph" });
    for (const def of Object.values(enemyDefs)) {
      this.params.set(def.id, { speed: def.speed, ...def.params });
    }
  }

  create(): void {
    console.log("✓ EnemyManager: Initialized");
  }

  /** Begin spawning the given wave's schedule. */
  startWave(wave: number, rng: Rng): void {
    this.clearAll();
    this.wave = wave;
    this.rng = rng;
    this.prevElapsed = 0;
    const waves = wavesData.waves;
    const def = waves.find((w) => w.wave === wave) ?? waves[waves.length - 1];
    this.schedule = buildSpawnSchedule({ ...def, wave });
  }

  update(dtMs: number, elapsedS: number, player: Vector2): void {
    if (dtMs <= 0) return;
    const dt = dtMs / 1000;

    // Each scheduled event fires exactly once: (prev, now]
    for (const ev of dueEvents(this.schedule, this.prevElapsed, elapsedS)) {
      this.telegraph(ev, player);
    }
    this.prevElapsed = elapsedS;

    this.updateTelegraphs(dt);
    this.updateEnemies(dt, player);
    this.updateBolts();
  }

  /** Apply damage; kills (and may explode) at 0 hp. Returns true if killed. */
  damageEnemy(enemy: Sprite, amount: number, crit: boolean): boolean {
    if (!enemy.active) return false;
    const state = enemy.getData("state") as EnemyState;
    state.hp -= amount;
    this.scene.events.emit("enemyHit", enemy, amount, crit);
    if (state.hp > 0) return false;
    this.killEnemy(enemy);
    return true;
  }

  /** Kill with death effects (drop event, exploder blast). */
  killEnemy(enemy: Sprite): void {
    if (!enemy.active) return;
    const def = enemy.getData("def") as EnemyDef;
    const { x, y } = enemy;
    enemy.disableBody(true, true);
    if (def.behavior === "exploder") {
      this.scene.events.emit(
        "enemyExploded",
        x,
        y,
        def.params!.blastRadius,
        def.params!.blastDamage
      );
    }
    this.scene.events.emit("enemyKilled", x, y, def);
  }

  /** Push an enemy; tanks ignore it. */
  knockback(enemy: Sprite, angle: number, force: number): void {
    const def = enemy.getData("def") as EnemyDef;
    if (def.behavior === "tank") return;
    const k = enemy.getData("knock") as Vector2;
    k.x = Math.cos(angle) * force;
    k.y = Math.sin(angle) * force;
  }

  removeBolt(bolt: Sprite): void {
    bolt.disableBody(true, true);
  }

  /** Remove everything with no effects or drops. */
  clearAll(): void {
    const e = this.enemies.children.entries;
    for (let i = 0; i < e.length; i++) (e[i] as Sprite).disableBody(true, true);
    const b = this.bolts.children.entries;
    for (let i = 0; i < b.length; i++) this.removeBolt(b[i] as Sprite);
    for (const p of this.pending) this.markers.killAndHide(p.marker);
    this.pending.length = 0;
    this.schedule = [];
  }

  /** Active enemies (shared buffer, valid until the next call). */
  getEnemies(): Sprite[] {
    const buf = this.activeBuf;
    buf.length = 0;
    const e = this.enemies.children.entries;
    for (let i = 0; i < e.length; i++) {
      if (e[i].active) buf.push(e[i] as Sprite);
    }
    return buf;
  }

  getEnemyGroup(): Phaser.Physics.Arcade.Group {
    return this.enemies;
  }

  getEnemyProjectileGroup(): Phaser.Physics.Arcade.Group {
    return this.bolts;
  }

  getEnemyCount(): number {
    return this.enemies.countActive(true);
  }

  /** Scene shutdown: Phaser has already destroyed the groups, so only drop our own state. */
  destroy(): void {
    this.pending.length = 0;
    this.schedule = [];
  }

  // ---- internals ----

  private telegraph(ev: SpawnEvent, player: Vector2): void {
    const def = (enemyDefs as Record<string, EnemyDef>)[ev.enemy];
    if (!def) return;
    const pos = this.pickEdgePoint(player);
    const marker = this.markers.get(
      pos.x,
      pos.y,
      "spawn_telegraph"
    ) as Phaser.GameObjects.Image;
    marker.setActive(true).setVisible(true).setDepth(DEPTH.GROUND_EFFECTS);
    this.pending.push({
      x: pos.x,
      y: pos.y,
      left: TELEGRAPH_S,
      def,
      count: ev.count,
      marker,
    });
  }

  /** Point on the rectangle EDGE_INSET px inside the arena, >= 160 px from the player. */
  private pickEdgePoint(player: Vector2): Vector2 {
    const w = GAME_CONFIG.WIDTH - 2 * EDGE_INSET;
    const h = GAME_CONFIG.HEIGHT - 2 * EDGE_INSET;
    const p = { x: 0, y: 0 };
    for (let tries = 0; tries < 10; tries++) {
      let t = this.rng.next() * 2 * (w + h);
      if (t < w) {
        p.x = t;
        p.y = 0;
      } else if ((t -= w) < h) {
        p.x = w;
        p.y = t;
      } else if ((t -= h) < w) {
        p.x = w - t;
        p.y = h;
      } else {
        p.x = 0;
        p.y = h - (t - w);
      }
      p.x += EDGE_INSET;
      p.y += EDGE_INSET;
      if (Math.hypot(p.x - player.x, p.y - player.y) >= MIN_PLAYER_DIST) break;
    }
    return p;
  }

  private updateTelegraphs(dt: number): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.left -= dt;
      if (p.left > 0) {
        p.marker
          .setScale(0.8 + 0.3 * Math.sin(p.left * 20))
          .setAlpha(1 - (p.left / TELEGRAPH_S) * 0.5);
        continue;
      }
      for (let n = 0; n < p.count; n++) {
        this.spawnEnemy(
          p.def,
          p.x + this.rng.int(-24, 24),
          p.y + this.rng.int(-24, 24)
        );
      }
      this.markers.killAndHide(p.marker);
      this.pending[i] = this.pending[this.pending.length - 1];
      this.pending.pop();
    }
  }

  private spawnEnemy(def: EnemyDef, x: number, y: number): void {
    const enemy = this.enemies.get(x, y, def.sprite) as Sprite | null;
    if (!enemy) return; // pool full
    enemy.setTexture(def.sprite);
    enemy.enableBody(true, x, y, true, true);
    enemy.setDepth(DEPTH.ENEMIES).setCollideWorldBounds(true);
    (enemy.body as Phaser.Physics.Arcade.Body).setCircle(def.radius);
    enemy.setData("def", def);
    enemy.setData("state", createEnemyState(def, this.wave));
    enemy.setData("knock", { x: 0, y: 0 });
  }

  private updateEnemies(dt: number, player: Vector2): void {
    const list = this.enemies.children.entries;
    const out = this.out;
    const decay = Math.max(0, 1 - KNOCK_DECAY * dt);
    for (let i = 0; i < list.length; i++) {
      const enemy = list[i] as Sprite;
      if (!enemy.active) continue;
      const def = enemy.getData("def") as EnemyDef;
      const state = enemy.getData("state") as EnemyState;
      const knock = enemy.getData("knock") as Vector2;
      steer(def.behavior, state, enemy, player, dt, this.params.get(def.id)!, out);
      enemy.setVelocity(out.vx + knock.x, out.vy + knock.y);
      knock.x *= decay;
      knock.y *= decay;
      if (out.fire) this.fireBolt(enemy, def, state, player);
    }
  }

  private fireBolt(
    enemy: Sprite,
    def: EnemyDef,
    state: EnemyState,
    player: Vector2
  ): void {
    const bolt = this.bolts.get(enemy.x, enemy.y, "enemy_bolt") as Sprite | null;
    if (!bolt) return;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const speed = def.params!.boltSpeed;
    bolt.enableBody(true, enemy.x, enemy.y, true, true);
    bolt.setDepth(DEPTH.PROJECTILES);
    bolt.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    bolt.setData("damage", state.damage);
  }

  private updateBolts(): void {
    const list = this.bolts.children.entries;
    for (let i = 0; i < list.length; i++) {
      const b = list[i] as Sprite;
      if (!b.active) continue;
      if (
        b.x < -BOLT_MARGIN ||
        b.y < -BOLT_MARGIN ||
        b.x > GAME_CONFIG.WIDTH + BOLT_MARGIN ||
        b.y > GAME_CONFIG.HEIGHT + BOLT_MARGIN
      ) {
        this.removeBolt(b);
      }
    }
  }
}
