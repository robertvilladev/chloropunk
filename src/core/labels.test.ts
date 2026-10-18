import { describe, expect, it } from "vitest";
import { formatClock, tierLabel, truncate } from "./labels";

describe("labels", () => {
  it("tierLabel", () => expect(tierLabel(3)).toBe("T3 · RARE"));
  it("formatClock", () => {
    expect(formatClock(31.9)).toBe("0:31");
    expect(formatClock(-4)).toBe("0:00");
    expect(formatClock(125)).toBe("2:05");
  });
  it("truncate", () => {
    expect(truncate("Kevlar Hoodie", 8)).toBe("Kevlar …");
    expect(truncate("abc", 8)).toBe("abc");
  });
});
