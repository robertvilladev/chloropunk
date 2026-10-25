import { THEME_CSS } from "@/config/theme";

/**
 * Vector sprites (owner pick 2026-10-24, addendum §4): one SVG string per texture key + frame, in design px,
 * rendered at 2x. Ink outline + keyline rim, base fill with a lower-right shade, facing right.
 * Port of the approved canvas file project/vector.js (https://claude.ai/artifact/TnsQjaTcJEYoShEC5AyMXM).
 */
export type ActorKey = "player" | "enemy_pea" | "enemy_pepper" | "enemy_potato" | "enemy_carrot" | "enemy_tomato";
export type SpriteKey = ActorKey | "pickup_scrap" | WeaponKey | ShotKey;
/** Design px; (cx, cy) = body centre, feet = shadow row; (px, py) = weapon grip pivot. */
export interface SpriteMeta { w: number; h: number; feet: number; cx: number; cy: number; px?: number; py?: number }

const K = THEME_CSS.deep;
const C = {
  pink: THEME_CSS.pink, pinkD: THEME_CSS.pink700, pinkL: THEME_CSS.pink300, skin: "#e0a77a", skinD: "#a8704a",
  cyan: "#4ff0ff", cyanD: "#1f9fc4", lime: THEME_CSS.lime, limeL: "#e9ff9a",
  jacket: THEME_CSS.faint, jacketD: THEME_CSS.line, slate: "#6b7088", metal: "#b8bdd4", metalD: "#6b7088", gun: "#3d4552",
  green: "#4caf50", greenD: "#2e7d32", greenL: "#93e06a", red: "#e53935", redD: "#a82525", redL: "#ff7d6b",
  orange: "#ff7a1a", orangeD: "#c45a10", orangeL: "#ffb35e", spud: "#b07a43", spudD: "#7d5530", spudL: "#d9a66a",
  flame: "#ffd23f", white: "#ffffff",
};
const KEYLINE = { r: 1.2, color: THEME_CSS.text, op: 0.55 };

