import { SCENE_KEYS } from "@/config/constants";
import { THEME, THEME_CSS } from "@/config/theme";
import { newRun } from "@/core/run";
import { BASE_STATS } from "@/core/stats";
import { weaponStats } from "@/core/weapons";
import type { WeaponDef } from "@/types";
import weaponDefs from "@assets/data/weapons.json";
import Phaser from "phaser";
import { DISPLAY_FONT, onKeys, text } from "./ui";

const STARTERS = ["pistol", "shotgun", "blade"] as const;

/** LoadoutScene - pick 1 of 3 starting weapons, then start a fresh run. */
export class LoadoutScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.LOADOUT });
  }

  create() {
    this.cameras.main.setBackgroundColor(THEME.bg);
    this.add
      .text(400, 90, "PICK YOUR WEAPON", { fontFamily: DISPLAY_FONT, fontSize: "36px", color: THEME_CSS.lime })
      .setOrigin(0.5);

    STARTERS.forEach((id, i) => {
      const def = (weaponDefs as Record<string, WeaponDef>)[id];
      const ws = weaponStats(def, 1, BASE_STATS);
      const x = 70 + i * 230;
      const card = this.add
        .rectangle(x, 170, 200, 240, THEME.surface)
        .setOrigin(0)
        .setStrokeStyle(2, THEME.line);
      text(this, x + 10, 180, `[${i + 1}]`, 12, THEME_CSS.textMuted);
      text(this, x + 100, 230, def.name, 18).setOrigin(0.5);
      text(this, x + 100, 260, def.tags.join(" · "), 12, THEME_CSS.textMuted).setOrigin(0.5);
      text(this, x + 100, 330, `DMG ${ws.damage}\nCD ${ws.cooldown.toFixed(2)}s\nRANGE ${ws.range}`, 14).setOrigin(0.5);
      card.setInteractive({ useHandCursor: true });
      card.on("pointerover", () => card.setStrokeStyle(3, THEME.lime));
      card.on("pointerout", () => card.setStrokeStyle(2, THEME.line));
      card.on("pointerdown", () => this.start(id));
    });

    text(this, 400, 450, "Click or press 1-3 · ESC back", 14, THEME_CSS.textMuted).setOrigin(0.5);
    onKeys(this, (e) => {
      const digit = /^Digit([1-3])$/.exec(e.code);
      if (digit) this.start(STARTERS[Number(digit[1]) - 1]);
      else if (e.code === "Escape") this.scene.start(SCENE_KEYS.MENU);
    });
  }

  private start(weaponId: string): void {
    const urlSeed = Number(new URLSearchParams(window.location.search).get("seed"));
    const seed = Number.isInteger(urlSeed) && urlSeed !== 0 ? urlSeed : Date.now();
    console.info(`Run seed: ${seed}`);
    this.scene.start(SCENE_KEYS.GAME, { run: newRun(seed, weaponId) });
  }
}
