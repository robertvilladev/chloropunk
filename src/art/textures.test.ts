import { describe, expect, it, vi } from "vitest";
import { spriteFrameKeys, svgUri } from "./textures";

// textures.ts only uses Phaser through the scene it is given (plus one filter-mode constant)
vi.mock("phaser", () => ({ default: { Textures: { FilterMode: { LINEAR: 0 } } } }));

describe("svgUri", () => {
  // Phaser decodes every data: URL with atob, so the payload must be base64
  it("round-trips the svg string as base64", () => {
    const s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path d="M0,0 L2,2" stroke="#fff"/></svg>';
    const uri = svgUri(s);
    expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(atob(uri.split(",")[1])).toBe(s);
  });
});

describe("spriteFrameKeys", () => {
  it("lists every key@frame plus the portrait", () => {
    const keys = spriteFrameKeys();
    expect(keys).toHaveLength(21);
    expect(keys[0]).toBe("player@walk0");
    expect(keys).toContain("enemy_potato@hit");
    expect(keys).toContain("pickup_scrap@1");
    expect(keys.at(-1)).toBe("player_portrait");
    expect(new Set(keys).size).toBe(21);
  });
});
