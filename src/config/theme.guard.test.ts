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
