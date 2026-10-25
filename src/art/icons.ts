import { THEME_CSS } from "@/config/theme";
import { AMB, C as BASE, E, K, Pd, Rr, box, dot, line, ol, part as basePart, resetIds, wrap } from "./vector";

/**
 * Card / HUD icons (board U2, approved 2026-10-25): 15 items + 14 level-up stats, 32x32 design px, baked at 2x like the sprites.
 * Stat icons carry no tier; the card frame shows it. Port of the canvas file project/vector.js (icons section).
 */
export const ITEM_ICONS = ["visor", "grip", "synthsteak", "hoodie", "sneakers", "coil", "chip", "nanopatch", "overclock", "knuckles", "scope", "harvester", "plasma", "glass", "ghost"] as const;
export const STAT_ICONS = ["maxHp", "hpRegen", "armor", "dodge", "speed", "damage", "melee", "ranged", "elemental", "attackSpeed", "crit", "range", "luck", "harvesting"] as const;
export type IconKind = "item" | "stat";
export const iconKey = (kind: IconKind, id: string): string => `icon_${kind}_${id}`;
export const ICON_KEYS = [...ITEM_ICONS.map((id) => iconKey("item", id)), ...STAT_ICONS.map((id) => iconKey("stat", id))];
export const ICON_SIZE = 32;

const C = { ...BASE, cyanD: "#1f9fc4", limeD: "#7fa82a", amber: AMB.base, amberD: AMB.d, amberL: AMB.l, jacket: THEME_CSS.faint };
const part = (shape: string, base: string, shade: string | null, k = 3, extra: string | null = "", w?: number) => basePart(shape, base, shade, k, extra ?? "", w);
const fade = (s: string, op: number) => s.replace("/>", ` opacity="${op}"/>`);

