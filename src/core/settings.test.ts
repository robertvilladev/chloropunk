import { describe, expect, it } from "vitest";
import { loadSettings, saveSettings } from "./settings";

const DEF = { reducedShake: false, sfxVolume: 0.6 };

describe("settings", () => {
  it("defaults when storage empty", () => {
    expect(loadSettings({ getItem: () => null })).toEqual(DEF);
  });
  it("defaults when storage throws", () => {
    const getItem = () => {
      throw new Error("denied");
    };
    expect(loadSettings({ getItem })).toEqual(DEF);
  });
  it("round trip", () => {
    const m = new Map<string, string>();
    const store = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
    };
    saveSettings({ reducedShake: true, sfxVolume: 0.4 }, store);
    expect(loadSettings(store)).toEqual({ reducedShake: true, sfxVolume: 0.4 });
  });
  it("defaults on bad JSON", () => {
    expect(loadSettings({ getItem: () => "{oops" })).toEqual(DEF);
  });
  it("keeps old saves and rejects bad volumes", () => {
    expect(loadSettings({ getItem: () => '{"reducedShake":true}' })).toEqual({ ...DEF, reducedShake: true });
    expect(loadSettings({ getItem: () => '{"sfxVolume":7}' })).toEqual(DEF);
    expect(loadSettings({ getItem: () => '{"sfxVolume":"x"}' })).toEqual(DEF);
    expect(loadSettings({ getItem: () => '{"sfxVolume":0}' }).sfxVolume).toBe(0);
  });
});
