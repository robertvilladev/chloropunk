const HEX = {
  bg: "#12151b",
  surface: "#1c2029",
  surface2: "#171a21",
  line: "#2c323d",
  text: "#edf2ec",
  textMuted: "#949ca3",
  lime: "#c6ff3d",
  limeInk: "#12151b",
  pink: "#ff4f9a",
  pink300: "#ff9cc6",
  pink700: "#b8336f",
  danger: "#ff6b3d",
  success: "#c6ff3d",
  deep: "#0d0f13",
  faint: "#4a5260",
  scanline: "#05070a",
} as const;
const TIER_HEX = ["#a9b0b8", "#3ad8ff", "#ff4f9a", "#ffb13b"] as const;

const num = (h: string): number => parseInt(h.slice(1), 16);

export const THEME_CSS = { ...HEX, tier: TIER_HEX };

export const THEME = {
  ...(Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, num(v)])) as {
    [K in keyof typeof HEX]: number;
  }),
  tier: TIER_HEX.map(num),
};

export const FONTS = {
  display: "Bungee, Impact, sans-serif",
  ui: "IBM Plex Mono, monospace",
  pixel: "VT323, monospace",
} as const;
