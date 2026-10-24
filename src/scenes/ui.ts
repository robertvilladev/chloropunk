import { DEPTH, GAME_CONFIG } from "@/config/constants";
import { FONTS, THEME, THEME_CSS } from "@/config/theme";
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

/** Clickable button centred on (x, y); `primary` = lime face with a 4px pink offset shadow. */
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
  const w = look.w ?? t.width + 24;
  const h = look.h ?? t.height + 12;
  const face = scene.add.rectangle(0, 0, w, h, enabled ? (primary ? THEME.lime : THEME.surface) : THEME.surface2);
  if (!primary || !enabled) face.setStrokeStyle(1, THEME.line);
  const parts: Phaser.GameObjects.GameObject[] = [];
  if (primary && enabled) parts.push(scene.add.rectangle(4, 4, w, h, THEME.pink));
  const c = scene.add.container(x, y, [...parts, face, t]).setSize(w, h);
  if (enabled) {
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => {
      sfx("uiConfirm");
      onClick();
    });
    const move = (d: number) => {
      face.setPosition(d, d);
      t.setPosition(d, d);
    };
    // PauseScene emits pointerover without a pointer to draw keyboard focus; it plays its own blip
    c.on("pointerover", (p?: Phaser.Input.Pointer) => {
      if (p) sfx("uiMove");
      move(-2);
      face.setFillStyle(primary ? THEME.pink300 : THEME.line);
    });
    c.on("pointerout", () => {
      move(0);
      face.setFillStyle(primary ? THEME.lime : THEME.surface);
    });
  }
  return c;
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { border?: number; fill?: number; shadow?: boolean } = {}
): Phaser.GameObjects.Rectangle {
  if (opts.shadow) scene.add.rectangle(x + 4, y + 4, w, h, THEME.pink).setOrigin(0);
  return scene.add
    .rectangle(x, y, w, h, opts.fill ?? THEME.surface)
    .setOrigin(0)
    .setStrokeStyle(1, opts.border ?? THEME.line);
}

export function tierChip(scene: Phaser.Scene, x: number, y: number, tier: Tier, origin = 0): Phaser.GameObjects.Text {
  return text(scene, x, y, tierLabel(tier), 11, THEME_CSS.tier[tier - 1]).setOrigin(origin, 0);
}

/** Tier tab sitting on a card's top edge: tier-coloured plate, dark label. `short` = "T3". */
export function tierTab(scene: Phaser.Scene, x: number, y: number, tier: Tier, short = false): Phaser.GameObjects.Container {
  const t = text(scene, 5, 0, short ? `T${tier}` : tierLabel(tier), 10, THEME_CSS.limeInk);
  const bg = scene.add.rectangle(0, 0, t.width + 10, t.height + 2, THEME.tier[tier - 1]).setOrigin(0);
  return scene.add.container(x, y - Math.round(bg.height / 2), [bg, t]);
}

/** Small muted label over a VT323 value. */
export function statTile(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  value: string,
  color: string = THEME_CSS.text
): Phaser.GameObjects.Container {
  return scene.add.container(x, y, [
    text(scene, 0, 0, label, 10, THEME_CSS.textMuted),
    text(scene, 0, 12, value, 24, color, "pixel"),
  ]);
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
  const t = text(scene, 5, 0, "LOCKED", 10, THEME_CSS.limeInk);
  const bg = scene.add.rectangle(0, 0, t.width + 10, t.height + 2, THEME.pink).setOrigin(0);
  return scene.add.container(right - bg.width, y - Math.round(bg.height / 2), [bg, t]);
}

/** 10px padlock (shackle closed when `locked`), centred on (x, 0) of its parent. */
export function lockIcon(scene: Phaser.Scene, x: number, locked: boolean): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y: 0 });
  g.lineStyle(1.5, locked ? THEME.pink : THEME.textMuted);
  g.strokeRect(-4, -1, 8, 6);
  g.beginPath().moveTo(-2.5, -1).lineTo(-2.5, -3).lineTo(2.5, -3).lineTo(2.5, locked ? -1 : -2).strokePath();
  return g;
}
