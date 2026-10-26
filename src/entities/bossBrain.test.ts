import { createRng } from "@/core/rng";
import enemies from "@assets/data/enemies.json";
import { describe, expect, it } from "vitest";
import { BOSS_INTRO_S, bossBusy, bossParams, bossPose, bossStep, bossTelegraphs, createBossState, type BossCommand } from "./bossBrain";

const P = bossParams(enemies.boss.params);
const DT = 1 / 60;
const self = { x: 500, y: 500 };
const player = { x: 800, y: 600 };

/** Run `secs` at a fixed HP ratio (or a function of t); returns [t, command] pairs. */
function run(seed: number, secs: number, hp: number | ((t: number) => number) = 1) {
  const s = createBossState(P);
  const rng = createRng(seed);
  const log: [number, BossCommand][] = [];
  const out: BossCommand[] = [];
  for (let i = 0; i < secs / DT; i++) {
    out.length = 0;
    bossStep(s, DT, typeof hp === "number" ? hp : hp(s.t), self, player, P, rng, out);
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
        bossStep(s, DT, hp, self, player, P, rng, out);
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
    while (!bossBusy(s)) bossStep(s, DT, 1, self, player, P, createRng(1), out);
    expect(bossTelegraphs(s, P)[0].k).toBe(0);
    bossStep(s, 0.25, 1, self, player, P, createRng(1), out);
    expect(bossTelegraphs(s, P)[0].k).toBeGreaterThan(0);
    expect(["volley", "charge", "lob"]).toContain(bossPose(s, 0, 0));
    s.phase = 2;
    expect(bossPose(s, 0, 0)).toMatch(/_p2$/);
    expect(bossPose(s, 0, 0.1)).toBe("hit");
  });
});
