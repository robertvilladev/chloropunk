import { feetOffset, fitCircle } from "@/art/body";
import type { SpriteKey } from "@/art/vector";
import { ARENA, DEPTH } from "@/config/constants";
import { THEME } from "@/config/theme";
import { BOSS_ART, BOSS_NAMES, bossKey, type BossSkin } from "@/core/bossSkin";
import { actorDepth, facingFlip } from "@/core/depth";
import type { Rng } from "@/core/rng";
import { avoid, type EnemyState } from "@/entities/enemyBehaviors";
import {
  bossBusy,
  bossParams,
  bossPose,
  bossStep,
  bossTelegraphs,
  createBossState,
  type BossCommand,
  type BossParams,
  type BossState,
} from "@/entities/bossBrain";
import { sfx } from "@/fx/sfx";
import type { Juice } from "@/fx/Juice";
import type { EnemyManager } from "@/managers/EnemyManager";
import type { EnemyDef, Rect, Vector2 } from "@/types";
import arenaData from "@assets/data/arena.json";
import enemyDefs from "@assets/data/enemies.json";
import Phaser from "phaser";

type Sprite = Phaser.Physics.Arcade.Sprite;

const HIT_MS = 0.08; // s of the hit frame after damage
const SWITCH_S = 0.12; // phase-2 white flash
const LOB_ARC = 90; // px a lobbed shot rises at mid-flight
const LINE_LEN = 420; // px of the volley telegraph lines
const BROOD_OFFSET = 70; // px from the boss centre where the brood telegraph appears

interface Lob {
  img: Phaser.GameObjects.Image;
  from: Vector2;
  to: Vector2;
  t: number;
  dur: number;
}

/**
 * BossManager - the wave-10 boss (M4b): one sprite in the enemy group (so weapons, contact damage
 * and clearAll treat it like any enemy), driven by the pure bossBrain. Turns its commands into
 * volley bolts, a charge, lobbed blasts and pea brood telegraphs, and draws every telegraph in
 * the danger colour. Everything runs on the scaled frame dt, so pause and game speed apply.
 */
export class BossManager {
  readonly skin: BossSkin;
  readonly name: string;
  private sprite: Sprite;
  private def: EnemyDef;
  private params: BossParams;
  private flat: Record<string, number>;
  private brain: BossState;
  private out: BossCommand[] = [];
  private gfx: Phaser.GameObjects.Graphics;
  private lobs: Lob[] = [];
  private lobPool: Phaser.GameObjects.Image[] = [];
  private hitLeft = 0;
  private switchLeft = 0;
  private charge: { dir: Vector2; left: number } | null = null;
  private pose = "";
  private scene: Phaser.Scene;
  private enemies: EnemyManager;
  private juice: Juice;
  private solids: readonly Rect[];
  private rng: Rng;

