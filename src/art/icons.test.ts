// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import itemDefs from "@assets/data/items.json";
import upgrades from "@assets/data/upgrades.json";
import { ICON_KEYS, ITEM_ICONS, STAT_ICONS, iconKey, iconSvg } from "./icons";

const all = [
  ...ITEM_ICONS.map((id) => ({ key: iconKey("item", id), s: iconSvg("item", id) })),
  ...STAT_ICONS.map((id) => ({ key: iconKey("stat", id), s: iconSvg("stat", id) })),
];

describe("icons", () => {
  it("every item has an icon and no icon lacks an item", () => {
    expect([...ITEM_ICONS].sort()).toEqual(Object.keys(itemDefs).sort());
  });

  it("every level-up stat has an icon and no icon lacks a stat", () => {
    expect([...STAT_ICONS].sort()).toEqual(Object.keys(upgrades).sort());
  });

  it("keys are icon_<kind>_<id>, one per icon", () => {
    expect(iconKey("item", "visor")).toBe("icon_item_visor");
    expect(iconKey("stat", "maxHp")).toBe("icon_stat_maxHp");
    expect(ICON_KEYS).toHaveLength(29);
    expect(new Set(ICON_KEYS).size).toBe(29);
  });

  it("builds a 32x32 svg at 2x that parses", () => {
    for (const { key, s } of all) {
      expect(s).toContain('viewBox="0 0 32 32"');
      expect(s).toContain('width="64"');
      const doc = new DOMParser().parseFromString(s, "image/svg+xml");
      expect(doc.getElementsByTagName("parsererror").length, key).toBe(0);
    }
  });

  it("is plain ASCII with unique ids and no external refs", () => {
    for (const { key, s } of all) {
      expect(/^[ -~]*$/.test(s), key).toBe(true);
      const ids = [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size, key).toBe(ids.length);
      expect(s).not.toContain("href=");
    }
  });

  it("every icon is different", () => {
    expect(new Set(all.map((a) => a.s)).size).toBe(29);
  });

  it("stays inside the size budget", () => {
    expect(all.reduce((n, a) => n + a.s.length, 0)).toBeLessThan(80 * 1024);
    for (const { key, s } of all) expect(s.length, key).toBeLessThan(6 * 1024);
  });

  it("unknown ids throw", () => {
    expect(() => iconSvg("item", "nope")).toThrow(/icon_item_nope/);
  });
});
