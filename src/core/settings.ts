export interface Settings {
  reducedShake: boolean;
  /** 0..1, applied to the SFX gain node (fx/sfx.ts) */
  sfxVolume: number;
  /** 0..1, applied to the music bus (fx/music.ts) */
  musicVolume: number;
  /** 0..1, Phaser's sound.volume: scales music and SFX together */
  masterVolume: number;
}

const KEY = "vv.settings";
const DEFAULTS: Settings = { reducedShake: false, sfxVolume: 0.6, musicVolume: 0.4, masterVolume: 1 };

const vol = (v: unknown, def: number): number => (typeof v === "number" && v >= 0 && v <= 1 ? v : def);

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadSettings(
  storage: Pick<Storage, "getItem"> | undefined = defaultStorage()
): Settings {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      reducedShake: parsed.reducedShake === true,
      sfxVolume: vol(parsed.sfxVolume, DEFAULTS.sfxVolume),
      musicVolume: vol(parsed.musicVolume, DEFAULTS.musicVolume),
      masterVolume: vol(parsed.masterVolume, DEFAULTS.masterVolume),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(
  s: Settings,
  storage: Pick<Storage, "setItem"> | undefined = defaultStorage()
): void {
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage unavailable: setting just won't persist
  }
}
