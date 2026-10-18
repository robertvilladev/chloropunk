import { SCENE_KEYS } from "@/config/constants";
import { THEME, THEME_CSS } from "@/config/theme";
import { combine, combinePairs, sellWeapon, weaponBuyMode } from "@/core/inventory";
import { createRng, type Rng } from "@/core/rng";
import {
  buy,
  closeShop,
  offerStatus,
  openShop,
  reroll,
  rerollCost,
  toggleLock,
  type ShopState,
} from "@/core/shop";
import { STAT_KEYS, STAT_LABELS, computeStats, statDiff } from "@/core/stats";
import { sellPrice, weaponStats } from "@/core/weapons";
import type { ItemDef, Offer, RunState, Stats, WeaponDef } from "@/types";
import itemDefs from "@assets/data/items.json";
import weaponDefs from "@assets/data/weapons.json";
import Phaser from "phaser";
import { DISPLAY_FONT, button, onKeys, text } from "./ui";

const weapons = weaponDefs as Record<string, WeaponDef>;
const items = itemDefs as Record<string, ItemDef>;
const tierColor = (t: number) => THEME_CSS.tier[t - 1];
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/**
 * ShopScene - 4 offers (buy / lock), reroll, owned weapons (sell / combine).
 * All rules live in core/shop and core/inventory; this scene only renders.
 */
export class ShopScene extends Phaser.Scene {
  private run!: RunState;
  private shop!: ShopState;
  private rng!: Rng;
  private ui!: Phaser.GameObjects.Container;
  private previewUp!: Phaser.GameObjects.Text;
  private previewDown!: Phaser.GameObjects.Text;
  private focus = -1; // focused owned weapon (Tab)
  private offerFocus = -1; // focused offer (arrow keys), shows its preview

  constructor() {
    super({ key: SCENE_KEYS.SHOP });
  }

  create(data: { run: RunState }) {
    this.run = data.run;
    this.focus = -1;
    this.offerFocus = -1;
    this.rng = createRng(this.run.seed + this.run.wave * 1009);
    this.shop = openShop(this.run, this.rng, computeStats(this.run).luck);
    this.cameras.main.setBackgroundColor(THEME.bg);
    this.input.keyboard!.addCapture("TAB,SPACE");
    onKeys(this, (e) => this.onKey(e));
    this.ui = this.add.container(0, 0);
    this.render();
  }

  private stats(): Stats {
    return computeStats(this.run);
  }

  // ---- actions ----

  private buy(i: number): void {
    const r = buy(this.shop, this.run, i);
    if (r === "poor") this.say("Not enough scrap");
    else if (r === "blocked") this.say("No free slot and no matching weapon to merge");
    else if (r !== "empty") this.render();
  }

  private lock(i: number): void {
    toggleLock(this.shop, i);
    this.render();
  }

  private reroll(): void {
    if (reroll(this.shop, this.run, this.rng, this.stats().luck)) this.render();
    else this.say("Not enough scrap to reroll");
  }

  private sell(i: number): void {
    if (sellWeapon(this.run, i) === 0) this.say("Can't sell your last weapon");
    this.focus = Math.min(this.focus, this.run.weapons.length - 1);
    this.render();
  }

  private combine(i: number): void {
    const pair = combinePairs(this.run.weapons).find(([a, b]) => a === i || b === i);
    if (!pair) {
      this.say("Needs a matching weapon of the same tier");
      return;
    }
    combine(this.run.weapons, pair[0], pair[1]);
    this.focus = Math.min(this.focus, this.run.weapons.length - 1);
    this.render();
  }

  private next(): void {
    closeShop(this.shop, this.run);
    this.scene.start(SCENE_KEYS.GAME, { run: this.run });
  }