let uid = 0;
const ol = (w = 2.5) => ` stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
/** shape = an SVG element without fill and without its closing "/>". Shade fill, base copy shifted up-left, ink outline. */
function part(shape: string, base: string, shade: string | null, k = 3, extra = "", w?: number): string {
  const id = `c${++uid}`;
  return `<clipPath id="${id}">${shape}/></clipPath>${shape} fill="${shade || base}"/>` +
    `<g clip-path="url(#${id})"><g transform="translate(${-k * 0.8} ${-k})">${shape} fill="${base}"/></g>${extra}</g>` +
    `${shape} fill="none"${ol(w)}/>`;
}
/** Stroked detail; under = ink width beneath (0 = none). */
const line = (d: string, color: string, w: number, under = 0) =>
  (under ? `<path d="${d}" fill="none"${ol(under)}/>` : "") +
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const E = (cx: number, cy: number, rx: number, ry: number, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ""}`;
const Rr = (x: number, y: number, w: number, h: number, r = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"`;
const Pd = (d: string) => `<path d="${d}"`;
const dot = (cx: number, cy: number, rx: number, ry: number, fill: string, rot = 0, op = 1) =>
  `${E(cx, cy, rx, ry, rot)} fill="${fill}"${op < 1 ? ` opacity="${op}"` : ""}/>`;
const box = (x: number, y: number, w: number, h: number, r: number, fill: string, op = 1) =>
  `${Rr(x, y, w, h, r)} fill="${fill}"${op < 1 ? ` opacity="${op}"` : ""}/>`;
/** Hit-frame >< eyes. */
const squint = (pts: number[][], s = 2.6) =>
  pts.map(([x, y], i) => line(i % 2
    ? `M${x + s},${y - s} L${x - s},${y} L${x + s},${y + s}`
    : `M${x - s},${y - s} L${x + s},${y} L${x - s},${y + s}`, K, 2)).join("");
const legs = (xs: number[][], y: number, h: number, fill: string, fillD: string) =>
  xs.map((p) => part(Rr(p[0], y + (p[1] || 0), 6, h, 3), fill, fillD, 2)).join("");

interface Actor { meta: SpriteMeta; accent: string; squint: number[][]; draw: (f: number) => string }

const A: Record<ActorKey, Actor> = {
  player: { meta: { w: 48, h: 48, feet: 46, cx: 24, cy: 32 }, accent: C.pink, squint: [[26, 15], [32, 15]], draw: (f) => {
    const b = f ? -1 : 0, L = f ? [[15, -1], [27, 0]] : [[17, 0], [25, 0]];
    return legs(L, 34, 10, C.slate, C.gun) +
      L.map((p) => part(E(p[0] + 3.5, 44.5 + (p[1] || 0), 4.6, 2.4), C.metal, C.metalD, 1.2)).join("") +
      `<g transform="translate(0 ${b})">` +
      part(Pd("M14,26 Q14,22 19,22 L29,22 Q34,22 34,27 L34,36 Q34,38 31,38 L17,38 Q14,38 14,36 Z"), C.jacket, C.jacketD, 3, box(18, 22, 2.6, 16, 0, C.lime)) +
      part(Pd("M14,24 L7,24.5 L11,18 C10,8 18,3 24,4 C31,4 35,10 34,17 C33,24 27,27 21,27 C17,27 15,26 14,24 Z"), C.pink, C.pinkD, 3.5, dot(19, 8, 5, 2.2, C.pinkL, -12)) +
      part(E(27.5, 17.5, 6.5, 7), C.skin, C.skinD, 2.5) +
      `<g class="face">${part(Rr(22, 12.5, 14, 5.5, 2.75), C.cyan, C.cyanD, 1.5, box(24, 13.4, 3.5, 1.3, 0.6, C.white))}${line("M28,22.5 L31.5,21.8", K, 1.6)}</g>` +
      part(Rr(25, 27, 10, 5, 2.5), C.gun, C.jacketD, 1.5) +
      part(Rr(32, 24, 13, 6, 1.5), C.slate, C.gun, 2, box(32, 24, 13, 1.8, 0, C.metal)) +
      part(Rr(35, 21, 5, 3, 1), C.gun, null, 0) +
      box(44.5, 25, 2.6, 4, 0.8, C.cyan) +
      part(E(33.5, 30.5, 2.6, 2.6), C.skin, C.skinD, 1) +
      "</g>";
  } },
  enemy_pea: { meta: { w: 40, h: 36, feet: 34, cx: 20, cy: 22 }, accent: C.green, squint: [[23, 19], [31, 19]], draw: (f) => {
    const b = f ? 1 : 0, Lg = f ? [[13, -1], [25, 0]] : [[11, 0], [27, 0]];
    return Lg.map((p) => part(Rr(p[0], 26 + p[1], 3.2, 6, 1.6), C.slate, C.gun, 1) + part(E(p[0] + 1.6, 32.3 + p[1], 3.8, 2.1), C.gun, C.jacketD, 1)).join("") +
      `<g transform="translate(0 ${b})">` +
      line("M5,20 C1,19 0,15 2,13", C.jacketD, 2, 4.6) + part(Rr(0, 10.5, 4.4, 3.6, 1), C.metal, C.metalD, 1) + box(0.8, 9, 0.9, 1.8, 0.3, C.metal) + box(2.6, 9, 0.9, 1.8, 0.3, C.metal) +
      line("M20,7 L22,1.5", C.slate, 1.3, 3.3) + dot(22, 1.5, 1.6, 1.6, C.lime) +
      part(E(13, 11, 4.3, 4.3), C.greenL, C.green, 1.8) +
      part(E(20, 9.5, 4.4, 4.4), C.metal, C.metalD, 1.8, dot(20.6, 9.6, 1.5, 1.5, C.cyan) + dot(19.2, 8, 0.9, 0.6, C.white)) +
      part(E(27, 11, 4.3, 4.3), C.greenL, C.green, 1.8) +
      part(Pd("M3,21 C4,13 11,12.5 20,13 C28,12.5 35,12.5 37,18 C38.5,25 30,29 20,29 C11,29 2.5,27 3,21 Z"), C.green, C.greenD, 4,
        dot(14, 16, 3.5, 1.4, C.greenL, -8) +
        box(7, 12, 4.2, 18, 0, C.metal) + box(7, 12, 1.2, 18, 0, C.white, 0.4) + box(10.2, 12, 1, 18, 0, C.metalD) +
        dot(9.1, 17, 0.8, 0.8, K) + dot(9.1, 24, 0.8, 0.8, K) +
        line("M13,25.5 L18,25.5 L20,23.5 L24,23.5", C.greenD, 1) + dot(24.5, 23.5, 1, 1, C.lime) + line("M27,26 L31,26", C.greenD, 1)) +
      `<g class="face">${box(16.5, 15.5, 18, 7, 3.5, K)}${box(18.5, 18.6, 14, 0.7, 0.3, C.cyan, 0.35)}` +
      `${box(20, 17.6, 4.5, 2.6, 1.3, C.cyan)}${box(28, 17.6, 4.5, 2.6, 1.3, C.cyan)}${dot(33, 19, 0.8, 0.8, C.pink)}</g>` +
      "</g>";
  } },
  enemy_pepper: { meta: { w: 40, h: 56, feet: 54, cx: 20, cy: 30 }, accent: C.red, squint: [[18, 20], [27, 20]], draw: (f) => {
    const b = f ? -1.5 : 0, fl = f ? 1.15 : 1;
    return `<g transform="translate(0 ${b})">` +
      `<g transform="translate(20 44) scale(1 ${fl}) translate(-20 -44)">` +
      `${Pd("M20,43 C11,46 9.5,53 13.5,56 C18,53 23,51 24.5,46 Z")} fill="${C.orange}"/>` +
      `${Pd("M20,45 C15,47 14,51 16,53.5 C18.5,51.5 21.5,50 22.5,47 Z")} fill="${C.flame}"/></g>` +
      part(Pd("M9,17 C9,10 15,8 20,8 C27,8 31,11 31,18 C31,30 27,40 21,47 C19,49.5 16.5,48.5 17.5,45.5 C19.5,38 9,30 9,17 Z"), C.red, C.redD, 4, dot(14, 16, 2.4, 4.5, C.redL, 10)) +
      line("M20,9 C20,5 22.5,2.5 26,2.5", C.greenD, 3, 6) +
      part(Pd("M9.5,12.5 C12,6 28,6 30.5,12.5 C26,15 14,15 9.5,12.5 Z"), C.green, C.greenD, 2) +
      '<g class="face">' +
      `${Pd("M15,18 L21.5,20 L20.5,22.5 L15,21.3 Z")} fill="${C.cyan}"${ol(1.4)}/>` +
      `${Pd("M24,20 L29.5,18 L29.5,21.3 L25,22.5 Z")} fill="${C.cyan}"${ol(1.4)}/>` +
      line("M13.5,15.5 L21.5,18.3", K, 2.2) + line("M23.5,18.3 L31,15.5", K, 2.2) +
      line("M18,28 Q22,25.5 26,28", K, 1.8) + "</g>" +
      "</g>";
  } },
  enemy_potato: { meta: { w: 68, h: 60, feet: 58, cx: 34, cy: 33 }, accent: C.spud, squint: [[41.5, 26.5], [52, 26.5]], draw: (f) => {
    const b = f ? 1 : 0, rot = f ? 45 : 0, lug = f ? 3 : 0;
    let lugs = "";
    for (let x = 9 + lug; x < 60; x += 6) lugs += box(x, 43, 3, 2.2, 0.6, C.gun);
    const wheels = [14, 24, 34, 44, 54].map((x) =>
      part(E(x, 51, 3.8, 3.8), C.slate, C.gun, 1.2) + `<g transform="rotate(${rot} ${x} 51)">${box(x - 0.7, 47.6, 1.4, 6.8, 0.6, C.jacketD)}</g>` + dot(x, 51, 1, 1, C.lime)).join("");
    let stripes = "";
    for (let s = -6; s < 22; s += 4.5) stripes += `<path d="M${12 + s},41 L${16 + s},33 L${18.2 + s},33 L${14.2 + s},41 Z" fill="${C.lime}"/>`;
    const smoke = f ? dot(7, 6, 2.6, 2.6, C.metal, 0, 0.35) + dot(10, 2, 1.8, 1.8, C.metal, 0, 0.25)
      : dot(7.5, 8, 2, 2, C.metal, 0, 0.4) + dot(5.5, 4, 2.4, 2.4, C.metal, 0, 0.25);
    return part(Rr(6, 44, 56, 13.5, 6.75), C.jacketD, K, 2, box(6, 44, 56, 3, 0, C.gun)) + lugs + wheels +
      `<g transform="translate(0 ${b})">` +
      smoke + part(Rr(4, 12, 6, 20, 2), C.metal, C.metalD, 1.5, box(4, 12, 6, 2.4, 0, C.gun)) +
      line("M19,12 L14,3", C.slate, 1.6, 4) + part(E(14, 3, 2.4, 2.4), f ? C.flame : C.lime, null, 0) +
      part(Pd("M8,30 C6,18 16,9.5 30,9.5 C36,6.5 44,7 50,11 C60,14 63,24 61,33 C60,42 50,47 34,47 C20,47 9,42 8,30 Z"), C.spud, C.spudD, 5,
        dot(26, 13, 7, 2.2, C.spudL, -4) + dot(54, 37, 2, 1.4, C.spudD) + dot(31, 43, 1.8, 1.2, C.spudD) +
        line("M47,9 C50,5 53,6 54,3", C.spudD, 1.2)) +
      part(Pd("M17,15.5 C25,9.5 45,9 54,13.5 L52.5,20 L18.5,20 Z"), C.metal, C.metalD, 2, box(17, 15.5, 40, 1.4, 0, C.white, 0.4)) +
      [21, 29, 37, 45, 51].map((x) => dot(x, 18, 0.8, 0.8, K)).join("") +
      part(Rr(7, 21.5, 56, 10, 2), C.metal, C.metalD, 2.5) +
      part(Rr(34, 23, 27, 7, 2.5), K, null, 0) +
      `<g class="face">${box(38, 25, 7.5, 3.2, 1.2, C.cyan)}${box(49, 25, 6.5, 3.2, 1.2, C.cyan)}${box(36, 27.8, 23, 0.6, 0.3, C.cyan, 0.35)}</g>` +
      dot(11, 26.5, 1, 1, K) + dot(30, 26.5, 1, 1, K) +
      part(Rr(41, 34, 17, 7, 2), C.slate, C.gun, 1.5, [44, 47.5, 51, 54.5].map((x) => box(x, 35.3, 1.5, 4.4, 0.6, K)).join("")) +
      part(Rr(11, 33, 20, 8, 1.5), K, null, 0, stripes) +
      "</g>";
  } },
  enemy_carrot: { meta: { w: 48, h: 56, feet: 54, cx: 22, cy: 30 }, accent: C.orange, squint: [[17, 18], [24, 18]], draw: (f) => {
    const b = f ? 1 : 0, s = f ? 6 : 0;
    return `<g transform="translate(0 ${b})">` +
      ([[16, 7, -32 - s, C.green], [21.5, 5, 0, C.greenD], [27, 7, 32 + s, C.green]] as const)
        .map(([x, y, r, c]) => part(E(x, y, 2.6, 6.2, r), c, C.greenD, 1)).join("") +
      part(Pd("M11,16 C11,11 16,10 21,10 C28,10 32,12 32,17 C32,30 26,42 21,52.5 C19.5,55.5 16.5,55 16.8,52 C15,40 11,28 11,16 Z"), C.orange, C.orangeD, 4,
        dot(15, 18, 2, 5, C.orangeL) + line("M13.5,27 L18,27.5", C.orangeD, 1.6) + line("M15.5,35 L20,35.5", C.orangeD, 1.6) + line("M17.5,43 L21,43.3", C.orangeD, 1.6)) +
      `<g class="face">${part(E(24, 18, 4.2, 4.2), K, null, 0)}${dot(24, 18, 2.3, 2.3, C.cyan)}${dot(23.2, 17.2, 0.7, 0.7, C.white)}` +
      `${line("M14.5,16.5 L19,18.3", K, 2.2)}${line("M17.5,24.5 L22.5,24", K, 1.8)}</g>` +
      part(Rr(24, 26, 22, 5, 1.5), C.slate, C.gun, 2, box(24, 26, 22, 1.8, 0, C.metal)) +
      part(Rr(30, 22.5, 7, 3.5, 1), C.gun, null, 0) + box(45.5, 26.5, 2.6, 4, 0.8, C.cyan) +
      "</g>";
  } },
  enemy_tomato: { meta: { w: 48, h: 52, feet: 50, cx: 24, cy: 32 }, accent: C.red, squint: [[21.5, 30], [30.5, 30]], draw: (f) => {
    const b = f ? -1 : 0, F = f ? [[18, 45.5], [29, 46.5]] : [[16, 46.5], [31, 46.5]];
    const spark = f ? "M31,-1 L32.5,2 L36,3 L32.5,4 L31,7 L29.5,4 L26,3 L29.5,2 Z" : "M31,0 L32,2.3 L34.5,3 L32,3.7 L31,6 L30,3.7 L27.5,3 L30,2.3 Z";
    return F.map((p) => part(E(p[0], p[1], 4, 2.6), C.redD, null, 0)).join("") +
      `<g transform="translate(0 ${b})">` +
      part(E(24, 31, 17, 15), C.red, C.redD, 5, dot(14, 24, 4.2, 2.4, C.redL, -32)) +
      line("M24,14 C24,9 27.5,6.5 30.5,4", C.slate, 2, 4.4) +
      `${Pd(spark)} fill="${C.flame}"${ol(1)}/>` + dot(31, 3, 1, 1, C.white) +
      part(Pd("M24,12 L27,16 L33,15 L29,19 L31,23 L24,21 L17,23 L19,19 L15,15 L21,16 Z"), C.green, C.greenD, 1.5) +
      '<g class="face">' +
      `${Pd("M19,28 L24.5,30 L24.5,32.3 L19,31.3 Z")} fill="${C.cyan}"${ol(1.4)}/>` +
      `${Pd("M28,30 L33.5,28 L33.5,31.3 L28,32.3 Z")} fill="${C.cyan}"${ol(1.4)}/>` +
      line("M17.5,25.5 L25,28", K, 2.2) + line("M27,28 L35,25.5", K, 2.2) +
      box(17, 35, 16, 6.5, 3.25, K) + box(19, 36.2, 12, 2.4, 0.6, C.white) + line("M22,36 L22,38.6 M25,36 L25,38.6 M28,36 L28,38.6", K, 0.9) + "</g>" +
      "</g>";
  } },
};

/** Power bolt (owner pick 2026-10-24): hex nut with a lime ring core; frame 1 = shimmer. */
function bolt(f: number): string {
  const hex = "M12,2.5 L20.2,7.25 L20.2,16.75 L12,21.5 L3.8,16.75 L3.8,7.25 Z";
  return part(Pd(hex), C.metal, C.metalD, 2.5, `${Pd("M12,2.5 L20.2,7.25 L12,12 L3.8,7.25 Z")} fill="${C.white}" opacity="0.35"/>`, 2) +
    dot(12, 12, 4.6, 4.6, K) + `<circle cx="12" cy="12" r="2.9" fill="none" stroke="${C.lime}" stroke-width="1.8"/>` +
    dot(12, 12, 1.1, 1.1, f ? C.limeL : C.lime) + (f ? line("M6,8 L9,6.2", C.white, 1.2) : "");
}

// ---------- weapons (pointing right; px,py = grip pivot), projectiles, effects (board A1, approved 2026-10-25) ----------
const AMB = { base: THEME_CSS.tier[3], d: "#b8741c", l: "#ffd98a" };
/** 4-point flash. */
function star(x: number, y: number, r: number, fill: string): string {
  const q = r * 0.32;
  return `${Pd(`M${x},${y - r} L${x + q},${y - q} L${x + r},${y} L${x + q},${y + q} L${x},${y + r} L${x - q},${y + q} L${x - r},${y} L${x - q},${y - q} Z`)} fill="${fill}"/>`;
}
const n1 = (v: number) => Math.round(v * 10) / 10;

export const WEAPON_IDS = ["pistol", "shotgun", "laser", "blade", "drone", "rocket"] as const;
export type WeaponKey = `weapon_${(typeof WEAPON_IDS)[number]}`;
export type ShotKey = "projectile_basic" | "proj_pellet" | "proj_rocket" | "enemy_bolt" | "fx_muzzle" | "fx_swoosh" | "fx_beam" | "fx_blast";
/** Tier trim is baked: frame t1..t4. */
export const weaponFrame = (tier: 1 | 2 | 3 | 4): string => `t${tier}`;

/** flat = no keyline (the beam tile must join seamlessly); draw gets the tier colour (weapons only). */
interface Misc { w: number; h: number; px?: number; py?: number; flat?: boolean; draw: (t: string) => string }
const X: Record<WeaponKey | ShotKey, Misc> = {
  weapon_pistol: { w: 24, h: 14, px: 6, py: 9, draw: (t) =>
    part(Pd("M4,8 L10,8 L9,13.5 L3.5,13.5 Z"), C.gun, C.jacketD, 1.2) + line("M9.5,9 Q11.5,12.5 13.5,9", K, 1.2) +
    part(Rr(2, 3, 19, 6, 2), C.slate, C.gun, 2, box(2, 3, 19, 1.6, 0, C.metal)) + box(5, 5.4, 12, 1.8, 0.9, t) +
    part(Rr(20, 3.8, 3.5, 4.4, 1), C.gun, null, 0, "", 1.6) + box(22.4, 4.7, 1.2, 2.6, 0.5, t) },
  weapon_shotgun: { w: 34, h: 14, px: 9, py: 9, draw: (t) =>
    part(Pd("M1,5 L9,5 L10,10.5 L2.5,12.5 Z"), C.slate, C.gun, 1.5, dot(4, 8, 0.8, 0.8, K)) +
    part(Rr(15, 2.8, 17, 3.2, 1.2), C.metal, C.metalD, 1, "", 1.6) + part(Rr(15, 6.2, 17, 3.2, 1.2), C.metal, C.metalD, 1, "", 1.6) +
    box(31, 3, 1.6, 6.2, 0.5, t) +
    part(Rr(8, 3.5, 9, 7.5, 1.5), C.slate, C.gun, 2, box(9.2, 6, 6.5, 2, 0.6, t) + dot(10, 9.3, 0.6, 0.6, K) + dot(15, 9.3, 0.6, 0.6, K)) +
    part(Rr(18, 8.6, 9, 4.2, 1.6), C.gun, C.jacketD, 1, box(19.4, 9.8, 6.2, 1.2, 0.6, t), 1.8) + line("M11,11 L10,13.2", K, 1.4) },
  weapon_laser: { w: 30, h: 16, px: 7, py: 10, draw: (t) =>
    part(Pd("M5,10 L11,10 L10,15 L4.5,15 Z"), C.gun, C.jacketD, 1.2) +
    part(Rr(19, 5.5, 8, 5, 2), C.gun, null, 0, [20.5, 23].map((x) => box(x, 5.5, 1.4, 5, 0.4, t)).join(""), 1.8) +
    part(Pd("M2,6.5 C2,3.5 5,2.5 8,2.5 L17,2.5 L21,5 L21,11 L17,13 L8,13 C5,13 2,12 2,9.5 Z"), C.metal, C.metalD, 2.5,
      box(4, 3.2, 13, 1.4, 0.7, C.white, 0.5) + box(5, 6.2, 9, 3.4, 1.7, K) + box(6, 7.1, 7, 1.6, 0.8, t)) +
    dot(28, 8, 3.4, 3.4, t, 0, 0.35) + dot(28, 8, 1.7, 2.2, t) + dot(27.6, 7.2, 0.6, 0.6, C.white) },
  weapon_blade: { w: 42, h: 12, px: 5, py: 6, draw: (t) =>
    part(Rr(0.8, 4.5, 8, 3, 1.5), C.gun, C.jacketD, 1, line("M3,4.6 L4,7.4 M5.5,4.6 L6.5,7.4", K, 0.8), 1.8) +
    part(Pd("M10,4 L35,4 C38.5,4 40.5,5 41,6 C39.5,7.6 36.5,8 33,8 L10,8 Z"), C.metal, C.metalD, 1.2, box(11, 4.2, 22, 1, 0.5, C.white, 0.7), 1.8) +
    line("M11,7.3 L33,7.3 C36.5,7.2 39,6.8 40.4,6.2", t, 1.2) + part(Rr(7.6, 1.2, 2.8, 9.6, 1), C.slate, C.gun, 0.8, "", 1.8) + dot(9, 6, 0.9, 0.9, t) },
  weapon_drone: { w: 24, h: 24, px: 12, py: 12, draw: (t) => {
    const r = [[5, 5], [19, 5], [5, 19], [19, 19]];
    return r.map((p) => line(`M12,12 L${p[0]},${p[1]}`, C.gun, 2.2, 4)).join("") +
      r.map((p) => dot(p[0], p[1], 4.4, 4.4, C.metal, 0, 0.35) + part(E(p[0], p[1], 2.2, 2.2), C.slate, C.gun, 0.6, "", 1.6)).join("") +
      part(E(12, 12, 6.4, 6.4), C.slate, C.gun, 2, `<circle cx="12" cy="12" r="4.4" fill="none" stroke="${t}" stroke-width="1.4"/>`) +
      dot(14, 12, 2.4, 2.4, K) + dot(14.4, 12, 1.4, 1.4, C.cyan) + dot(13.9, 11.4, 0.5, 0.5, C.white);
  } },
  weapon_rocket: { w: 34, h: 14, px: 11, py: 9, draw: (t) =>
    part(Pd("M9,10 L14,10 L13,14 L8.5,14 Z"), C.gun, C.jacketD, 1.2) +
    part(Pd("M26,4.2 L29,4.2 C31.5,4.2 33,6 33,7.2 C33,8.4 31.5,10.2 29,10.2 L26,10.2 Z"), C.red, C.redD, 1.2, "", 1.8) +
    part(Pd("M1,2.5 L5,4 L5,10 L1,11.5 Z"), C.gun, null, 0, "", 1.8) +
    part(Rr(4, 3, 23, 8.4, 3), C.jacket, C.jacketD, 2, box(4, 3, 23, 1.8, 0, C.slate) + box(8, 3, 2.4, 8.4, 0, t) + box(21, 3, 2.4, 8.4, 0, t)) +
    part(Rr(12, 0.8, 6, 2.4, 0.8), C.gun, null, 0, "", 1.4) + dot(17.4, 2, 0.7, 0.7, C.lime) },
  projectile_basic: { w: 12, h: 8, draw: () => box(0.5, 1, 11, 6, 3, C.cyan, 0.4) + box(2, 2.4, 9, 3.2, 1.6, C.cyan) + box(5, 3.2, 5.4, 1.6, 0.8, C.white) },
  proj_pellet: { w: 8, h: 8, draw: () => dot(4, 4, 3.6, 3.6, AMB.base, 0, 0.45) + part(E(4, 4, 2.3, 2.3), AMB.l, AMB.base, 0.8, "", 1.2) + dot(4.6, 3.4, 0.7, 0.7, C.white) },
  proj_rocket: { w: 18, h: 10, draw: () =>
    `${Pd("M5,3.5 L0,5 L5,6.5 Z")} fill="${C.flame}"/>` + dot(4, 5, 3, 2.4, C.orange, 0, 0.6) +
    part(Pd("M5,3 L13,3 C15.5,3 17,4 17,5 C17,6 15.5,7 13,7 L5,7 Z"), C.metal, C.metalD, 1, box(12, 3, 2, 4, 0, C.red), 1.4) +
    part(Pd("M5,3 L8,3 L6,0.8 L4.4,0.8 Z"), C.red, null, 0, "", 1.2) + part(Pd("M5,7 L8,7 L6,9.2 L4.4,9.2 Z"), C.red, null, 0, "", 1.2) },
  // orange-red (owner 2026-10-25): an enemy shot reads as danger, not like the cyan pistol bolt
  enemy_bolt: { w: 10, h: 10, draw: () => dot(5, 5, 4.6, 4.6, C.red, 0, 0.4) + dot(5, 5, 3, 3, C.orange) + dot(5, 5, 1.5, 1.5, C.flame) },
  fx_muzzle: { w: 14, h: 14, draw: () => dot(7, 7, 6, 6, C.flame, 0, 0.35) + star(7, 7, 6.5, C.flame) + dot(7, 7, 2, 2, C.white) },
  /** Arc centre at (4, 56), outer radius 58, 120 deg. */
  fx_swoosh: { w: 64, h: 112, flat: true, draw: () =>
    `${Pd("M33,5.8 A58,58 0 0 1 33,106.2 A82.6,82.6 0 0 0 33,5.8 Z")} fill="${C.white}" opacity="0.5"/>` +
    `<path d="M33,5.8 A58,58 0 0 1 33,106.2" fill="none" stroke="${C.cyan}" stroke-width="2.4" stroke-linecap="round"/>` },
  fx_beam: { w: 16, h: 10, flat: true, draw: () => box(0, 0, 16, 10, 0, C.cyan, 0.3) + box(0, 2, 16, 6, 0, C.cyan) + box(0, 4, 16, 2, 0, C.white) },
  /** Ring radius 27 at the centre of a 64 frame. */
  fx_blast: { w: 64, h: 64, draw: () =>
    dot(32, 32, 26, 26, C.flame, 0, 0.25) + `<circle cx="32" cy="32" r="27" fill="none" stroke="${C.orange}" stroke-width="5"/>` +
    `<circle cx="32" cy="32" r="27" fill="none" stroke="${C.flame}" stroke-width="1.6"/>` +
    [0, 60, 120, 180, 240, 300].map((a) => star(n1(32 + Math.cos(a * Math.PI / 180) * 17), n1(32 + Math.sin(a * Math.PI / 180) * 17), 3, C.flame)).join("") },
};
/** Design px of the swoosh arc and blast ring, for scaling them to a weapon's reach. */
export const SWOOSH = { cx: 4, cy: 56, r: 58 } as const;
export const BLAST_R = 27;

export const ACTOR_KEYS = Object.keys(A) as ActorKey[];
export const SPRITE_META: Record<SpriteKey, SpriteMeta> = {
  ...(Object.fromEntries(Object.entries(A).map(([k, a]) => [k, a.meta])) as Record<ActorKey, SpriteMeta>),
  pickup_scrap: { w: 24, h: 24, feet: 22, cx: 12, cy: 12 },
  ...(Object.fromEntries(Object.entries(X).map(([k, { w, h, px, py }]) =>
    [k, { w, h, feet: h, cx: w / 2, cy: h / 2, ...(px === undefined ? {} : { px, py }) }])) as Record<WeaponKey | ShotKey, SpriteMeta>),
};
const WALK = ["walk0", "walk1", "hit"] as const;
export const FRAMES: Record<SpriteKey, readonly string[]> = {
  player: WALK, enemy_pea: WALK, enemy_pepper: WALK, enemy_potato: WALK, enemy_carrot: WALK, enemy_tomato: WALK,
  pickup_scrap: ["0", "1"],
  ...(Object.fromEntries(Object.keys(X).map((k) => [k, k.startsWith("weapon_") ? ["t1", "t2", "t3", "t4"] : ["0"]])) as Record<WeaponKey | ShotKey, string[]>),
};

/** Keyline filter (dilated alpha, light rim under the art); hit = everything white, face swapped for >< eyes. */
function wrap(w: number, h: number, inner: string, hit: string, keyline = true): string {
  const css = hit ? `<style>.hit [fill]:not([fill="none"]){fill:#fff}.hit .face{display:none}.hit [stroke]:not([stroke="${K}"]){stroke:#fff}</style>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">${css}<defs>` +
    `<filter id="st" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="${KEYLINE.r}" result="d"/>` +
    `<feFlood flood-color="${KEYLINE.color}" flood-opacity="${KEYLINE.op}"/><feComposite in2="d" operator="in" result="k"/>` +
    `<feMerge><feMergeNode in="k"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
    `<g${keyline ? ' filter="url(#st)"' : ""}><g class="${hit ? "hit" : ""}">${inner}</g>${hit}</g></svg>`;
}

/** SVG string for a texture key + frame (walk0/walk1/hit, scrap 0/1, weapons t1..t4, shots 0); width/height = 2x design px. */
export function svg(key: SpriteKey, frame: string): string {
  uid = 0;
  const { w, h } = SPRITE_META[key];
  if (key === "pickup_scrap") return wrap(w, h, bolt(+frame), "");
  if (key in X) {
    const x = X[key as WeaponKey | ShotKey];
    return wrap(w, h, x.draw(THEME_CSS.tier[(+frame.slice(1) || 1) - 1]), "", !x.flat);
  }
  const a = A[key as ActorKey];
  return wrap(w, h, a.draw(frame === "walk1" ? 1 : 0), frame === "hit" ? squint(a.squint) : "");
}
