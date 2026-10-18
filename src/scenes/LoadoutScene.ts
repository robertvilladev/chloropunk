import { GAME_CONFIG, SCENE_KEYS } from "@/config/constants";
import { THEME, THEME_CSS } from "@/config/theme";
import { newRun } from "@/core/run";
import { BASE_STATS } from "@/core/stats";
import { weaponStats } from "@/core/weapons";
import type { WeaponDef } from "@/types";
import character from "@assets/data/character.json";
import weaponDefs from "@assets/data/weapons.json";
import Phaser from "phaser";
import { button, onKeys, panel, scanlines, text } from "./ui";

const STARTERS = ["pistol", "shotgun", "blade"] as const;
const TOP = 134;
const H = 300;

/** LoadoutScene - pick 1 of 3 starting weapons, then start a fresh run. */
export class LoadoutScene extends Phaser.Scene {
  private selected = 0;

  constructor() {
    super({ key: SCENE_KEYS.LOADOUT });
  }

  create() {
    this.selected = 0;
    this.cameras.main.setBackgroundColor(THEME.bg);
    text(this, 32, 32, "LOADOUT", 10, THEME_CSS.pink300).setLetterSpacing(1.8);
    text(this, 32, 50, "PICK YOUR STARTER", 32, THEME_CSS.text, "display");
    text(this, 32, 98, "One weapon to start. You'll find more in the shop.", 13, THEME_CSS.textMuted);

    this.characterPanel();

    const faces: Phaser.GameObjects.Rectangle[] = [];
    const shadows: Phaser.GameObjects.Rectangle[] = [];
    const refresh = () =>
      faces.forEach((f, i) => {
        const on = i === this.selected;
        f.setStrokeStyle(2, on ? THEME.pink : THEME.line);
        shadows[i].setVisible(on);
      });
    STARTERS.forEach((id, i) => {
      const def = (weaponDefs as Record<string, WeaponDef>)[id];
      const ws = weaponStats(def, 1, BASE_STATS);
      const x = 256 + i * 176;
      shadows.push(this.add.rectangle(x + 4, TOP + 4, 160, H, THEME.pink).setOrigin(0));
      const face = this.add.rectangle(x, TOP, 160, H, THEME.surface).setOrigin(0);
      faces.push(face);
      this.add.rectangle(x + 16, TOP + 16, 128, 72, THEME.surface2).setOrigin(0);
      text(this, x + 80, TOP + 52, String(i + 1), 40, THEME_CSS.faint, "pixel").setOrigin(0.5);
      text(this, x + 16, TOP + 104, def.name.toUpperCase(), 14, THEME_CSS.text, "display").setWordWrapWidth(128);
      text(this, x + 16, TOP + 152, [...def.tags, def.behavior.replace(/^melee-?/, "")].filter(Boolean).join(" · ").toUpperCase(), 9, THEME_CSS.textMuted)
        .setLetterSpacing(1.2)
        .setWordWrapWidth(128);
      text(this, x + 16, TOP + 172, `${ws.damage} dmg · ${+ws.cooldown.toFixed(2)}s\n${ws.range} range`, 12)
        .setFontStyle("600")
        .setWordWrapWidth(128);
      text(this, x + 16, TOP + 214, def.blurb, 11, THEME_CSS.textMuted).setWordWrapWidth(128);
      face.setInteractive({ useHandCursor: true });
      face.on("pointerover", () => {
        this.selected = i;
        refresh();
      });
      face.on("pointerdown", () => this.start(id));
    });
    refresh();

    button(this, 32 + 36, 542, "BACK", () => this.scene.start(SCENE_KEYS.MENU), false, true, { size: 13, w: 72, h: 44 });
    button(this, 768 - 76, 542, "DROP IN", () => this.start(STARTERS[this.selected]), true, true, {
      size: 18,
      font: "display",
      w: 152,
      h: 52,
    });
    scanlines(this);

    onKeys(this, (e) => {
      const digit = /^Digit([1-3])$/.exec(e.code);
      if (digit) this.start(STARTERS[Number(digit[1]) - 1]);
      else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        this.selected = (this.selected + (e.code === "ArrowRight" ? 1 : STARTERS.length - 1)) % STARTERS.length;
        refresh();
      } else if (e.code === "Escape") this.scene.start(SCENE_KEYS.MENU);
    });
  }

  private characterPanel(): void {
    panel(this, 32, TOP, 200, H, { fill: THEME.surface2 }).setStrokeStyle(2, THEME.line);
    text(this, 48, TOP + 16, character.title, 10, THEME_CSS.textMuted).setLetterSpacing(1.4);
    this.add.image(132, TOP + 94, "player", "walk0").setDisplaySize(128, 128);
    text(this, 48, TOP + 168, character.name.toUpperCase(), 16, THEME_CSS.text, "display");
    const rows: [string, number][] = [
      ["Max HP", BASE_STATS.maxHp],
      ["Speed", GAME_CONFIG.INITIAL_PLAYER_SPEED],
      ["Armor", BASE_STATS.armor],
      ["Pickup range", BASE_STATS.pickupRadius],
    ];
    rows.forEach(([label, value], i) => {
      const y = TOP + 208 + i * 20;
      text(this, 48, y, label, 12, THEME_CSS.textMuted);
      text(this, 216, y, String(value), 12, THEME_CSS.pink300).setFontStyle("600").setOrigin(1, 0);
    });
  }

  private start(weaponId: string): void {
    const urlSeed = Number(new URLSearchParams(window.location.search).get("seed"));
    const seed = Number.isInteger(urlSeed) && urlSeed !== 0 ? urlSeed : Date.now();
    console.info(`Run seed: ${seed}`);
    this.scene.start(SCENE_KEYS.GAME, { run: newRun(seed, weaponId) });
  }
}
