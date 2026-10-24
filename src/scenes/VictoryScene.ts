import wavesData from "@assets/data/waves.json";
import { duckMusic } from "@/fx/music";
import { SCENE_KEYS, GAME_CONFIG } from "@/config/constants";
import { endRun, saveRun } from "@/core/runlog";
import type { RunState } from "@/types";
import { THEME, THEME_CSS } from "@/config/theme";
import { button, panel, scanlines, statTile, text } from "./ui";
import Phaser from "phaser";
/**
 * VictoryScene - Displayed when player completes the round
 * Shows stats and provides options to continue or return to menu
 */
export class VictoryScene extends Phaser.Scene {
  private enemiesKilled: number = 0;
  private scrapEarned: number = 0;
  private run?: RunState;
  constructor() {
    super({ key: SCENE_KEYS.VICTORY });
  }
  init(data: { enemiesKilled?: number; scrapEarned?: number; run?: RunState }) {
    this.run = data.run;
    this.enemiesKilled = data.enemiesKilled || 0;
    this.scrapEarned = data.scrapEarned || 0;
  }
  create() {
    duckMusic(true);
    const { WIDTH: width, HEIGHT: height } = GAME_CONFIG;
    const cx = width / 2;
    this.cameras.main.setBackgroundColor(THEME.bg);
    scanlines(this);
    const pw = 460, ph = 330;
    panel(this, cx - pw / 2, height / 2 - ph / 2, pw, ph, { border: THEME.lime, shadow: true });
    text(this, cx, height / 2 - 120, "ROUND COMPLETE", 40, THEME_CSS.lime, "display").setOrigin(0.5);
    statTile(this, cx - 130, height / 2 - 55, "ENEMIES DEFEATED", String(this.enemiesKilled));
    statTile(this, cx + 30, height / 2 - 55, "SCRAP EARNED", String(this.scrapEarned), THEME_CSS.pink);
    const exit = () => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.stop(SCENE_KEYS.GAME); // it sits paused (and still renders) under this overlay
    };
    button(this, cx, height / 2 + 35, "CONTINUE", () => {
      exit();
      // Past the last defined wave the run is over (GameScene has saved it as won)
      if (this.run && this.run.wave > wavesData.waves.length) {
        this.scene.start(SCENE_KEYS.SUMMARY, { run: this.run, outcome: "victory" });
        return;
      }
      // One pick per level gained, then the shop
      const next = this.run && this.run.pendingLevelUps > 0 ? SCENE_KEYS.LEVEL_UP : SCENE_KEYS.SHOP;
      this.scene.start(next, { run: this.run });
    }, true, true, { size: 20, font: "display", w: 220, h: 48 });
    button(this, cx, height / 2 + 105, "MAIN MENU", () => {
      exit();
      if (this.run && !this.run.log.result) {
        endRun(this.run.log, "quit");
        saveRun(this.run.log);
      }
      this.scene.start(SCENE_KEYS.MENU);
    }, false, true, { size: 14, w: 220, h: 36 });

    console.log("✓ VictoryScene: Initialized");
  }
}
