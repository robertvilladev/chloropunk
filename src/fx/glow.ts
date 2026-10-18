import Phaser from "phaser";
import { THEME } from "@/config/theme";

export const isWebGL = (scene: Phaser.Scene): boolean => scene.game.renderer.type === Phaser.WEBGL;

/** One camera-level bloom (WebGL only); never per-sprite postFX. The HUD is another camera, so it stays crisp. */
export function applyGlow(scene: Phaser.Scene): void {
  if (!isWebGL(scene)) return;
  // fresh camera per scene start, so no stacking
  scene.cameras.main.postFX.addBloom(THEME.text, 1, 1, 1, 0.6);
}
