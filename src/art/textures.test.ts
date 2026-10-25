import { describe, expect, it, vi } from "vitest";
import { buildSpriteTextures, shadowEllipse, spriteFrameKeys, svgUri } from "./textures";
import { frameSize } from "./body";
import { ACTOR_KEYS, SPRITE_META } from "./vector";
import { ICON_KEYS } from "./icons";

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
  it("lists every key@frame, the portrait, then the icons", () => {
    const keys = spriteFrameKeys();
    expect(keys).toHaveLength(53 + 29);
    expect(keys[0]).toBe("player@walk0");
    expect(keys).toContain("enemy_potato@hit");
    expect(keys).toContain("pickup_scrap@1");
    expect(keys).toContain("weapon_rocket@t4");
    expect(keys).toContain("fx_beam@0");
    expect(keys[52]).toBe("player_portrait");
    expect(keys.slice(53)).toEqual(ICON_KEYS);
    expect(new Set(keys).size).toBe(53 + 29);
  });
});

describe("buildSpriteTextures", () => {
  it("throws when a sprite frame failed to load", () => {
    const canvas = { getContext: () => ({}), add() {}, refresh() {}, setFilter() {} };
    const scene = { textures: { exists: () => false, createCanvas: () => canvas, get: () => ({}), remove() {} } };
    expect(() => buildSpriteTextures(scene as unknown as Phaser.Scene)).toThrow(/player@walk0 failed to load/);
  });

  it("throws when an icon failed to load, and smooths every icon", () => {
    const filtered: string[] = [];
    const canvas = { getContext: () => ({}), add() {}, refresh() {}, setFilter() {} };
    const has = (k: string) => k !== "icon_stat_luck";
    const scene = { textures: { exists: has, createCanvas: () => canvas, get: (k: string) => ({ setFilter: () => filtered.push(k) }), remove() {} } };
    expect(() => buildSpriteTextures(scene as unknown as Phaser.Scene)).toThrow(/icon_stat_luck failed to load/);
    const ok = { textures: { ...scene.textures, exists: () => true } };
    filtered.length = 0;
    buildSpriteTextures(ok as unknown as Phaser.Scene);
    expect(filtered).toEqual(expect.arrayContaining(ICON_KEYS));
  });
});

describe("shadowEllipse", () => {
  it("keeps every actor shadow whole inside its frame, under the feet", () => {
    for (const k of ACTOR_KEYS) {
      const s = shadowEllipse(k);
      expect(s.cy + s.ry, k).toBeLessThanOrEqual(frameSize(k).h);
      expect(s.rx, k).toBeCloseTo(SPRITE_META[k].w * 0.36 * 2);
      expect(s.ry, k).toBeCloseTo(s.rx / 4);
      expect(SPRITE_META[k].feet * 2 - s.cy, k).toBeLessThanOrEqual(s.ry);
    }
  });
});
