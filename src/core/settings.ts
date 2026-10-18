export interface Settings {
  reducedShake: boolean;
}

const KEY = "vv.settings";
const DEFAULTS: Settings = { reducedShake: false };

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
    return { reducedShake: parsed.reducedShake === true };
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
