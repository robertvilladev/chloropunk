import { describe, expect, it } from "vitest";
import { createRng } from "./rng";

describe("createRng", () => {
  it("int throws when max < min", () => {
    expect(() => createRng(1).int(5, 4)).toThrow(/max 4 < min 5/);
  });

  it("same seed gives same sequence", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds differ", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("next is in [0,1)", () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("int is inclusive and bounded", () => {
    const r = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(r.int(3, 5));
    expect([...seen].sort()).toEqual([3, 4, 5]);
  });

  it("pick returns an element", () => {
    expect(["a", "b"]).toContain(createRng(9).pick(["a", "b"]));
  });

  it("pick throws on an empty list", () => {
    expect(() => createRng(1).pick([])).toThrow("pick from empty list");
  });
});
