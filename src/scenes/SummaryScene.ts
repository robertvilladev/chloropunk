import { GAME_CONFIG, SCENE_KEYS } from "@/config/constants";
import { FONTS, THEME, THEME_CSS } from "@/config/theme";
import { formatCount } from "@/core/labels";
import { loadBest, summariseRun, type RunOutcome, type RunSummary } from "@/core/summary";
import { duckMusic } from "@/fx/music";
import { sfx } from "@/fx/sfx";
import type { RunState } from "@/types";
import itemDefs from "@assets/data/items.json";
import Phaser from "phaser";
import { button, onKeys, panel, scanlines, text } from "./ui";

const PW = 560, PAD = 28, INNER = PW - 2 * PAD;
const WEAPON_CHIP = 40, ITEM_CHIP = 28, CHIP_GAP = 6;
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Run summary (spec §7, mockup Summary.dc.html) for victory and defeat.
 * Started with `{ run, outcome }` once the run log is saved; Enter = one more run, Esc = menu.
 */
export class SummaryScene extends Phaser.Scene {
  private run!: RunState;
  private outcome: RunOutcome = "defeat";

  constructor() {
    super({ key: SCENE_KEYS.SUMMARY });
  }

  init(data: { run: RunState; outcome: RunOutcome }) {
    this.run = data.run;
    this.outcome = data.outcome;
  }

  create() {
    // Whoever started us may leave the HUD (and a paused GameScene) behind
    this.scene.stop(SCENE_KEYS.UI);
    this.scene.stop(SCENE_KEYS.GAME);
    duckMusic(true);
    const s = summariseRun(this.run, this.outcome, loadBest());
    const win = s.outcome === "victory";
    const accent = win ? THEME.lime : THEME.danger;
    const accentCss = win ? THEME_CSS.lime : THEME_CSS.danger;
    sfx(win ? "runComplete" : "gameOver");
    this.cameras.main.setBackgroundColor(THEME.bg);
    scanlines(this);

    const { WIDTH: W, HEIGHT: H } = GAME_CONFIG;
    const ph = 420, px = W / 2 - PW / 2, py = H / 2 - ph / 2;
    const x = px + PAD;
    panel(this, px, py, PW, ph, { border: accent, shadow: true }).setStrokeStyle(2, accent);

    let y = py + PAD;
    text(this, x, y, `${win ? "DISTRICT CLEARED" : "SIGNAL LOST"} · WAVE ${pad2(s.wave)}`, 10, accentCss).setLetterSpacing(1.8);
    y += 20;
    // RGB-split title, same layers as the menu logo
    const title = win ? "VICTORY" : "FLATLINED";
    for (const [dx, color] of [[3, THEME_CSS.pink], [-3, THEME_CSS.tier[1]], [0, accentCss]] as const) {
      this.add.text(x + dx, y, title, { fontFamily: FONTS.display, fontSize: "40px", color });
    }
    y += 50;
    const sub = win
      ? `You cleared all ${s.waves} waves. The harvest is yours.`
      : `Taken down on wave ${s.wave}.${s.wave < s.waves ? ` The boss waits on wave ${s.waves}.` : ""}`;
    text(this, x, y, sub, 13, THEME_CSS.textMuted);
    y += 38;

    const tiles: [string, string, string][] = [
      ["WAVE", `${s.wave}/${s.waves}`, THEME_CSS.text],
      ["SMASHED", formatCount(s.kills), THEME_CSS.text],
      ["DAMAGE", formatCount(s.damageDealt), THEME_CSS.text],
      ["LEVEL", String(s.level), THEME_CSS.pink300],
    ];
    const tw = (INNER - 3 * 8) / 4;
    tiles.forEach(([label, value, color], i) => {
      const tx = x + i * (tw + 8);
      this.add.rectangle(tx, y, tw, 58, THEME.surface2).setOrigin(0);
      text(this, tx + 10, y + 10, label, 9, THEME_CSS.textMuted).setLetterSpacing(1.2);
      text(this, tx + 10, y + 22, value, 32, color, "pixel");
    });
    y += 58 + 22;

    text(this, x, y, "FINAL BUILD", 10, THEME_CSS.textMuted).setLetterSpacing(1.4);
    y += 20;
    y += this.build(s, x, y) + 22;

    const best = text(this, x, y, `BEST WAVE ${s.best}`, 11, THEME_CSS.pink300).setLetterSpacing(1.1);
    if (s.newBest) text(this, x + best.width + 8, y, "· NEW BEST", 11, THEME_CSS.lime).setLetterSpacing(1.1);

    const by = py + ph - PAD - 26;
    const again = () => this.scene.start(SCENE_KEYS.LOADOUT); // new run: pick a weapon again
    const toMenu = () => this.scene.start(SCENE_KEYS.MENU);
    button(this, x + 50, by, "MENU", toMenu, false, true, { size: 13, w: 100, h: 44 });
    button(this, x + INNER - 110, by, "ONE MORE RUN", again, true, true, { size: 18, font: "display", w: 220, h: 52 });
    onKeys(this, (e) => {
      if (e.code === "Enter" || e.code === "NumpadEnter") again();
      else if (e.code === "Escape") toMenu();
    });
  }

  /**
   * Weapon chips (tier border), a gap, then item chips (rarity border) level with the weapons' bottom,
   * wrapping onto a second row; overflow ends in "+N". Returns the block's height.
   */
  private build(s: RunSummary, x0: number, y0: number): number {
    const chip = (x: number, y: number, size: number, border: number) =>
      this.add.rectangle(x, y, size, size, THEME.surface2).setOrigin(0).setStrokeStyle(2, border);
    let x = x0;
    for (const w of s.weapons) {
      chip(x, y0, WEAPON_CHIP, THEME.tier[w.tier - 1]);
      x += WEAPON_CHIP + CHIP_GAP;
    }
    const ix = x + 12 - CHIP_GAP;
    const perRow = Math.max(1, Math.floor((x0 + INNER - ix + CHIP_GAP) / (ITEM_CHIP + CHIP_GAP)));
    const fit = s.items.length > 2 * perRow ? 2 * perRow - 1 : s.items.length;
    const defs = itemDefs as Record<string, { rarity: number }>;
    const rows = s.items.length > perRow ? 2 : 1;
    const rowY = (r: number) => (rows === 1 ? y0 + WEAPON_CHIP - ITEM_CHIP : y0 + r * (ITEM_CHIP + CHIP_GAP));
    const at = (i: number) => [ix + (i % perRow) * (ITEM_CHIP + CHIP_GAP), rowY(Math.floor(i / perRow))] as const;
    s.items.slice(0, fit).forEach((id, i) => {
      const [cx, cy] = at(i);
      chip(cx, cy, ITEM_CHIP, THEME.tier[(defs[id]?.rarity ?? 1) - 1]);
    });
    if (fit < s.items.length) {
      const [cx, cy] = at(fit);
      chip(cx, cy, ITEM_CHIP, THEME.line);
      text(this, cx + ITEM_CHIP / 2, cy + ITEM_CHIP / 2, `+${s.items.length - fit}`, 16, THEME_CSS.textMuted, "pixel").setOrigin(0.5);
    }
    return rows === 1 ? WEAPON_CHIP : 2 * ITEM_CHIP + CHIP_GAP;
  }
}
