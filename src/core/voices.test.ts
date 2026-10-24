import { describe, expect, it } from "vitest";
import { VoiceLimiter, streakRate, vary, waveBoost } from "./voices";

describe("VoiceLimiter", () => {
  const rule = { max: 2, gapMs: 50 };

  it("caps concurrent voices until one ends", () => {
    const v = new VoiceLimiter();
    expect(v.tryStart("hit", rule, 0, 200)).toBe(true);
    expect(v.tryStart("hit", rule, 60, 200)).toBe(true);
    expect(v.tryStart("hit", rule, 120, 200)).toBe(false); // 2 still playing
    expect(v.tryStart("hit", rule, 201, 200)).toBe(true); // first one ended
  });

  it("enforces the minimum gap between starts", () => {
    const v = new VoiceLimiter();
    expect(v.tryStart("hit", rule, 0, 10)).toBe(true);
    expect(v.tryStart("hit", rule, 49, 10)).toBe(false);
    expect(v.tryStart("hit", rule, 50, 10)).toBe(true);
  });

  it("limits each sound separately", () => {
    const v = new VoiceLimiter();
    expect(v.tryStart("hit", rule, 0, 100)).toBe(true);
    expect(v.tryStart("kill", rule, 0, 100)).toBe(true);
  });
});

describe("vary", () => {
  it("spreads ±amount around the base", () => {
    expect(vary(1, 0.1, () => 0)).toBeCloseTo(0.9);
    expect(vary(1, 0.1, () => 0.5)).toBeCloseTo(1);
    expect(vary(2, 0.1, () => 1)).toBeCloseTo(2.2);
  });
});

describe("waveBoost", () => {
  it("starts neutral and grows a little each wave, capped at wave 10", () => {
    expect(waveBoost(1)).toEqual({ rate: 1, gain: 1 });
    expect(waveBoost(2).rate).toBeGreaterThan(1);
    expect(waveBoost(10).rate).toBeLessThan(1.15); // under ~2.5 semitones
    expect(waveBoost(10).gain).toBeLessThanOrEqual(1.3);
    expect(waveBoost(20)).toEqual(waveBoost(10));
  });
});

describe("streakRate", () => {
  it("rises with the streak and caps at an octave", () => {
    expect(streakRate(0)).toBe(1);
    expect(streakRate(1)).toBeGreaterThan(streakRate(0));
    expect(streakRate(100)).toBe(2);
  });
});
