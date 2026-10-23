export interface Settings {
  reducedShake: boolean;
  /** 0..1, applied to the SFX gain node (fx/sfx.ts) */
  sfxVolume: number;
}

const KEY = "vv.settings";
const DEFAULTS: Settings = { reducedShake: false, sfxVolume: 0.6 };

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
    const vol = parsed.sfxVolume;
    return {
      reducedShake: parsed.reducedShake === true,
      sfxVolume: typeof vol === "number" && vol >= 0 && vol <= 1 ? vol : DEFAULTS.sfxVolume,
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
