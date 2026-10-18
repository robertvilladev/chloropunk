import { describe, expect, it } from "vitest";
import { loadSettings, saveSettings } from "./settings";

describe("settings", () => {
  it("defaults when storage empty", () => {
    expect(loadSettings({ getItem: () => null })).toEqual({ reducedShake: false });
  });
  it("defaults when storage throws", () => {
    const getItem = () => {
      throw new Error("denied");
    };
    expect(loadSettings({ getItem })).toEqual({ reducedShake: false });
  });
  it("round trip", () => {
    const m = new Map<string, string>();
    const store = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
    };
    saveSettings({ reducedShake: true }, store);
    expect(loadSettings(store)).toEqual({ reducedShake: true });
  });
  it("defaults on bad JSON", () => {
    expect(loadSettings({ getItem: () => "{oops" })).toEqual({ reducedShake: false });
  });
});
