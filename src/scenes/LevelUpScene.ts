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
import { button, cardGlow, iconArt, iconWindow, legendaryPop, num, onKeys, panel, text, tierBadge } from "./ui";
import { pickSound } from "@/fx/sounds";
import { frameSize } from "@/art/body";
import { TIER_NAMES } from "@/core/labels";

const CARD_W = 172;
const CARD_H = 200;
const CARD_Y = 150;
const cardX = (i: number) => 32 + i * 188;
const LEGENDARY_MS = 900; // legendary pick effect plays before the next pick / the shop

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
  private picked = false; // one pick per level: input after it is ignored while the legendary effect plays

  constructor() {
    super({ key: SCENE_KEYS.LEVEL_UP });
  }

  create(data: { run: RunState; total?: number }) {
    setMusic("game"); // between waves: keeps the game track, lifts the round-complete duck
    this.run = data.run;
    this.total = data.total ?? this.run.pendingLevelUps;
    this.rerolls = 0;
    this.focus = -1;
    this.picked = false;
    this.rng = createRng(this.run.seed + this.run.wave * 1013 + this.run.pendingLevelUps);
    this.choices = this.roll();
    this.offered = [...this.choices];
    this.cameras.main.setBackgroundColor(THEME.bg);
    sfx("levelUp"); // once per level: the scene restarts for each pending level-up
    onKeys(this, (e) => this.onKey(e));
    this.ui = this.add.container(0, 0);
    this.render();
  }

  /** After a pick the screen is frozen (the stats already changed) until it moves on. */
  private onKey(e: Pick<KeyboardEvent, "code">): void {
    if (this.picked) return;
    const digit = /^Digit([1-4])$/.exec(e.code);
    if (digit) this.pick(Number(digit[1]) - 1);
    else if (e.code === "KeyR") this.reroll();
    else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      this.focus = (this.focus + (e.code === "ArrowLeft" ? 3 : 1)) % 4;
      sfx("uiMove");
      this.render();
      this.preview(this.choices[this.focus]);
    }
  }

  private roll(): UpgradeChoice[] {
    return rollUpgrades(this.rng, this.run.wave, computeStats(this.run).luck);
  }

  private pick(i: number): void {
    const c = this.choices[i];
    if (!c || this.picked) return;
    this.picked = true;
    this.run.log.levelups.push({ afterWave: this.run.wave - 1, offered: this.offered, pick: c, rerolls: this.rerolls });
    applyUpgrade(this.run, c);
    const next = () => {
      if (this.run.pendingLevelUps > 0) this.scene.restart({ run: this.run, total: this.total });
      else this.scene.start(SCENE_KEYS.SHOP, { run: this.run });
    };
    if (c.tier !== 4) return next();
    // Legendary (board U3): sound + effect, then move on once it has played
    this.input.enabled = false; // REROLL button and card hovers too
    sfx(pickSound(c.tier, "uiConfirm"));
    legendaryPop(this, cardX(i), CARD_Y, CARD_W, CARD_H);
    this.time.delayedCall(LEGENDARY_MS, next);
  }

  private reroll(): void {
    const cost = rerollCost(this.run.wave, this.rerolls);
    if (this.picked) return;
    if (this.run.scrap < cost) {
      sfx("deny");
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
    if (this.picked) return;
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
    const scrap = add(num(this, 612, 62, `${this.run.scrap}`, 20, THEME_CSS.lime).setOrigin(1, 0.5));
    add(this.add.image(scrap.x - scrap.width - 14, 62, "pickup_scrap", "0").setScale(20 / frameSize("pickup_scrap").w));
    add(button(this, 700, 62, `REROLL ${cost}`, () => this.reroll(), false, this.run.scrap >= cost, { w: 124, h: 44, size: 13 }));

    this.choices.forEach((c, i) => {
      const x = cardX(i);
      const y = CARD_Y;
      const tc = THEME.tier[c.tier - 1];
      const glow = cardGlow(this, x, y, CARD_W, CARD_H, c.tier);
      if (glow) Object.values(glow).forEach(add);
      add(panel(this, x, y, CARD_W, CARD_H, { frame: tc, ...(i === this.focus ? { shadow: tc } : {}) }));
      if (glow?.shine) this.ui.bringToTop(glow.shine);
      add(iconWindow(this, x + 12, y + 14, 64, tc, iconArt("stat", c.stat)));
      add(tierBadge(this, x + 8, y + 68, c.tier));
      add(text(this, x + CARD_W - 12, y + 12, `[${i + 1}]`, 10, THEME_CSS.textMuted).setOrigin(1, 0));
      add(
        this.add.text(x + 14, y + 96, truncate(STAT_LABELS[c.stat].toUpperCase(), 24), {
          fontFamily: FONTS.display,
          fontSize: "14px",
          color: THEME_CSS.text,
          wordWrap: { width: 144 },
        })
      );
      add(num(this, x + 14, y + 134, `+${c.amount}`, 32, THEME_CSS.lime));
      add(text(this, x + 14, y + 180, TIER_NAMES[c.tier - 1], 9, THEME_CSS.tier[c.tier - 1]).setLetterSpacing(1));
      const hit = add(this.add.zone(x, y, CARD_W, CARD_H).setOrigin(0).setInteractive({ useHandCursor: true }));
      hit.on("pointerover", () => this.preview(c));
      hit.on("pointerdown", () => this.pick(i));
    });

    add(panel(this, 32, 492, 736, 60, { fill: THEME.surface2 }));
    this.diff = add(this.add.container(48, 514));
    this.info = add(text(this, 48, 514, "Hover or ←/→ to preview · 1-4 pick · R reroll", 12, THEME_CSS.textMuted));
  }
}
