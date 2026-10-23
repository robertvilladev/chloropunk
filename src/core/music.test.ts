import { describe, expect, it } from "vitest";
import { DUCK, nextVolume, trackGains } from "./music";

const TRIM = { nlv: 0.75, spring: 1 };

describe("trackGains", () => {
  it("plays only the state's track, at its trim", () => {
    expect(trackGains("menu", false, TRIM)).toEqual({ nlv: 0.75, spring: 0 });
    expect(trackGains("game", false, TRIM)).toEqual({ nlv: 0, spring: 1 });
  });
  it("ducks the playing track", () => {
    expect(trackGains("game", true, TRIM)).toEqual({ nlv: 0, spring: DUCK });
  });
  it("is silent before any state is set", () => {
    expect(trackGains(undefined, false, TRIM)).toEqual({ nlv: 0, spring: 0 });
  });
});

describe("nextVolume", () => {
  it("steps 20% and wraps at 100%", () => {
    expect([0, 0.2, 0.6, 0.8, 1].map(nextVolume)).toEqual([0.2, 0.4, 0.8, 1, 0]);
  });
});
