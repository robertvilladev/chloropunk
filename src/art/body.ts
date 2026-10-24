import { SPRITE_META, type SpriteKey } from "./vector";

/** Textures are baked at 2x design px and drawn at 1/ART_SCALE, so edges stay sharp at camera zoom 2. */
export const ART_SCALE = 2;

/** Frame size in texture px. */
export function frameSize(key: SpriteKey): { w: number; h: number } {
  const { w, h } = SPRITE_META[key];
  return { w: w * ART_SCALE, h: h * ART_SCALE };
}

/** Design px from the sprite centre (origin 0.5) down to the feet: depth sorts by the feet, not the centre. */
export function feetOffset(key: SpriteKey): number {
  const { h, feet } = SPRITE_META[key];
  return feet - h / 2;
}

// Arcade bodies take sizes and offsets in texture px and scale them with the sprite, so `radius`/`w`/`h`
// stay in design px here. Both set the scale too: a recycled pool sprite may carry another key's state.

/** Circle of `radius` design px centred on the sprite's body centre. */
export function fitCircle(s: Phaser.Physics.Arcade.Sprite, key: SpriteKey, radius: number): void {
  const { cx, cy } = SPRITE_META[key];
  const r = radius * ART_SCALE;
  s.setScale(1 / ART_SCALE);
  (s.body as Phaser.Physics.Arcade.Body).setCircle(r, cx * ART_SCALE - r, cy * ART_SCALE - r);
}

/** w x h design px box centred on the sprite's body centre. */
export function fitBox(s: Phaser.Physics.Arcade.Sprite, key: SpriteKey, w: number, h: number): void {
  const { cx, cy } = SPRITE_META[key];
  const [bw, bh] = [w * ART_SCALE, h * ART_SCALE];
  s.setScale(1 / ART_SCALE);
  (s.body as Phaser.Physics.Arcade.Body).setSize(bw, bh).setOffset(cx * ART_SCALE - bw / 2, cy * ART_SCALE - bh / 2);
}
