import { DEPTH, GAME_CONFIG } from "@/config/constants";

/** Facing for a sprite: true = left. Velocities inside the dead zone keep `prev`. */
export const facingFlip = (vx: number, prev: boolean): boolean => (Math.abs(vx) < 8 ? prev : vx < 0);

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** 3/4 y-sort: larger y (lower on screen) draws in front, inside [40, 49.99]. */
export const actorDepth = (y: number, height: number = GAME_CONFIG.HEIGHT): number =>
  Number.isFinite(y) ? DEPTH.ACTORS + 9.99 * clamp01(y / height) : DEPTH.ACTORS;

/** Pickups sort among themselves but always stay below actors. */
export const pickupDepth = (y: number, height: number = GAME_CONFIG.HEIGHT): number =>
  Number.isFinite(y) ? DEPTH.SCRAP + 0.99 * clamp01(y / height) : DEPTH.SCRAP;
