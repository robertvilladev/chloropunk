import { THEME_CSS } from "@/config/theme";

/**
 * Vector sprites (owner pick 2026-10-24, addendum §4): one SVG string per texture key + frame, in design px,
 * rendered at 2x. Ink outline + keyline rim, base fill with a lower-right shade, facing right.
 * Port of the approved canvas file project/vector.js (https://claude.ai/artifact/TnsQjaTcJEYoShEC5AyMXM).
 */
export type ActorKey = "player" | "enemy_pea" | "enemy_pepper" | "enemy_potato" | "enemy_carrot" | "enemy_tomato";
export type SpriteKey = ActorKey | "pickup_scrap" | WeaponKey | ShotKey | BossKey;
/** Design px; (cx, cy) = body centre, feet = shadow row; (px, py) = weapon grip pivot. */
export interface SpriteMeta { w: number; h: number; feet: number; cx: number; cy: number; px?: number; py?: number }

export const K = THEME_CSS.deep;
export const C = {
  pink: THEME_CSS.pink, pinkD: THEME_CSS.pink700, pinkL: THEME_CSS.pink300, skin: "#e0a77a", skinD: "#a8704a",
  cyan: "#4ff0ff", cyanD: "#1f9fc4", lime: THEME_CSS.lime, limeL: "#e9ff9a",
  jacket: THEME_CSS.faint, jacketD: THEME_CSS.line, slate: "#6b7088", metal: "#b8bdd4", metalD: "#6b7088", gun: "#3d4552",
  green: "#4caf50", greenD: "#2e7d32", greenL: "#93e06a", red: "#e53935", redD: "#a82525", redL: "#ff7d6b",
  orange: "#ff7a1a", orangeD: "#c45a10", orangeL: "#ffb35e", spud: "#b07a43", spudD: "#7d5530", spudL: "#d9a66a",
  flame: "#ffd23f", white: "#ffffff", limeD: "#7fa82a",
  amber: THEME_CSS.tier[3], amberD: "#b8741c", amberL: "#ffd98a", root: "#d9a66a", rootD: "#a8704a",
};
const KEYLINE = { r: 1.2, color: THEME_CSS.text, op: 0.55 };

