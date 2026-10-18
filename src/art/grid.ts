import { PALETTE } from "./palette";

/** Rows of palette letters; '.' is transparent. At most 16 wide and 16 rows. */
export type Grid = string[];

export interface ActorArt {
  key: string;
  walk0: Grid;
  walk1: Grid;
  hit: Grid;
}

export const parseGrid = (rows: string): Grid => rows.replace(/^\n/, "").replace(/\n$/, "").split("\n");

export function gridBounds(g: Grid): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  g.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === ".") continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  });
  return x1 < 0 ? { x0: 0, y0: 0, x1: -1, y1: -1 } : { x0, y0, x1, y1 };
}

/** Problems with one frame's shape and letters. */
export function validateGrid(g: Grid, name = "grid"): string[] {
  const out: string[] = [];
  if (g.length > 16) out.push(`${name}: ${g.length} rows (max 16)`);
  g.forEach((row, y) => {
    if (row.length > 16) out.push(`${name}: row ${y} is ${row.length} chars (max 16)`);
    for (const ch of row) if (ch !== "." && !(ch in PALETTE)) out.push(`${name}: row ${y} has unknown palette letter '${ch}'`);
  });
  if (gridBounds(g).x1 < 0) out.push(`${name}: empty`);
  return out;
}

export function validateActor(a: ActorArt): string[] {
  const out = (["walk0", "walk1", "hit"] as const).flatMap((f) => validateGrid(a[f], `${a.key}.${f}`));
  if (out.length) return out;
  const b0 = gridBounds(a.walk0);
  const b1 = gridBounds(a.walk1);
  const bh = gridBounds(a.hit);
  if (Math.abs(b1.y1 - b0.y1) > 1) out.push(`${a.key}: walk feet rows differ by more than 1`);
  if (Math.abs(b1.x1 - b1.x0 - (b0.x1 - b0.x0)) > 1) out.push(`${a.key}: walk1 width differs from walk0 by more than 1`);
  for (const k of ["x0", "y0", "x1", "y1"] as const) {
    if (Math.abs(bh[k] - b0[k]) > 1) out.push(`${a.key}: hit ${k} differs from walk0 by more than 1`);
  }
  if (a.hit.join("\n") === a.walk0.join("\n")) out.push(`${a.key}: hit is identical to walk0`);
  return out;
}
