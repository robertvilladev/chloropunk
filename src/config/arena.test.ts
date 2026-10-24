import { describe, expect, it } from "vitest";
import { arenaFromSearch } from "./arena";

describe("arenaFromSearch", () => {
  it("is 1600x1200 unless ?arena=small in a dev build", () => {
    expect(arenaFromSearch("", true)).toEqual({ w: 1600, h: 1200 });
    expect(arenaFromSearch("?arena=small", true)).toEqual({ w: 800, h: 600 });
    expect(arenaFromSearch("?arena=small", false)).toEqual({ w: 1600, h: 1200 });
  });
});
