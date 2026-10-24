import layout from "@assets/data/arena.json";
import { describe, expect, it } from "vitest";
import type { ArenaProp } from "@/types";
import { CLEAR_RADIUS, validateArena } from "./arena";

const arena = { w: 1600, h: 1200 };
const vent = (x: number, y: number, w = 100, h = 50): ArenaProp => ({ kind: "vent", x, y, w, h });

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
});
