import { DEPTH, SCENE_KEYS, GAME_CONFIG } from "@/config/constants";
import wavesData from "@assets/data/waves.json";
import { FONTS, THEME, THEME_CSS } from "@/config/theme";
import { edgeArrow } from "@/core/edgeArrow";
import { formatClock } from "@/core/labels";
import { waveBoost } from "@/core/voices";
import { sfx } from "@/fx/sfx";
import type { SoundName } from "@/fx/sounds";
import type { GameScene } from "@/scenes/GameScene";
import { cardGlow, drawPanel, fitImage, iconArt, num, panel, text, weaponArt } from "@/scenes/ui";
import { hudSlots } from "@/scenes/hud";
import itemDefs from "@assets/data/items.json";
import type { ItemDef, OwnedWeapon } from "@/types";
import { frameSize } from "@/art/body";
import Phaser from "phaser";

const HP_W = 216; // inner width of the 220px HP bar (2px border)
const BOSS_W = 276; // inner width of the 280px boss bar
const XP_W = 140;
const ARROWS = 12; // pooled off-screen telegraph arrows; more pending than this just go unmarked
const ARROW_INSET = 12;
const SCRAP_TEX = frameSize("pickup_scrap").w; // texture px of one scrap frame
const items = itemDefs as Record<string, ItemDef>;

/**
 * UIScene - Persistent UI overlay (HUD), per mockups/Hud.dc.html.
 * Runs parallel to GameScene; no scanlines over the arena.
 */
