import { DEPTH, GAME_CONFIG } from "@/config/constants";
import { FONTS, THEME, THEME_CSS, numberStroke } from "@/config/theme";
import { sfx } from "@/fx/sfx";
import type { Tier } from "@/types";
import { iconKey, type IconKind } from "@/art/icons";
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
  look: { size?: number; font?: keyof typeof FONTS; w?: number; h?: number; face?: number } = {}
): Phaser.GameObjects.Container {
  const dark = primary || look.face !== undefined;
  const t = text(scene, 0, 0, label, look.size ?? 14, enabled ? (dark ? THEME_CSS.limeInk : THEME_CSS.text) : THEME_CSS.textMuted, look.font).setOrigin(0.5);
  if (look.font !== "display") t.setFontStyle("600");
  const w = look.w ?? t.width + 24;
  const h = look.h ?? t.height + 12;
  const g = scene.add.graphics();
  const paint = (d: number, hover: boolean) => {
    g.clear();
    const fill = !enabled ? THEME.surface2 : look.face ?? (primary ? (hover ? THEME.pink300 : THEME.lime) : hover ? THEME.line : THEME.surface);
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

/** 10px padlock (shackle closed when `locked`), centred on (x, 0) of its parent. */
export function lockIcon(scene: Phaser.Scene, x: number, locked: boolean): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y: 0 });
  g.lineStyle(1.5, locked ? THEME.pink : THEME.textMuted);
  g.strokeRect(-4, -1, 8, 6);
  g.beginPath().moveTo(-2.5, -1).lineTo(-2.5, -3).lineTo(2.5, -3).lineTo(2.5, locked ? -1 : -2).strokePath();
  return g;
}

/** Art for an icon window: a texture key + frame; weapons are tilted to fit (board U3). */
export interface IconArt { key: string; frame?: string; angle?: number }

/** Icon art for a weapon (its sprite at the tier frame) or an item / stat icon. */
export const weaponArt = (id: string, tier: Tier, angle = 0): IconArt => ({ key: `weapon_${id}`, frame: `t${tier}`, angle });
export const iconArt = (kind: IconKind, id: string): IconArt => ({ key: iconKey(kind, id) });

/** Image of `art` scaled so its (rotated) bounds fit a `box` px square, centred on (x, y). */
export function fitImage(scene: Phaser.Scene, x: number, y: number, art: IconArt, box: number): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, art.key, art.frame).setAngle(art.angle ?? 0);
  const a = Phaser.Math.DegToRad(art.angle ?? 0);
  const bw = img.width * Math.abs(Math.cos(a)) + img.height * Math.abs(Math.sin(a));
  const bh = img.width * Math.abs(Math.sin(a)) + img.height * Math.abs(Math.cos(a));
  return img.setScale(box / Math.max(bw, bh));
}

/** Framed icon window (board U3): dark well with a coloured rim, art fitted inside; (x, y) = top-left. */
export function iconWindow(scene: Phaser.Scene, x: number, y: number, size: number, rim: number, art: IconArt): Phaser.GameObjects.Container {
  const g = drawPanel(scene.add.graphics(), 0, 0, size, size, { fill: THEME.bg, frame: rim, keyline: false });
  return scene.add.container(x, y, [g, fitImage(scene, size / 2, size / 2, art, size - Math.max(8, size * 0.16))]);
}

