import layout from "@assets/data/arena.json";
import { describe, expect, it } from "vitest";
import type { ArenaProp } from "@/types";
import { CLEAR_RADIUS, outsideSolids, solidRects, validateArena } from "./arena";

const arena = { w: 1600, h: 1200 };
const vent = (x: number, y: number, w = 100, h = 50): ArenaProp => ({ kind: "vent", x, y, w, h });
const solid = (x: number, y: number, w = 100, h = 50): ArenaProp => ({ ...vent(x, y, w, h), solid: true });

describe("validateArena", () => {
  it("accepts a prop inside the arena and outside the clear circle", () => {
    expect(validateArena([vent(100, 100)], arena, CLEAR_RADIUS)).toEqual([]);
  });

  it("reports props outside the arena", () => {
    expect(validateArena([vent(-1, 100)], arena, CLEAR_RADIUS)).toHaveLength(1);
    expect(validateArena([vent(1550, 100)], arena, CLEAR_RADIUS)).toHaveLength(1);
    expect(validateArena([vent(100, 100, 0, 50)], arena, CLEAR_RADIUS)).toHaveLength(1);
  });

  it("reports props touching the clear circle at the centre", () => {
    expect(validateArena([vent(900, 500)], arena, CLEAR_RADIUS)).toHaveLength(1); // nearest point (900, 550): 112 px
    expect(validateArena([vent(500, 570, 160, 60)], arena, CLEAR_RADIUS)).toHaveLength(1); // nearest (660, 600): 140 px
    expect(validateArena([vent(500, 570, 120, 60)], arena, CLEAR_RADIUS)).toEqual([]); // nearest (620, 600): 180 px
  });

  it("reports unknown kinds", () => {
    expect(validateArena([{ ...vent(100, 100), kind: "tree" } as unknown as ArenaProp], arena, CLEAR_RADIUS)).toHaveLength(1);
  });

  it("the shipped layout is valid for its own arena size", () => {
    expect(layout).toMatchObject(arena);
    expect(validateArena(layout.props as ArenaProp[], layout, CLEAR_RADIUS)).toEqual([]);
  });

  it("reports solids over 144x96", () => {
    expect(validateArena([solid(200, 200, 145, 50)], arena, CLEAR_RADIUS)).toHaveLength(1);
    expect(validateArena([solid(200, 200, 100, 97)], arena, CLEAR_RADIUS)).toHaveLength(1);
    expect(validateArena([solid(200, 200, 144, 96)], arena, CLEAR_RADIUS)).toEqual([]);
  });

  it("reports solids closer than 80 px to the edge or to another solid", () => {
    expect(validateArena([solid(60, 200)], arena, CLEAR_RADIUS)).toHaveLength(1);
    expect(validateArena([solid(200, 1200 - 50 - 60)], arena, CLEAR_RADIUS)).toHaveLength(1);
    expect(validateArena([solid(200, 200), solid(360, 200)], arena, CLEAR_RADIUS)).toHaveLength(1); // 60 px apart
    expect(validateArena([solid(200, 200), solid(380, 200)], arena, CLEAR_RADIUS)).toEqual([]);
  });

  it("non-solid props ignore the solid rules", () => {
    expect(validateArena([vent(60, 200, 200, 120), vent(300, 200)], arena, CLEAR_RADIUS)).toEqual([]);
  });

  it("solidRects returns only solids; the shipped layout has the 4 vents", () => {
    expect(solidRects([vent(100, 100), solid(300, 300, 40, 30)])).toEqual([{ x: 300, y: 300, w: 40, h: 30 }]);
    expect(solidRects(layout.props as ArenaProp[])).toHaveLength(4);
  });
});

describe("outsideSolids", () => {
  const rects = [{ x: 100, y: 100, w: 100, h: 50 }];
  it("moves a point inside a solid to the nearest edge plus pad", () => {
    expect(outsideSolids({ x: 110, y: 130 }, rects, 10)).toEqual({ x: 90, y: 130 }); // left edge nearest
    expect(outsideSolids({ x: 150, y: 145 }, rects, 10)).toEqual({ x: 150, y: 160 }); // bottom edge nearest
    expect(outsideSolids({ x: 150, y: 95 }, rects, 10)).toEqual({ x: 150, y: 90 }); // inside the pad only
  });

  it("leaves a point outside unchanged", () => {
    expect(outsideSolids({ x: 50, y: 50 }, rects, 10)).toEqual({ x: 50, y: 50 });
    expect(outsideSolids({ x: 50, y: 50 }, [], 10)).toEqual({ x: 50, y: 50 });
  });
});