/** n-point star path. */
function burst(cx: number, cy: number, r1: number, r2: number, n: number, rot = 0): string {
  let d = "";
  const a0 = rot * Math.PI / 180, f = (v: number) => Math.round(v * 10) / 10;
  for (let i = 0; i < n * 2; i++) { const a = a0 + i * Math.PI / n, r = i % 2 ? r2 : r1; d += (i ? " L" : "M") + f(cx + Math.sin(a) * r) + "," + f(cy - Math.cos(a) * r); }
  return Pd(d + " Z");
}
const HEART = "M16,27.5 C9,22.5 3.5,17.5 3.5,11.5 C3.5,7.3 6.6,4.5 10.4,4.5 C13,4.5 15,6 16,8.2 C17,6 19,4.5 21.6,4.5 C25.4,4.5 28.5,7.3 28.5,11.5 C28.5,17.5 23,22.5 16,27.5 Z";
const PLUS = "M12.5,4 L19.5,4 L19.5,12.5 L28,12.5 L28,19.5 L19.5,19.5 L19.5,28 L12.5,28 L12.5,19.5 L4,19.5 L4,12.5 L12.5,12.5 Z";
const BOLT = "M18.5,3 L7,18 L14.5,18 L12.5,29 L25,12.5 L17.5,12.5 Z";
function clover(cx: number, cy: number, r: number, fill: string, shade: string): string {
  return line("M" + cx + "," + cy + " Q" + (cx + r * 0.6) + "," + (cy + r * 1.6) + " " + (cx + r * 1.1) + "," + (cy + r * 1.45), C.greenD, 1.8, 3.6) +
    [[0, -1], [1, 0], [0, 1], [-1, 0]].map((o) => part(E(cx + o[0] * r * 0.62, cy + o[1] * r * 0.62, r * 0.5, r * 0.5), fill, shade, 1.5, null, 2)).join("") + dot(cx, cy, r * 0.2, r * 0.2, shade);
}
const I: Record<string, () => string> = {
// items
item_visor: () => {
  return part(Rr(2, 12, 6, 8, 2), C.gun, C.jacketD, 1) + part(Rr(24, 12, 6, 8, 2), C.gun, C.jacketD, 1) +
    part(Pd("M4,13 C4,9 9,8 16,8 C23,8 28,9 28,13 L28,19 C28,23 23,24 16,24 C9,24 4,23 4,19 Z"), C.slate, C.gun, 2.5, box(4, 8, 24, 2, 0, C.metal)) +
    part(Rr(7, 11.5, 18, 9, 4.5), C.cyan, C.cyanD, 2, fade(box(9, 12.6, 8, 2.2, 1.1, C.white), 0.8)) +
    line("M20.5,13 L20.5,19 M17.5,16 L23.5,16", C.pink, 1.2) + dot(20.5, 16, 1.4, 1.4, C.pink);
},
item_grip: () => {
  return part(Pd("M15,22 L30,22 L28.5,25 L30,28 L15,28 Z"), C.lime, C.limeD, 1, line("M18,24.5 L27,24.5", C.limeD, 0.8)) +
    part(E(15, 15, 12, 12), C.lime, C.limeD, 3, [0, 45, 90, 135].map((a) => '<g transform="rotate(' + a + ' 15 15)">' + fade(box(14.4, 3, 1.2, 24, 0, C.limeD), 0.5) + "</g>").join("") + dot(10, 9, 3.4, 1.6, C.limeL, -40)) +
    part(E(15, 15, 5.5, 5.5), C.gun, C.jacketD, 1, '<circle cx="15" cy="15" r="3.6" fill="none" stroke="' + C.jacket + '" stroke-width="1"/>');
},
item_synthsteak: () => {
  return part(Pd("M5,14 C4,7 11.5,4 19,4.5 C27,5 30,11.5 28.5,18.5 C27,25.5 19,28.5 12.5,27 C7.5,26 5.6,20 5,14 Z"), C.red, C.redD, 3.5,
    line("M14,8 C19,9 24,12 25,18", C.redL, 1.4) + line("M10,20 C15,22 19,23 23,22", C.redL, 1.2) + dot(15, 9, 4, 1.6, C.redL, -10)) +
    part(E(11, 14.5, 4.4, 4.4), C.white, C.metal, 1.2, null, 2) + dot(11, 14.5, 1.6, 1.6, C.pinkL) +
    part(Rr(17, 22, 9, 4, 1), C.cyan, C.cyanD, 0.6, [18.3, 19.8, 22, 23.6].map((x) => box(x, 22.6, 0.7, 2.8, 0, K)).join(""), 1.4);
},
item_hoodie: () => {
  return part(Pd("M4,30 L4,16 C4,11 8,9 12,8.5 L20,8.5 C24,9 28,11 28,16 L28,30 Z"), C.jacket, C.jacketD, 3,
    box(7, 17, 7, 8, 1.5, C.slate) + box(18, 17, 7, 8, 1.5, C.slate) + dot(10.5, 21, 0.9, 0.9, K) + dot(21.5, 21, 0.9, 0.9, K) + box(15.2, 13, 1.6, 17, 0, C.lime)) +
    part(Pd("M9,10 C9,3 23,3 23,10 C23,14 19.5,15.5 16,15.5 C12.5,15.5 9,14 9,10 Z"), C.pink, C.pinkD, 2, dot(13, 6.5, 3, 1.2, C.pinkL, -15)) +
    dot(16, 11, 4, 3, K) + line("M13,15 L12.5,20 M19,15 L19.5,20", C.white, 1);
},
item_sneakers: () => {
  return fade(line("M2,9 L9,9 M1,13 L6,13", C.cyan, 1.6), 0.8) +
    part(Pd("M5,21 L5,12 C5,9 8,8 10,9.5 L15,13.5 C18.5,15 22.5,14.5 25.5,16.5 C28.5,18 30,19.5 30,21.5 Z"), C.pink, C.pinkD, 3,
      box(5, 12, 4, 9.5, 1, C.pinkL) + dot(22, 17.5, 2.5, 1, C.white, 10)) +
    line("M11,12 L13.5,10.5 M13.5,14 L16,12.5 M16.5,15.5 L19,14", C.white, 1.3) +
    part(Rr(3, 21, 28, 5.5, 2.7), C.cyan, C.cyanD, 1.5, box(4, 23.6, 26, 0.9, 0.4, C.white));
},
item_coil: () => {
  return line("M9.5,7 L9.5,15.5 A6.5,6.5 0 0 0 22.5,15.5 L22.5,7", C.red, 6, 9.5) + line("M8.4,9 L8.4,15.6", C.redL, 1.2) +
    part(Rr(5.5, 3, 8, 6, 1), C.metal, C.metalD, 1, null, 2) + part(Rr(18.5, 3, 8, 6, 1), C.metal, C.metalD, 1, null, 2) +
    line("M3,23 C5,25 4,27 6,29 M29,23 C27,25 28,27 26,29 M16,26 L16,30.5", C.lime, 1.5);
},
item_chip: () => {
  let notches = "";
    for (let a = 0; a < 360; a += 45) notches += '<g transform="rotate(' + a + ' 16 16)">' + box(14, 3.2, 4, 4, 0.8, C.white) + "</g>";
  return part(E(16, 16, 13, 13), C.pink, C.pinkD, 3, notches) +
    '<circle cx="16" cy="16" r="8.4" fill="' + C.pinkD + '" stroke="' + K + '" stroke-width="1.6"/>' +
    burst(16, 16, 6, 2.6, 5) + ' fill="' + C.flame + '"' + ol(1.2) + "/>";
},
item_nanopatch: () => {
  return '<g transform="rotate(-38 16 16)">' + part(Rr(2.5, 10.5, 27, 11, 5.5), C.metal, C.metalD, 2.5,
    [5.5, 8, 23.5, 26].map((x) => dot(x, 13.5, 0.7, 0.7, C.metalD) + dot(x, 18.5, 0.7, 0.7, C.metalD)).join("")) +
    part(Rr(10.5, 10.5, 11, 11, 1.5), C.lime, C.limeD, 1.5) + "</g>" +
    '<g transform="translate(16 16) scale(0.36) translate(-16 -16)">' + Pd(PLUS) + ' fill="' + C.white + '"/></g>';
},
item_overclock: () => {
  let pins = "";
    [9, 13.5, 18.5, 23].forEach((p) => { pins += box(p - 1, 1.5, 2, 4, 0.5, C.metal) + box(p - 1, 26.5, 2, 4, 0.5, C.metal) + box(1.5, p - 1, 4, 2, 0.5, C.metal) + box(26.5, p - 1, 4, 2, 0.5, C.metal); });
  return pins + part(Rr(5, 5, 22, 22, 3), C.slate, C.gun, 2.5, box(5, 5, 22, 2, 0, C.metal)) +
    box(8.5, 8.5, 15, 15, 1.5, K) + fade(dot(16, 16, 7, 7, C.orange), 0.3) +
    '<g transform="translate(16 16) scale(0.5) translate(-16 -16)">' + Pd(BOLT) + ' fill="' + C.flame + '"' + ol(2.4) + "/></g>";
},
item_knuckles: () => {
  return part(Pd("M3.5,15 L28.5,15 L27,22 C24,27 8,27 5,22 Z"), C.amber, C.amberD, 2.5, box(6, 16, 20, 1.6, 0.8, C.amberL)) +
    [6.5, 12.8, 19.2, 25.5].map((x) => part(E(x, 10.5, 3.6, 5.4), C.amber, C.amberD, 1.2, dot(x - 1.2, 7.4, 1.2, 0.8, C.amberL), 2.2) + part(E(x, 10.8, 1.6, 2.8), C.gun, null, 0, null, 1.4)).join("") +
    line("M16,24 L16,27", K, 1.2);
},
item_scope: () => {
  return part(Rr(14, 25, 4, 5, 1), C.gun, null, 0, null, 2) + part(E(16, 15, 13, 13), C.gun, C.jacketD, 2.5, box(15, 2, 2, 3, 0.5, C.metal) + box(15, 25, 2, 3, 0.5, C.metal) + box(2, 14, 3, 2, 0.5, C.metal) + box(27, 14, 3, 2, 0.5, C.metal)) +
    part(E(16, 15, 8.6, 8.6), C.cyan, C.cyanD, 2.5, fade(dot(12.5, 11.5, 3, 1.8, C.white, -35), 0.85), 2) +
    line("M16,8 L16,13 M16,17 L16,22 M9,15 L14,15 M18,15 L23,15", K, 1.2) + dot(16, 15, 1.4, 1.4, C.red);
},
item_harvester: () => {
  return line("M10,9 L23,29", C.spud, 3, 5.5) + line("M20.5,25 L24,23", C.gun, 3, 5) +
    part(Pd("M6,10 C14,1 28,3 30,15 C26,9 18,7.5 11,12.5 Z"), C.metal, C.metalD, 2, line("M10,10.5 C16,6 24,6.5 28.5,12", C.white, 0.9)) +
    line("M8.5,11.5 C15,6.4 23,6.6 29,13.6", C.lime, 1.2) +
    part(Rr(7, 8, 6, 6, 1.5), C.gun, C.jacketD, 1, dot(10, 11, 1.2, 1.2, C.lime), 2);
},
item_plasma: () => {
  let arc = "M16,11.5 C13,14 19,16 16,18.5 C13,21 19,22.5 16,25";
  return part(Rr(12, 2, 8, 4, 1), C.metal, C.metalD, 1, null, 2) + part(Rr(7, 5, 18, 25, 4), C.slate, C.gun, 2.5, box(7, 5, 18, 2, 0, C.metal)) +
    box(10.5, 9.5, 11, 17, 3, K) + fade(box(11.5, 10.5, 9, 15, 2.4, C.pink), 0.55) +
    line(arc, C.cyan, 1.6) + line(arc, C.white, 0.6) + fade(dot(14, 13, 1.4, 2.6, C.white), 0.6);
},
item_glass: () => {
  return part(E(10, 24, 5.5, 5.5), C.slate, C.gun, 1.5, dot(10, 24, 1.6, 1.6, C.metal)) +
    '<g transform="rotate(-24 16 16)">' +
    Rr(5, 11, 22, 10, 4) + ' fill="' + C.cyan + '" opacity="0.35"/>' + Rr(5, 11, 22, 10, 4) + ' fill="none"' + ol() + "/>" +
    fade(box(7, 12.5, 16, 2.2, 1.1, C.white), 0.8) +
    part(Rr(25, 9.5, 5, 13, 1.5), C.cyan, C.cyanD, 1, null, 2.2) +
    line("M14,11 L16,15 L13.5,17 L16.5,21", C.white, 1.1) + "</g>" +
    part(Rr(2, 18, 6, 6, 1.5), C.pink, C.pinkD, 1, dot(5, 21, 1, 1, C.white), 2);
},
item_ghost: () => {
  return fade(Pd("M5,29 L5,14 C5,7.5 10,3 16,3 C22,3 27,7.5 27,14 L27,29 L23.3,25.5 L19.6,29 L16,25.5 L12.4,29 L8.7,25.5 Z") + ' fill="' + C.cyan + '"/>', 0.25) +
    part(Pd("M7,28 L7,14 C7,8.5 11,5 16,5 C21,5 25,8.5 25,14 L25,28 L22,25 L19,28 L16,25 L13,28 L10,25 Z"), "#d8fbff", C.cyan, 3,
      line("M10,21 L13,21 L14.5,19 L18,19", C.cyanD, 1) + dot(18.6, 19, 0.9, 0.9, C.amber) + dot(11, 9.5, 2.2, 1.3, C.white, -30)) +
    box(10, 12, 12, 5, 2.5, K) + box(11.3, 13.3, 3.6, 2.4, 1.2, C.amber) + box(17.1, 13.3, 3.6, 2.4, 1.2, C.amber);
},
// stats
stat_maxHp: () => part(Pd(HEART), C.red, C.redD, 3.5, dot(10, 10, 3.2, 1.8, C.redL, -35)),
stat_hpRegen: () => {
  return part(Pd(HEART), C.greenD, C.green, 2) + '<g transform="translate(16 15) scale(0.56) translate(-16 -16)">' + Pd(PLUS) + ' fill="' + C.lime + '"' + ol(3.4) + "/></g>" +
    line("M25,25 C28,22.5 29.5,19.5 29,16.5", C.lime, 1.6, 3.4) + Pd("M27,16 L29,13 L31,16.4 Z") + ' fill="' + C.lime + '"' + ol(1) + "/>";
},
stat_armor: () => {
  return part(Pd("M16,2.5 L27.5,6.5 L27.5,15 C27.5,22 22.5,27 16,29.5 C9.5,27 4.5,22 4.5,15 L4.5,6.5 Z"), C.metal, C.metalD, 3.5, dot(10, 8.5, 2.4, 1.3, C.white, -20)) +
    part(Pd("M16,8 L22,10 L22,15 C22,19 19.5,21.5 16,23 C12.5,21.5 10,19 10,15 L10,10 Z"), C.cyan, C.cyanD, 1.5, null, 1.8);
},
stat_dodge: () => {
  return fade(E(9, 16, 7, 9) + ' fill="' + C.cyan + '"/>', 0.22) + fade(E(13.5, 16, 7, 9) + ' fill="' + C.cyan + '"/>', 0.38) +
    part(E(20.5, 16, 7, 9), C.cyan, C.cyanD, 2.5, dot(18.5, 11.5, 2, 1.2, C.white, -30)) + box(17, 13.5, 8, 3, 1.5, K) + box(21, 14.2, 3, 1.6, 0.8, C.lime) +
    line("M1.5,10 L5,10 M1,16 L3.5,16 M1.5,22 L5,22", C.white, 1.4);
},
stat_speed: () => {
  let ch = "M3,5 L14,16 L3,27 L9.5,27 L20.5,16 L9.5,5 Z";
  return fade(Pd(ch) + ' fill="' + C.lime + '"/>', 0.35) + '<g transform="translate(9 0)">' + part(Pd(ch), C.lime, C.limeD, 2.5) + "</g>";
},
stat_damage: () => {
  return burst(16, 16, 14, 7, 8, 11) + ' fill="' + C.orange + '"' + ol(2.4) + "/>" + burst(16, 16, 8.5, 4.4, 8, 11) + ' fill="' + C.flame + '"/>' + dot(16, 16, 2.6, 2.6, C.white);
},
stat_melee: () => {
  return '<g transform="rotate(45 16 16)">' +
    part(Pd("M14,4 L16,0.5 L18,4 L18,21 L14,21 Z"), C.metal, C.metalD, 1.2, fade(box(14.6, 3, 1.1, 18, 0, C.white), 0.7)) +
    part(Rr(9, 21, 14, 3.2, 1.4), C.slate, C.gun, 1, dot(16, 22.6, 1, 1, C.pink), 2) +
    part(Rr(14.4, 24, 3.2, 5, 1), C.gun, C.jacketD, 0.8, null, 2) + part(E(16, 30, 2, 2), C.pink, C.pinkD, 0.6, null, 1.6) + "</g>";
},
stat_ranged: () => {
  return line("M3,26 L9,26 M5,21.5 L10,21.5", C.flame, 1.4) + '<g transform="rotate(45 16 16)">' +
    part(Pd("M10.5,11 C10.5,5 13,2 16,1 C19,2 21.5,5 21.5,11 Z"), C.metal, C.metalD, 1.6, null, 2.2) +
    part(Rr(10, 11, 12, 15, 0.5), C.amber, C.amberD, 2, fade(box(11.5, 11, 2, 15, 0, C.amberL), 0.9)) +
    part(Rr(9, 26, 14, 4, 1), C.amberD, null, 0, null, 2) + "</g>";
},
stat_elemental: () => {
  return part(Pd("M16,30 C8.5,30 5,24.5 6,18.5 C7,13 11,11 11,5.5 C15,8 16,11.5 15.5,14.5 C18,12.5 18.5,8 17.5,3 C24,6.5 27.5,13 27,19.5 C26.5,25.5 22.5,30 16,30 Z"), C.orange, C.orangeD, 3,
    Pd("M16,29.5 C12,29.5 10.5,26.5 11,23.5 C11.5,20.5 14,19 14,15.5 C17,17.5 17,20.5 16.5,22.5 C18.5,21.5 19.5,19.5 19.5,17.5 C22,20 22.5,22.5 22,25 C21.5,28 19,29.5 16,29.5 Z") + ' fill="' + C.flame + '"/>' +
    dot(15.8, 26, 2, 2.4, C.white));
},
stat_attackSpeed: () => {
  return part(Rr(13, 1.5, 6, 3.5, 1), C.metal, C.metalD, 0.8, null, 2) + part(Rr(24, 5, 4, 3, 1), C.metal, null, 0, null, 1.8) +
    part(E(16, 18, 12, 12), C.slate, C.gun, 2.5) + part(E(16, 18, 8.8, 8.8), C.white, C.metal, 1.5, null, 1.6) +
    Pd("M16,18 L16,9.2 A8.8,8.8 0 0 1 24.4,15.4 Z") + ' fill="' + C.lime + '" opacity="0.7"/>' +
    line("M16,18 L21.5,13", K, 1.8) + line("M16,18 L16,12", K, 1.4) + dot(16, 18, 1.6, 1.6, C.pink);
},
stat_crit: () => {
  return part(E(15, 17, 12.5, 12.5), C.white, C.metal, 2.5) + part(E(15, 17, 9, 9), C.red, C.redD, 1.5, null, 2) +
    part(E(15, 17, 5.4, 5.4), C.white, C.metal, 1, null, 2) + part(E(15, 17, 2.4, 2.4), C.red, null, 0, null, 1.6) +
    burst(26, 6, 5.5, 1.8, 4) + ' fill="' + C.flame + '"' + ol(1.2) + "/>";
},
stat_range: () => {
  return [24, 17, 10].map((r, i) => line("M4," + (28 - r) + " A" + r + "," + r + " 0 0 1 " + (4 + r) + ",28", [C.cyanD, C.cyan, "#a8f8ff"][i], 2.4, 4.6)).join("") +
    part(E(4.5, 27.5, 3.4, 3.4), C.pink, C.pinkD, 1, null, 2) + line("M8,24 L25,7", C.white, 1.2) + Pd("M23,5 L28,4 L27,9 Z") + ' fill="' + C.white + '"/>';
},
stat_luck: () => clover(14.5, 14.5, 10, C.green, C.greenD) + dot(11.5, 8.5, 2, 1.1, C.greenL, -30),
stat_harvesting: () => {
  return part(Pd("M16,3 L27,9.5 L27,22.5 L16,29 L5,22.5 L5,9.5 Z"), C.lime, C.limeD, 3.5, dot(10.5, 9.5, 2.6, 1.2, C.limeL, -30)) + part(E(16, 16, 5.4, 5.4), C.gun, C.jacketD, 1, null, 2.2) +
    '<circle cx="16" cy="16" r="3.4" fill="none" stroke="' + C.metal + '" stroke-width="1" stroke-dasharray="1.6 1.2"/>';
},
};

/** SVG string for an icon (viewBox 32, width/height 64); throws on an unknown id. */
export function iconSvg(kind: IconKind, id: string): string {
  const draw = I[`${kind}_${id}`];
  if (!draw) throw new Error(`no icon ${iconKey(kind, id)}`);
  resetIds();
  return wrap(ICON_SIZE, ICON_SIZE, draw(), "");
}
