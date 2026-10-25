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

/**
 * Rooftop decor (A4, owner pick 2026-10-24: Night violet). CSS colours with alpha baked in (#rrggbbaa),
 * dim on purpose: everything that moves is brighter. Violet/indigo is used by no actor or projectile.
 */
const DECOR = {
  zone: "#1a1730",
  zoneEdge: "#3a2f6b",
  vent: "#1d1a2c",
  ventEdge: "#6a4cc299",
  slat: "#2e2848",
  rail: "#2f2657",
  railPost: "#7b5cffaa",
  puddle: "#5b3fd133",
  puddleEdge: "#ff4f9a33",
  padEdge: "#6a4cc2aa",
  padText: "#6a4cc277",
  signBg: "#1a1236",
} as const;

const num = (h: string): number => parseInt(h.slice(1), 16);

export const THEME_CSS = { ...HEX, tier: TIER_HEX, decor: DECOR };

export const THEME = {
  ...(Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, num(v)])) as {
    [K in keyof typeof HEX]: number;
  }),
  tier: TIER_HEX.map(num),
};

/** No pixel font (UI art refresh, 2026-10-25): Bungee for titles and every big number, Plex Mono for the rest. */
export const FONTS = {
  display: "Bungee, Impact, sans-serif",
  ui: "IBM Plex Mono, monospace",
} as const;

/** Ink stroke under Bungee numbers so they read over the floor (board U1). */
export const numberStroke = (size: number): number => (size >= 24 ? 3 : 2);

/** Damage numbers (board U1): white hits, bigger amber crits that pop (scale `pop` -> 1) before floating. */
export const DAMAGE_NUMBER = {
  normal: { fontFamily: FONTS.display, fontSize: "16px", color: HEX.text, stroke: HEX.deep, strokeThickness: 2, pop: 1 },
  crit: { fontFamily: FONTS.display, fontSize: "22px", color: TIER_HEX[3], stroke: HEX.deep, strokeThickness: 3, pop: 1.4 },
} as const;
