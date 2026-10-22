import { DEPTH, SCENE_KEYS, GAME_CONFIG } from "@/config/constants";
import wavesData from "@assets/data/waves.json";
import { THEME, THEME_CSS } from "@/config/theme";
import { formatClock } from "@/core/labels";
import type { GameScene } from "@/scenes/GameScene";
import { panel, text } from "@/scenes/ui";
import Phaser from "phaser";

const HP_W = 216; // inner width of the 220px HP bar (2px border)
const XP_W = 140;

/**
 * UIScene - Persistent UI overlay (HUD), per mockups/Hud.dc.html.
 * Runs parallel to GameScene; no scanlines over the arena.
 */
export class UIScene extends Phaser.Scene {
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpValue!: Phaser.GameObjects.Text;
  private hpFlash?: Phaser.Tweens.Tween;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private levelText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private waveSplit: Phaser.GameObjects.Text[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private scrapBox!: Phaser.GameObjects.Rectangle;
  private scrapGem!: Phaser.GameObjects.Rectangle;
  private scrapValue!: Phaser.GameObjects.Text;
  private scrapLabel!: Phaser.GameObjects.Text;
  private speedButtons: Phaser.GameObjects.Container[] = [];
  private gameSpeed: number = 1;

  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  create() {
    // Phaser reuses scene instances, so reset per-run fields
    this.speedButtons = [];
    this.gameSpeed = 1;
    this.hpFlash = undefined;
    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;

    // Top-left: HP bar, then XP bar + level
    panel(this, 30, 16, 220, 24, { fill: THEME.surface2 }).setStrokeStyle(2, THEME.line).setDepth(DEPTH.UI);
    this.hpFill = this.add.rectangle(32, 18, HP_W, 20, THEME.danger).setOrigin(0).setDepth(DEPTH.UI);
    text(this, 36, 28, "HP", 11).setFontStyle("600").setOrigin(0, 0.5).setDepth(DEPTH.UI + 1);
    this.hpValue = text(this, 244, 28, "", 11).setFontStyle("600").setOrigin(1, 0.5).setDepth(DEPTH.UI + 1);
    this.add.rectangle(30, 49, XP_W, 6, THEME.surface2).setOrigin(0, 0.5).setDepth(DEPTH.UI);
    this.xpFill = this.add.rectangle(30, 49, XP_W, 6, THEME.pink).setOrigin(0, 0.5).setDepth(DEPTH.UI);
    this.levelText = text(this, 30 + XP_W + 8, 49, "LV 1", 10, THEME_CSS.pink300).setLetterSpacing(1.4).setOrigin(0, 0.5).setDepth(DEPTH.UI);

    // Top-centre: wave + timer
    // 1px RGB split: pink +1px / cyan -1px behind the lime label
    this.waveText = text(this, w / 2, 10, "", 12, THEME_CSS.lime, "display").setOrigin(0.5, 0).setDepth(DEPTH.UI);
    this.waveSplit = [
      text(this, w / 2 + 1, 10, "", 12, THEME_CSS.pink, "display").setOrigin(0.5, 0).setDepth(DEPTH.UI - 1),
      text(this, w / 2 - 1, 10, "", 12, THEME_CSS.tier[1], "display").setOrigin(0.5, 0).setDepth(DEPTH.UI - 1),
    ];
    this.timerText = text(this, w / 2, 24, "", 40, THEME_CSS.text, "pixel").setOrigin(0.5, 0).setDepth(DEPTH.UI);

    // Top-right: scrap (laid out right-to-left in layoutScrap so any digit count fits)
    this.scrapBox = panel(this, w - 30, 16, 100, 36, { fill: THEME.surface2 })
      .setOrigin(1, 0)
      .setStrokeStyle(2, THEME.line)
      .setDepth(DEPTH.UI);
    this.scrapGem = this.add.rectangle(0, 34, 10, 10, THEME.lime).setAngle(45).setDepth(DEPTH.UI + 1);
    this.scrapValue = text(this, 0, 20, "0", 26, THEME_CSS.lime, "pixel").setOrigin(1, 0).setDepth(DEPTH.UI + 1);
    this.scrapLabel = text(this, 0, 30, "SCRAP", 10, THEME_CSS.textMuted).setLetterSpacing(1.4).setOrigin(1, 0).setDepth(DEPTH.UI + 1);

    // Bottom-left: 6 weapon slots, framed by tier colour (no icons); weapons only change in the shop
    const owned = (this.scene.get(SCENE_KEYS.GAME) as GameScene | undefined)?.getPlayerStats().weapons ?? [];
    for (let i = 0; i < 6; i++) {
      const wpn = owned[i];
      this.add
        .rectangle(30 + i * 42, h - 52, 36, 36, THEME.surface2)
        .setOrigin(0)
        .setStrokeStyle(2, wpn ? THEME.tier[wpn.tier - 1] : THEME.line)
        .setDepth(DEPTH.UI);
    }

    if (import.meta.env.DEV) this.createSpeedControls(h);

    // Listen for game events
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    if (gameScene) {
      gameScene.events.on("playerHealthChanged", this.updateHealth, this);
      gameScene.events.on("timerUpdate", this.updateTimer, this);
      gameScene.events.on("scrapCollected", this.refresh, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        gameScene.events.off("playerHealthChanged", this.updateHealth, this);
        gameScene.events.off("timerUpdate", this.updateTimer, this);
        gameScene.events.off("scrapCollected", this.refresh, this);
        this.hpFlash?.stop();
      });
      this.refresh();
    }
  }

