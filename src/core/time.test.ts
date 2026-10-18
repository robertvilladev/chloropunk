import { describe, expect, it } from "vitest";
import { clampDelta } from "./time";

describe("clampDelta", () => {
  it("passes normal frames through", () => expect(clampDelta(16)).toBe(16));
  it("caps long frames at 100 ms", () => expect(clampDelta(5000)).toBe(100));
});
