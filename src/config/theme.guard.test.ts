import { describe, expect, it } from "vitest";

// Files still holding raw colour literals; each themed task removes its files (Task 11 asserts empty).
const PENDING = [
  "GameOverScene.ts", "VictoryScene.ts", "MenuScene.ts", "UIScene.ts", "WorldManager.ts",
  "gameConfig.ts", "BootScene.ts",
];
const sources = import.meta.glob<string>(["/src/**/*.ts", "!/src/**/*.test.ts", "!/src/art/**", "!/src/config/theme.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const all = Object.keys(sources);
const dirty = (p: string) => /#[0-9a-fA-F]{6}\b|\b0x[0-9a-fA-F]{6}\b/.test(sources[p]);

describe("no hardcoded colours", () => {
  it("only PENDING files contain hex literals", () => {
    const bad = all.filter(dirty).filter((p) => !PENDING.some((n) => p.endsWith(n)));
    expect(bad).toEqual([]);
  });
  it("PENDING lists only dirty files", () => {
    const clean = PENDING.filter((n) => !all.some((p) => p.endsWith(n) && dirty(p)));
    expect(clean).toEqual([]);
  });
});
