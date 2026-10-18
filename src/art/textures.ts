import Phaser from "phaser";
import { ACTORS } from "./actors";
import { ACTOR_FRAME, actorShiftX, FEET_Y, gridTop, PIXEL } from "./body";
import { gridBounds, type Grid } from "./grid";
import { PALETTE } from "./palette";
import { PICKUPS } from "./pickups";

export { ACTOR_FRAME };
const PICKUP_PX = 24;
const FRAMES = ["walk0", "walk1", "hit"] as const;

function paint(ctx: CanvasRenderingContext2D, g: Grid, ox: number, oy: number): void {
  g.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === ".") continue;
      ctx.fillStyle = PALETTE[row[x]];
      ctx.fillRect(ox + x * PIXEL, oy + y * PIXEL, PIXEL, PIXEL);
    }
  });
}

/** One CanvasTexture per actor, frames walk0/walk1/hit side by side, baked shadow under the feet. */
export function buildActorTextures(scene: Phaser.Scene): void {
  const { w, h } = ACTOR_FRAME;
  for (const a of ACTORS) {
    const tex = scene.textures.createCanvas(a.key, w * FRAMES.length, h);
    if (!tex) continue;
    const ctx = tex.getContext();
    const dx = actorShiftX(a.key);
    FRAMES.forEach((name, i) => {
      const g = a[name];
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(i * w + w / 2, FEET_Y, 18, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      paint(ctx, g, i * w + dx, gridTop(gridBounds(g).y1));
      tex.add(name, 0, i * w, 0, w, h);
    });
    tex.refresh();
  }
}

/** pickup_scrap: frames "0"/"1", 24x24, with a faint lighter halo ring around the nut. */
export function buildPickupTextures(scene: Phaser.Scene): void {
  for (const p of PICKUPS) {
    const tex = scene.textures.createCanvas(p.key, PICKUP_PX * p.frames.length, PICKUP_PX);
    if (!tex) continue;
    const ctx = tex.getContext();
    p.frames.forEach((g, i) => {
      const ox = i * PICKUP_PX;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = PALETTE.w;
      g.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] !== ".") ctx.fillRect(ox + x * PIXEL - 1, y * PIXEL - 1, PIXEL + 2, PIXEL + 2);
        }
      });
      ctx.globalAlpha = 1;
      paint(ctx, g, ox, 0);
      tex.add(String(i), 0, ox, 0, PICKUP_PX, PICKUP_PX);
    });
    tex.refresh();
  }
}

export function registerAnimations(scene: Phaser.Scene): void {
  const anims = scene.anims;
  for (const a of ACTORS) {
    if (anims.exists(`${a.key}_walk`)) continue;
    anims.create({
      key: `${a.key}_walk`,
      frames: [{ key: a.key, frame: "walk0" }, { key: a.key, frame: "walk1" }],
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
