import { describe, expect, it } from "vitest";
import { formatClock, formatCount, tierLabel, truncate } from "./labels";

describe("labels", () => {
  it("tierLabel", () => expect(tierLabel(3)).toBe("T3 · RARE"));
  it("formatClock", () => {
    expect(formatClock(31.9)).toBe("0:31");
    expect(formatClock(-4)).toBe("0:00");
    expect(formatClock(125)).toBe("2:05");
  });
  it("formatCount", () => {
    expect([formatCount(0), formatCount(412.4), formatCount(18400), formatCount(2_500_000)]).toEqual(["0", "412", "18.4k", "2.5M"]);
  });
  it("truncate", () => {
    expect(truncate("Kevlar Hoodie", 8)).toBe("Kevlar …");
    expect(truncate("abc", 8)).toBe("abc");
  });
});
