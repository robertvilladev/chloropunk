import { SCENE_KEYS, GAME_CONFIG } from "@/config/constants";
import { THEME, THEME_CSS } from "@/config/theme";
import { sfx } from "@/fx/sfx";
import { button, panel, scanlines, text } from "./ui";
import Phaser from "phaser";

/**
 * GameOverScene - Displayed when player dies
 * Provides options to retry or return to main menu
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  private complete = false;

  init(data: { complete?: boolean }) {
    this.complete = !!data.complete;
  }

  create() {
    const { WIDTH: width, HEIGHT: height } = GAME_CONFIG;
    const cx = width / 2;
    const accent = this.complete ? THEME.lime : THEME.danger;
    this.cameras.main.setBackgroundColor(THEME.bg);
    sfx(this.complete ? "runComplete" : "gameOver");
    scanlines(this);
    const pw = 460, ph = 330;
    panel(this, cx - pw / 2, height / 2 - ph / 2, pw, ph, { border: accent, shadow: true });
    text(this, cx, height / 2 - 105, this.complete ? "RUN COMPLETE" : "GAME OVER", 44, this.complete ? THEME_CSS.lime : THEME_CSS.danger, "display").setOrigin(0.5);
    text(this, cx, height / 2 - 55, this.complete ? "You cleared every wave!" : "You were defeated!", 16, THEME_CSS.textMuted).setOrigin(0.5);

    const toMenu = () => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.stop(SCENE_KEYS.GAME); // it sits paused under this overlay
      this.scene.start(SCENE_KEYS.MENU);
    };
    button(this, cx, height / 2 + 20, "TRY AGAIN", () => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.stop(SCENE_KEYS.GAME); // it sits paused under this overlay
      this.scene.start(SCENE_KEYS.LOADOUT); // new run: pick a weapon again
    }, true, true, { size: 20, font: "display", w: 220, h: 48 });
    button(this, cx, height / 2 + 90, "MAIN MENU", toMenu, false, true, { size: 14, w: 220, h: 36 });

    // ESC to menu
    this.input.keyboard?.once("keydown-ESC", toMenu);

    console.log("✓ GameOverScene: Initialized");
  }
}