  /**
   * Pull current values from GameScene (its initial events fire before this scene exists)
   */
  private refresh = (): void => {
    const stats = (this.scene.get(SCENE_KEYS.GAME) as GameScene).getPlayerStats();
    this.updateHealth(stats.health, stats.maxHealth);
    const wave = `WAVE ${String(stats.wave).padStart(2, "0")} / ${wavesData.waves.length}`;
    [this.waveText, ...this.waveSplit].forEach((t) => t.setText(wave));
    this.scrapValue.setText(String(stats.scrap));
    this.layoutScrap();
    this.xpFill.width = XP_W * Math.min(1, stats.xp / stats.xpNeeded);
    this.levelText.setText(`LV ${stats.level}${stats.pending > 0 ? ` (+${stats.pending})` : ""}`);
  };

  /** Right-align label, value and gem inside a box sized to the text. */
  private layoutScrap(): void {
    const right = GAME_CONFIG.WIDTH - 30;
    this.scrapLabel.setX(right - 10);
    this.scrapValue.setX(this.scrapLabel.x - this.scrapLabel.width - 8);
    this.scrapGem.setX(this.scrapValue.x - this.scrapValue.width - 8 - 5);
    this.scrapBox.setSize(right - (this.scrapGem.x - 5) + 10, 36);
  }

  /**
   * Dev-only speed buttons (keys 1/2/3 too)
   */
  private createSpeedControls(h: number): void {
    const speeds = [1, 2, 3];
    const startX = GAME_CONFIG.WIDTH - 120;
    speeds.forEach((speed, index) => {
      this.speedButtons.push(this.createSpeedButton(startX + index * 35, h - 30, speed));
    });

    const kb = this.input.keyboard;
    // Phaser names digit keys: keydown-ONE, not keydown-1
    const keys = ["ONE", "TWO", "THREE"];
    const handlers = speeds.map((speed, i) => {
      const fn = () => this.setGameSpeed(speed);
      kb?.on(`keydown-${keys[i]}`, fn);
      return fn;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      keys.forEach((key, i) => kb?.off(`keydown-${key}`, handlers[i]))
    );
    this.updateSpeedButtons();
  }

  private createSpeedButton(x: number, y: number, speed: number): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 30, 30, THEME.surface2).setStrokeStyle(2, THEME.line);
    const label = text(this, 0, 0, String(speed), 14, THEME_CSS.text).setOrigin(0.5);
    const button = this.add.container(x, y, [bg, label]).setDepth(DEPTH.UI).setSize(30, 30);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => this.setGameSpeed(speed));
    return button;
  }

  private setGameSpeed(speed: number): void {
    this.gameSpeed = speed;
    this.updateSpeedButtons();
    this.scene.get(SCENE_KEYS.GAME)?.events.emit("speedChanged", speed);
  }

  private updateSpeedButtons(): void {
    this.speedButtons.forEach((button, index) => {
      const active = index + 1 === this.gameSpeed;
      (button.list[0] as Phaser.GameObjects.Rectangle).setFillStyle(active ? THEME.lime : THEME.surface2);
      (button.list[1] as Phaser.GameObjects.Text).setColor(active ? THEME_CSS.limeInk : THEME_CSS.text);
    });
  }

  /**
   * Update health display; under 25% the fill turns danger and the readout flashes
   */
  updateHealth(current: number, max: number) {
    const low = max > 0 && current / max < 0.25;
    this.hpFill.width = HP_W * Phaser.Math.Clamp(current / max, 0, 1);
    this.hpValue.setText(`${Math.ceil(current)}/${max}`);
    this.hpValue.setColor(low ? THEME_CSS.danger : THEME_CSS.text);
    if (low && !this.hpFlash) {
      this.hpFlash = this.tweens.add({ targets: this.hpValue, alpha: 0.3, duration: 250, yoyo: true, repeat: -1 });
    } else if (!low && this.hpFlash) {
      this.hpFlash.stop();
      this.hpFlash = undefined;
      this.hpValue.setAlpha(1);
    }
  }

  /**
   * Update timer display (danger in the last 5 s)
   */
  updateTimer(timeRemaining: number): void {
    this.timerText.setColor(timeRemaining <= 5 ? THEME_CSS.danger : THEME_CSS.text);
    this.timerText.setText(formatClock(timeRemaining));
  }
}
