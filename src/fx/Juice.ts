import { DEPTH } from "@/config/constants";
import { THEME, THEME_CSS } from "@/config/theme";
import { loadSettings } from "@/core/settings";
import Phaser from "phaser";

const MAX_NUMBERS = 60;
const PIXEL_FONT = "VT323, monospace";
const DISPLAY_FONT = "Bungee, Impact, sans-serif";
const LOW_HP = 0.25;
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
  private numbers: Phaser.GameObjects.Text[] = [];
  private nextNumber = 0;
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
  }

  damageNumber(x: number, y: number, amount: number, crit: boolean): void {
    let t = this.numbers[this.nextNumber];
    if (!t) {
      t = this.scene.add
        .text(0, 0, "", { fontFamily: PIXEL_FONT })
        .setOrigin(0.5)
        .setDepth(DEPTH.UI - 2);
      this.numbers[this.nextNumber] = t;
    }
    this.nextNumber = (this.nextNumber + 1) % MAX_NUMBERS;

    this.scene.tweens.killTweensOf(t);
    t.setText(String(Math.round(amount)))
      .setFontSize(crit ? 36 : 24)
      .setColor(crit ? THEME_CSS.lime : THEME_CSS.text)
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
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = this.scene.add
        .rectangle(x, y, 4, 4, color)
        .setDepth(DEPTH.GROUND_EFFECTS);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * 28,
        y: y + Math.sin(a) * 28,
        alpha: 0,
        duration: 350,
        onComplete: () => p.destroy(),
      });
    }
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
          fontFamily: DISPLAY_FONT,
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
