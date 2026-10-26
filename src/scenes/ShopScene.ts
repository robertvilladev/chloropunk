import { SCENE_KEYS } from "@/config/constants";
import { setMusic } from "@/fx/music";
import { FONTS, THEME, THEME_CSS } from "@/config/theme";
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
import type { ShopLog } from "@/core/runlog";
import type { ItemDef, Offer, RunState, StatKey, Stats, WeaponDef } from "@/types";
import itemDefs from "@assets/data/items.json";
import weaponDefs from "@assets/data/weapons.json";
import Phaser from "phaser";
import { TIER_NAMES, truncate } from "@/core/labels";
import { sfx } from "@/fx/sfx";
import { button, cardGlow, fitImage, iconArt, iconWindow, legendaryPop, lockIcon, num, onKeys, panel, text, tierBadge, weaponArt } from "./ui";
import { pickSound } from "@/fx/sounds";
import { frameSize } from "@/art/body";

const weapons = weaponDefs as Record<string, WeaponDef>;
const items = itemDefs as Record<string, ItemDef>;
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/**
 * ShopScene - 4 offers (buy / lock), reroll, owned weapons (sell / combine).
 * All rules live in core/shop and core/inventory; this scene only renders.
 */
export class ShopScene extends Phaser.Scene {
  private run!: RunState;
  private shop!: ShopState;
  private log!: ShopLog; // run log (balance design §9), pushed when the shop closes
  private rng!: Rng;
  private ui!: Phaser.GameObjects.Container;
  private previewUp!: Phaser.GameObjects.Text;
  private previewDown!: Phaser.GameObjects.Text;
  private statBox!: Phaser.GameObjects.Container;
  private focus = -1; // focused owned weapon (Tab)
  private offerFocus = -1; // focused offer (arrow keys), shows its preview

  constructor() {
    super({ key: SCENE_KEYS.SHOP });
  }

