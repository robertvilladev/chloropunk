import type { Rng } from "@/core/rng";
import { leadPoint } from "@/entities/enemyBehaviors";
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
  aimLock: number; // s at the end of each telegraph where the aim is frozen (≥ 0.3)
  aimLead: number; // leadPoint k: 0 = the player's position, 1 = the full intercept
  boltSpeed: number;
  chargeSpeed: number;
  chargeChain: [number, number]; // charges per charge attack
  band: [number, number]; // px from the player: pursue beyond, strafe inside, back off below
  strafeFlip: [number, number]; // s between strafe-direction flips, min/max
}

export interface BossCommand {
  kind: "telegraph" | "fire" | "phase";
  pattern: BossPattern;
  aim: Vector2; // led player position, tracked until the lock then frozen (brood: the boss); mutated in place
  count: number;
  points: Vector2[]; // barrage markers, moved with `aim` until the lock
}

interface Active {
  cmd: BossCommand;
  left: number;
  firing: boolean;
  chain: number; // charges still to come after this one
  offsets: Vector2[]; // barrage markers relative to aim
}

export interface BossState {
  t: number;
  phase: 1 | 2;
  gap: number;
  brood: number;
  last: BossAttack | null;
  active: Active[];
  strafe: 1 | -1; // circling direction around the player
  flip: number; // s until it flips
  flipped: number; // s.t of the last flip
}

/** Seconds before the first attack: the intro banner plays first. */
export const BOSS_INTRO_S = 2;

export function createBossState(p: BossParams): BossState {
  return { t: 0, phase: 1, gap: BOSS_INTRO_S, brood: p.broodEvery[0], last: null, active: [], strafe: 1, flip: 0, flipped: 0 };
}

/** Reverse the strafe and draw the next flip time (from the brain's own RNG). */
export function flipStrafe(s: BossState, p: BossParams, rng: Rng): void {
  s.strafe = s.strafe === 1 ? -1 : 1;
  s.flipped = s.t;
  s.flip = p.strafeFlip[0] + (p.strafeFlip[1] - p.strafeFlip[0]) * rng.next();
}

/** Re-aim `a` at the player as it will be when the attack lands, if it keeps going. */
function track(a: Active, self: Vector2, player: Vector2, vel: Vector2, p: BossParams): void {
  const pattern = a.cmd.pattern as BossAttack;
  const k = p.aimLead;
  const at = { x: player.x + vel.x * a.left * k, y: player.y + vel.y * a.left * k }; // at fire time
  // barrage lands as the telegraph ends; bolts and the dash still have to travel
  const to = pattern === "barrage" ? at : leadPoint(self, at, vel, pattern === "volley" ? p.boltSpeed : p.chargeSpeed, k);
  a.cmd.aim.x = to.x;
  a.cmd.aim.y = to.y;
  a.offsets.forEach((o, i) => {
    a.cmd.points[i].x = to.x + o.x;
    a.cmd.points[i].y = to.y + o.y;
  });
}

