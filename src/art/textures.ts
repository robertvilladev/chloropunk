import Phaser from "phaser";
import { ART_SCALE, frameSize } from "./body";
import { ICON_KEYS, ITEM_ICONS, STAT_ICONS, iconKey, iconSvg } from "./icons";
import { ACTOR_KEYS, WEAPON_IDS, FRAMES, SPRITE_META, svg, type ActorKey, type SpriteKey } from "./vector";
import { THEME } from "@/config/theme";

const KEYS = Object.keys(SPRITE_META) as SpriteKey[];
/** Menu/loadout fighter, drawn up to 4x design size: baked at 8x so it stays sharp. */
const PORTRAIT_SCALE = 4;

/** Base64 because Phaser's loader decodes every data: URL with atob; the SVG strings are plain ASCII. */
export const svgUri = (s: string): string => "data:image/svg+xml;base64," + btoa(s);

/** Card / HUD / loadout art is drawn up to ~54 design px (108 device px at RENDER_SCALE 2): baked at 4x design, never upscaled. */
const UI_ART_SCALE = 2;
/** Weapon sprites for cards and slots, one texture per tier frame: ui_weapon_<id>_t<n>. */
export const uiWeaponKey = (id: string, tier: number): string => `ui_weapon_${id}_t${tier}`;
export const UI_WEAPON_KEYS = WEAPON_IDS.flatMap((id) => [1, 2, 3, 4].map((t) => uiWeaponKey(id, t)));

/** Loader keys queued by preloadSprites: every key@frame, then player_portrait, the card/HUD icons and the UI weapon art. */
export function spriteFrameKeys(): string[] {
  return [...KEYS.flatMap((k) => FRAMES[k].map((f) => `${k}@${f}`)), "player_portrait", ...ICON_KEYS, ...UI_WEAPON_KEYS];
}

/** Queue every frame as an SVG image at 2x design px (the svg width/height), plus the 8x portrait. */
export function preloadSprites(scene: Phaser.Scene): void {
  for (const k of KEYS) for (const f of FRAMES[k]) scene.load.svg(`${k}@${f}`, svgUri(svg(k, f)));
  scene.load.svg("player_portrait", svgUri(svg("player", "walk0")), { scale: PORTRAIT_SCALE });
  // Icons and UI weapon art stay one texture each (4x design px), drawn down to card and HUD size
  const ui = { scale: UI_ART_SCALE };
  for (const id of ITEM_ICONS) scene.load.svg(iconKey("item", id), svgUri(iconSvg("item", id)), ui);
  for (const id of STAT_ICONS) scene.load.svg(iconKey("stat", id), svgUri(iconSvg("stat", id)), ui);
  for (const id of WEAPON_IDS) for (const t of [1, 2, 3, 4]) scene.load.svg(uiWeaponKey(id, t), svgUri(svg(`weapon_${id}`, `t${t}`)), ui);
}

/** Baked shadow in texture px: rx 0.36 w, ry rx/4, centred on the feet but lifted so it never clips at the frame bottom. */
export function shadowEllipse(key: SpriteKey): { cy: number; rx: number; ry: number } {
  const rx = SPRITE_META[key].w * 0.36 * ART_SCALE, ry = rx / 4;
  return { cy: Math.min(SPRITE_META[key].feet * ART_SCALE, frameSize(key).h - ry), rx, ry };
}

/** One CanvasTexture per key, frames side by side (walk0/walk1/hit, scrap 0/1, weapons t1..t4), shadow baked under actors. */
export function buildSpriteTextures(scene: Phaser.Scene): void {
  for (const k of KEYS) {
    if (scene.textures.exists(k)) continue;
    const { w, h } = frameSize(k);
    const tex = scene.textures.createCanvas(k, w * FRAMES[k].length, h);
    if (!tex) continue;
    const ctx = tex.getContext();
    const sh = shadowEllipse(k);
    FRAMES[k].forEach((f, i) => {
      const src = `${k}@${f}`;
      // A frame the browser could not decode is dropped by the loader: fail at boot, not with a missing texture
      if (!scene.textures.exists(src)) throw new Error(`sprite ${src} failed to load`);
      if (ACTOR_KEYS.includes(k as ActorKey)) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(i * w + w / 2, sh.cy, sh.rx, sh.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.drawImage(scene.textures.get(src).getSourceImage() as CanvasImageSource, i * w, 0, w, h);
      tex.add(f, 0, i * w, 0, w, h);
      scene.textures.remove(src);
    });
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  if (!scene.textures.exists("player_portrait")) throw new Error("sprite player_portrait failed to load");
  scene.textures.get("player_portrait").setFilter(Phaser.Textures.FilterMode.LINEAR);
  for (const k of [...ICON_KEYS, ...UI_WEAPON_KEYS]) {
    if (!scene.textures.exists(k)) throw new Error(`sprite ${k} failed to load`);
    scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

/** vignette: 800x600, transparent centre, danger-coloured edge (alpha 0.7 -> 0 over 90px). Canvas-safe. */
export function buildFxTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists("vignette")) return;
  const [w, h, edge] = [800, 600, 90];
  const rgb = `${THEME.danger >> 16},${(THEME.danger >> 8) & 255},${THEME.danger & 255}`;
  const tex = scene.textures.createCanvas("vignette", w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  const side = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, `rgba(${rgb},0.7)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(rx, ry, rw, rh);
  };
  side(0, 0, 0, edge, 0, 0, w, edge);
  side(0, h, 0, h - edge, 0, h - edge, w, edge);
  side(0, 0, edge, 0, 0, 0, edge, h);
  side(w, 0, w - edge, 0, w - edge, 0, edge, h);
  tex.refresh();
}

export function registerAnimations(scene: Phaser.Scene): void {
  const anims = scene.anims;
  for (const key of ACTOR_KEYS) {
    if (anims.exists(`${key}_walk`)) continue;
    anims.create({
      key: `${key}_walk`,
      frames: [{ key, frame: "walk0" }, { key, frame: "walk1" }],
      frameRate: 6,
      repeat: -1,
    });
  }
  if (!anims.exists("pickup_scrap_spin")) {
    anims.create({
      key: "pickup_scrap_spin",
      frames: [{ key: "pickup_scrap", frame: "0" }, { key: "pickup_scrap", frame: "1" }],
      frameRate: 3,
      repeat: -1,
    });
  }
}
