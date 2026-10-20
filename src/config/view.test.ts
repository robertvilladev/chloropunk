import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./constants";
import { CANVAS_SIZE, RENDER_SCALE, applyView } from "./view";

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
});
