/** Cap a frame delta (ms) so a tab-switch stall can't teleport enemies. */
export const clampDelta = (ms: number): number => Math.min(ms, 100);