let uid = 0;
/** Restart clip-path ids: every svg() string numbers its own from 1. */
export const resetIds = (): void => {
  uid = 0;
};
export const ol = (w = 2.5) => ` stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
/** shape = an SVG element without fill and without its closing "/>". Shade fill, base copy shifted up-left, ink outline. */
export function part(shape: string, base: string, shade: string | null, k = 3, extra: string | null = "", w?: number): string {
  const id = `c${++uid}`;
  return `<clipPath id="${id}">${shape}/></clipPath>${shape} fill="${shade || base}"/>` +
    `<g clip-path="url(#${id})"><g transform="translate(${-k * 0.8} ${-k})">${shape} fill="${base}"/></g>${extra ?? ""}</g>` +
    `${shape} fill="none"${ol(w)}/>`;
}
/** Stroked detail; under = ink width beneath (0 = none). */
export const line = (d: string, color: string, w: number, under = 0) =>
  (under ? `<path d="${d}" fill="none"${ol(under)}/>` : "") +
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const E = (cx: number, cy: number, rx: number, ry: number, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ""}`;
export const Rr = (x: number, y: number, w: number, h: number, r = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"`;
export const Pd = (d: string) => `<path d="${d}"`;
export const dot = (cx: number, cy: number, rx: number, ry: number, fill: string, rot = 0, op = 1) =>
  `${E(cx, cy, rx, ry, rot)} fill="${fill}"${op < 1 ? ` opacity="${op}"` : ""}/>`;
export const box = (x: number, y: number, w: number, h: number, r: number, fill: string, op = 1) =>
  `${Rr(x, y, w, h, r)} fill="${fill}"${op < 1 ? ` opacity="${op}"` : ""}/>`;
/** Hit-frame >< eyes. */
const squint = (pts: number[][], s = 2.6) =>
  pts.map(([x, y], i) => line(i % 2
    ? `M${x + s},${y - s} L${x - s},${y} L${x + s},${y + s}`
    : `M${x - s},${y - s} L${x + s},${y} L${x - s},${y + s}`, K, 2)).join("");
const legs = (xs: number[][], y: number, h: number, fill: string, fillD: string) =>
  xs.map((p) => part(Rr(p[0], y + (p[1] || 0), 6, h, 3), fill, fillD, 2)).join("");

interface Actor { meta: SpriteMeta; accent: string; squint: number[][]; draw: (f: number, tell?: boolean) => string }

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
      // no gun in hand: the equipped weapons orbit as their own sprites (owner 2026-10-25)
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
  enemy_pepper: { meta: { w: 40, h: 56, feet: 54, cx: 20, cy: 30 }, accent: C.red, squint: [[18, 20], [27, 20]], draw: (f, tell) => { // tell: crouch before the dash
    const b = f ? -1.5 : 0, fl = tell ? 1.5 : f ? 1.15 : 1, eye = tell ? C.flame : C.cyan;
    return `<g transform="translate(0 ${b})${tell ? " translate(20 52) scale(1.12 0.84) translate(-20 -52)" : ""}">` +
      `<g transform="translate(20 44) scale(1 ${fl}) translate(-20 -44)">` +
      `${Pd("M20,43 C11,46 9.5,53 13.5,56 C18,53 23,51 24.5,46 Z")} fill="${C.orange}"/>` +
      `${Pd("M20,45 C15,47 14,51 16,53.5 C18.5,51.5 21.5,50 22.5,47 Z")} fill="${C.flame}"/></g>` +
      part(Pd("M9,17 C9,10 15,8 20,8 C27,8 31,11 31,18 C31,30 27,40 21,47 C19,49.5 16.5,48.5 17.5,45.5 C19.5,38 9,30 9,17 Z"), C.red, C.redD, 4, dot(14, 16, 2.4, 4.5, C.redL, 10)) +
      line("M20,9 C20,5 22.5,2.5 26,2.5", C.greenD, 3, 6) +
      part(Pd("M9.5,12.5 C12,6 28,6 30.5,12.5 C26,15 14,15 9.5,12.5 Z"), C.green, C.greenD, 2) +
      '<g class="face">' +
      `${Pd("M15,18 L21.5,20 L20.5,22.5 L15,21.3 Z")} fill="${eye}"${ol(1.4)}/>` +
      `${Pd("M24,20 L29.5,18 L29.5,21.3 L25,22.5 Z")} fill="${eye}"${ol(1.4)}/>` +
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
  enemy_carrot: { meta: { w: 48, h: 56, feet: 54, cx: 22, cy: 30 }, accent: C.orange, squint: [[17, 18], [24, 18]], draw: (f, tell) => { // tell: aim, scope and muzzle glow
    const b = f ? 1 : 0, s = f ? 6 : 0;
    return `<g transform="translate(0 ${b})">` +
      ([[16, 7, -32 - s, C.green], [21.5, 5, 0, C.greenD], [27, 7, 32 + s, C.green]] as const)
        .map(([x, y, r, c]) => part(E(x, y, 2.6, 6.2, r), c, C.greenD, 1)).join("") +
      part(Pd("M11,16 C11,11 16,10 21,10 C28,10 32,12 32,17 C32,30 26,42 21,52.5 C19.5,55.5 16.5,55 16.8,52 C15,40 11,28 11,16 Z"), C.orange, C.orangeD, 4,
        dot(15, 18, 2, 5, C.orangeL) + line("M13.5,27 L18,27.5", C.orangeD, 1.6) + line("M15.5,35 L20,35.5", C.orangeD, 1.6) + line("M17.5,43 L21,43.3", C.orangeD, 1.6)) +
      (tell ? dot(24, 18, 7, 7, C.flame, 0, 0.4) : "") +
      `<g class="face">${part(E(24, 18, 4.2, 4.2), K, null, 0)}${dot(24, 18, 2.3, 2.3, tell ? C.flame : C.cyan)}${dot(23.2, 17.2, 0.7, 0.7, C.white)}` +
      `${line("M14.5,16.5 L19,18.3", K, 2.2)}${line("M17.5,24.5 L22.5,24", K, 1.8)}</g>` +
      part(Rr(24, 26, 22, 5, 1.5), C.slate, C.gun, 2, box(24, 26, 22, 1.8, 0, C.metal)) +
      part(Rr(30, 22.5, 7, 3.5, 1), C.gun, null, 0) +
      (tell ? dot(46, 28.5, 4.6, 4.6, C.flame, 0, 0.5) + box(45.5, 26.5, 2.6, 4, 0.8, C.flame) + dot(46.8, 28.5, 1, 1, C.white) : box(45.5, 26.5, 2.6, 4, 0.8, C.cyan)) +
      "</g>";
  } },
  enemy_tomato: { meta: { w: 48, h: 52, feet: 50, cx: 24, cy: 32 }, accent: C.red, squint: [[21.5, 30], [30.5, 30]], draw: (f, tell) => { // tell: fuse flares, body swells
    const b = f ? -1 : 0, F = f ? [[18, 45.5], [29, 46.5]] : [[16, 46.5], [31, 46.5]], eye = tell ? C.flame : C.cyan;
    const spark = tell ? "M31,0 L33.2,2.6 L37.5,3.5 L33.2,4.6 L31,8 L28.8,4.6 L24.5,3.5 L28.8,2.6 Z" : f ? "M31,-1 L32.5,2 L36,3 L32.5,4 L31,7 L29.5,4 L26,3 L29.5,2 Z" : "M31,0 L32,2.3 L34.5,3 L32,3.7 L31,6 L30,3.7 L27.5,3 L30,2.3 Z";
    return F.map((p) => part(E(p[0], p[1], 4, 2.6), C.redD, null, 0)).join("") +
      `<g transform="translate(0 ${b})${tell ? " translate(24 31) scale(1.07) translate(-24 -31)" : ""}">` + (tell ? dot(31, 3.5, 6, 6, C.flame, 0, 0.45) : "") +
      part(E(24, 31, 17, 15), C.red, C.redD, 5, dot(14, 24, 4.2, 2.4, C.redL, -32)) +
      line("M24,14 C24,9 27.5,6.5 30.5,4", C.slate, 2, 4.4) +
      `${Pd(spark)} fill="${C.flame}"${ol(1)}/>` + dot(31, 3, 1, 1, C.white) +
      part(Pd("M24,12 L27,16 L33,15 L29,19 L31,23 L24,21 L17,23 L19,19 L15,15 L21,16 Z"), C.green, C.greenD, 1.5) +
      '<g class="face">' +
      `${Pd("M19,28 L24.5,30 L24.5,32.3 L19,31.3 Z")} fill="${eye}"${ol(1.4)}/>` +
      `${Pd("M28,30 L33.5,28 L33.5,31.3 L28,32.3 Z")} fill="${eye}"${ol(1.4)}/>` +
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
export const AMB = { base: THEME_CSS.tier[3], d: "#b8741c", l: "#ffd98a" };
/** 4-point flash. */
function star(x: number, y: number, r: number, fill: string): string {
  const q = r * 0.32;
  return `${Pd(`M${x},${y - r} L${x + q},${y - q} L${x + r},${y} L${x + q},${y + q} L${x},${y + r} L${x - q},${y + q} L${x - r},${y} L${x - q},${y - q} Z`)} fill="${fill}"/>`;
}
const n1 = (v: number) => Math.round(v * 10) / 10;
/** Tapered capsule path from (x1, y1) radius r1 to (x2, y2) radius r2. */
function cone(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): string {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  return Pd(`M${n1(x1 + nx * r1)},${n1(y1 + ny * r1)} L${n1(x2 + nx * r2)},${n1(y2 + ny * r2)}` +
    ` A${r2},${r2} 0 0 1 ${n1(x2 - nx * r2)},${n1(y2 - ny * r2)}` +
    ` L${n1(x1 - nx * r1)},${n1(y1 - ny * r1)} A${r1},${r1} 0 0 1 ${n1(x1 + nx * r1)},${n1(y1 + ny * r1)} Z`);
}
const fade = (s: string, op: number) => s.replace("/>", ` opacity="${op}"/>`);

export const WEAPON_IDS = ["pistol", "shotgun", "laser", "blade", "drone", "rocket"] as const;
export type WeaponKey = `weapon_${(typeof WEAPON_IDS)[number]}`;
export type ShotKey = "projectile_basic" | "proj_pellet" | "proj_rocket" | "enemy_bolt" | "fx_muzzle" | "fx_swoosh" | "fx_beam" | "fx_blast"
  | "bproj_round" | "bproj_shard" | "bproj_cbolt" | "bproj_tomato" | "bproj_bulb";
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
  bproj_round: { w: 16, h: 8, draw: () =>
    part(Rr(1, 2, 6, 4, 1), C.metal, C.metalD, 0.8, null, 1.4) + part(cone(6, 4, 2.6, 14, 4, 0.8), C.orange, C.orangeD, 0.8, null, 1.4) + line("M9,3.2 L9.6,4.8", C.orangeD, 0.8) },
  bproj_shard: { w: 16, h: 8, draw: () =>
    part(Pd("M1,4 L6,1 L15,4 L6,7 Z"), C.amberL, C.amber, 1, line("M3,4 L12,4", C.amberD, 0.8), 1.6) },
  bproj_cbolt: { w: 16, h: 8, draw: () =>
    fade(dot(9, 4, 6, 3.6, C.flame), 0.35) + part(E(2.6, 2.6, 2.2, 1.2, -30), C.green, null, 0, null, 1.2) + part(E(2.6, 5.4, 2.2, 1.2, 30), C.green, null, 0, null, 1.2) +
      part(cone(4, 4, 2.4, 14, 4, 0.8), C.orangeL, C.orange, 0.8, null, 1.4) },
  bproj_tomato: { w: 16, h: 16, draw: () =>
    part(E(8, 9, 6.2, 5.8), C.red, C.redD, 1.5, dot(5.6, 7, 1.8, 1, C.redL, -30), 1.8) + part(Pd("M8,2.6 L9.4,4.4 L12,4 L10.2,5.6 L8,5 L5.8,5.6 L4,4 L6.6,4.4 Z"), C.green, null, 0, null, 1.2) + star(12.4, 2.4, 2, C.flame) },
  bproj_bulb: { w: 14, h: 16, draw: () =>
    fade(dot(7, 9.5, 6.6, 6.6, C.lime), 0.3) + part(E(7, 9.5, 4.6, 5), C.limeL, C.limeD, 1.4, dot(5.4, 7.6, 1, 1.4, C.white), 1.8) + part(Rr(4.8, 2, 4.4, 3, 1), C.metal, C.metalD, 0.6, null, 1.4) },
};
/** Design px of the swoosh arc and blast ring, for scaling them to a weapon's reach. */
export const SWOOSH = { cx: 4, cy: 56, r: 58 } as const;
export const BLAST_R = 27;

// ---------- bosses: 160x160, three looks, one fight (board A3, approved 2026-10-25); frames idle0 idle1 hit volley charge lob ----------
export const BOSS_KEYS = ["boss_harvester", "boss_onion", "boss_greenhouse"] as const;
export type BossKey = (typeof BOSS_KEYS)[number];
export const BOSS_FRAMES = ["idle0", "idle1", "hit", "volley", "charge", "lob"] as const;
/** Every boss texture: the six poses, then the same six in phase 2 (`<pose>_p2`). */
const BOSS_ALL = [...BOSS_FRAMES, ...BOSS_FRAMES.map((f) => `${f}_p2`)] as readonly string[];
/** One shared body for all three looks (M4b sets the radius). */
const BOSS_META: SpriteMeta = { w: 160, h: 160, feet: 154, cx: 80, cy: 96 };
const BW = 3; // boss outline
const bpart = (shape: string, base: string, shade: string | null, k?: number, extra?: string) => part(shape, base, shade, k, extra, BW);
const glass = (shape: string, op = 0.22) => `${shape} fill="${C.cyan}" opacity="${op}"/>`;
const streaks = (ys: number[], x0: number, x1: number) => ys.map((y, i) => fade(line(`M${x0 + i * 3},${y} L${x1 - i * 2},${y}`, C.metal, 2.2), 0.55)).join("");
const puffs = (pts: number[][]) => pts.map((p) => fade(dot(p[0], p[1], p[2], p[2], C.metal), 0.3)).join("");
const tomatoBall = (x: number, y: number, r: number) =>
  bpart(E(x, y, r, r * 0.92), C.red, C.redD, 2, dot(x - r * 0.35, y - r * 0.3, r * 0.3, r * 0.18, C.redL, -30)) + bpart(E(x, y - r * 0.85, r * 0.5, r * 0.26), C.green, null, 0);

interface Boss { squint: number[][]; sqs: number; draw: (pose: string, f: number, B: boolean) => string }
// phase 2 (below 50% HP), option B "unleashed" (board 8, chosen 2026-10-25): frames <pose>_p2
const RED = "#ff3b3b";
const fissure = (d: string, w = 1.3) => line(d, C.white, w, w + 1.6);
const sparks = (pts: number[][]) => pts.map((p) => star(p[0], p[1], p[2], C.flame) + dot(p[0], p[1], p[2] * 0.3, p[2] * 0.3, C.white)).join("");
const smoke = (pts: number[][]) => pts.map((p) => fade(dot(p[0], p[1], p[2], p[2], C.slate), 0.5)).join("");
// ported as-is from the canvas vector.js (ES5 style kept so the two stay easy to diff)
const BOSS: Record<BossKey, Boss> = {
  boss_harvester: { squint: [[76.5, 45], [83.5, 45]], sqs: 2.2, draw: (pose: string, f: number, B: boolean) => {
    var s = "", ch = pose === "charge", vo = pose === "volley", lo = pose === "lob";
    [[48, 1], [94, -1]].forEach(function (L) { // mech legs with pepper thrusters
      var x = L[0], px = L[1] > 0 ? x - 10 : x + 20;
      if (ch || B) s += cone(px + 5, 135, 5, px - 12, 156, 1.5) + ' fill="' + C.orange + '"/>' + cone(px + 5, 135, 3, px - 4, 150, 1) + ' fill="' + C.flame + '"/>';
      s += bpart(Rr(x, 104, 18, 36, 5), C.gun, C.jacketD, 3) + bpart(E(x + 9, 108, 7, 7), C.slate, C.gun, 2) +
        bpart(Rr(x - 6, 138, 30, 14, 5), C.metal, C.metalD, 3, fade(box(x - 6, 138, 30, 3, 0, C.white), 0.35));
      s += bpart(E(px + 5, 122, 6, 11), C.red, C.redD, 3, dot(px + 3, 117, 1.4, 3.5, C.redL)) + bpart(E(px + 5, 111.5, 5, 2.4), C.green, C.greenD, 1) +
        bpart(Rr(px + 1.5, 131, 7, 4, 1), K, null, 0) + (ch || B ? "" : fade(dot(px + 5, 137, 2.6, 2.2, C.flame), 0.6));
    });
    if (ch) s += streaks([62, 84, 106], 0, 22);
    var u = ch ? "translate(4 3) rotate(7 80 110)" : "translate(0 " + (f ? 1.5 : 0) + ")";
    s += '<g transform="' + u + '">';
    // pea hopper on the back
    s += bpart(Rr(26, 30, 26, 22, 4), C.green, C.greenD, 3) + [32, 39, 46].map(function (x) { return bpart(E(x, 30, 3.6, 3.6), C.greenL, C.green, 1); }).join("") +
      box(29, 40, 20, 2, 1, C.greenD);
    // back arm: claw
    s += bpart(E(34, 66, 9, 9), C.metal, C.metalD, 2) + bpart(cone(34, 68, 7, 24, 98, 5.5), C.gun, C.jacketD, 3) +
      bpart(Pd("M30,98 L16,98 L12,112 L19,108 L22,114 L26,108 L33,112 Z"), C.metal, C.metalD, 2);
    // torso
    var hz = ""; for (var i = -40; i < 70; i += 9) hz += '<path d="M' + (52 + i) + ",95 L" + (64 + i) + ",71 L" + (68.5 + i) + ",71 L" + (56.5 + i) + ',95 Z" fill="' + (B ? C.red : C.lime) + '"/>';
    s += bpart(Rr(36, 56, 88, 54, 12), C.jacket, C.jacketD, 6, box(40, 59, 50, 3, 1.5, C.slate)) +
      bpart(Rr(52, 71, 56, 24, 4), K, null, 0, hz) +
      fade(dot(80, 83, 10, 10, C.cyan), 0.3) + bpart(E(80, 83, 6.5, 6.5), C.cyan, C.cyanD, 2, dot(78, 81, 1.8, 1.8, C.white)) +
      [42, 118].map(function (x) { return dot(x, 64, 1.6, 1.6, K) + dot(x, 102, 1.6, 1.6, K); }).join("");
    // tomato mortar on the shoulder (lob: the tomato is in flight)
    s += bpart(Rr(110, 26, 18, 34, 3), C.slate, C.gun, 3, box(110, 26, 18, 4, 0, lo ? C.orange : C.gun)) + bpart(E(119, 23, 9, 4), K, null, 0);
    s += lo ? fade(dot(119, 20, 7, 4, C.flame), 0.6) + puffs([[110, 16, 3.5], [127, 14, 3], [104, 9, 2.4]]) + tomatoBall(134, 9, 6.5) : tomatoBall(119, 18, 6.5);
    // front arm: carrot gatling (volley: raised level, barrels hot)
    var gy = vo ? 74 : 92, by = vo ? [78, 82, 86] : [96, 100, 104];
    s += bpart(E(126, 66, 9, 9), C.metal, C.metalD, 2) + bpart(cone(126, 68, 7, vo ? 138 : 136, vo ? 80 : 96, 6), C.gun, C.jacketD, 3) +
      by.map(function (y) { var hot = vo || B; return part(Rr(146, y - 1.3, 12, 2.6, 1), hot ? C.orange : C.gun, hot ? C.orangeD : null, hot ? 1 : 0, null, 1.6); }).join("") +
      bpart(Rr(122, gy, 28, 16, 4), C.metal, C.metalD, 3, box(122, gy, 28, 3, 0, C.white).replace("/>", ' opacity="0.35"/>'));
    if (vo) s += fade(dot(152, 82, 13, 13, C.flame), 0.4) + star(154, 82, 9, C.flame) + dot(156, 82, 1.6, 1.6, C.white);
    else s += [126, 132, 138, 144].map(function (x) { return Pd("M" + x + ",108 l3,0 l-1.5,7 Z") + ' fill="' + C.orange + '"' + ol(1) + "/>"; }).join("");
    // cockpit dome with the tomato pilot (phase 2: the glass is gone, only shards on the rim)
    var eye = vo ? C.flame : B ? RED : C.cyan;
    s += bpart(Rr(56, 46, 48, 12, 4), C.metal, C.metalD, 2) + bpart(E(80, 46, 9.5, 8.5), C.red, C.redD, 3) +
      '<g class="face">' + Pd("M74,44 l4,1.5 0,2 -4,-0.8 Z") + ' fill="' + eye + '"/>' + Pd("M82,45.5 l4,-1.5 0,2.6 -4,0.6 Z") + ' fill="' + eye + '"/>' +
      line("M73,42 L78.5,44 M81.5,44 L87,42", K, 1.8) + box(76, 50, 8, 2.4, 1, K) + "</g>" +
      (B ? glass(Pd("M58,48 L58,37 L63,42 L66,33 L70,41 L73,48 Z"), 0.35) + Pd("M58,48 L58,37 L63,42 L66,33 L70,41 L73,48 Z") + ' fill="none"' + ol(2) + "/>" +
        glass(Pd("M102,48 L102,38 L97,43 L94,35 L90,42 L87,48 Z"), 0.35) + Pd("M102,48 L102,38 L97,43 L94,35 L90,42 L87,48 Z") + ' fill="none"' + ol(2) + "/>" +
        line("M80,26 L80,36", C.slate, 1.5, 3.5) + dot(80, 25, 2.6, 2.6, RED)
      : glass(Pd("M58,48 C58,24 102,24 102,48 Z")) + Pd("M58,48 C58,24 102,24 102,48 Z") + ' fill="none"' + ol(BW) + "/>" +
        line("M64,40 C66,33 72,30 78,29", C.white, 2) + dot(80, 23, 2.6, 2.6, ch ? C.flame : C.lime) + line("M80,26 L80,23", C.slate, 1.5, 3.5));
    if (B) s += sparks([[114, 60, 6], [48, 100, 5], [128, 106, 4], [64, 58, 4]]) +
      smoke([[30, 20, 5], [40, 10, 4], [26, 6, 3], [120, 6, 3.5]]) + fade(dot(80, 83, 16, 16, RED), 0.35);
    return s + "</g>";
  } },
  boss_onion: { squint: [[66, 86], [94, 86]], sqs: 5, draw: (pose: string, f: number, B: boolean) => {
    var s = "", ch = pose === "charge", vo = pose === "volley", lo = pose === "lob";
    var roots = ch ? [[62, 132, 56, 142], [80, 136, 80, 146], [98, 132, 104, 142]] : [[60, 128, 38, 152], [70, 132, 58, 154], [90, 132, 102, 154], [100, 128, 122, 152], [80, 134, 80, 155]];
    if (ch) s += streaks([70, 96, 122], 0, 26) + puffs([[34, 150, 5], [22, 146, 3.5], [46, 154, 3]]);
    var u = ch ? "rotate(-24 80 104)" : "translate(0 " + (f ? 1.5 : 0) + ")";
    if (!ch) s += roots.map(function (r) { return bpart(cone(r[0], r[1], 6, r[2], r[3], 1.8), C.root, C.rootD, 2); }).join("");
    s += '<g transform="' + u + '">';
    if (ch) s += roots.map(function (r) { return bpart(cone(r[0], r[1], 6, r[2], r[3], 2.4), C.root, C.rootD, 2); }).join("");
    if (vo) [-160, -128, -52, -18, 14, 166].forEach(function (a) { // layer shards bristle out of the outline
      var r = a * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r), n = (v: number) => Math.round(v * 10) / 10;
      var bx = 80 + 36 * c, byy = 98 + 40 * sn, tx = 80 + 64 * c, ty = 98 + 68 * sn, px = -sn * 6, py = c * 6;
      s += bpart(Pd("M" + n(bx + px) + "," + n(byy + py) + " L" + n(tx) + "," + n(ty) + " L" + n(bx - px) + "," + n(byy - py) + " Z"), C.amberL, C.amber, 1.5);
    });
    var layers = line("M80,40 C58,58 54,100 66,138", C.amberD, 2) + line("M80,40 C102,58 106,100 94,138", C.amberD, 2) +
      line("M80,40 C70,60 70,104 76,140", C.amberD, 1.4) + line("M80,40 C90,60 90,104 84,140", C.amberD, 1.4) + dot(58, 70, 5, 14, C.amberL, 20);
    var crack = Pd("M108,74 L116,82 L111,90 L118,99 L110,106 L104,96 L108,88 L102,80 Z") + ' fill="' + C.lime + '"' + ol(1.6) + "/>" +
      Pd("M108,82 L111,88 L107,94 L109,100") + ' fill="none" stroke="' + C.limeL + '" stroke-width="1.4"/>';
    if (B) { // outer layer peeled off: the lime core, torn amber shreds round the base
      var core = line("M80,48 C64,62 60,100 70,132", C.limeD, 2) + line("M80,48 C96,62 100,100 90,132", C.limeD, 2) + dot(62, 76, 4, 11, C.limeL, 20);
      s += [[44, 118, 52, 140, 58, 120], [102, 120, 108, 140, 116, 116], [62, 130, 66, 146, 72, 132], [88, 132, 94, 146, 98, 130]].map(function (t) {
        return bpart(Pd("M" + t[0] + "," + t[1] + " L" + t[2] + "," + t[3] + " L" + t[4] + "," + t[5] + " Z"), C.amber, C.amberD, 1.5); }).join("") +
        fade(dot(80, 94, 40, 46, C.lime), 0.25) +
        bpart(Pd("M80,42 C72,54 48,70 50,104 C52,128 66,138 80,138 C94,138 108,128 110,104 C112,70 88,54 80,42 Z"), C.lime, C.limeD, 6, core);
    } else s += bpart(Pd("M80,34 C70,46 36,64 38,102 C40,132 60,142 80,142 C100,142 120,132 122,102 C124,64 90,46 80,34 Z"), C.amber, C.amberD, 8, layers + crack);
    // sprout + neon crown
    s += line("M80,36 C77,26 72,20 66,16", C.green, 3, 6.6) + line("M80,36 C82,24 86,18 92,13", C.greenD, 3, 6.6) + line("M80,36 C80,26 80,18 79,10", C.green, 3, 6.6);
    var crown = '<path d="M56,40 L60,22 L70,34 L80,16 L90,34 L100,22 L104,40 Z" fill="none"';
    s += crown + ' stroke="' + C.cyan + '" stroke-width="7" stroke-linejoin="round" opacity="' + (vo || B ? 0.6 : 0.3) + '"/>' + crown + ol(6) + "/>" +
      crown + ' stroke="' + C.cyan + '" stroke-width="3" stroke-linejoin="round"/>' +
      [[60, 22], [80, 16], [100, 22]].map(function (p) { return part(E(p[0], p[1], 3, 3), C.pink, C.pinkD, 1); }).join("");
    // cyber implant plate + cable to the crown
    s += line("M46,64 C40,52 48,42 56,40", K, 2.6) + bpart(Rr(38, 62, 20, 22, 3), C.metal, C.metalD, 2.5, fade(box(38, 62, 20, 3, 0, C.white), 0.4)) +
      dot(42, 68, 1.4, 1.4, K) + dot(54, 68, 1.4, 1.4, K) + dot(48, 77, 3, 3, vo ? C.flame : C.pink);
    // face (lob: tears run, the gas is the tears)
    var eye = vo ? C.flame : B ? RED : C.cyan;
    s += '<g class="face">' +
      Pd("M58,80 l16,5 0,7 -16,-3 Z") + ' fill="' + eye + '"' + ol(2) + "/>" + Pd("M86,85 l16,-5 0,9 -16,3 Z") + ' fill="' + eye + '"' + ol(2) + "/>" +
      line("M54,74 L76,82 L84,82 L106,74", K, 4) +
      bpart(Pd(lo ? "M64,106 L96,106 L92,122 L68,122 Z" : "M62,104 L98,104 L94,118 L66,118 Z"), K, null, 0, [68, 74, 80, 86, 92].map(function (x) { return Pd("M" + x + "," + (lo ? 106 : 104) + " l3,0 l-1.5,5 Z") + ' fill="' + C.white + '"/>'; }).join("")) +
      (lo ? [[64, 94, 10], [96, 96, 8]].map(function (t) { return line("M" + t[0] + "," + t[1] + " l0," + t[2], C.cyan, 3, 5); }).join("") : fade(dot(64, 96, 1.6, 4, C.cyan), 0.7)) +
      "</g>";
    // root arms (lob: thrown up)
    var arms = lo ? [[40, 100, 26, 78], [120, 100, 134, 78]] : ch ? [[42, 106, 34, 112], [118, 106, 126, 112]] : [[40, 104, 24, 116], [120, 104, 136, 116]];
    s += arms.map(function (a) { return bpart(cone(a[0], a[1], 5, a[2], a[3], 3), C.root, C.rootD, 2); }).join("");
    if (lo) [[26, 66], [136, 64], [120, 22]].forEach(function (p) { // tear-gas bulbs in the air
      s += fade(dot(p[0], p[1], 9, 9, C.lime), 0.25) + bpart(E(p[0], p[1], 5.5, 6), C.limeL, C.limeD, 2, dot(p[0] - 1.6, p[1] - 2, 1.4, 1.8, C.white)) + bpart(Rr(p[0] - 2.5, p[1] - 9, 5, 3.2, 1), C.metal, C.metalD, 1);
    });
    if (B) s += smoke([[40, 30, 5], [120, 34, 4], [30, 20, 3]]) + sparks([[48, 60, 5], [114, 66, 4]]);
    return s + "</g>";
  } },
  boss_greenhouse: { squint: [[75.5, 80], [84.5, 80]], sqs: 2.6, draw: (pose: string, f: number, B: boolean) => {
    var s = "", ch = pose === "charge", vo = pose === "volley", lo = pose === "lob", dy = ch ? 10 : f ? 1.5 : 0;
    [[44, 112, 12, 152, 22, 128], [58, 114, 40, 154, 46, 136], [102, 114, 120, 154, 114, 136], [116, 112, 148, 152, 138, 128]].forEach(function (l, i) {
      var kx = l[4] + (ch ? (i < 2 ? -8 : 8) : 0), ky = l[5] + (ch ? -12 : dy * 0.6), hy = l[1] + dy;
      s += bpart(cone(l[0], hy, 5, kx, ky, 4), C.slate, C.gun, 2) + bpart(cone(kx, ky, 4, l[2], l[3], 2.2), C.metal, C.metalD, 2) + bpart(E(kx, ky, 4.6, 4.6), C.gun, C.jacketD, 1);
    });
    if (ch) s += streaks([60, 82, 104], 0, 24);
    var u = ch ? "translate(4 10) rotate(6 80 100)" : "translate(0 " + dy + ")";
    s += '<g transform="' + u + '">';
    // base
    s += bpart(Rr(30, 96, 100, 24, 7), C.jacket, C.jacketD, 4) + [40, 52, 108, 120].map(function (x) { return dot(x, 108, 2.4, 2.4, B ? RED : C.lime); }).join("") +
      bpart(Rr(64, 100, 32, 14, 3), K, null, 0, [70, 78, 86].map(function (x) { return box(x, 103, 4, 8, 1, C.greenD); }).join(""));
    // back turret: tomato mortar (lob: the tomato is in flight)
    s += bpart(Rr(14, 90, 20, 16, 3), C.slate, C.gun, 2, box(14, 90, 20, 3, 0, lo ? C.orange : C.gun)) + bpart(E(24, 88, 7, 3), K, null, 0);
    s += lo ? fade(dot(24, 85, 6, 3.5, C.flame), 0.6) + puffs([[16, 80, 3.2], [31, 78, 2.6], [12, 72, 2.2]]) + tomatoBall(36, 22, 6) : bpart(E(24, 83, 5, 4.6), C.red, C.redD, 1.5);
    // front turret: carrot cannon (volley: hot, flash)
    s += bpart(Rr(126, 98, 24, 10, 3), C.slate, C.gun, 2) + bpart(cone(146, 103, 5, 157, 103, 2), vo ? C.orangeL : C.orange, C.orangeD, 2) +
      (vo ? fade(dot(156, 103, 9, 9, C.flame), 0.35) + star(157, 103, 5.5, C.flame) + dot(157, 103, 1.4, 1.4, C.white) : "");
    // interior: vines, peas and a tomato heart
    var eye = vo ? C.flame : B ? RED : C.cyan;
    var inside = line("M50,98 C46,78 60,70 56,52", C.greenD, 5) + line("M110,98 C116,80 98,72 104,52", C.greenD, 5) + line("M80,98 C72,80 92,64 80,40", C.green, 5) +
      [[58, 60], [100, 58], [76, 46]].map(function (p) { return part(E(p[0], p[1], 4.5, 4.5), C.greenL, C.green, 1.5); }).join("") +
      fade(dot(80, 80, B ? 22 : 15, B ? 22 : 15, C.red), vo || B ? 0.6 : 0.35) + part(B ? E(80, 80, 13.5, 12.5) : E(80, 80, 11, 10), C.red, C.redD, 3) +
      '<g class="face">' + Pd("M73,78 l5,2 0,2.4 -5,-0.8 Z") + ' fill="' + eye + '"/>' + Pd("M82,80 l5,-2 0,3.2 -5,0.4 Z") + ' fill="' + eye + '"/>' +
      line("M71,75 L78,78 M82,78 L89,75", K, 2) + box(76, 85, 8, 2.6, 1.2, K) + "</g>";
    var dome = "M34,98 C34,40 126,40 126,98 Z";
    s += Pd(dome) + ' fill="#0f1a24"/>' + '<clipPath id="gh">' + Pd(dome) + "/></clipPath>" + '<g clip-path="url(#gh)">' + inside + "</g>" +
      glass(Pd(dome), B ? 0.08 : 0.18) +
      line(B ? "M80,62 L80,98 M58,74 C60,86 60,92 58,98 M104,70 C101,84 100,92 102,98 M38,76 L52,76 M110,76 L122,76" : "M80,42 L80,98 M56,50 C60,70 60,86 58,98 M104,50 C100,70 100,86 102,98 M38,76 L122,76", C.metal, 1.6) +
      (B ? "" : line("M46,72 C48,58 58,50 70,46", C.white, 2.4)) + Pd(dome) + ' fill="none"' + ol(BW) + "/>" +
      (B ? fissure("M62,52 L70,60 L66,68 L74,74") + fissure("M98,50 L92,60 L100,66") + fissure("M46,82 L54,86") : "");
    // phase 2: vines burst out over the dome
    var vine = function (d: string, leaves: number[][]) { return line(d, C.greenD, 4.4, 7) + leaves.map(function (p) { return part(E(p[0], p[1], 4.4, 2.4, p[2]), C.greenL, C.green, 1, null, 1.6); }).join(""); };
    if (B) s += vine("M70,48 C64,36 52,34 44,26", [[44, 24, -40], [56, 34, 20]]) + vine("M96,48 C104,34 118,32 126,22", [[126, 20, -30], [110, 34, 30]]) +
      vine("M38,84 C26,80 20,70 14,62", [[14, 60, 40]]) + vine("M122,82 C134,80 140,72 146,64", [[146, 62, -40]]);
    // roof vent + beacon
    s += bpart(Rr(72, 36, 16, 8, 2), C.metal, C.metalD, 1.5) + fade(dot(80, 32, 6, 6, ch ? C.flame : C.lime), 0.3) + bpart(E(80, 32, 3.4, 3.4), ch ? C.flame : C.lime, C.limeD, 1);
    if (B) s += sparks([[126, 96, 5], [30, 94, 4], [80, 40, 4]]) + smoke([[24, 76, 4], [138, 80, 3.5]]);
    return s + "</g>";
  } },
};

export const ACTOR_KEYS = Object.keys(A) as ActorKey[];
export const SPRITE_META: Record<SpriteKey, SpriteMeta> = {
  ...(Object.fromEntries(Object.entries(A).map(([k, a]) => [k, a.meta])) as Record<ActorKey, SpriteMeta>),
  pickup_scrap: { w: 24, h: 24, feet: 22, cx: 12, cy: 12 },
  ...(Object.fromEntries(Object.entries(X).map(([k, { w, h, px, py }]) =>
    [k, { w, h, feet: h, cx: w / 2, cy: h / 2, ...(px === undefined ? {} : { px, py }) }])) as Record<WeaponKey | ShotKey, SpriteMeta>),
  ...(Object.fromEntries(BOSS_KEYS.map((k) => [k, BOSS_META])) as Record<BossKey, SpriteMeta>),
};
const WALK = ["walk0", "walk1", "hit"] as const;
const TELL = [...WALK, "tell"] as const; // board A2: wind-up frame
export const FRAMES: Record<SpriteKey, readonly string[]> = {
  player: WALK, enemy_pea: WALK, enemy_pepper: TELL, enemy_potato: WALK, enemy_carrot: TELL, enemy_tomato: TELL,
  pickup_scrap: ["0", "1"],
  ...(Object.fromEntries(Object.keys(X).map((k) => [k, k.startsWith("weapon_") ? ["t1", "t2", "t3", "t4"] : ["0"]])) as Record<WeaponKey | ShotKey, string[]>),
  ...(Object.fromEntries(BOSS_KEYS.map((k) => [k, BOSS_ALL])) as Record<BossKey, readonly string[]>),
};

/** Keyline filter (dilated alpha, light rim under the art); hit = everything white, face swapped for >< eyes. */
export function wrap(w: number, h: number, inner: string, hit: string, keyline = true): string {
  const css = hit ? `<style>.hit [fill]:not([fill="none"]){fill:#fff}.hit .face{display:none}.hit [stroke]:not([stroke="${K}"]){stroke:#fff}</style>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">${css}<defs>` +
    `<filter id="st" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="${KEYLINE.r}" result="d"/>` +
    `<feFlood flood-color="${KEYLINE.color}" flood-opacity="${KEYLINE.op}"/><feComposite in2="d" operator="in" result="k"/>` +
    `<feMerge><feMergeNode in="k"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
    `<g${keyline ? ' filter="url(#st)"' : ""}><g class="${hit ? "hit" : ""}">${inner}</g>${hit}</g></svg>`;
}

/** SVG string for a texture key + frame (walk0/walk1/hit, tell on pepper/carrot/tomato, scrap 0/1, weapons t1..t4, shots 0, bosses idle0/idle1/hit/volley/charge/lob); width/height = 2x design px. */
export function svg(key: SpriteKey, frame: string): string {
  resetIds();
  const { w, h } = SPRITE_META[key];
  if (key === "pickup_scrap") return wrap(w, h, bolt(+frame), "");
  if (key in X) {
    const x = X[key as WeaponKey | ShotKey];
    return wrap(w, h, x.draw(THEME_CSS.tier[(+frame.slice(1) || 1) - 1]), "", !x.flat);
  }
  if (key in BOSS) { // hit = the idle pose all white; idle1 = the 1.5 px settle; _p2 = phase 2
    const b = BOSS[key as BossKey], p2 = frame.endsWith("_p2"), pose = frame.replace(/_p2$/, "");
    return wrap(w, h, b.draw(pose === "hit" ? "idle" : pose.replace(/[01]$/, ""), pose === "idle1" ? 1 : 0, p2), pose === "hit" ? squint(b.squint, b.sqs) : "");
  }
  const a = A[key as ActorKey];
  return wrap(w, h, a.draw(frame === "walk1" ? 1 : 0, frame === "tell"), frame === "hit" ? squint(a.squint) : "");
}
