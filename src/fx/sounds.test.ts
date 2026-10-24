import { describe, expect, it } from "vitest";
import { SOUNDS } from "./sounds";
import { zzfxSamples } from "./zzfx";

describe("sounds", () => {
  it.each(Object.entries(SOUNDS))("%s renders short, finite, audible, unclipped samples", (_, s) => {
    const b = zzfxSamples(44100, s.zzfx);
    const peak = b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(b.every(Number.isFinite)).toBe(true);
    expect(b.length / 44100).toBeLessThan(1.5);
    expect(peak).toBeGreaterThan(0.05);
    expect(peak).toBeLessThanOrEqual(1);
    expect(s.zzfx[1]).toBe(0); // buffers are cached: per-play variation happens in sfx.ts
  });
});