export class UIScene extends Phaser.Scene {
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpValue!: Phaser.GameObjects.Text;
  private hpFlash?: Phaser.Tweens.Tween;
  private vignette!: Phaser.GameObjects.Image;
  private vignetteTween?: Phaser.Tweens.Tween;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private levelText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private waveSplit: Phaser.GameObjects.Text[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private scrapBox!: Phaser.GameObjects.Graphics;
  private scrapGem!: Phaser.GameObjects.Image;
  private scrapValue!: Phaser.GameObjects.Text;
  private scrapLabel!: Phaser.GameObjects.Text;
  private speedButtons: Phaser.GameObjects.Container[] = [];
  private arrows: Phaser.GameObjects.Triangle[] = [];
  private bossFill?: Phaser.GameObjects.Rectangle;
  private gameSpeed: number = 1;

  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  create() {
    // Phaser reuses scene instances, so reset per-run fields
    this.speedButtons = [];
    this.gameSpeed = 1;
    this.hpFlash = undefined;
    this.vignetteTween = undefined;
    const w = GAME_CONFIG.WIDTH;
    const h = GAME_CONFIG.HEIGHT;

    // Screen-fixed effects live here: GameScene's camera follows the fighter
    this.vignette = this.add.image(0, 0, "vignette").setOrigin(0).setDisplaySize(w, h).setDepth(DEPTH.UI - 2).setAlpha(0);
    // Arrows on the screen edge for spawn telegraphs outside the view, in the telegraph's colour
    this.arrows = Array.from({ length: ARROWS }, () =>
      this.add.triangle(0, 0, 0, 0, 14, 7, 0, 14, THEME.danger).setStrokeStyle(2, THEME.text, 0.35).setDepth(DEPTH.UI - 1).setVisible(false)
    );

    // Top-left: HP bar, then XP bar + level
    panel(this, 30, 16, 220, 24, { fill: THEME.surface2 }).setDepth(DEPTH.UI);
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
    this.timerText = num(this, w / 2, 26, "", 26).setOrigin(0.5, 0).setDepth(DEPTH.UI);
    // Boss wave: the boss's name and HP bar replace the timer (M4b)
    const boss = (this.scene.get(SCENE_KEYS.GAME) as GameScene | undefined)?.getBoss();
    this.bossFill = undefined;
    if (boss) {
      this.timerText.setVisible(false);
      text(this, w / 2, 30, boss.name, 10, THEME_CSS.danger, "display").setLetterSpacing(1.4).setOrigin(0.5, 0).setDepth(DEPTH.UI);
      panel(this, w / 2 - 140, 46, 280, 12, { fill: THEME.surface2 }).setDepth(DEPTH.UI);
      this.bossFill = this.add.rectangle(w / 2 - 138, 48, BOSS_W, 8, THEME.danger).setOrigin(0).setDepth(DEPTH.UI);
    }

    // Top-right: scrap (laid out right-to-left in layoutScrap so any digit count fits)
    this.scrapBox = this.add.graphics().setDepth(DEPTH.UI);
    this.scrapGem = this.add.image(0, 34, "pickup_scrap", "0").setScale(22 / SCRAP_TEX).setDepth(DEPTH.UI + 1);
    this.scrapValue = num(this, 0, 23, "0", 18, THEME_CSS.lime).setOrigin(1, 0).setDepth(DEPTH.UI + 1);
    this.scrapLabel = text(this, 0, 30, "SCRAP", 10, THEME_CSS.textMuted).setLetterSpacing(1.4).setOrigin(1, 0).setDepth(DEPTH.UI + 1);

    // Bottom-left: weapons + owned items (board U4); both only change in the shop and this scene restarts each wave
    const run = (this.scene.get(SCENE_KEYS.GAME) as GameScene | undefined)?.getPlayerStats();
    if (run) this.drawInventory(run.weapons, run.items, w, h);

    if (import.meta.env.DEV) this.createSpeedControls(h);

    // Listen for game events
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    if (gameScene) {
      gameScene.events.on("playerHealthChanged", this.updateHealth, this);
      gameScene.events.on("timerUpdate", this.updateTimer, this);
      gameScene.events.on("scrapCollected", this.refresh, this);
      gameScene.events.on("banner", this.banner, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        gameScene.events.off("playerHealthChanged", this.updateHealth, this);
        gameScene.events.off("timerUpdate", this.updateTimer, this);
        gameScene.events.off("scrapCollected", this.refresh, this);
        gameScene.events.off("banner", this.banner, this);
        this.hpFlash?.stop();
      });
      this.refresh();
      // This scene starts with each wave, after GameScene.create
      const wave = (gameScene as GameScene).getPlayerStats().wave;
      this.banner(boss ? boss.name : `WAVE ${String(wave).padStart(2, "0")}`, wave);
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

  /** Weapon slots (sprite at its tier frame, tier rim, T3/T4 glow) and item chips (rarity rim, stack count). */
  private drawInventory(weapons: readonly OwnedWeapon[], owned: readonly string[], w: number, h: number): void {
    const layout = hudSlots(weapons, owned, w, h);
    const g = this.add.graphics().setDepth(DEPTH.UI);
    for (const s of layout.weapons) {
      const glow = cardGlow(this, s.x, s.y, s.size, s.size, s.tier);
      if (glow) Object.values(glow).forEach((o) => o.setDepth(DEPTH.UI - 1));
      drawPanel(g, s.x, s.y, s.size, s.size, { fill: THEME.surface2, frame: THEME.tier[s.tier - 1], keyline: false });
      fitImage(this, s.x + s.size / 2, s.y + s.size / 2, weaponArt(s.id, s.tier), s.size - 6).setDepth(DEPTH.UI + 1);
    }
    for (const c of layout.items) {
      drawPanel(g, c.x, c.y, c.size, c.size, { fill: THEME.surface2, frame: THEME.tier[(items[c.id]?.rarity ?? 1) - 1], keyline: false });
      fitImage(this, c.x + c.size / 2, c.y + c.size / 2, iconArt("item", c.id), c.size - 4).setDepth(DEPTH.UI + 1);
      if (c.count > 1) num(this, c.x + c.size + 1, c.y + c.size + 2, String(c.count), 9).setOrigin(1, 1).setDepth(DEPTH.UI + 2);
    }
    if (layout.more) {
      const m = layout.more;
      drawPanel(g, m.x, m.y, m.size, m.size, { fill: THEME.surface2, keyline: false });
      num(this, m.x + m.size / 2, m.y + m.size / 2, `+${m.n}`, 9, THEME_CSS.textMuted).setOrigin(0.5).setDepth(DEPTH.UI + 1);
    }
  }

  /** Right-align label, value and gem inside a box sized to the text. */
  private layoutScrap(): void {
    const right = GAME_CONFIG.WIDTH - 30;
    this.scrapLabel.setX(right - 10);
    this.scrapValue.setX(this.scrapLabel.x - this.scrapLabel.width - 8);
    this.scrapGem.setX(this.scrapValue.x - this.scrapValue.width - 6 - 11);
    const left = this.scrapGem.x - 11 - 8;
    drawPanel(this.scrapBox.clear(), left, 16, right - left, 36, { fill: THEME.surface2 });
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
  update(): void {
    const game = this.scene.get(SCENE_KEYS.GAME) as GameScene;
    const view = game.cameras.main.worldView;
    const pending = game.getTelegraphs();
    let used = 0;
    for (let i = 0; i < pending.length && used < ARROWS; i++) {
      const a = edgeArrow(pending[i], view, ARROW_INSET);
      if (a) this.arrows[used++].setPosition(a.x, a.y).setRotation(a.angle).setVisible(true);
    }
    for (; used < ARROWS; used++) this.arrows[used].setVisible(false);
    const boss = game.getBoss();
    if (boss && this.bossFill) {
      const { hp, max } = boss.hp;
      this.bossFill.width = BOSS_W * Phaser.Math.Clamp(hp / max, 0, 1);
      this.bossFill.setFillStyle(boss.phase === 2 ? THEME.pink : THEME.danger);
    }
  }

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
    this.lowHp(low && current > 0);
  }

  /** Pulsing danger vignette while HP is low. */
  private lowHp(on: boolean): void {
    if (!on) {
      this.vignetteTween?.stop();
      this.vignetteTween = undefined;
      this.vignette.setAlpha(0);
    } else if (!this.vignetteTween) {
      sfx("lowHp");
      this.vignetteTween = this.tweens.add({
        targets: this.vignette,
        alpha: { from: 0.35, to: 1 },
        duration: 450,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  /** Wave banner + its sound, a little louder and higher each wave. GameScene emits "banner" for the wave end. */
  private banner(text: string, wave: number, sound: SoundName = "waveStart"): void {
    const boost = waveBoost(wave);
    sfx(sound, boost.rate, boost.gain);
    const { WIDTH: w, HEIGHT: h } = GAME_CONFIG;
    // Pink/cyan RGB-split shadows behind the lime face
    const layers: [number, string][] = [
      [-3, THEME_CSS.tier[1]],
      [3, THEME_CSS.pink],
      [0, THEME_CSS.lime],
    ];
    const texts = layers.map(([dx, color]) =>
      this.add
        .text(w / 2 + dx, h / 3, text, {
          fontFamily: FONTS.display,
          fontSize: "64px",
          color,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.UI - 1)
    );
    this.tweens.add({
      targets: texts,
      alpha: 0,
      y: h / 3 - 20,
      delay: 500,
      duration: 400,
      onComplete: () => texts.forEach((t) => t.destroy()),
    });
  }

  /**
   * Update timer display (danger in the last 5 s)
   */
  updateTimer(timeRemaining: number): void {
    this.timerText.setColor(timeRemaining <= 5 ? THEME_CSS.danger : THEME_CSS.text);
    this.timerText.setText(formatClock(timeRemaining));
  }
}