  private onKey(e: KeyboardEvent): void {
    const digit = /^Digit([1-4])$/.exec(e.code);
    if (digit) {
      const i = Number(digit[1]) - 1;
      if (e.shiftKey) this.lock(i);
      else this.buy(i);
      return;
    }
    const n = this.run.weapons.length;
    switch (e.code) {
      case "ArrowLeft":
      case "ArrowRight":
        this.offerFocus = (this.offerFocus + (e.code === "ArrowLeft" ? 3 : 1)) % 4;
        this.render();
        this.preview(this.offerFocus);
        break;
      case "KeyR":
        this.reroll();
        break;
      case "Tab":
        this.focus = (this.focus + 1) % n;
        this.render();
        break;
      case "KeyS":
        if (this.focus >= 0) this.sell(this.focus);
        break;
      case "KeyC":
        if (this.focus >= 0) this.combine(this.focus);
        break;
      case "Enter":
      case "Space":
        this.next();
        break;
    }
  }

  // ---- rendering (rebuilt on every change; the shop is not a hot path) ----

  private say(msg: string): void {
    this.previewUp.setText(msg).setColor(THEME_CSS.danger);
    this.previewDown.setText("");
  }

  private preview(i: number): void {
    const o = this.shop.offers[i];
    if (!o) return;
    const now = this.stats();
    if (o.kind === "item") {
      const diff = statDiff(now, computeStats({ ...this.run, items: [...this.run.items, o.id] }));
      const fmt = (d: [string, number][]) =>
        d.map(([k, v]) => `${signed(v)} ${STAT_LABELS[k as keyof Stats]}`).join("   ");
      this.previewUp.setText(fmt(diff.filter(([, v]) => v > 0))).setColor(THEME_CSS.lime);
      this.previewDown.setText(fmt(diff.filter(([, v]) => v < 0)));
    } else {
      const ws = weaponStats(weapons[o.id], o.tier, now);
      const mode = weaponBuyMode(this.run.weapons, o.id, o.tier);
      const what =
        mode === "merge" ? `merges into T${o.tier + 1}` : mode === "add" ? "takes a free slot" : "NO SLOT";
      this.previewUp
        .setText(`DMG ${ws.damage}  CD ${ws.cooldown.toFixed(2)}s  RANGE ${ws.range}  — ${what}`)
        .setColor(THEME_CSS.lime);
      this.previewDown.setText("");
    }
  }

  private render(): void {
    this.ui.removeAll(true);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      this.ui.add(o);
      return o;
    };
    const stats = this.stats();

    add(this.add.text(20, 14, `SHOP · WAVE ${this.run.wave}`, { fontFamily: DISPLAY_FONT, fontSize: "26px", color: THEME_CSS.lime }));
    add(text(this, 780, 20, `SCRAP ${this.run.scrap}`, 20, THEME_CSS.lime).setOrigin(1, 0));

    this.shop.offers.forEach((o, i) => this.renderOffer(add, o, i, stats));

    this.previewUp = add(text(this, 20, 252, "Hover an offer to preview · ←/→ preview · 1-4 buy · Shift+1-4 lock · R reroll", 13, THEME_CSS.textMuted));
    this.previewDown = add(text(this, 20, 270, "", 13, THEME_CSS.danger));

    // Owned weapons
    const pairs = combinePairs(this.run.weapons);
    add(text(this, 20, 296, `WEAPONS ${this.run.weapons.length}/6 · Tab focus · S sell · C combine`, 13, THEME_CSS.textMuted));
    this.run.weapons.forEach((w, i) => {
      const x = 20 + i * 128;
      const def = weapons[w.id];
      const focused = i === this.focus;
      add(this.add.rectangle(x, 316, 120, 96, THEME.surface).setOrigin(0).setStrokeStyle(focused ? 3 : 1, focused ? THEME.pink : THEME.line));
      add(text(this, x + 8, 322, def.name, 12));
      add(text(this, x + 8, 340, `T${w.tier}`, 12, tierColor(w.tier)));
      add(button(this, x + 60, 372, `SELL +${sellPrice(def, w.tier, this.run.wave)}`, () => this.sell(i), false, this.run.weapons.length > 1));
      if (pairs.some(([a, b]) => a === i || b === i)) {
        add(button(this, x + 60, 398, "COMBINE", () => this.combine(i), true));
      }
    });

