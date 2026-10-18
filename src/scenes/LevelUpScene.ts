import { SCENE_KEYS } from "@/config/constants";
import { THEME, THEME_CSS } from "@/config/theme";
import { applyUpgrade, rollUpgrades, type UpgradeChoice } from "@/core/levelup";
import { createRng, type Rng } from "@/core/rng";
import { rerollCost } from "@/core/shop";
import { STAT_LABELS, computeStats, statDiff } from "@/core/stats";
import type { RunState } from "@/types";
import Phaser from "phaser";
import { DISPLAY_FONT, button, onKeys, text } from "./ui";

/**
 * LevelUpScene - one pick per pending level (1 of 4 stat upgrades, paid
 * reroll). Restarts itself until no levels are pending, then opens the shop.
 */
export class LevelUpScene extends Phaser.Scene {
  private run!: RunState;
  private rng!: Rng;
  private choices: UpgradeChoice[] = [];
  private rerolls = 0;
  private focus = -1; // card focused with arrow keys (shows its preview)
  private ui!: Phaser.GameObjects.Container;
  private info!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.LEVEL_UP });
  }

  create(data: { run: RunState }) {
    this.run = data.run;
    this.rerolls = 0;
    this.focus = -1;
    this.rng = createRng(this.run.seed + this.run.wave * 1013 + this.run.pendingLevelUps);
    this.choices = this.roll();
    this.cameras.main.setBackgroundColor(THEME.bg);
    onKeys(this, (e) => {
      const digit = /^Digit([1-4])$/.exec(e.code);
      if (digit) this.pick(Number(digit[1]) - 1);
      else if (e.code === "KeyR") this.reroll();
      else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        this.focus = (this.focus + (e.code === "ArrowLeft" ? 3 : 1)) % 4;
        this.render();
        this.preview(this.choices[this.focus]);
      }
    });
    this.ui = this.add.container(0, 0);
    this.render();
  }

  private roll(): UpgradeChoice[] {
    return rollUpgrades(this.rng, this.run.wave, computeStats(this.run).luck);
  }

  private pick(i: number): void {
    const c = this.choices[i];
    if (!c) return;
    applyUpgrade(this.run, c);
    if (this.run.pendingLevelUps > 0) this.scene.restart({ run: this.run });
    else this.scene.start(SCENE_KEYS.SHOP, { run: this.run });
  }

  private reroll(): void {
    const cost = rerollCost(this.run.wave, this.rerolls);
    if (this.run.scrap < cost) {
      this.info.setText("Not enough scrap to reroll").setColor(THEME_CSS.danger);
      return;
    }
    this.run.scrap -= cost;
    this.rerolls++;
    this.choices = this.roll();
    this.render();
  }

  private preview(c: UpgradeChoice): void {
    const now = computeStats(this.run);
    const after = computeStats({
      ...this.run,
      levelMods: { ...this.run.levelMods, [c.stat]: (this.run.levelMods[c.stat] ?? 0) + c.amount },
    });
    const d = statDiff(now, after);
    this.info
      .setText(d.map(([k, v]) => `${STAT_LABELS[k]}: ${now[k]} → ${now[k] + v}`).join("   ") || "No change (capped)")
      .setColor(THEME_CSS.lime);
  }

  private render(): void {
    this.ui.removeAll(true);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      this.ui.add(o);
      return o;
    };
    add(
      this.add
        .text(400, 70, "LEVEL UP", { fontFamily: DISPLAY_FONT, fontSize: "48px", color: THEME_CSS.lime })
        .setOrigin(0.5)
    );
    add(text(this, 400, 118, `LV ${this.run.level} · ${this.run.pendingLevelUps} pick(s) left`, 16, THEME_CSS.pink).setOrigin(0.5));
    add(text(this, 780, 20, `SCRAP ${this.run.scrap}`, 18, THEME_CSS.lime).setOrigin(1, 0));

    this.choices.forEach((c, i) => {
      const x = 40 + i * 185;
      const card = add(this.add.rectangle(x, 170, 170, 200, THEME.surface).setOrigin(0).setStrokeStyle(i === this.focus ? 4 : 2, i === this.focus ? THEME.lime : THEME.tier[c.tier - 1]));
      add(text(this, x + 8, 178, `[${i + 1}]`, 12, THEME_CSS.textMuted));
      add(text(this, x + 162, 178, `T${c.tier}`, 12, THEME_CSS.tier[c.tier - 1]).setOrigin(1, 0));
      add(text(this, x + 85, 250, `+${c.amount}`, 32, THEME_CSS.lime).setOrigin(0.5));
      add(text(this, x + 85, 300, STAT_LABELS[c.stat], 14).setOrigin(0.5));
      card.setInteractive({ useHandCursor: true });
      card.on("pointerover", () => this.preview(c));
      card.on("pointerdown", () => this.pick(i));
    });

    this.info = add(text(this, 400, 400, "Hover or ←/→ to preview · 1-4 pick · R reroll", 14, THEME_CSS.textMuted).setOrigin(0.5));
    const cost = rerollCost(this.run.wave, this.rerolls);
    add(button(this, 400, 460, `REROLL (${cost})`, () => this.reroll(), false, this.run.scrap >= cost));
  }
}
