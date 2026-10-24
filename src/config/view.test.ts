import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./constants";
import { CANVAS_SIZE, RENDER_SCALE, applyView, followView } from "./view";

describe("view", () => {
  it("canvas is the 800x600 design space at RENDER_SCALE", () => {
    expect(RENDER_SCALE).toBe(2);
    expect(CANVAS_SIZE).toEqual({ width: GAME_CONFIG.WIDTH * 2, height: GAME_CONFIG.HEIGHT * 2 });
  });

  it("zooms a camera and centres it on the design space", () => {
    const calls: unknown[] = [];
    const cam = {
      setZoom(z: number) { calls.push(["zoom", z]); return cam; },
      centerOn(x: number, y: number) { calls.push(["centre", x, y]); return cam; },
    };
    applyView(cam as never);
    expect(calls).toEqual([["zoom", 2], ["centre", 400, 300]]);
  });

  it("follows a target inside the arena, starting centred on it", () => {
    const calls: unknown[] = [];
    const cam = {
      setBounds(...a: number[]) { calls.push(["bounds", ...a]); return cam; },
      centerOn(x: number, y: number) { calls.push(["centre", x, y]); return cam; },
      startFollow(t: unknown, round: boolean, lx: number, ly: number) { calls.push(["follow", t, round, lx, ly]); return cam; },
    };
    const target = { x: 10, y: 20 };
    followView(cam as never, target as never, { w: 1600, h: 1200 });
    expect(calls).toEqual([["bounds", 0, 0, 1600, 1200], ["centre", 10, 20], ["follow", target, true, 0.12, 0.12]]);
  });
});
