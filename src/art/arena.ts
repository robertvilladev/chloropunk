import Phaser from "phaser";
import { THEME_CSS } from "@/config/theme";
import type { ArenaProp, PropKind } from "@/types";

const GRID = 48;

const D = THEME_CSS.decor;

type Ctx = CanvasRenderingContext2D;

function vent(c: Ctx, { x, y, w, h }: ArenaProp): void {
  c.fillStyle = THEME_CSS.deep;
  c.fillRect(x + 4, y + 6, w, h); // drop shadow
  c.fillStyle = D.vent;
  c.fillRect(x, y, w, h);
  c.strokeStyle = D.ventEdge;
  c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  c.fillStyle = D.slat;
  for (let i = 1; i < 4; i++) c.fillRect(x + 6, y + (h * i) / 4 - 1, w - 12, 2);
}

function sign(c: Ctx, { x, y, w, h, label }: ArenaProp): void {
  c.fillStyle = D.signBg;
  c.fillRect(x, y, w, h);
  c.strokeStyle = THEME_CSS.pink;
  c.lineWidth = 2;
  c.shadowColor = THEME_CSS.pink;
  c.shadowBlur = 8;
  c.strokeRect(x + 1, y + 1, w - 2, h - 2);
  if (label) {
    c.fillStyle = THEME_CSS.pink;
    c.font = `${Math.round(h * 0.6)}px Bungee, Impact, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(label, x + w / 2, y + h / 2 + 1);
  }
  c.shadowBlur = 0;
  c.lineWidth = 1;
}

function pad(c: Ctx, { x, y, w, h }: ArenaProp): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2 - 2;
  c.strokeStyle = D.padEdge;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 1;
  c.fillStyle = D.padText;
  c.font = `${Math.round(r)}px Bungee, Impact, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("H", cx, cy + 2);
}

function puddle(c: Ctx, { x, y, w, h }: ArenaProp): void {
  c.beginPath();
  c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  c.fillStyle = D.puddle;
  c.fill();
  c.strokeStyle = D.puddleEdge;
  c.stroke();
}

function rail(c: Ctx, { x, y, w, h }: ArenaProp): void {
  c.fillStyle = D.rail;
  c.fillRect(x, y, w, h);
  c.fillStyle = D.railPost; // posts every 48 px
  const along = w >= h;
  for (let t = 0; t <= (along ? w : h) - 4; t += GRID) c.fillRect(along ? x + t : x, along ? y : y + t, along ? 4 : w, along ? h : 4);
}

function zone(c: Ctx, { x, y, w, h }: ArenaProp): void {
  c.fillStyle = D.zone;
  c.fillRect(x, y, w, h);
  c.strokeStyle = D.zoneEdge;
  c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function crate(c: Ctx, { x, y, w, h }: ArenaProp): void {
  c.fillStyle = D.vent;
  c.fillRect(x, y, w, h);
  c.strokeStyle = D.ventEdge;
  c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  c.strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
}

const DRAW: Record<PropKind, (c: Ctx, p: ArenaProp) => void> = { vent, sign, pad, puddle, rail, zone, crate };

/** Bakes floor, grid, decor and the lime edge into one CanvasTexture per arena size (once; reused across waves). Returns the key. */
export function bakeArena(scene: Phaser.Scene, props: readonly ArenaProp[], arena: { w: number; h: number }): string {
  const key = `arena_floor_${arena.w}x${arena.h}`;
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, arena.w, arena.h);
  if (!tex) return key;
  const c = tex.getContext();
  c.fillStyle = THEME_CSS.bg;
  c.fillRect(0, 0, arena.w, arena.h);
  // zones under the grid, everything else on top of it
  for (const p of props) if (p.kind === "zone") zone(c, p);
  c.globalAlpha = 0.25;
  c.fillStyle = THEME_CSS.line;
  for (let x = 0; x <= arena.w; x += GRID) c.fillRect(x, 0, 1, arena.h);
  for (let y = 0; y <= arena.h; y += GRID) c.fillRect(0, y, arena.w, 1);
  c.globalAlpha = 1;
  for (const p of props) if (p.kind !== "zone") DRAW[p.kind](c, p);
  c.globalAlpha = 0.8;
  c.strokeStyle = THEME_CSS.lime;
  c.lineWidth = 2;
  c.strokeRect(1, 1, arena.w - 2, arena.h - 2);
  tex.refresh();
  return key;
}
