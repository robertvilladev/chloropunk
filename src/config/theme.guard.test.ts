import { describe, expect, it } from "vitest";

const sources = import.meta.glob<string>(["/src/**/*.ts", "!/src/**/*.test.ts", "!/src/art/**", "!/src/config/theme.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const all = Object.keys(sources);
const dirty = (p: string) => /#[0-9a-fA-F]{6}\b|\b0x[0-9a-fA-F]{6}\b/.test(sources[p]);

describe("no hardcoded colours", () => {
  it("no source file contains hex literals", () => {
    expect(all.filter(dirty)).toEqual([]);
  });
});

// UI art refresh (2026-10-25): no pixel font anywhere
const everything = import.meta.glob<string>(["/src/**/*.ts", "!/src/**/*.test.ts", "/index.html"], { query: "?raw", import: "default", eager: true });

describe("no pixel font", () => {
  it("no source file or index.html mentions VT323", () => {
    expect(Object.keys(everything).length).toBeGreaterThan(20);
    expect(Object.keys(everything).filter((p) => /VT323/i.test(everything[p]))).toEqual([]);
  });

  it("no text asks for a pixel font", () => {
    expect(Object.keys(everything).filter((p) => /FONTS\.pixel|,\s*"pixel"\)/.test(everything[p]))).toEqual([]);
  });
});
