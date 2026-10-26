import type { Rng } from "@/core/rng";
import type { Vector2 } from "@/types";

/** Boss patterns (arena addendum §3); `brood` is the support spawn on its own cadence. */
export type BossPattern = "volley" | "charge" | "barrage" | "brood";
export type BossAttack = Exclude<BossPattern, "brood">;
export const BOSS_ATTACKS: readonly BossAttack[] = ["volley", "charge", "barrage"];

/** enemies.json `boss.params` reshaped; [phase 1, phase 2] pairs where the phase changes it. */
export interface BossParams {
  phase2At: number; // HP ratio below which phase 2 starts
  telegraph: Record<BossAttack, number>; // s of warning, ≥ 0.5 (spec)
  recover: Record<BossAttack, number>; // s the attack stays busy after it fires (charge: max dash time)
  gap: [number, number]; // s before the next attack may start
  broodEvery: [number, number];
  broodCount: number;
  volley: [number, number]; // bolts, min/max
  barrage: [number, number]; // markers, min/max
  barrageSpread: number; // px around the player
}

export interface BossCommand {
  kind: "telegraph" | "fire" | "phase";
  pattern: BossPattern;
  aim: Vector2; // player position when the telegraph started (volley/charge target, brood: the boss)
  count: number;
  points: Vector2[]; // barrage markers
}

interface Active {
  cmd: BossCommand;
  left: number;
  firing: boolean;
}

export interface BossState {
  t: number;
  phase: 1 | 2;
  gap: number;
  brood: number;
  last: BossAttack | null;
  active: Active[];
}

/** Seconds before the first attack: the intro banner plays first. */
export const BOSS_INTRO_S = 2;

export function createBossState(p: BossParams): BossState {
  return { t: 0, phase: 1, gap: BOSS_INTRO_S, brood: p.broodEvery[0], last: null, active: [] };
}

/**
 * Pure boss decision step: pushes this step's commands into `out`. Each attack
 * telegraphs first and fires `telegraph` s later with the same aim, then stays
 * busy for `recover` s. Phase 1 runs one attack at a time; phase 2 (below
 * `phase2At`) shortens the cadence and lets a second attack start while one runs.
 */
export function bossStep(
  s: BossState,
  dt: number,
  hpRatio: number,
  self: Vector2,
  player: Vector2,
  p: BossParams,
  rng: Rng,
  out: BossCommand[]
): void {
  s.t += dt;
  if (s.phase === 1 && hpRatio < p.phase2At) {
    s.phase = 2;
    s.gap = Math.min(s.gap, p.gap[1]);
    out.push({ kind: "phase", pattern: "brood", aim: { x: self.x, y: self.y }, count: 0, points: [] });
  }
  const ph = s.phase - 1;

  for (let i = s.active.length - 1; i >= 0; i--) {
    const a = s.active[i];
    a.left -= dt;
    if (a.left > 0) continue;
    const pattern = a.cmd.pattern as BossAttack;
    if (!a.firing) {
      a.firing = true;
      a.left += p.recover[pattern];
      out.push({ ...a.cmd, kind: "fire" });
    } else s.active.splice(i, 1);
  }

  s.brood -= dt;
  if (s.brood <= 0) {
    s.brood += p.broodEvery[ph];
    out.push({ kind: "fire", pattern: "brood", aim: { x: self.x, y: self.y }, count: p.broodCount, points: [] });
  }

  if (s.active.length >= s.phase) return; // phase n: up to n attacks at once
  s.gap -= dt;
  if (s.gap > 0) return;
  s.gap = p.gap[ph];
  const free = BOSS_ATTACKS.filter((a) => a !== s.last && !s.active.some((x) => x.cmd.pattern === a));
  const pattern = free[rng.int(0, free.length - 1)];
  s.last = pattern;
  const aim = { x: player.x, y: player.y };
  let count = 1;
  const points: Vector2[] = [];
  if (pattern === "volley") count = rng.int(p.volley[0], p.volley[1]);
  if (pattern === "barrage") {
    count = rng.int(p.barrage[0], p.barrage[1]);
    points.push(aim); // the first lands on the player, the rest around
    for (let i = 1; i < count; i++) {
      const a = rng.next() * Math.PI * 2;
      const r = p.barrageSpread * (0.4 + 0.6 * rng.next());
      points.push({ x: aim.x + Math.cos(a) * r, y: aim.y + Math.sin(a) * r });
    }
  }
  const cmd: BossCommand = { kind: "telegraph", pattern, aim, count, points };
  s.active.push({ cmd, left: p.telegraph[pattern], firing: false });
  out.push(cmd);
}

/** First attack still in its telegraph or firing (drives the pose and the boss standing still). */
export function bossBusy(s: BossState): BossAttack | null {
  return s.active.length > 0 ? (s.active[0].cmd.pattern as BossAttack) : null;
}

/** Telegraph progress 0→1 of each attack still winding up (for drawing). */
export function bossTelegraphs(s: BossState, p: BossParams): { cmd: BossCommand; k: number }[] {
  return s.active.filter((a) => !a.firing).map((a) => ({ cmd: a.cmd, k: 1 - a.left / p.telegraph[a.cmd.pattern as BossAttack] }));
}

const POSE: Record<BossAttack, string> = { volley: "volley", charge: "charge", barrage: "lob" };

/**
 * Frame name: the phase-1 `hit` during the phase switch flash, else the attack pose while
 * one runs, else `hit` on damage, else idle0/idle1 at 3 fps; `_p2` twins in phase 2.
 */
export function bossPose(s: BossState, hitLeft: number, switchLeft: number): string {
  if (switchLeft > 0) return "hit";
  const busy = bossBusy(s);
  // the attack pose is part of the telegraph, so damage flashes never hide it
  const pose = busy ? POSE[busy] : hitLeft > 0 ? "hit" : Math.floor(s.t * 3) % 2 ? "idle1" : "idle0";
  return s.phase === 2 ? `${pose}_p2` : pose;
}

/** BossParams from the flat enemies.json `boss.params`. */
export function bossParams(f: Record<string, number>): BossParams {
  return {
    phase2At: f.phase2At,
    telegraph: { volley: f.teleVolley, charge: f.teleCharge, barrage: f.teleBarrage },
    recover: { volley: f.recVolley, charge: f.recCharge, barrage: f.recBarrage },
    gap: [f.gap1, f.gap2],
    broodEvery: [f.brood1, f.brood2],
    broodCount: f.broodCount,
    volley: [f.volleyMin, f.volleyMax],
    barrage: [f.barrageMin, f.barrageMax],
    barrageSpread: f.barrageSpread,
  };
}