const GLOW_PAD = 14;
/** Idle glow (board U1/U3): T3 pink pulse 1.6 s, T4 amber pulse 1.2 s + a shine sweep every 3.2 s. Baked, no tint. */
export function cardGlow(scene: Phaser.Scene, x: number, y: number, w: number, h: number, tier: Tier): { glow: Phaser.GameObjects.Image; shine?: Phaser.GameObjects.Image } | null {
  if (tier < 3) return null;
  const key = `glow_t${tier}_${w}x${h}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, w + GLOW_PAD * 2, h + GLOW_PAD * 2)!;
    const ctx = tex.getContext();
    ctx.shadowColor = ctx.fillStyle = THEME_CSS.tier[tier - 1];
    ctx.shadowBlur = 12;
    ctx.fillRect(GLOW_PAD, GLOW_PAD, w, h);
    tex.refresh();
  }
  const glow = scene.add.image(x - GLOW_PAD, y - GLOW_PAD, key).setOrigin(0).setAlpha(0.25);
  scene.tweens.add({ targets: glow, alpha: 0.75, duration: tier === 4 ? 600 : 800, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  glow.once(Phaser.GameObjects.Events.DESTROY, () => scene.tweens.killTweensOf(glow));
  if (tier < 4) return { glow };
  if (!scene.textures.exists("shine")) {
    const tex = scene.textures.createCanvas("shine", 22, 4)!;
    const ctx = tex.getContext();
    const gr = ctx.createLinearGradient(0, 0, 22, 0);
    gr.addColorStop(0, "rgba(255,255,255,0)");
    gr.addColorStop(0.5, "rgba(255,255,255,1)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 22, 4);
    tex.refresh();
  }
  const shine = scene.add.image(x + 2, y + 2, "shine").setOrigin(0).setDisplaySize(22, h - 4).setAlpha(0);
  scene.tweens.add({
    targets: shine,
    props: { x: { from: x + 2, to: x + w - 24, duration: 900 }, alpha: { from: 0, to: 0.22, duration: 450, yoyo: true } },
    delay: 1200,
    repeat: -1,
    repeatDelay: 2300,
  });
  shine.once(Phaser.GameObjects.Events.DESTROY, () => scene.tweens.killTweensOf(shine));
  return { glow, shine };
}

/**
 * Legendary pick effect (board U3, first pass) over a card at (x, y, w, h): warm flash, amber ring, ten sparks and
 * a "LEGENDARY!" pop. Fire-and-forget: it never takes input and cleans itself up; the pick is already applied.
 */
export function legendaryPop(scene: Phaser.Scene, x: number, y: number, w: number, h: number): void {
  const cx = x + w / 2, cy = y + h / 2, depth = DEPTH.UI + 10;
  const amber = THEME.tier[3];
  const flash = scene.add.rectangle(x, y, w, h, THEME.text, 0.75).setOrigin(0).setDepth(depth);
  scene.tweens.add({ targets: flash, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
  const ring = scene.add.graphics({ x: cx, y: cy }).setDepth(depth);
  ring.lineStyle(4, amber).strokeCircle(0, 0, Math.min(w, h) * 0.4);
  ring.setScale(0.4);
  scene.tweens.add({ targets: ring, scale: 1.7, alpha: 0, duration: 520, ease: "Cubic.Out", onComplete: () => ring.destroy() });
  const cols = [amber, THEME.lime, amber, THEME.pink, THEME.text];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3, r = i % 2 ? 100 : 80;
    const s = scene.add.graphics({ x: cx, y: cy }).setDepth(depth).setAngle(45);
    s.fillStyle(cols[i % 5]).fillRect(-4, -4, 8, 8).lineStyle(1.5, THEME.deep).strokeRect(-4, -4, 8, 8);
    scene.tweens.add({ targets: s, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.9, scale: 0.4, alpha: 0, duration: 640, ease: "Cubic.Out", onComplete: () => s.destroy() });
  }
  const label = num(scene, cx, y - 6, "LEGENDARY!", 26, THEME_CSS.tier[3]).setOrigin(0.5, 1).setDepth(depth);
  // keep the popped (1.18x) label on screen over the edge cards
  const half = (label.width * 1.18) / 2 + 8;
  label.setX(Phaser.Math.Clamp(cx, half, GAME_CONFIG.WIDTH - half)).setScale(0.6).setAlpha(0);
  scene.tweens.chain({
    targets: label,
    tweens: [
      { scale: 1.18, alpha: 1, duration: 140, ease: "Back.Out" },
      { scale: 1, duration: 90 },
      { y: label.y - 16, alpha: 0, delay: 700, duration: 400, onComplete: () => label.destroy() },
    ],
  });
}