  create(data: { run: RunState }) {
    setMusic("game");
    this.run = data.run;
    this.focus = -1;
    this.offerFocus = -1;
    this.rng = createRng(this.run.seed + this.run.wave * 1009);
    this.shop = openShop(this.run, this.rng, computeStats(this.run).luck);
    this.log = {
      afterWave: this.run.wave - 1,
      scrapBefore: this.run.scrap,
      scrapAfter: 0,
      offers: this.seen(),
      bought: [],
      sold: [],
      combined: [],
      rerolls: 0,
      rerollSpent: 0,
      locked: [],
    };
    this.cameras.main.setBackgroundColor(THEME.bg);
    this.input.keyboard!.addCapture("TAB,SPACE");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard!.removeCapture("TAB,SPACE"));
    onKeys(this, (e) => this.onKey(e));
    this.ui = this.add.container(0, 0);
    this.render();
  }

  private stats(): Stats {
    return computeStats(this.run);
  }

  // ---- actions ----

  /** Copies of the current offers (only the unlocked ones after a reroll), for the log. */
  private seen(rerolled = false): Offer[] {
    return this.shop.offers
      .filter((o, i): o is Offer => o !== null && !(rerolled && this.shop.locked[i]))
      .map((o) => ({ ...o }));
  }

  private buy(i: number): void {
    const o = this.shop.offers[i];
    const r = buy(this.shop, this.run, i);
    const bought = o && (r === "add" || r === "merge" || r === "item");
    if (bought) {
      this.log.bought.push({ ...o });
      sfx(pickSound(o.tier, "buy"));
    }
    if (r === "poor") this.say("Not enough scrap");
    else if (r === "blocked") this.say("No free slot and no matching weapon to merge");
    else if (r !== "empty") this.render();
    // Legendary (board U3): effect over the bought card; outside this.ui so the re-render keeps it
    if (bought && o.tier === 4) {
      const b = offerBox(i);
      legendaryPop(this, b.x, b.y, b.w, b.h);
    }
  }

  private lock(i: number): void {
    toggleLock(this.shop, i);
    this.render();
  }

  private reroll(): void {
    const cost = rerollCost(this.run.wave, this.shop.rerolls);
    if (reroll(this.shop, this.run, this.rng, this.stats().luck)) {
      this.log.rerolls++;
      this.log.rerollSpent += cost;
      this.log.offers.push(...this.seen(true));
      this.render();
    }
    else this.say("Not enough scrap to reroll");
  }

  private sell(i: number): void {
    const w = this.run.weapons[i];
    const price = sellWeapon(this.run, i);
    if (price === 0) this.say("Can't sell your last weapon");
    else this.log.sold.push({ ...w, price });
    this.focus = Math.min(this.focus, this.run.weapons.length - 1);
    this.render();
  }

  private combine(i: number): void {
    const pair = combinePairs(this.run.weapons).find(([a, b]) => a === i || b === i);
    if (!pair) {
      this.say("Needs a matching weapon of the same tier");
      return;
    }
    const w = this.run.weapons[pair[0]];
    if (combine(this.run.weapons, pair[0], pair[1])) this.log.combined.push({ ...w });
    this.focus = Math.min(this.focus, this.run.weapons.length - 1);
    this.render();
  }

  private next(): void {
    closeShop(this.shop, this.run);
    this.log.scrapAfter = this.run.scrap;
    this.log.locked = this.run.lockedOffers.map((o) => ({ ...o }));
    this.run.log.shops.push(this.log);
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
        sfx("uiMove");
        this.render();
        this.preview(this.offerFocus);
        break;
      case "KeyR":
        this.reroll();
        break;
      case "Tab":
        this.focus = (this.focus + 1) % n;
        sfx("uiMove");
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

  /** Show a refusal (not enough scrap, can't sell, ...) with the deny sound. */
  private say(msg: string): void {
    sfx("deny");
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
      this.previewDown.setText(fmt(diff.filter(([, v]) => v < 0))).setColor(THEME_CSS.danger);
      this.drawStats(new Map(diff));
    } else {
      const ws = weaponStats(weapons[o.id], o.tier, now);
      const mode = weaponBuyMode(this.run.weapons, o.id, o.tier);
      const what =
        mode === "merge" ? `merges into T${o.tier + 1}` : mode === "add" ? "takes a free slot" : "NO SLOT";
      this.previewUp
        .setText(`DMG ${ws.damage}  CD ${ws.cooldown.toFixed(2)}s  RANGE ${ws.range}  — ${what}`)
        .setColor(mode === "blocked" ? THEME_CSS.danger : THEME_CSS.lime);
      this.previewDown.setText("");
      this.drawStats();
    }
  }

  /** Stats column; `diff` (focused item offer) adds the `→ after` preview. */
  private drawStats(diff?: Map<string, number>): void {
    this.statBox.removeAll(true);
    const stats = this.stats();
    STAT_KEYS.forEach((k: StatKey, n) => {
      const y = n * 13;
      const v = stats[k];
      const d = diff?.get(k) ?? 0;
      this.statBox.add(text(this, 0, y, STAT_LABELS[k], 11, THEME_CSS.textMuted));
      const after = d ? text(this, 176, y, `→ ${v + d}`, 11, d > 0 ? THEME_CSS.lime : THEME_CSS.danger).setOrigin(1, 0) : null;
      const now = text(this, after ? 176 - after.width - 6 : 176, y, `${v}`, 11, THEME_CSS.pink300).setOrigin(1, 0);
      this.statBox.add(now);
      if (after) this.statBox.add(after);
    });
  }

  private render(): void {
    this.ui.removeAll(true);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => {
      this.ui.add(o);
      return o;
    };
    const stats = this.stats();

    add(text(this, 24, 24, `WAVE ${String(this.run.wave - 1).padStart(2, "0")} CLEARED`, 10, THEME_CSS.textMuted));
    add(this.add.text(24, 40, "BLACK MARKET", { fontFamily: FONTS.display, fontSize: "28px", color: THEME_CSS.text }));
    const cost = rerollCost(this.run.wave, this.shop.rerolls);
    add(panel(this, 500, 28, 128, 44, { fill: THEME.surface2 }));
    add(this.add.image(524, 50, "pickup_scrap", "0").setScale(22 / SCRAP_TEX));
    add(num(this, 620, 50, `${this.run.scrap}`, 24, THEME_CSS.lime).setOrigin(1, 0.5));
    add(button(this, 704, 50, `REROLL ${cost}`, () => this.reroll(), false, this.run.scrap >= cost, { w: 120, h: 44, size: 13 }));

    this.shop.offers.forEach((o, i) => this.renderOffer(add, o, i, stats));

    // Weapons panel
    const pairs = combinePairs(this.run.weapons);
    add(panel(this, 24, 292, 536, 236, { fill: THEME.surface2 }));
    add(text(this, 36, 302, `WEAPONS ${this.run.weapons.length} / 6`, 10, THEME_CSS.textMuted));
    add(text(this, 548, 302, "TAB FOCUS · S SELL · C COMBINE", 10, THEME_CSS.textMuted).setOrigin(1, 0));
    for (let i = 0; i < 6; i++) {
      const x = 36 + i * 86;
      const y = 326;
      const w = this.run.weapons[i];
      if (!w) {
        add(this.add.rectangle(x, y, 78, 116).setOrigin(0).setStrokeStyle(2, THEME.line, 0.6)); // empty slot: dashed-feel outline only
        continue;
      }
      const def = weapons[w.id];
      const focused = i === this.focus;
      add(panel(this, x, y, 78, 116, { frame: focused ? THEME.pink : THEME.tier[w.tier - 1], frameW: focused ? 3 : 2 }));
      add(fitImage(this, x + 46, y + 18, weaponArt(w.id, w.tier), 34));
      add(tierBadge(this, x + 5, y + 6, w.tier));
      add(
        text(this, x + 6, y + 32, truncate(def.name.toUpperCase(), 22), 9)
          .setWordWrapWidth(66, true)
          .setMaxLines(2)
      );
      if (pairs.some(([a, b]) => a === i || b === i)) {
        add(button(this, x + 39, y + 66, "COMBINE", () => this.combine(i), true, true, { w: 66, h: 22, size: 10 }));
      }
      add(button(this, x + 39, y + 96, `SELL +${sellPrice(def, w.tier, this.run.wave)}`, () => this.sell(i), false, this.run.weapons.length > 1, { w: 66, h: 22, size: 10 }));
    }
    const counts = new Map<string, number>();
    for (const id of this.run.items) counts.set(id, (counts.get(id) ?? 0) + 1);
    add(text(this, 36, 456, "ITEMS", 10, THEME_CSS.textMuted));
    add(
      text(this, 36, 472, [...counts].map(([id, n]) => `${items[id].name}${n > 1 ? ` ×${n}` : ""}`).join(" · ") || "—", 11)
        .setWordWrapWidth(512, true)
        .setMaxLines(3)
    );

    // Stats panel
    add(panel(this, 576, 292, 200, 236, { fill: THEME.surface2 }));
    add(text(this, 588, 302, "STATS", 10, THEME_CSS.textMuted));
    this.statBox = add(this.add.container(588, 322));
    this.drawStats();

    this.previewUp = add(text(this, 24, 540, "←/→ preview · 1-4 buy · Shift+1-4 lock · R reroll", 11, THEME_CSS.textMuted).setWordWrapWidth(520, true));
    this.previewDown = add(text(this, 24, 560, "", 11, THEME_CSS.danger).setWordWrapWidth(520, true));
    add(button(this, 672, 564, "NEXT WAVE", () => this.next(), true, true, { w: 200, h: 44, size: 18, font: "display" }));
  }

  private renderOffer(
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
    o: Offer | null,
    i: number,
    stats: Stats
  ): void {
    const { x, y, w, h } = offerBox(i);
    const locked = this.shop.locked[i];
    const focused = i === this.offerFocus;
    if (!o) {
      add(panel(this, x, y, w, h, { fill: THEME.surface2, frame: focused ? THEME.lime : undefined }));
      add(text(this, x + w / 2, y + h / 2, "SOLD", 16, THEME_CSS.textMuted, "display").setOrigin(0.5));
      return;
    }
    const tc = THEME.tier[o.tier - 1];
    const glow = cardGlow(this, x, y, w, h, o.tier);
    if (glow) Object.values(glow).forEach(add);
    add(panel(this, x, y, w, h, { frame: focused ? THEME.lime : locked ? THEME.pink : tc, frameW: focused ? 3 : 2, ...(locked ? { shadow: THEME.pink } : {}) }));
    if (glow?.shine) this.ui.bringToTop(glow.shine);
    const status = offerStatus(this.shop, this.run, i);
    const def = o.kind === "weapon" ? weapons[o.id] : items[o.id];
    add(iconWindow(this, x + 8, y + 10, 54, tc, o.kind === "weapon" ? weaponArt(o.id, o.tier, -30) : iconArt("item", o.id)));
    add(tierBadge(this, x + 4, y + 54, o.tier));
    add(text(this, x + 70, y + 10, `[${i + 1}]`, 9, THEME_CSS.textMuted));
    add(
      this.add
        .text(x + 70, y + 24, truncate(def.name.toUpperCase(), 30), { fontFamily: FONTS.display, fontSize: "12px", color: THEME_CSS.text })
        .setWordWrapWidth(98, true)
        .setMaxLines(2)
    );
    const owned = this.run.weapons.filter((w) => w.id === o.id).length;
    const kind =
      o.kind === "weapon"
        ? `${TIER_NAMES[o.tier - 1]} · WEAPON · ${weapons[o.id].tags.join(" · ").toUpperCase()}${owned ? ` · OWNED ×${owned}` : ""}`
        : `${TIER_NAMES[o.tier - 1]} · ITEM`;
    add(text(this, x + 10, y + 70, kind, 9, owned ? THEME_CSS.pink300 : THEME_CSS.tier[o.tier - 1]).setWordWrapWidth(157, true).setMaxLines(2));
    const lines: [string, string][] =
      o.kind === "weapon"
        ? (() => {
            const ws = weaponStats(weapons[o.id], o.tier, stats);
            return [[`DMG ${ws.damage}`, THEME_CSS.text], [`CD ${ws.cooldown.toFixed(2)}s`, THEME_CSS.text], [`RANGE ${ws.range}`, THEME_CSS.text]];
          })()
        : Object.entries(items[o.id].mods).map(([k, v]) => [
            `${signed(v!)} ${STAT_LABELS[k as keyof Stats]}`,
            v! > 0 ? THEME_CSS.lime : THEME_CSS.danger,
          ]);
    lines.forEach(([t, c], n) => add(text(this, x + 10, y + 92 + n * 14, truncate(t, 24), 12, c)));

    add(panel(this, x + 8, y + h - 38, w - 16, 28, { fill: THEME.surface2 }));
    if (status === "blocked") add(text(this, x + w / 2, y + h - 24, "NO SLOT", 13, THEME_CSS.danger, "display").setOrigin(0.5));
    else {
      const price = add(num(this, x + w / 2 + 10, y + h - 24, `${o.price}`, 14, status === "ok" ? THEME_CSS.lime : THEME_CSS.danger).setOrigin(0.5));
      add(this.add.image(price.x - price.width / 2 - 11, y + h - 24, "pickup_scrap", "0").setScale(16 / SCRAP_TEX));
    }
    const bw = locked ? 60 : 50;
    const hit = add(this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true }));
    const lockBtn = add(button(this, x + w - bw / 2 - 6, y + 14, locked ? "LOCKED" : "LOCK", () => this.lock(i), false, true, {
      w: bw, h: 16, size: 8, ...(locked ? { face: THEME.pink } : {}),
    }));
    lockBtn.add(lockIcon(this, 9 - bw / 2, locked));

    // The hit zone sits under the lock button, so a click on LOCK never also buys
    hit.on("pointerover", () => this.preview(i));
    hit.on("pointerdown", () => this.buy(i));
  }
}

const SCRAP_TEX = frameSize("pickup_scrap").w; // texture px of one scrap frame
/** Offer card i (board U3): today's 177 x 176 boxes. */
const offerBox = (i: number) => ({ x: 24 + i * 191, y: 100, w: 177, h: 176 });
