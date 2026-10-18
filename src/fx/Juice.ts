import { DEPTH } from "@/config/constants";
import { FONTS, THEME, THEME_CSS } from "@/config/theme";
import { loadSettings } from "@/core/settings";
import Phaser from "phaser";

const MAX_NUMBERS = 40; // per pool (normal, crit)
const LOW_HP = 0.25;
const MAX_BLASTS = 8;
const SHAKES = {
  hit: { ms: 120, intensity: 0.006 },
  kill: { ms: 80, intensity: 0.003 },
};

/**
 * Juice - all hit/kill feedback effects. Scenes and managers only call this.
 */
export class Juice {
  private scene: Phaser.Scene;
  private reducedShake: boolean;
  // Two pre-styled pools so a hit only calls setText (each style change re-renders)
  private pools = { normal: [] as Phaser.GameObjects.Text[], crit: [] as Phaser.GameObjects.Text[] };
  private next = { normal: 0, crit: 0 };
  private burst: Phaser.GameObjects.Particles.ParticleEmitter;
  private blasts: Phaser.GameObjects.Arc[] = [];
  private nextBlast = 0;
  private vignette: Phaser.GameObjects.Graphics;
  private vignetteTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.reducedShake = loadSettings().reducedShake; // read once
    const { width: w, height: h } = scene.scale;
    const edge = 90;
    this.vignette = scene.add
      .graphics()
      .setDepth(DEPTH.UI - 1)
      .setAlpha(0);
    this.vignette.fillGradientStyle(THEME.danger, THEME.danger, THEME.danger, THEME.danger, 0.7, 0.7, 0, 0);
    this.vignette.fillRect(0, 0, w, edge);
    this.vignette.fillGradientStyle(THEME.danger, THEME.danger, THEME.danger, THEME.danger, 0, 0, 0.7, 0.7);
    this.vignette.fillRect(0, h - edge, w, edge);
    this.vignette.fillGradientStyle(THEME.danger, THEME.danger, THEME.danger, THEME.danger, 0.7, 0, 0.7, 0);
    this.vignette.fillRect(0, 0, edge, h);
    this.vignette.fillGradientStyle(THEME.danger, THEME.danger, THEME.danger, THEME.danger, 0, 0.7, 0, 0.7);
    this.vignette.fillRect(w - edge, 0, edge, h);
    this.burst = scene.add
      .particles(0, 0, "pixel", {
        emitting: false,
        speed: 80,
        lifespan: 350,
        alpha: { start: 1, end: 0 },
      })
      .setDepth(DEPTH.ENEMIES + 1);
  }

  damageNumber(x: number, y: number, amount: number, crit: boolean): void {
    const kind = crit ? "crit" : "normal";
    const pool = this.pools[kind];
    let t = pool[this.next[kind]];
    if (!t) {
      t = this.scene.add
        .text(0, 0, "", {
          fontFamily: FONTS.pixel,
          fontSize: crit ? "36px" : "24px",
          color: crit ? THEME_CSS.lime : THEME_CSS.text,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.UI - 2);
      pool[this.next[kind]] = t;
    }
    this.next[kind] = (this.next[kind] + 1) % MAX_NUMBERS;

    this.scene.tweens.killTweensOf(t);
    t.setText(String(Math.round(amount)))
      .setPosition(x, y)
      .setAlpha(1)
      .setVisible(true);
    this.scene.tweens.add({
      targets: t,
      y: y - 24,
      alpha: 0,
      duration: 600,
      onComplete: () => t.setVisible(false),
    });
  }

  hitFlash(sprite: Phaser.GameObjects.Sprite): void {
    sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => sprite.clearTint());
  }

  shake(kind: "hit" | "kill"): void {
    if (this.reducedShake) return;
    const s = SHAKES[kind];
    this.scene.cameras.main.shake(s.ms, s.intensity);
  }

  deathBurst(x: number, y: number, color: number): void {
    this.burst.particleTint = color;
    this.burst.explode(8, x, y);
  }

  /** Rocket explosion ring (pooled). */
  blast(x: number, y: number, radius: number): void {
    let c = this.blasts[this.nextBlast];
    if (!c) {
      c = this.scene.add
        .circle(0, 0, 1, THEME.danger, 0.35)
        .setStrokeStyle(2, THEME.danger)
        .setDepth(DEPTH.PROJECTILES);
      this.blasts[this.nextBlast] = c;
    }
    this.nextBlast = (this.nextBlast + 1) % MAX_BLASTS;
    this.scene.tweens.killTweensOf(c);
    c.setRadius(radius).setPosition(x, y).setScale(0.3).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: c,
      scale: 1,
      alpha: 0,
      duration: 200,
      onComplete: () => c.setVisible(false),
    });
  }

  lowHp(ratio: number): void {
    if (ratio >= LOW_HP || ratio <= 0) {
      this.vignetteTween?.stop();
      this.vignetteTween = undefined;
      this.vignette.setAlpha(0);
    } else if (!this.vignetteTween) {
      this.vignetteTween = this.scene.tweens.add({
        targets: this.vignette,
        alpha: { from: 0.35, to: 1 },
        duration: 450,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  banner(text: string): void {
    const { width: w, height: h } = this.scene.scale;
    // Pink/cyan RGB-split shadows behind the lime face
    const layers: [number, string][] = [
      [-3, THEME_CSS.tier[1]],
      [3, THEME_CSS.pink],
      [0, THEME_CSS.lime],
    ];
    const texts = layers.map(([dx, color]) =>
      this.scene.add
        .text(w / 2 + dx, h / 3, text, {
          fontFamily: FONTS.display,
          fontSize: "64px",
          color,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.UI - 2)
    );
    this.scene.tweens.add({
      targets: texts,
      alpha: 0,
      y: h / 3 - 20,
      delay: 500,
      duration: 400,
      onComplete: () => texts.forEach((t) => t.destroy()),
    });
  }
}
