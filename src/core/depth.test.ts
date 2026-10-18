import { describe, expect, it } from "vitest";
import { facingFlip } from "./depth";

describe("facingFlip", () => {
  it("faces left on negative vx", () => expect(facingFlip(-50, false)).toBe(true));
  it("faces right on positive vx", () => expect(facingFlip(50, true)).toBe(false));
  it("dead zone keeps previous", () => {
    expect(facingFlip(3, true)).toBe(true);
    expect(facingFlip(-3, false)).toBe(false);
    expect(facingFlip(0, false)).toBe(false);
  });
});
