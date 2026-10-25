import { describe, expect, it } from "vitest";
import { HUD, hudSlots } from "./hud";
import type { OwnedWeapon } from "@/types";

const W = 800, H = 600;
const wpn = (n: number): OwnedWeapon[] => Array.from({ length: n }, (_, i) => ({ id: "pistol", tier: ((i % 4) + 1) as 1 | 2 | 3 | 4 }));
const ids = (n: number) => Array.from({ length: n }, (_, i) => `item${i}`);
type Box = { x: number; y: number; size: number };
const overlap = (a: Box, b: Box) => a.x < b.x + b.size && b.x < a.x + a.size && a.y < b.y + b.size && b.y < a.y + a.size;

describe("hudSlots", () => {
  it("lays 1 to 6 weapons in a row of 30 px slots at the bottom-left", () => {
    for (let n = 1; n <= 6; n++) {
      const { weapons } = hudSlots(wpn(n), [], W, H);
      expect(weapons).toHaveLength(n);
      weapons.forEach((s, i) => {
        expect(s).toMatchObject({ size: HUD.weapon, y: H - 16 - HUD.weapon, id: "pistol", tier: (i % 4) + 1 });
        expect(s.x).toBe(30 + i * (HUD.weapon + 4));
      });
    }
  });

  it("stacks duplicate items into one chip with a count, in first-bought order", () => {
    const { items } = hudSlots(wpn(1), ["grip", "visor", "grip", "grip"], W, H);
    expect(items.map((c) => [c.id, c.count])).toEqual([["grip", 3], ["visor", 1]]);
  });

  it("fills the row above the weapons first, 12 per row, then a second row", () => {
    const { items } = hudSlots(wpn(6), ids(13), W, H);
    const rowY = H - 16 - HUD.weapon - 8 - HUD.item;
    expect(items.slice(0, 12).every((c) => c.y === rowY)).toBe(true);
    expect(items[12].y).toBe(rowY - HUD.item - 3);
    expect(items[12].x).toBe(30);
  });

  it("ends in a +N chip past two rows", () => {
    const { items, more } = hudSlots(wpn(6), ids(30), W, H);
    expect(items).toHaveLength(23);
    expect(more).toMatchObject({ n: 7, size: HUD.item });
    expect(hudSlots(wpn(6), ids(24), W, H).more).toBeUndefined();
  });

  it("fits 800 x 600 with no overlap for any mix", () => {
    for (let n = 1; n <= 6; n++) {
      for (const m of [0, 1, 12, 15, 24, 40]) {
        const { weapons, items, more } = hudSlots(wpn(n), ids(m), W, H);
        const all: Box[] = [...weapons, ...items, ...(more ? [more] : [])];
        for (const b of all) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.x + b.size).toBeLessThanOrEqual(W / 2);
          expect(b.y + b.size).toBeLessThanOrEqual(H);
        }
        for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(overlap(all[i], all[j])).toBe(false);
      }
    }
  });
});
