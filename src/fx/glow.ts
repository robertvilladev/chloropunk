import Phaser from "phaser";

export const isWebGL = (scene: Phaser.Scene): boolean => scene.game.renderer.type === Phaser.WEBGL;
