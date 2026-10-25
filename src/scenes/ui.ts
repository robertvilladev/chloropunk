import { DEPTH, GAME_CONFIG } from "@/config/constants";
import { FONTS, THEME, THEME_CSS, numberStroke } from "@/config/theme";
import { tierLabel } from "@/core/labels";
import { sfx } from "@/fx/sfx";
import type { Tier } from "@/types";
import Phaser from "phaser";

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 14,
  color: string = THEME_CSS.text,
  font: keyof typeof FONTS = "ui"
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: FONTS[font], fontSize: `${size}px`, color });
}

/** Bungee number with an ink stroke (board U1): HP, timer, scrap, prices, amounts, summary values. */
export function num(scene: Phaser.Scene, x: number, y: number, value: string, size: number, color: string = THEME_CSS.text): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, {
    fontFamily: FONTS.display,
    fontSize: `${size}px`,
    color,
    stroke: THEME_CSS.deep,
    strokeThickness: numberStroke(size),
  });
}

const RADIUS = 3;

/**
 * Kit panel look (board U1) drawn into `g` with its top-left at (x, y): optional offset shadow, light keyline,
 * fill, ink rim, and an optional coloured frame (tier, accent) inside the ink.
 */
export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; frame?: number; frameW?: number; shadow?: number; keyline?: boolean } = {}
): Phaser.GameObjects.Graphics {
  if (opts.shadow !== undefined) {
    g.fillStyle(opts.shadow).fillRoundedRect(x + 4, y + 4, w, h, RADIUS);
    g.lineStyle(2, THEME.deep).strokeRoundedRect(x + 4, y + 4, w, h, RADIUS);
  }
  if (opts.keyline !== false) g.lineStyle(1, THEME.text, 0.3).strokeRoundedRect(x - 1.5, y - 1.5, w + 3, h + 3, RADIUS + 1.5);
  g.fillStyle(opts.fill ?? THEME.surface).fillRoundedRect(x, y, w, h, RADIUS);
  g.lineStyle(2, THEME.deep).strokeRoundedRect(x, y, w, h, RADIUS);
  if (opts.frame !== undefined) {
    const fw = opts.frameW ?? 2;
    g.lineStyle(fw, opts.frame).strokeRoundedRect(x + 1 + fw / 2, y + 1 + fw / 2, w - 2 - fw, h - 2 - fw, Math.max(1, RADIUS - 1));
  }
  return g;
}

/** Kit panel at (x, y), top-left origin; `frame` = coloured rim (tier, accent), `shadow` = offset plate colour. */
export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; frame?: number; frameW?: number; shadow?: number } = {}
): Phaser.GameObjects.Graphics {
  return drawPanel(scene.add.graphics({ x, y }), 0, 0, w, h, opts);
}

/** Clickable button centred on (x, y); `primary` = lime face on a pink offset plate, both ink-rimmed. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  primary = false,
  enabled = true,
  look: { size?: number; font?: keyof typeof FONTS; w?: number; h?: number } = {}
): Phaser.GameObjects.Container {
  const t = text(scene, 0, 0, label, look.size ?? 14, enabled ? (primary ? THEME_CSS.limeInk : THEME_CSS.text) : THEME_CSS.textMuted, look.font).setOrigin(0.5);
  if (look.font !== "display") t.setFontStyle("600");
  const w = look.w ?? t.width + 24;
  const h = look.h ?? t.height + 12;
  const g = scene.add.graphics();
  const paint = (d: number, hover: boolean) => {
    g.clear();
    const fill = !enabled ? THEME.surface2 : primary ? (hover ? THEME.pink300 : THEME.lime) : hover ? THEME.line : THEME.surface;
    drawPanel(g, -w / 2 + d, -h / 2 + d, w, h, { fill, keyline: !primary, ...(primary && enabled ? { shadow: THEME.pink } : {}) });
    t.setPosition(d, d);
  };
  paint(0, false);
  const c = scene.add.container(x, y, [g, t]).setSize(w, h);
  if (enabled) {
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => {
      sfx("uiConfirm");
      onClick();
    });
    // PauseScene emits pointerover without a pointer to draw keyboard focus; it plays its own blip
    c.on("pointerover", (p?: Phaser.Input.Pointer) => {
      if (p) sfx("uiMove");
      paint(-2, true);
    });
    c.on("pointerout", () => paint(0, false));
  }
  return c;
}

/** Small plate with an ink rim and dark Bungee label (tier badge, LOCKED, key hints); (x, y) = top-left. */
export function badge(scene: Phaser.Scene, x: number, y: number, label: string, fill: number, size = 9): Phaser.GameObjects.Container {
  const t = scene.add.text(4, 1, label, { fontFamily: FONTS.display, fontSize: `${size}px`, color: THEME_CSS.limeInk });
  const g = scene.add.graphics();
  g.fillStyle(fill).fillRoundedRect(0, 0, t.width + 8, t.height + 2, 2);
  g.lineStyle(1.5, THEME.deep).strokeRoundedRect(0, 0, t.width + 8, t.height + 2, 2);
  return scene.add.container(x, y, [g, t]).setSize(t.width + 8, t.height + 2);
}

