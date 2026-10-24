/** `?arena=small` keeps the old 800x600 playfield for side-by-side checks (dev builds only). Pure so it tests in node. */
export function arenaFromSearch(search: string, dev: boolean): { w: number; h: number } {
  return dev && new URLSearchParams(search).get("arena") === "small" ? { w: 800, h: 600 } : { w: 1600, h: 1200 };
}
