import { afterEach, describe, expect, it, vi } from "vitest";
import { FONT_SPECS, loadFonts } from "./fonts";

afterEach(() => vi.useRealTimers());

describe("loadFonts", () => {
  it("resolves when all specs load", async () => {
    const load = vi.fn().mockResolvedValue([]);
    await loadFonts({ load }, ["a", "b", "c"], 3000);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("resolves after timeout when load never settles", async () => {
    vi.useFakeTimers();
    const load = vi.fn(() => new Promise<FontFace[]>(() => {}));
    let done = false;
    void loadFonts({ load }, ["a"], 3000).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(2999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it("swallows a rejecting load", async () => {
    const load = vi.fn().mockRejectedValue(new Error("nope"));
    await expect(loadFonts({ load }, ["a"], 3000)).resolves.toBeUndefined();
  });
});

describe("FONT_SPECS", () => {
  it("loads Bungee and Plex Mono only", () => {
    expect(FONT_SPECS.join(" ")).not.toMatch(/VT323/);
    expect(FONT_SPECS.some((f) => f.includes("Bungee"))).toBe(true);
  });
});