/** Tier badge "T3" in the tier colour (board U1). */
export const tierBadge = (scene: Phaser.Scene, x: number, y: number, tier: Tier, size = 9) => badge(scene, x, y, `T${tier}`, THEME.tier[tier - 1], size);

/** Tier tab sitting on a card's top edge: tier-coloured plate, dark label. `short` = "T3". */
export function tierTab(scene: Phaser.Scene, x: number, y: number, tier: Tier, short = false): Phaser.GameObjects.Container {
  const b = badge(scene, x, y, short ? `T${tier}` : tierLabel(tier), THEME.tier[tier - 1], 10);
  return b.setY(y - Math.round(b.height / 2));
}

/** Small muted label over a Bungee value. */
export function statTile(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  value: string,
  color: string = THEME_CSS.text
): Phaser.GameObjects.Container {
  return scene.add.container(x, y, [text(scene, 0, 0, label, 10, THEME_CSS.textMuted), num(scene, 0, 14, value, 22, color)]);
}

/** Barely visible 2px scanlines over the whole canvas; menus only. */
export function scanlines(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const key = "scanlines";
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, 4, 4)!;
    tex.context.fillStyle = THEME_CSS.scanline;
    tex.context.fillRect(0, 0, 4, 2);
    tex.refresh();
  }
  const { WIDTH: width, HEIGHT: height } = GAME_CONFIG;
  return scene.add.tileSprite(0, 0, width, height, key).setOrigin(0).setAlpha(0.06).setDepth(DEPTH.UI - 5) as unknown as Phaser.GameObjects.Image;
}

/**
 * Listen to keydown on `event.code` for the scene's lifetime. Auto-repeat is
 * ignored so holding a key can't buy or reroll repeatedly.
 */
export function onKeys(scene: Phaser.Scene, handler: (e: KeyboardEvent) => void): void {
  const kb = scene.input.keyboard!;
  const h = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code === "Escape") sfx("uiBack");
    handler(e);
  };
  kb.on("keydown", h);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off("keydown", h));
}

/** Pink "LOCKED" tab on a card's top edge, same plate style as tierTab; `right` is its right edge. */
export function lockedTab(scene: Phaser.Scene, right: number, y: number): Phaser.GameObjects.Container {
  const b = badge(scene, 0, 0, "LOCKED", THEME.pink, 10);
  return b.setPosition(right - b.width, y - Math.round(b.height / 2));
}

/** 10px padlock (shackle closed when `locked`), centred on (x, 0) of its parent. */
export function lockIcon(scene: Phaser.Scene, x: number, locked: boolean): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y: 0 });
  g.lineStyle(1.5, locked ? THEME.pink : THEME.textMuted);
  g.strokeRect(-4, -1, 8, 6);
  g.beginPath().moveTo(-2.5, -1).lineTo(-2.5, -3).lineTo(2.5, -3).lineTo(2.5, locked ? -1 : -2).strokePath();
  return g;
}
