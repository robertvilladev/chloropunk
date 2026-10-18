import { SCENE_KEYS } from "@/config/constants";
import { FONTS, THEME, THEME_CSS } from "@/config/theme";
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
    const { width: W, height: H } = this.scale;
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
        .text(56 + dx, 122, "VEGGIE\nVENDETTA", { fontFamily: FONTS.display, fontSize: "64px", color })
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

    this.add.image(636, 340, "player", "walk0").setScale(4);
    text(this, 16, H - 12, `v${pkg.version} // MVP`, 16, THEME_CSS.faint, "pixel").setOrigin(0, 1);

    scanlines(this);
    this.cameras.main.fadeIn(300);
  }

  private startRun(): void {
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => this.scene.start(SCENE_KEYS.LOADOUT));
  }
}
