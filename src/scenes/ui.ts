import { THEME_CSS } from "@/config/theme";
import Phaser from "phaser";

// Placeholder widgets for the M2 menus; M3 restyles them per the mockups.
export const UI_FONT = "IBM Plex Mono, monospace";
export const DISPLAY_FONT = "Bungee, Impact, sans-serif";

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 14,
  color: string = THEME_CSS.text
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: UI_FONT, fontSize: `${size}px`, color });
}

/** A clickable text button; `primary` = lime action colour. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  primary = false,
  enabled = true
): Phaser.GameObjects.Text {
  const bg = primary ? THEME_CSS.lime : THEME_CSS.surface;
  const fg = primary ? THEME_CSS.limeInk : THEME_CSS.text;
  const b = scene.add
    .text(x, y, label, {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: enabled ? fg : THEME_CSS.textMuted,
      backgroundColor: enabled ? bg : THEME_CSS.surface2,
      padding: { x: 10, y: 6 },
    })
    .setOrigin(0.5);
  if (enabled) {
    b.setInteractive({ useHandCursor: true });
    b.on("pointerdown", onClick);
    b.on("pointerover", () => b.setStyle({ backgroundColor: primary ? THEME_CSS.pink : THEME_CSS.line }));
    b.on("pointerout", () => b.setStyle({ backgroundColor: bg }));
  }
  return b;
}

/**
 * Listen to keydown on `event.code` for the scene's lifetime. Auto-repeat is
 * ignored so holding a key can't buy or reroll repeatedly.
 */
export function onKeys(scene: Phaser.Scene, handler: (e: KeyboardEvent) => void): void {
  const kb = scene.input.keyboard!;
  const h = (e: KeyboardEvent) => {
    if (!e.repeat) handler(e);
  };
  kb.on("keydown", h);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off("keydown", h));
}
