import { createRng } from "@/core/rng";
import enemies from "@assets/data/enemies.json";
import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "@/config/constants";
import { BOSS_INTRO_S, bossBusy, bossMove, bossParams, bossPose, bossStep, bossTelegraphs, createBossState, type BossCommand } from "./bossBrain";

const P = bossParams(enemies.boss.params as Record<string, number>);
const DT = 1 / 60;
const self = { x: 500, y: 500 };
const player = { x: 800, y: 600 };
const still = { x: 0, y: 0 };

/** Run `secs` at a fixed HP ratio (or a function of t); returns [t, command] pairs. */
function run(seed: number, secs: number, hp: number | ((t: number) => number) = 1) {
  const s = createBossState(P);
  const rng = createRng(seed);
  const log: [number, BossCommand][] = [];
  const out: BossCommand[] = [];
  for (let i = 0; i < secs / DT; i++) {
    out.length = 0;
    bossStep(s, DT, typeof hp === "number" ? hp : hp(s.t), self, player, still, P, rng, out);
    for (const c of out) log.push([s.t, c]);
  }
  return { s, log };
}

describe("bossBrain", () => {
  it("every telegraph lasts ≥ 0.5 s and fires with the same aim", () => {
    for (const k of Object.values(P.telegraph)) expect(k).toBeGreaterThanOrEqual(0.5);
    const { log } = run(1, 60, (t) => (t < 30 ? 1 : 0.3));
    const fires = log.filter(([, c]) => c.kind === "fire" && c.pattern !== "brood");
    expect(fires.length).toBeGreaterThan(10);
    for (const [t, f] of fires) {
      const tel = log.filter(([, c]) => c.kind === "telegraph" && c.aim === f.aim);
      expect(tel).toHaveLength(1);
      expect(t - tel[0][0]).toBeGreaterThanOrEqual(0.5 - 1e-9);
      expect(tel[0][1].count).toBe(f.count);
    }
  });

  it("waits for the intro, then volley/barrage counts stay in range", () => {
    const { log } = run(2, 60);
    const tels = log.filter(([, c]) => c.kind === "telegraph");
    expect(tels[0][0]).toBeGreaterThanOrEqual(BOSS_INTRO_S - DT);
    for (const [, c] of tels) {
      if (c.pattern === "volley") expect(c.count).toBeGreaterThanOrEqual(P.volley[0]), expect(c.count).toBeLessThanOrEqual(P.volley[1]);
      if (c.pattern === "barrage") expect(c.points).toHaveLength(c.count), expect(c.points[0]).toEqual(player);
    }
    expect(new Set(tels.map(([, c]) => c.pattern))).toEqual(new Set(["volley", "charge", "barrage"]));
  });

  it("phase 1 never overlaps attacks; phase 2 does, with a shorter cadence", () => {
    const busy = (secs: number, hp: number) => {
      const s = createBossState(P);
      const rng = createRng(3);
      let max = 0;
      let starts = 0;
      const out: BossCommand[] = [];
      for (let i = 0; i < secs / DT; i++) {
        out.length = 0;
        bossStep(s, DT, hp, self, player, still, P, rng, out);
        starts += out.filter((c) => c.kind === "telegraph").length;
        max = Math.max(max, s.active.length);
      }
      return { max, starts, phase: s.phase };
    };
    const p1 = busy(60, 1);
    const p2 = busy(60, 0.4);
    expect(p1).toMatchObject({ max: 1, phase: 1 });
    expect(p2).toMatchObject({ max: 2, phase: 2 });
    expect(p2.starts).toBeGreaterThan(p1.starts * 1.3);
    expect(P.gap[1]).toBeLessThan(P.gap[0]);
    expect(P.broodEvery[1]).toBeLessThan(P.broodEvery[0]);
  });

  it("switches phase once, below phase2At, with a phase command", () => {
    const { s, log } = run(4, 20, (t) => (t < 10 ? 0.5 : 0.49));
    const phase = log.filter(([, c]) => c.kind === "phase");
    expect(phase).toHaveLength(1);
    expect(phase[0][0]).toBeGreaterThan(10);
    expect(s.phase).toBe(2);
  });

  it("brood fires on its own cadence, phase 1 and 2", () => {
    const times = (hp: number) => run(5, 30, hp).log.filter(([, c]) => c.pattern === "brood" && c.kind === "fire").map(([t]) => t);
    const gaps = (ts: number[]) => ts.slice(1).map((t, i) => t - ts[i]);
    for (const g of gaps(times(1))) expect(g).toBeCloseTo(P.broodEvery[0], 1);
    for (const g of gaps(times(0.2))) expect(g).toBeCloseTo(P.broodEvery[1], 1);
    expect(run(5, 30).log.find(([, c]) => c.pattern === "brood")![1].count).toBe(P.broodCount);
  });

  it("same seed → same command sequence over 60 s; another seed differs", () => {
    const seq = (seed: number) => run(seed, 60, (t) => (t < 30 ? 1 : 0.3)).log.map(([t, c]) => `${t.toFixed(3)} ${c.kind} ${c.pattern} ${c.count}`);
    expect(seq(7)).toEqual(seq(7));
    expect(seq(7)).not.toEqual(seq(8));
  });

  it("pose: switch flash, hit, attack pose, idle, _p2 twins", () => {
    const s = createBossState(P);
    expect(bossPose(s, 0, 0)).toBe("idle0");
    s.t = 0.4;
    expect(bossPose(s, 0, 0)).toBe("idle1");
    expect(bossPose(s, 0.05, 0)).toBe("hit");
    const out: BossCommand[] = [];
    s.gap = 0;
    while (!bossBusy(s)) bossStep(s, DT, 1, self, player, still, P, createRng(1), out);
    expect(bossTelegraphs(s, P)[0].k).toBe(0);
    bossStep(s, 0.25, 1, self, player, still, P, createRng(1), out);
    expect(bossTelegraphs(s, P)[0].k).toBeGreaterThan(0);
    expect(["volley", "charge", "lob"]).toContain(bossPose(s, 0, 0));
    expect(bossPose(s, 0.05, 0)).toBe(bossPose(s, 0, 0)); // a hit never hides the telegraph pose
    s.phase = 2;
    expect(bossPose(s, 0, 0)).toMatch(/_p2$/);
    expect(bossPose(s, 0, 0.1)).toBe("hit");
  });

  it("aim tracks a moving player with a lead, then freezes for the last aimLock s", () => {
    expect(P.aimLock).toBeGreaterThanOrEqual(0.3);
    for (const k of Object.values(P.telegraph)) expect(k - P.aimLock).toBeGreaterThan(0); // some tracking, ≥ 0.5 s total
    const s = createBossState(P);
    const rng = createRng(1);
    const vel = { x: 150, y: 0 };
    const pl = { x: 600, y: 300 };
    const out: BossCommand[] = [];
    const seen = new Map<BossCommand, { tracking: number[]; locked: number[] }>();
    for (let i = 0; i < 20 / DT; i++) {
      out.length = 0;
      pl.x = 600 + ((i * DT * vel.x) % 800); // runs right, wraps
      bossStep(s, DT, 1, self, pl, vel, P, rng, out);
      for (const { cmd, locked } of bossTelegraphs(s, P)) {
        if (!seen.has(cmd)) seen.set(cmd, { tracking: [], locked: [] });
        const r = seen.get(cmd)!;
        (locked ? r.locked : r.tracking).push(cmd.aim.x);
        if (!locked) expect(cmd.aim.x).toBeGreaterThan(pl.x); // leads ahead of a player running right
      }
    }
    expect(seen.size).toBeGreaterThan(5);
    for (const [, r] of seen) {
      if (r.locked.length === 0) continue; // still winding up when the run ended
      expect(new Set(r.tracking).size).toBeGreaterThan(1); // tracked
      expect(new Set(r.locked).size).toBe(1); // frozen
      expect(r.locked.length * DT).toBeGreaterThanOrEqual(P.aimLock - 2 * DT);
    }
  });

  it("phase 2 chains chargeChain charges, each re-aimed with a full telegraph", () => {
    expect(P.chargeChain).toEqual([1, 2]);
    const chains = (hp: number) => {
      const { log } = run(9, 90, hp);
      const charge = log.filter(([, c]) => c.pattern === "charge");
      let n = 0;
      for (let i = 1; i < charge.length; i++) {
        const [t0, prev] = charge[i - 1];
        const [t1, next] = charge[i];
        if (prev.kind !== "fire" || next.kind !== "telegraph" || Math.abs(t1 - t0 - P.recover.charge) > 2 * DT) continue;
        n++;
        const fire = charge.find(([t, c]) => c.kind === "fire" && c.aim === next.aim && t > t1)!;
        expect(fire[0] - t1).toBeGreaterThanOrEqual(0.5 - 1e-9);
        expect(next.aim).not.toBe(prev.aim); // its own aim
      }
      return n;
    };
    expect(chains(1)).toBe(0);
    expect(chains(0.3)).toBeGreaterThan(0);
  });

  it("same seed → same aims with a moving player", () => {
    const seq = (seed: number) => {
      const s = createBossState(P);
      const rng = createRng(seed);
      const out: BossCommand[] = [];
      const log: string[] = [];
      for (let i = 0; i < 40 / DT; i++) {
        out.length = 0;
        const t = i * DT;
        bossStep(s, DT, t < 20 ? 1 : 0.3, self, { x: 700 + 200 * Math.sin(t), y: 500 }, { x: 200 * Math.cos(t), y: 0 }, P, rng, out);
        for (const c of out) if (c.kind === "fire") log.push(`${t.toFixed(3)} ${c.pattern} ${c.aim.x.toFixed(2)} ${c.aim.y.toFixed(2)}`);
      }
      return log;
    };
    expect(seq(3)).toEqual(seq(3));
    expect(seq(3)).not.toEqual(seq(4));
  });

  it("strafe flips every flipMin–flipMax s, from the brain's seed", () => {
    const flips = (seed: number) => {
      const s = createBossState(P);
      const rng = createRng(seed);
      const out: BossCommand[] = [];
      const ts: number[] = [];
      let dir = s.strafe;
      for (let i = 0; i < 40 / DT; i++) {
        bossStep(s, DT, 1, self, player, still, P, rng, out);
        if (s.strafe !== dir) ts.push(s.t), (dir = s.strafe);
      }
      return ts;
    };
    const ts = flips(1);
    expect(ts.length).toBeGreaterThan(8);
    for (let i = 1; i < ts.length; i++) {
      expect(ts[i] - ts[i - 1]).toBeGreaterThanOrEqual(P.strafeFlip[0] - DT);
      expect(ts[i] - ts[i - 1]).toBeLessThanOrEqual(P.strafeFlip[1] + DT);
    }
    expect(flips(1)).toEqual(ts);
    expect(flips(2)).not.toEqual(ts);
  });

  it("move: pursues beyond the band, circles inside it, backs off below it", () => {
    const base = GAME_CONFIG.INITIAL_PLAYER_SPEED;
    expect(enemies.boss.speed).toBe(base * enemies.boss.params!.chaseMul); // the sim walks it in at def.speed
    const s = createBossState(P);
    const at = (d: number) => ({ x: player.x - d, y: player.y }); // the player is to the right
    const chase = base * 0.8;
    const strafe = base * 0.5;
    expect(bossMove(s, at(P.band[1] + 50), player, P, chase, strafe)).toEqual({ x: chase, y: 0 });
    const mid = bossMove(s, at((P.band[0] + P.band[1]) / 2), player, P, chase, strafe);
    expect(mid.x).toBeCloseTo(0);
    expect(Math.abs(mid.y)).toBeCloseTo(strafe);
    const near = bossMove(s, at(P.band[0] - 50), player, P, chase, strafe);
    expect(near.x).toBeLessThan(0);
    s.strafe = s.strafe === 1 ? -1 : 1;
    expect(bossMove(s, at((P.band[0] + P.band[1]) / 2), player, P, chase, strafe).y).toBeCloseTo(-mid.y);
  });
});
