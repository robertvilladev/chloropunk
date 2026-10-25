import type { OwnedWeapon, Tier } from "@/types";

/** HUD bottom-left strip (board U4): slot sizes and spacing in design px. */
export const HUD = { weapon: 30, item: 22, perRow: 12, rows: 2, left: 30, bottom: 16 } as const;
const W_GAP = 4, I_GAP = 3, ROW_GAP = 8;

export interface Slot { x: number; y: number; size: number }
export interface WeaponSlot extends Slot { id: string; tier: Tier }
export interface ItemChip extends Slot { id: string; count: number }

/**
 * Weapon slots in a row at the bottom-left, owned items above them as one chip per id (with a stack count),
 * 12 per row, at most 2 rows; past that the last chip becomes "+N". Pure layout, read from the run each wave.
 */
export function hudSlots(weapons: readonly OwnedWeapon[], items: readonly string[], _w: number, h: number): { weapons: WeaponSlot[]; items: ItemChip[]; more?: Slot & { n: number } } {
  const wy = h - HUD.bottom - HUD.weapon;
  const ws = weapons.map((wpn, i) => ({ x: HUD.left + i * (HUD.weapon + W_GAP), y: wy, size: HUD.weapon, id: wpn.id, tier: wpn.tier }));
  const counts = new Map<string, number>();
  for (const id of items) counts.set(id, (counts.get(id) ?? 0) + 1);
  const max = HUD.perRow * HUD.rows;
  const all = [...counts];
  const fit = all.length > max ? max - 1 : all.length;
  const at = (i: number): Slot => ({
    x: HUD.left + (i % HUD.perRow) * (HUD.item + I_GAP),
    y: wy - ROW_GAP - HUD.item - Math.floor(i / HUD.perRow) * (HUD.item + I_GAP),
    size: HUD.item,
  });
  const chips = all.slice(0, fit).map(([id, count], i) => ({ ...at(i), id, count }));
  return { weapons: ws, items: chips, ...(fit < all.length ? { more: { ...at(fit), n: all.length - fit } } : {}) };
}
