import { describe, expect, it } from "vitest";
import { loadSettings, saveSettings } from "./settings";

const DEF = { reducedShake: false, sfxVolume: 0.6, musicVolume: 0.4, masterVolume: 1 };

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
    const s = { reducedShake: true, sfxVolume: 0.4, musicVolume: 0.2, masterVolume: 0.8 };
    saveSettings(s, store);
    expect(loadSettings(store)).toEqual(s);
  });
  it("defaults on bad JSON", () => {
    expect(loadSettings({ getItem: () => "{oops" })).toEqual(DEF);
  });
  it("keeps old saves and rejects bad volumes", () => {
    expect(loadSettings({ getItem: () => '{"reducedShake":true}' })).toEqual({ ...DEF, reducedShake: true });
    expect(loadSettings({ getItem: () => '{"sfxVolume":7}' })).toEqual(DEF);
    expect(loadSettings({ getItem: () => '{"sfxVolume":"x"}' })).toEqual(DEF);
    expect(loadSettings({ getItem: () => '{"sfxVolume":0}' }).sfxVolume).toBe(0);
    expect(loadSettings({ getItem: () => '{"musicVolume":-1,"masterVolume":2}' })).toEqual(DEF);
    expect(loadSettings({ getItem: () => '{"musicVolume":0,"masterVolume":0.4}' })).toEqual({ ...DEF, musicVolume: 0, masterVolume: 0.4 });
  });
});
