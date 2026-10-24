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
 * Rooftop decor (A4), CSS colours with alpha baked in (#rrggbbaa): dim on purpose, everything that moves is brighter.
 * Three candidates for the owner's pick (A4 plan Task 0); only the chosen one stays.
 */
const DECOR_OPTIONS = {
  // A · Night violet
  a: {
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
    padStripe: "#00000000",
    padText: "#6a4cc277",
    signBg: "#1a1236",
  },
  // B · Toxic teal
  b: {
    zone: "#121b1e",
    zoneEdge: "#1f4d4f",
    vent: "#1c2029",
    ventEdge: "#949ca380",
    slat: "#2c323d",
    rail: "#4a5260",
    railPost: "#949ca3",
    puddle: "#0f5c5a66",
    puddleEdge: "#1f8a8555",
    padEdge: "#7a5a1ecc",
    padStripe: "#7a5a1e88",
    padText: "#7a5a1e99",
    signBg: "#0d0f13",
  },
  // C · Graphite + one neon
  c: {
    zone: "#171a21",
    zoneEdge: "#2c323d",
    vent: "#1c2029",
    ventEdge: "#949ca380",
    slat: "#2c323d",
    rail: "#4a5260",
    railPost: "#949ca3",
    puddle: "#2c323d99",
    puddleEdge: "#4a526088",
    padEdge: "#4a5260",
    padStripe: "#00000000",
    padText: "#4a526099",
    signBg: "#0d0f13",
  },
} as const;
export type DecorOption = keyof typeof DECOR_OPTIONS;

const num = (h: string): number => parseInt(h.slice(1), 16);

export const THEME_CSS = { ...HEX, tier: TIER_HEX, decorOptions: DECOR_OPTIONS };

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
