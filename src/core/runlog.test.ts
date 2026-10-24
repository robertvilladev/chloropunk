import { describe, expect, it } from "vitest";
import { newRun } from "./run";
import { computeStats } from "./stats";
import {
  DATA_HASH,
  MAX_RUNS,
  endRun,
  fitParams,
  loadRuns,
  median,
  newRunLog,
  saveRun,
  startWave,
  summarise,
  type RunLog,
} from "./runlog";

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

/** A run that clears wave 1 (10/12 kills, 20/25 shots hit) then dies in wave 2. */
function fakeRun(id: string, hash = DATA_HASH): RunLog {
  const run = newRun(1, "pistol");
  const log = { ...newRunLog(1, "pistol", new Date(0), id), dataHash: hash };
  const w1 = startWave(log, run, computeStats(run));
  Object.assign(w1, { duration: 20, spawned: 12, spawnDist: 400, killed: 10, peakAlive: 3, scrapDropped: 10, scrapLive: 7, scrapBanked: 3, shots: 25, hits: 20, hpEnd: 50, contactTime: 4, contactHits: 2 });
  w1.taken.contact = 30;
  log.shops.push({ afterWave: 1, scrapBefore: 10, scrapAfter: 0, offers: [], bought: [{ kind: "item", id: "grip", tier: 1, price: 10 }], sold: [], combined: [], rerolls: 0, rerollSpent: 0, locked: [] });
  run.wave = 2;
  const w2 = startWave(log, run, computeStats(run));
  Object.assign(w2, { duration: 9, spawned: 10, spawnDist: 500, killed: 5, shots: 15, hits: 10, hpEnd: 0, deathTime: 9 });
  endRun(log, "died");
  return log;
}

describe("runlog", () => {
  it("is plain versioned JSON with an anonymous id", () => {
    const log = fakeRun("a");
    expect(log.schemaVersion).toBe(1);
    expect(log.dataHash).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.parse(JSON.stringify(log))).toEqual(log);
    expect(log.result).toEqual({ wave: 2, outcome: "died", time: 29 });
    expect(newRunLog(1, "pistol").id).not.toBe(newRunLog(1, "pistol").id);
  });

  it("copies the build so later shopping doesn't rewrite it", () => {
    const run = newRun(1, "pistol");
    const w = startWave(newRunLog(1, "pistol"), run, computeStats(run));
    run.weapons.push({ id: "shotgun", tier: 1 });
    expect(w.build.weapons).toHaveLength(1);
  });

  it("summarises per wave, deduped, grouped by data hash", () => {
    const [s, old] = summarise([fakeRun("a"), fakeRun("a"), fakeRun("b"), fakeRun("c", "00000000")]);
    expect(s.dataHash).toBe(DATA_HASH);
    expect(s.runs).toBe(2);
    expect(old.runs).toBe(1);
    const [w1, w2] = s.rows;
    expect(w1).toMatchObject({ wave: 1, runs: 2, deaths: 0, peakAlive: 3, scrapDropped: 10, scrapLive: 7, scrapBanked: 3, buys: 1, aim: 0.8, hpEnd: 50, hpEndPct: 50, spawnDist: 400 });
    expect(w1.killPct).toBeCloseTo(83.3, 1);
    expect(w1.taken).toEqual({ contact: 30, bolt: 0, blast: 0 });
    expect(w2).toMatchObject({ wave: 2, deaths: 2, killPct: 50, buys: 0 });
  });

  it("fits aim and contact rate", () => {
    expect(fitParams([fakeRun("a")])).toEqual({ aim: 30 / 40, contactRate: 0.5, spawnDist: (400 * 12 + 500 * 10) / 22 });
    const old = fakeRun("old");
    for (const w of old.waves) delete w.spawnDist; // logs from before A3
    expect(fitParams([old])?.spawnDist).toBe(0);
    expect(fitParams([])).toBeNull();
  });

  it("summarises each arena size apart", () => {
    const small = { ...fakeRun("s"), arena: { w: 800, h: 600 } };
    const big = { ...fakeRun("b"), arena: { w: 1600, h: 1200 } };
    expect(summarise([small, big, fakeRun("old")]).map((s) => `${s.arena} ${s.runs}`).sort()).toEqual(["1600x1200 1", "800x600 1", "? 1"]);
  });

  it("median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it("stores the newest runs and survives bad storage", () => {
    const store = memStore();
    for (let i = 0; i < MAX_RUNS + 2; i++) saveRun({ ...fakeRun(`r${i}`) }, store);
    const runs = loadRuns(store);
    expect(runs).toHaveLength(MAX_RUNS);
    expect(runs[0].id).toBe("r2");
    expect(loadRuns({ getItem: () => "{oops" })).toEqual([]);
    expect(() => saveRun(fakeRun("x"), { getItem: () => null, setItem: () => { throw new Error("full"); } })).not.toThrow();
  });
});