    // Stats (two columns) and owned items
    add(text(this, 20, 430, "STATS", 13, THEME_CSS.pink));
    STAT_KEYS.forEach((k, n) => {
      const col = n < 8 ? 0 : 1;
      const row = n % 8;
      const v = stats[k];
      const color = v > 0 ? THEME_CSS.text : v < 0 ? THEME_CSS.danger : THEME_CSS.textMuted;
      add(text(this, 20 + col * 190, 450 + row * 17, `${STAT_LABELS[k]}: ${v}`, 12, color));
    });
    const counts = new Map<string, number>();
    for (const id of this.run.items) counts.set(id, (counts.get(id) ?? 0) + 1);
    add(text(this, 410, 430, "ITEMS", 13, THEME_CSS.pink));
    add(
      text(this, 410, 450, [...counts].map(([id, n]) => `${items[id].name}${n > 1 ? ` ×${n}` : ""}`).join("\n") || "—", 12).setWordWrapWidth(200)
    );

    add(button(this, 660, 470, `REROLL (${rerollCost(this.run.wave, this.shop.rerolls)})`, () => this.reroll(), false, this.run.scrap >= rerollCost(this.run.wave, this.shop.rerolls)));
    add(button(this, 690, 540, "NEXT WAVE ▶", () => this.next(), true));
  }

  private renderOffer(
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
    o: Offer | null,
    i: number,
    stats: Stats
  ): void {
    const x = 20 + i * 192;
    const y = 60;
    const locked = this.shop.locked[i];
    const focused = i === this.offerFocus;
    const card = add(
      this.add
        .rectangle(x, y, 180, 180, THEME.surface)
        .setOrigin(0)
        .setStrokeStyle(locked || focused ? 3 : 1, locked ? THEME.pink : focused ? THEME.lime : THEME.line)
    );
    add(text(this, x + 8, y + 6, `[${i + 1}]`, 12, THEME_CSS.textMuted));
    if (!o) {
      add(text(this, x + 90, y + 90, "SOLD", 16, THEME_CSS.textMuted).setOrigin(0.5));
      return;
    }
    const status = offerStatus(this.shop, this.run, i);
    const name = o.kind === "weapon" ? weapons[o.id].name : items[o.id].name;
    add(text(this, x + 172, y + 6, `T${o.tier}`, 12, tierColor(o.tier)).setOrigin(1, 0));
    add(text(this, x + 8, y + 26, name, 14).setWordWrapWidth(164));
    add(text(this, x + 8, y + 64, o.kind === "weapon" ? weapons[o.id].tags.join(" · ") : "item", 11, THEME_CSS.textMuted));
    const body =
      o.kind === "weapon"
        ? (() => {
            const ws = weaponStats(weapons[o.id], o.tier, stats);
            return `DMG ${ws.damage}\nCD ${ws.cooldown.toFixed(2)}s\nRANGE ${ws.range}`;
          })()
        : Object.entries(items[o.id].mods)
            .map(([k, v]) => `${signed(v!)} ${STAT_LABELS[k as keyof Stats]}`)
            .join("\n");
    add(text(this, x + 8, y + 82, body, 12));
    const priceLabel = status === "blocked" ? "NO SLOT" : `${o.price} scrap`;
    add(text(this, x + 8, y + 152, priceLabel, 14, status === "ok" ? THEME_CSS.lime : THEME_CSS.danger));
    add(button(this, x + 140, y + 160, locked ? "LOCKED" : "LOCK", () => this.lock(i)));

    card.setInteractive({ useHandCursor: true });
    card.on("pointerover", () => this.preview(i));
    card.on("pointerdown", () => this.buy(i));
  }
}
