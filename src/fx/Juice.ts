import { ART_SCALE } from "@/art/body";
import { BLAST_R } from "@/art/vector";
import { DEPTH } from "@/config/constants";
import { DAMAGE_NUMBER } from "@/config/theme";
import { loadSettings } from "@/core/settings";
import Phaser from "phaser";
import { sfx } from "./sfx";

const MAX_NUMBERS = 40; // per pool (normal, crit)
const MAX_BLASTS = 8;
const MAX_POPS = 24; // death pops in flight (200 ms each)
const SHAKES = {
  hit: { ms: 120, intensity: 0.006 },
  kill: { ms: 80, intensity: 0.003 },
};

/**
 * Juice - hit/kill feedback in world space (visual and sound). Screen-fixed effects (banner, low-HP vignette) live in UIScene.
 */
export class Juice {
  private scene: Phaser.Scene;
  private reducedShake = false;
  // Two pre-styled pools so a hit only calls setText (each style change re-renders)
  private pools = { normal: [] as Phaser.GameObjects.Text[], crit: [] as Phaser.GameObjects.Text[] };
  private next = { normal: 0, crit: 0 };
  private burst: Phaser.GameObjects.Particles.ParticleEmitter;
  private blasts: Phaser.GameObjects.Image[] = [];
  private nextBlast = 0;
  private pops: { body: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Arc }[] = [];
  private nextPop = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.refreshSettings();
    this.burst = scene.add
      .particles(0, 0, "pixel", {
        emitting: false,
        speed: 80,
        lifespan: 350,
        alpha: { start: 1, end: 0 },
      })
      .setDepth(DEPTH.FX);
  }

  /** Re-read persisted settings (after the pause menu may have changed them). */
  refreshSettings(): void {
    this.reducedShake = loadSettings().reducedShake;
  }

  damageNumber(x: number, y: number, amount: number, crit: boolean): void {
    const kind = crit ? "crit" : "normal";
    const pool = this.pools[kind];
    let t = pool[this.next[kind]];
    if (!t) {
      t = this.scene.add
        .text(0, 0, "", DAMAGE_NUMBER[kind])
        .setOrigin(0.5)
        .setDepth(DEPTH.NUMBERS);
      pool[this.next[kind]] = t;
    }
    this.next[kind] = (this.next[kind] + 1) % MAX_NUMBERS;

    this.scene.tweens.killTweensOf(t);
    const pop = DAMAGE_NUMBER[kind].pop;
    t.setText(String(Math.round(amount)))
      .setPosition(x, y)
      .setAlpha(1)
      .setScale(pop > 1 ? 0.6 : 1)
      .setVisible(true);
    // Crit pop (board U1): 0.6 -> 1.4 -> 1 in the first 100 ms, alongside the float
    if (pop > 1) this.scene.tweens.chain({ targets: t, tweens: [{ scale: pop, duration: 50 }, { scale: 1, duration: 50 }] });
    this.scene.tweens.add({
      targets: t,
      y: y - 24,
      alpha: 0,
      duration: 600,
      onComplete: () => t.setVisible(false),
    });
  }

  hitFlash(sprite: Phaser.GameObjects.Sprite): void {
    sfx("hit");
    sprite.anims.pause();
    sprite.setFrame("hit");
    this.scene.time.delayedCall(80, () => {
      if (!sprite.active || sprite.frame.name !== "hit") return;
      sprite.anims.resume();
      sprite.setFrame(sprite.anims.currentFrame?.textureFrame ?? "walk0");
    });
  }

  shake(kind: "hit" | "kill"): void {
    if (kind === "hit") sfx("hurt"); // the "hit" shake = the player got hit
    if (this.reducedShake) return;
    const s = SHAKES[kind];
    this.scene.cameras.main.shake(s.ms, s.intensity);
  }

  deathBurst(x: number, y: number, color: number): void {
    sfx("kill");
    this.burst.particleTint = color;
    this.burst.explode(8, x, y);
  }

  /**
   * Death pop (board A2, pooled): the hit frame grows to 1.25x over 60 ms, then shrinks to nothing over 120 ms
   * while a ring in the enemy's colour opens. Plain images, so the physics sprite can go back to the pool at once.
   */
  deathPop(x: number, y: number, key: string, flipX: boolean, radius: number, color: number): void {
    let p = this.pops[this.nextPop];
    if (!p) {
      p = { body: this.scene.add.image(0, 0, key, "hit"), ring: this.scene.add.circle(0, 0, 1).setDepth(DEPTH.FX) };
      this.pops[this.nextPop] = p;
    }
    this.nextPop = (this.nextPop + 1) % MAX_POPS;
    const { body, ring } = p;
    this.scene.tweens.killTweensOf([body, ring]);
    const s = 1 / ART_SCALE;
    body.setTexture(key, "hit").setFlipX(flipX).setPosition(x, y).setScale(s).setDepth(DEPTH.FX).setVisible(true);
    this.scene.tweens.chain({
      targets: body,
      tweens: [{ scale: s * 1.25, duration: 60, ease: "Quad.Out" }, { scale: 0, duration: 120, ease: "Quad.In" }],
      onComplete: () => body.setVisible(false),
    });
    ring.setPosition(x, y).setRadius(radius + 8).setStrokeStyle(2, color).setScale(0.2).setAlpha(0).setVisible(true);
    this.scene.tweens.add({
      targets: ring,
      delay: 60,
      scale: 1,
      alpha: { from: 0.9, to: 0 },
      duration: 160,
      ease: "Quad.Out",
      onComplete: () => ring.setVisible(false),
    });
  }

  /** Rocket explosion ring (pooled). */
  blast(x: number, y: number, radius: number): void {
    sfx("blast");
    let c = this.blasts[this.nextBlast];
    if (!c) {
      c = this.scene.add.image(0, 0, "fx_blast").setDepth(DEPTH.PROJECTILES);
      this.blasts[this.nextBlast] = c;
    }
    this.nextBlast = (this.nextBlast + 1) % MAX_BLASTS;
    this.scene.tweens.killTweensOf(c);
    // the ring is drawn at BLAST_R design px in a 2x texture: full scale puts it on the blast radius
    const full = radius / (BLAST_R * ART_SCALE);
    c.setPosition(x, y).setScale(full * 0.3).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: c,
      scale: full,
      alpha: 0,
      duration: 200,
      onComplete: () => c.setVisible(false),
    });
  }
}
