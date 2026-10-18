import type { Tier } from "@/types";

export const TIER_NAMES = ["COMMON", "UNCOMMON", "RARE", "LEGENDARY"] as const;

export const tierLabel = (t: Tier): string => `T${t} · ${TIER_NAMES[t - 1]}`;

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const truncate = (s: string, max: number): string => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);
