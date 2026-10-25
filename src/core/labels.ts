import type { Tier } from "@/types";

export const TIER_NAMES = ["COMMON", "UNCOMMON", "RARE", "LEGENDARY"] as const;

export const tierLabel = (t: Tier): string => `T${t} · ${TIER_NAMES[t - 1]}`;

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const truncate = (s: string, max: number): string => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);

/** 412 → "412", 18 400 → "18.4k", 2 500 000 → "2.5M". */
export function formatCount(n: number): string {
  const r = Math.round(n);
  if (r < 1000) return String(r);
  return r < 1e6 ? `${(r / 1e3).toFixed(1)}k` : `${(r / 1e6).toFixed(1)}M`;
}