function start(
  s: BossState,
  pattern: BossAttack,
  chain: number,
  self: Vector2,
  player: Vector2,
  vel: Vector2,
  p: BossParams,
  rng: Rng,
  out: BossCommand[]
): void {
  let count = 1;
  const offsets: Vector2[] = [];
  if (pattern === "volley") count = rng.int(p.volley[0], p.volley[1]);
  if (pattern === "barrage") {
    count = rng.int(p.barrage[0], p.barrage[1]);
    offsets.push({ x: 0, y: 0 }); // the first lands on the predicted position, the rest around
    for (let i = 1; i < count; i++) {
      const a = rng.next() * Math.PI * 2;
      const r = p.barrageSpread * (0.4 + 0.6 * rng.next());
      offsets.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
  }
  const cmd: BossCommand = { kind: "telegraph", pattern, aim: { x: 0, y: 0 }, count, points: offsets.map(() => ({ x: 0, y: 0 })) };
  const a: Active = { cmd, left: p.telegraph[pattern], firing: false, chain, offsets };
  track(a, self, player, vel, p);
  s.active.push(a);
  out.push(cmd);
}

/**
 * Pure boss decision step: pushes this step's commands into `out`. Each attack
 * telegraphs first, its aim tracking the player (led by `vel`) until the last
 * `aimLock` s, fires `telegraph` s after it started at the frozen aim, then stays
 * busy for `recover` s. Phase 1 runs one attack at a time; phase 2 (below
 * `phase2At`) shortens the cadence, lets a second attack start while one runs and
 * chains `chargeChain` charges, each re-aimed with its own full telegraph.
 */
export function bossStep(
  s: BossState,
  dt: number,
  hpRatio: number,
  self: Vector2,
  player: Vector2,
  vel: Vector2,
  p: BossParams,
  rng: Rng,
  out: BossCommand[]
): void {
  s.t += dt;
  if ((s.flip -= dt) <= 0) flipStrafe(s, p, rng);
  if (s.phase === 1 && hpRatio < p.phase2At) {
    s.phase = 2;
    s.gap = Math.min(s.gap, p.gap[1]);
    out.push({ kind: "phase", pattern: "brood", aim: { x: self.x, y: self.y }, count: 0, points: [] });
  }
  const ph = s.phase - 1;

  for (let i = s.active.length - 1; i >= 0; i--) {
    const a = s.active[i];
    a.left -= dt;
    if (!a.firing && a.left > p.aimLock) track(a, self, player, vel, p);
    if (a.left > 0) continue;
    const pattern = a.cmd.pattern as BossAttack;
    if (!a.firing) {
      a.firing = true;
      a.left += p.recover[pattern];
      out.push({ ...a.cmd, kind: "fire" });
    } else {
      s.active.splice(i, 1);
      if (a.chain > 0) start(s, pattern, a.chain - 1, self, player, vel, p, rng, out);
    }
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
  start(s, pattern, pattern === "charge" ? p.chargeChain[ph] - 1 : 0, self, player, vel, p, rng, out);
}

/**
 * Walking velocity before vent avoidance: beyond the band it pursues at `chase`;
 * inside it circles the player at `strafe` in `s.strafe`'s direction, drifting to the
 * band's middle (on screen) and backing off below it so body contact (untelegraphed) stays rare.
 */
export function bossMove(s: BossState, self: Vector2, player: Vector2, p: BossParams, chase: number, strafe: number): Vector2 {
  const dx = player.x - self.x;
  const dy = player.y - self.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  if (d > p.band[1]) return { x: ux * chase, y: uy * chase };
  const half = (p.band[1] - p.band[0]) / 2;
  const r = Math.max(-1, (d - p.band[0] - half) / half); // +1 at the outer edge (in), -1 at the inner (out)
  const vx = -uy * s.strafe + ux * r;
  const vy = ux * s.strafe + uy * r;
  const l = Math.hypot(vx, vy);
  return { x: (vx / l) * strafe, y: (vy / l) * strafe };
}

/** First attack still in its telegraph or firing (drives the pose and the boss standing still). */
export function bossBusy(s: BossState): BossAttack | null {
  return s.active.length > 0 ? (s.active[0].cmd.pattern as BossAttack) : null;
}

/** Telegraph progress 0→1 of each attack still winding up, and whether its aim is locked (for drawing). */
export function bossTelegraphs(s: BossState, p: BossParams): { cmd: BossCommand; k: number; locked: boolean }[] {
  return s.active
    .filter((a) => !a.firing)
    .map((a) => ({ cmd: a.cmd, k: 1 - a.left / p.telegraph[a.cmd.pattern as BossAttack], locked: a.left <= p.aimLock }));
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
    aimLock: f.aimLock,
    aimLead: f.aimLead,
    boltSpeed: f.boltSpeed,
    chargeSpeed: f.chargeSpeed,
    chargeChain: [f.chargeChain1, f.chargeChain2],
    band: [f.bandMin, f.bandMax],
    strafeFlip: [f.flipMin, f.flipMax],
  };
}
