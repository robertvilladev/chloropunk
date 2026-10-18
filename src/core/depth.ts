/** Facing for a sprite: true = left. Velocities inside the dead zone keep `prev`. */
export const facingFlip = (vx: number, prev: boolean): boolean => (Math.abs(vx) < 8 ? prev : vx < 0);
