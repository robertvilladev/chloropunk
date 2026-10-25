import { GAME_CONFIG, SCENE_KEYS } from "@/config/constants";
import { loadBest } from "@/core/summary";
import { MUSIC_CREDITS, MUSIC_LICENCE, setMusic } from "@/fx/music";
import { FONTS, THEME, THEME_CSS, numberStroke } from "@/config/theme";
import Phaser from "phaser";
import pkg from "../../package.json";
import { button, scanlines, text } from "./ui";

/** Slime-drip segments across the top edge: [width, height]; a final bar fills the rest. */
const DRIP: [number, number][] = [[80, 8], [16, 22], [120, 8], [16, 14], [200, 8], [16, 18]];
/** Skyline blocks along the bottom: [width, height, fill, top accent]. */
const SKYLINE: [number, number, number, number | null][] = [
  [90, 120, THEME.surface2, null], [60, 180, THEME.surface, THEME.pink], [110, 100, THEME.surface2, null],
  [70, 150, THEME.surface, null], [130, 90, THEME.surface2, THEME.lime], [60, 170, THEME.surface, null],
  [100, 120, THEME.surface2, null],
];

/** MenuScene - title screen. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create() {
    setMusic("menu");
    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;
    this.cameras.main.setBackgroundColor(THEME.bg);

    let x = 0;
    for (const [w, h, fill, accent] of SKYLINE) {
      this.add.rectangle(x, H, w, h, fill).setOrigin(0, 1);
      if (accent !== null) this.add.rectangle(x, H - h, w, 4, accent).setOrigin(0, 1);
      x += w + 4;
    }
    this.add.rectangle(x, H, W - x, 140, THEME.surface).setOrigin(0, 1);
    this.add.rectangle(x, H - 140, W - x, 4, THEME.pink).setOrigin(0, 1);
    this.add.rectangle(0, H, W, 40, THEME.deep).setOrigin(0, 1);

    x = 0;
    for (const [w, h] of DRIP) {
      this.add.rectangle(x, 0, w, h, THEME.lime).setOrigin(0);
      x += w;
    }
    this.add.rectangle(x, 0, W - x, 8, THEME.lime).setOrigin(0);

    text(this, 56, 96, "NEO-HARVEST DISTRICT · 2077", 10, THEME_CSS.textMuted).setLetterSpacing(2.4);
    // RGB-split logo, same layers as Juice.banner
    const layers: [number, string][] = [[-3, THEME_CSS.tier[1]], [3, THEME_CSS.pink], [0, THEME_CSS.lime]];
    for (const [dx, color] of layers) {
      this.add
        .text(56 + dx, 122, "CHLORO\nPUNK", { fontFamily: FONTS.display, fontSize: "64px", color, ...(dx ? {} : { stroke: THEME_CSS.deep, strokeThickness: numberStroke(64) }) })
        .setLineSpacing(-12);
    }
    text(this, 56, 276, "The harvest mutated. You didn't.", 14, THEME_CSS.textMuted);

    button(this, 56 + 130, 340, "START RUN", () => this.startRun(), true, true, { size: 18, font: "display", w: 260, h: 52 });
    text(
      this,
      56,
      374,
      "WASD / arrows to move\nWeapons auto-fire at nearby enemies\nCollect scrap to buy upgrades",
      11,
      THEME_CSS.textMuted
    ).setLineSpacing(2);
    const best = loadBest().wave;
    const label = text(this, 56, 432, "BEST", 11, THEME_CSS.textMuted).setLetterSpacing(1.1);
    text(this, 56 + label.width + 8, 432, best > 0 ? `WAVE ${best}` : "—", 11, THEME_CSS.pink300).setLetterSpacing(1.1);

    this.add.image(636, 340, "player_portrait").setScale(0.5); // 384 px texture -> 192 design px
    text(this, 16, H - 12, `v${pkg.version} // MVP`, 11, THEME_CSS.faint).setOrigin(0, 1);
    text(this, W - 112, H - 12, "MUSIC: NLV · SPRING (CC-BY 4.0)", 11, THEME_CSS.faint).setOrigin(1, 1);
    button(this, W - 52, H - 20, "CREDITS", () => this.showCredits(), false, true, { size: 11, w: 84, h: 26 });

    scanlines(this);
    this.cameras.main.fadeIn(300);
  }

  /** Full CC-BY attribution for the music; click anywhere or Esc closes it. */
  private showCredits(): void {
    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;
    const pw = 600, ph = 300, x = W / 2 - pw / 2, y = H / 2 - ph / 2;
    const parts: Phaser.GameObjects.GameObject[] = [this.add.rectangle(0, 0, W, H, THEME.bg, 0.8).setOrigin(0).setInteractive()];
    parts.push(this.add.rectangle(x + 4, y + 4, pw, ph, THEME.pink).setOrigin(0));
    parts.push(this.add.rectangle(x, y, pw, ph, THEME.surface).setOrigin(0).setStrokeStyle(1, THEME.lime));
    parts.push(text(this, W / 2, y + 36, "MUSIC CREDITS", 24, THEME_CSS.lime, "display").setOrigin(0.5));
    MUSIC_CREDITS.forEach((c, i) => {
      const ty = y + 76 + i * 76;
      parts.push(text(this, x + 24, ty, c.line, 14));
      parts.push(text(this, x + 24, ty + 22, c.source, 11, THEME_CSS.textMuted));
      parts.push(text(this, x + 24, ty + 40, c.changes, 11, THEME_CSS.textMuted));
    });
    parts.push(text(this, W / 2, y + ph - 48, MUSIC_LICENCE, 11, THEME_CSS.text).setOrigin(0.5));
    parts.push(text(this, W / 2, y + ph - 24, "Click or Esc to close", 10, THEME_CSS.faint).setOrigin(0.5));
    const overlay = this.add.container(0, 0, parts).setDepth(10);
    const close = () => overlay.destroy();
    parts[0].once("pointerdown", close);
    this.input.keyboard?.once("keydown-ESC", close);
  }

  private startRun(): void {
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => this.scene.start(SCENE_KEYS.LOADOUT));
  }
}
