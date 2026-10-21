import { describe, expect, it } from "vitest";

// The canvas is 2x the 800x600 design space (view.ts): layout must use GAME_CONFIG.WIDTH/HEIGHT
const sources = import.meta.glob<string>(["/src/**/*.ts", "!/src/**/*.test.ts", "!/src/config/view.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const canvasSize = /\.scale\.(width|height|gameSize)\b|=\s*(this|scene|this\.scene)\.scale\s*;|cameras\.main\.(width|height)\b|setScrollFactor\(0\)/;

describe("layout uses the design space", () => {
  it("no source reads the 2x canvas size", () => {
    expect(Object.keys(sources).filter((p) => canvasSize.test(sources[p]))).toEqual([]);
  });
});
