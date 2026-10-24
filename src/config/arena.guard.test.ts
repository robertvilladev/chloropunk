import { describe, expect, it } from "vitest";

// Gameplay sizes come from ARENA; GAME_CONFIG.WIDTH/HEIGHT is the 800x600 design space (layout only)
const sources = import.meta.glob<string>(
  ["/src/managers/**/*.ts", "/src/core/**/*.ts", "/src/entities/**/*.ts", "/src/scenes/GameScene.ts", "!/src/**/*.test.ts"],
  { query: "?raw", import: "default", eager: true }
);
const designSize = /GAME_CONFIG\.(WIDTH|HEIGHT)\b/;

describe("gameplay uses the arena size", () => {
  it("no gameplay source reads the design-space size", () => {
    expect(Object.keys(sources).filter((p) => designSize.test(sources[p]))).toEqual([]);
  });
});
