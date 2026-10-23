import { SCENE_KEYS } from "@/config/constants";
import { setMusic } from "@/fx/music";
import { FONTS, THEME, THEME_CSS } from "@/config/theme";
import { applyUpgrade, rollUpgrades, type UpgradeChoice } from "@/core/levelup";
import { createRng, type Rng } from "@/core/rng";
import { rerollCost } from "@/core/shop";
import { STAT_LABELS, computeStats, statDiff } from "@/core/stats";
import type { RunState } from "@/types";
import Phaser from "phaser";
import { truncate } from "@/core/labels";
import { sfx } from "@/fx/sfx";
import { button, onKeys, panel, text, tierTab } from "./ui";

/**
 * LevelUpScene - one pick per pending level (1 of 4 stat upgrades, paid
 * reroll). Restarts itself until no levels are pending, then opens the shop.
 */
export class LevelUpScene extends Phaser.Scene {
  private run!: RunState;
  private rng!: Rng;
  private choices: UpgradeChoice[] = [];
  private offered: UpgradeChoice[] = []; // every card seen this pick, for the run log
  private rerolls = 0;
  private focus = -1; // card focused with arrow keys (shows its preview)
  private ui!: Phaser.GameObjects.Container;
  private info!: Phaser.GameObjects.Text;
  private diff!: Phaser.GameObjects.Container;
  private total = 1;

  constructor() {
    super({ key: SCENE_KEYS.LEVEL_UP });
  }

  create(data: { run: RunState; total?: number }) {
    setMusic("game"); // between waves: keeps the game track, lifts the round-complete duck
    this.run = data.run;
    this.total = data.total ?? this.run.pendingLevelUps;
    this.rerolls = 0;
    this.focus = -1;
    this.rng = createRng(this.run.seed + this.run.wave * 1013 + this.run.pendingLevelUps);
    this.choices = this.roll();
    this.offered = [...this.choices];
    this.cameras.main.setBackgroundColor(THEME.bg);
    sfx("levelUp"); // once per level: the scene restarts for each pending level-up
    onKeys(this, (e) => {
      const digit = /^Digit([1-4])$/.exec(e.code);
      if (digit) this.pick(Number(digit[1]) - 1);
      else if (e.code === "KeyR") this.reroll();
      else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        this.focus = (this.focus + (e.code === "ArrowLeft" ? 3 : 1)) % 4;
        sfx("uiMove");
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
    this.run.log.levelups.push({ afterWave: this.run.wave - 1, offered: this.offered, pick: c, rerolls: this.rerolls });
    applyUpgrade(this.run, c);
    if (this.run.pendingLevelUps > 0) this.scene.restart({ run: this.run, total: this.total });
    else this.scene.start(SCENE_KEYS.SHOP, { run: this.run });
  }

  private reroll(): void {
    const cost = rerollCost(this.run.wave, this.rerolls);
    if (this.run.scrap < cost) {
      this.diff.removeAll(true);
      this.info.setText("Not enough scrap to reroll").setColor(THEME_CSS.danger);
      return;
    }
    this.run.scrap -= cost;
    this.rerolls++;
    this.choices = this.roll();
    this.offered.push(...this.choices);
    this.render();
  }

  private preview(c: UpgradeChoice): void {
    const now = computeStats(this.run);
    const after = computeStats({
      ...this.run,
      levelMods: { ...this.run.levelMods, [c.stat]: (this.run.levelMods[c.stat] ?? 0) + c.amount },
    });
    const d = statDiff(now, after);
    this.diff.removeAll(true);
    this.info.setText(d.length ? "" : "No change (capped)").setColor(THEME_CSS.lime);
    let x = 0;
    const seg = (s: string, color: string) => {
      const t = text(this, x, 0, s, 12, color);
      this.diff.add(t);
      x += t.width;
    };
    d.forEach(([k, v], n) => {
      if (n) x += 28;
      seg(`${STAT_LABELS[k].toUpperCase()} `, THEME_CSS.textMuted);
      seg(`${now[k]}`, THEME_CSS.pink300);
      seg(" → ", THEME_CSS.textMuted);
      seg(`${now[k] + v}`, THEME_CSS.lime);
    });
  }

  private render(): void {
    this.ui.removeAll(true);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      this.ui.add(o);
      return o;
    };
    const pick = this.total - this.run.pendingLevelUps + 1;
    add(text(this, 32, 32, `LEVEL ${this.run.level} REACHED · ${pick} OF ${this.total} PICKS`, 10, THEME_CSS.lime));
    add(this.add.text(32, 50, "UPGRADE", { fontFamily: FONTS.display, fontSize: "34px", color: THEME_CSS.text }));
    const cost = rerollCost(this.run.wave, this.rerolls);
    add(text(this, 612, 62, `◆ ${this.run.scrap}`, 24, THEME_CSS.lime, "pixel").setOrigin(1, 0.5));
    add(button(this, 700, 62, `REROLL ${cost}`, () => this.reroll(), false, this.run.scrap >= cost, { w: 124, h: 44, size: 13 }));

    this.choices.forEach((c, i) => {
      const x = 32 + i * 188;
      const y = 150;
      const focused = i === this.focus;
      const tc = THEME.tier[c.tier - 1];
      if (focused) add(this.add.rectangle(x + 4, y + 4, 172, 200, tc).setOrigin(0));
      const card = add(this.add.rectangle(x, y, 172, 200, THEME.surface).setOrigin(0).setStrokeStyle(2, tc));
      add(tierTab(this, x + 12, y, c.tier));
      add(text(this, x + 14, y + 22, `[${i + 1}]`, 10, THEME_CSS.textMuted));
      add(
        this.add
          .text(x + 14, y + 44, truncate(STAT_LABELS[c.stat].toUpperCase(), 24), { fontFamily: FONTS.display, fontSize: "14px", color: THEME_CSS.text, wordWrap: { width: 144 } })
      );
      add(text(this, x + 14, y + 110, `+${c.amount}`, 56, THEME_CSS.lime, "pixel"));
      card.setInteractive({ useHandCursor: true });
      card.on("pointerover", () => this.preview(c));
      card.on("pointerdown", () => this.pick(i));
    });

    add(panel(this, 32, 492, 736, 60, { border: THEME.line, fill: THEME.surface2 }));
    this.diff = add(this.add.container(48, 514));
    this.info = add(text(this, 48, 514, "Hover or ←/→ to preview · 1-4 pick · R reroll", 12, THEME_CSS.textMuted));
  }
}