  constructor(scene: Phaser.Scene, enemies: EnemyManager, juice: Juice, solids: readonly Rect[], rng: Rng, skin: BossSkin) {
    this.scene = scene;
    this.enemies = enemies;
    this.juice = juice;
    this.solids = solids;
    this.rng = rng;
    this.skin = skin;
    this.name = BOSS_NAMES[skin];
    const key = bossKey(skin);
    this.def = { ...(enemyDefs.boss as EnemyDef), sprite: key, name: this.name };
    this.flat = this.def.params!;
    this.params = bossParams(this.flat);
    this.brain = createBossState(this.params);
    const at = spawnPoint();
    this.sprite = scene.physics.add.sprite(at.x, at.y, key, "idle0");
    enemies.addBoss(this.sprite, this.def, this.def.hp);
    fitCircle(this.sprite, key, this.def.radius);
    this.sprite.setCollideWorldBounds(true).setAlpha(0);
    scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 400 });
    this.gfx = scene.add.graphics().setDepth(DEPTH.GROUND_EFFECTS + 1);
  }

  get alive(): boolean {
    return this.sprite.active;
  }

  get hp(): { hp: number; max: number } {
    const s = this.state;
    return { hp: Math.max(0, s.hp), max: s.maxHp };
  }

  get phase(): 1 | 2 {
    return this.brain.phase;
  }

  isBoss(o: Phaser.GameObjects.GameObject): boolean {
    return o === this.sprite;
  }

  /** Damage feedback: the hit frame (BossManager owns the boss's frames, so not Juice.hitFlash). */
  flash(): void {
    sfx("hit");
    this.hitLeft = HIT_MS;
  }

  update(dt: number, player: Vector2): void {
    this.gfx.clear();
    if (!this.alive) return;
    const s = this.sprite;
    const state = this.state;
    this.out.length = 0;
    bossStep(this.brain, dt, state.hp / state.maxHp, s, player, this.params, this.rng, this.out);
    for (const c of this.out) this.run(c, player);
    this.hitLeft -= dt;
    this.switchLeft -= dt;

    // Move: charge dash, else stand still while winding up, else walk up to holdDistance around the vents
    const body = s.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    if (this.charge) {
      this.charge.left -= dt;
      if (this.charge.left <= 0 || (!body.blocked.none && this.charge.left < this.flat.recCharge - 0.05)) this.endCharge();
      else {
        vx = this.charge.dir.x * this.flat.chargeSpeed;
        vy = this.charge.dir.y * this.flat.chargeSpeed;
      }
    } else if (!bossBusy(this.brain)) {
      const dx = player.x - s.x;
      const dy = player.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      // keeps its distance: body contact is untelegraphed, so the damage comes from the attacks
      const speed = d > this.flat.holdDistance ? this.def.speed : 0;
      const v = avoid(s, this.def.radius, { vx: (dx / d) * speed, vy: (dy / d) * speed }, this.solids, [], { vx: 0, vy: 0 }, state);
      vx = v.vx;
      vy = v.vy;
    }
    s.setVelocity(vx, vy);
    s.flipX = facingFlip(player.x - s.x, s.flipX);
    s.setDepth(actorDepth(s.y + feetOffset(this.def.sprite as SpriteKey)));
    const pose = bossPose(this.brain, this.hitLeft, this.switchLeft);
    if (pose !== this.pose) s.setFrame((this.pose = pose));

    this.updateLobs(dt);
    this.drawTelegraphs();
  }

  /** Boss died or the wave ended: drop pending attacks (lobs in the air, telegraphs) with no effect. */
  clear(): void {
    for (const l of this.lobs) l.img.setVisible(false);
    this.lobPool.push(...this.lobs.map((l) => l.img));
    this.lobs.length = 0;
    this.charge = null;
    this.gfx.clear();
  }

  // ---- internals ----

  private get state(): EnemyState {
    return this.sprite.getData("state") as EnemyState;
  }

  private run(c: BossCommand, player: Vector2): void {
    const s = this.sprite;
    const f = this.flat;
    if (c.kind === "phase") {
      this.switchLeft = SWITCH_S;
      this.juice.deathBurst(s.x, s.y, BOSS_ART[this.skin].color);
      this.juice.blast(s.x, s.y, 140);
      this.juice.shake("boss");
      this.scene.events.emit("banner", "PHASE 2", 10, "waveClear");
      return;
    }
    if (c.pattern === "brood") {
      const a = Math.atan2(s.y - player.y, s.x - player.x); // behind the boss, away from the player
      this.enemies.telegraphAt("pea", c.count, s.x + Math.cos(a) * BROOD_OFFSET, s.y + Math.sin(a) * BROOD_OFFSET);
      return;
    }
    if (c.kind === "telegraph") {
      if (c.pattern === "barrage") for (const p of c.points) this.lob(clampArena(p), f.teleBarrage);
      return;
    }
    if (c.pattern === "volley") {
      const base = Math.atan2(c.aim.y - s.y, c.aim.x - s.x);
      const spread = Phaser.Math.DegToRad(f.volleySpread);
      for (let i = 0; i < c.count; i++) {
        const a = base - spread / 2 + (spread * i) / (c.count - 1);
        this.enemies.spawnBolt(s.x, s.y, a, f.boltSpeed, f.boltDamage, BOSS_ART[this.skin].bolt);
      }
    } else if (c.pattern === "charge") {
      const dx = c.aim.x - s.x;
      const dy = c.aim.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      this.charge = { dir: { x: dx / d, y: dy / d }, left: f.recCharge };
      this.state.damage = f.chargeDamage;
    } else {
      for (const p of c.points) {
        const q = clampArena(p);
        this.juice.blast(q.x, q.y, f.blastRadius);
        this.scene.events.emit("enemyExploded", q.x, q.y, f.blastRadius, f.blastDamage);
      }
    }
  }

  private endCharge(): void {
    this.charge = null;
    this.state.damage = this.def.damage;
  }

  private lob(to: Vector2, dur: number): void {
    const img = this.lobPool.pop() ?? this.scene.add.image(0, 0, BOSS_ART[this.skin].lob, "0").setScale(0.75); // 1.5x design size: reads as a heavy shot
    img.setVisible(true).setDepth(DEPTH.PROJECTILES);
    this.lobs.push({ img, from: { x: this.sprite.x, y: this.sprite.y - 40 }, to, t: 0, dur });
  }

  private updateLobs(dt: number): void {
    for (let i = this.lobs.length - 1; i >= 0; i--) {
      const l = this.lobs[i];
      l.t += dt;
      const k = Math.min(1, l.t / l.dur);
      l.img.setPosition(l.from.x + (l.to.x - l.from.x) * k, l.from.y + (l.to.y - l.from.y) * k - Math.sin(k * Math.PI) * LOB_ARC);
      l.img.setRotation(k * Math.PI * 2);
      if (k >= 1) {
        l.img.setVisible(false);
        this.lobPool.push(l.img);
        this.lobs.splice(i, 1);
      }
    }
  }

  /** Danger-coloured telegraphs, fading in over the wind-up: volley fan lines, charge lane, barrage markers. */
  private drawTelegraphs(): void {
    const g = this.gfx;
    const s = this.sprite;
    const f = this.flat;
    for (const { cmd, k } of bossTelegraphs(this.brain, this.params)) {
      const alpha = 0.25 + 0.55 * k;
      if (cmd.pattern === "volley") {
        const base = Math.atan2(cmd.aim.y - s.y, cmd.aim.x - s.x);
        const spread = Phaser.Math.DegToRad(f.volleySpread);
        g.lineStyle(3, THEME.danger, alpha);
        for (let i = 0; i < cmd.count; i++) {
          const a = base - spread / 2 + (spread * i) / (cmd.count - 1);
          g.lineBetween(s.x, s.y, s.x + Math.cos(a) * LINE_LEN, s.y + Math.sin(a) * LINE_LEN);
        }
      } else if (cmd.pattern === "charge") {
        const a = Math.atan2(cmd.aim.y - s.y, cmd.aim.x - s.x);
        const len = f.chargeSpeed * f.recCharge;
        const w = this.def.radius;
        const [cx, cy, nx, ny] = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a)];
        const pts = [
          { x: s.x + nx * w, y: s.y + ny * w },
          { x: s.x + nx * w + cx * len, y: s.y + ny * w + cy * len },
          { x: s.x - nx * w + cx * len, y: s.y - ny * w + cy * len },
          { x: s.x - nx * w, y: s.y - ny * w },
        ];
        g.fillStyle(THEME.danger, alpha * 0.35).fillPoints(pts, true);
        g.lineStyle(2, THEME.danger, alpha).strokePoints(pts, true);
      } else {
        for (const p of cmd.points) {
          const q = clampArena(p);
          g.fillStyle(THEME.danger, alpha * 0.3).fillCircle(q.x, q.y, f.blastRadius * (0.3 + 0.7 * k));
          g.lineStyle(2, THEME.danger, alpha).strokeCircle(q.x, q.y, f.blastRadius);
        }
      }
    }
  }
}

/** Boss entrance: the helipad centre (arena.json), clamped into the arena. */
function spawnPoint(): Vector2 {
  const pad = arenaData.props.find((p) => p.kind === "pad");
  const at = pad ? { x: pad.x + pad.w / 2, y: pad.y + pad.h / 2 } : { x: ARENA.w * 0.7, y: ARENA.h * 0.6 };
  return clampArena(at);
}

const clampArena = (p: Vector2): Vector2 => ({
  x: Phaser.Math.Clamp(p.x, 60, ARENA.w - 60),
  y: Phaser.Math.Clamp(p.y, 60, ARENA.h - 60),
});
