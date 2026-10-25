import { feetOffset, fitBox, fitCircle } from "@/art/body";
import type { SpriteKey } from "@/art/vector";
import { ARENA, DEPTH, HIT_SIZE } from "@/config/constants";
import type { Rng } from "@/core/rng";
import { actorDepth, facingFlip } from "@/core/depth";
import { MAX_ALIVE, advanceCursor, buildSpawnSchedule, offscreenPoint } from "@/core/waves";
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
export const SPAWN_MARGIN = 50; // px outside the view: largest enemy radius (potato 26) + the 24 px group spread
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
  private cursor = 0; // next unfired index into schedule
  private rng!: Rng;
  /** Scheduled enemies spawned this wave (run log); dev spawns and capped drops excluded. */
  spawned = 0;
  /** Sum of player→enemy px at spawn for those (run log `spawnDist` = this ÷ spawned). */
  spawnDistSum = 0;

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
    this.cursor = 0;
    this.spawned = 0;
    this.spawnDistSum = 0;
    const waves = wavesData.waves;
    const def = waves.find((w) => w.wave === wave);
    if (!def) throw new Error(`No wave ${wave} defined`);
    this.schedule = buildSpawnSchedule({ ...def, wave });
  }

  update(dtMs: number, elapsedS: number, player: Vector2): void {
    if (dtMs <= 0) return;
    const dt = dtMs / 1000;

    // Schedule is sorted: fire each event once when its time has passed
    const sched = this.schedule;
    const end = advanceCursor(sched, this.cursor, elapsedS);
    for (; this.cursor < end; this.cursor++) this.telegraph(sched[this.cursor], player);

    this.updateTelegraphs(dt, player);
    this.updateEnemies(dt, player);
    this.updateBolts();
  }

  /** Telegraphs waiting to spawn (HUD's off-screen arrows). */
  get telegraphs(): readonly Vector2[] {
    return this.pending;
  }

  /** Dev: spawn `count` of an enemy at random arena points (silent no-op past the pool cap). */
  debugSpawn(id: string, count: number): void {
    const def = (enemyDefs as Record<string, EnemyDef>)[id];
    for (let i = 0; def && i < count; i++) {
      this.spawnEnemy(
        def,
        this.rng.int(EDGE_INSET, ARENA.w - EDGE_INSET),
        this.rng.int(EDGE_INSET, ARENA.h - EDGE_INSET)
      );
    }
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

  /** Kill with death effects (exploder blast; drops unless `drops` is false). */
  killEnemy(enemy: Sprite, drops = true): void {
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
    this.scene.events.emit("enemyKilled", x, y, def, drops);
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
    const pos = this.pickSpawnPoint(player);
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

  /** Point just outside the camera view, inside the arena, >= 160 px from the player (one RNG draw). */
  private pickSpawnPoint(player: Vector2): Vector2 {
    return offscreenPoint(
      this.rng.next(),
      player,
      this.scene.cameras.main.worldView,
      ARENA,
      SPAWN_MARGIN,
      EDGE_INSET,
      MIN_PLAYER_DIST
    );
  }

  private updateTelegraphs(dt: number, player: Vector2): void {
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
        // draw first so the spawn RNG stream doesn't depend on the cap
        const x = p.x + this.rng.int(-24, 24);
        const y = p.y + this.rng.int(-24, 24);
        if (this.enemies.countActive(true) < MAX_ALIVE) {
          this.spawnEnemy(p.def, x, y);
          this.spawned++;
          this.spawnDistSum += Math.hypot(x - player.x, y - player.y);
        }
      }
      this.markers.killAndHide(p.marker);
      this.pending[i] = this.pending[this.pending.length - 1];
      this.pending.pop();
    }
  }

  private spawnEnemy(def: EnemyDef, x: number, y: number): void {
    const enemy = this.enemies.get(x, y, def.sprite) as Sprite | null;
    if (!enemy) return; // pool full
    enemy.setTexture(def.sprite, "walk0");
    enemy.setFlipX(false);
    enemy.clearTint();
    enemy.enableBody(true, x, y, true, true);
    enemy.setDepth(actorDepth(y + feetOffset(def.sprite as SpriteKey))).setCollideWorldBounds(true);
    fitCircle(enemy, def.sprite as SpriteKey, def.radius);
    enemy.anims.resume();
    enemy.play(`${def.sprite}_walk`, true);
    enemy.anims.setProgress(Math.random()); // cosmetic: keeps the seeded rng stream untouched
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
      enemy.flipX = facingFlip(out.vx + knock.x, enemy.flipX);
      const d = actorDepth(enemy.y + feetOffset(def.sprite as SpriteKey));
      if (Math.round(d * 100) !== Math.round(enemy.depth * 100)) enemy.setDepth(d); // only re-sort on a visible change
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
    fitBox(bolt, "enemy_bolt", ...HIT_SIZE.enemy_bolt);
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
        b.x > ARENA.w + BOLT_MARGIN ||
        b.y > ARENA.h + BOLT_MARGIN
      ) {
        this.removeBolt(b);
      }
    }
  }
}
