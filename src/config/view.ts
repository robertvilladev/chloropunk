import type Phaser from "phaser";
import { GAME_CONFIG } from "./constants";

/** The canvas is rendered at 2x; every scene keeps its 800x600 design coordinates. */
export const RENDER_SCALE = 2;
export const CANVAS_SIZE = { width: GAME_CONFIG.WIDTH * RENDER_SCALE, height: GAME_CONFIG.HEIGHT * RENDER_SCALE };

/** Zoom a camera so the 800x600 design space fills the larger canvas. */
export function applyView(cam: Phaser.Cameras.Scene2D.Camera): void {
  cam.setZoom(RENDER_SCALE).centerOn(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2);
}

/** Text renders to its own canvas, so zoom alone would blur it: rasterise every Text at RENDER_SCALE. */
export function installCrispText(P: typeof Phaser): void {
  const f = P.GameObjects.GameObjectFactory.prototype;
  const add = f.text;
  f.text = function (this: Phaser.GameObjects.GameObjectFactory, x, y, text, style) {
    return add.call(this, x, y, text, { resolution: RENDER_SCALE, ...style });
  };
}
