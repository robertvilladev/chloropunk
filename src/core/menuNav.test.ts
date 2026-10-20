import { describe, expect, it } from "vitest";
import { stepIndex } from "./menuNav";

describe("stepIndex", () => {
  it("moves down and up", () => {
    expect(stepIndex(0, 3, 1)).toBe(1);
    expect(stepIndex(2, 3, -1)).toBe(1);
  });
  it("wraps at both ends", () => {
    expect(stepIndex(2, 3, 1)).toBe(0);
    expect(stepIndex(0, 3, -1)).toBe(2);
  });
  it("stays put with a single item", () => {
    expect(stepIndex(0, 1, 1)).toBe(0);
  });
});
