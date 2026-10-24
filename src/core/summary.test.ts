import { describe, expect, it } from "vitest";
import { newRun } from "./run";
import { endRun, startWave } from "./runlog";
import { computeStats } from "./stats";
import { loadBest, recordBest, summariseRun } from "./summary";

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}
const throwing = {
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("full");
  },
};

/** Clears wave 1, dies in wave 2. */
function twoWaveRun() {
  const run = newRun(1, "pistol");
  const w1 = startWave(run.log, run, computeStats(run));
  Object.assign(w1, { killed: 10, damageDealt: 300 });
  w1.taken.contact = 30;
  run.wave = 2;
  run.level = 3;
  run.items = ["grip", "grip"];
  const w2 = startWave(run.log, run, computeStats(run));
  Object.assign(w2, { killed: 5, damageDealt: 150 });
  w2.taken.bolt = 12;
  w2.taken.blast = 8;
  endRun(run.log, "died");
  return run;
}

describe("summariseRun", () => {
  it("sums the wave records and copies the build", () => {
    const run = twoWaveRun();
    const s = summariseRun(run, "defeat", loadBest(memStore()));
    expect(s).toMatchObject({ outcome: "defeat", wave: 2, kills: 15, damageDealt: 450, damageTaken: 50, level: 3, items: ["grip", "grip"] });
    expect(s.weapons).toEqual([{ id: "pistol", tier: 1 }]);
    expect(s.waves).toBe(10);
  });

  it("uses the last logged wave, not run.wave (victory hands over wave + 1)", () => {
    const run = twoWaveRun();
    run.wave = 3;
    expect(summariseRun(run, "victory", { wave: 0, id: "" }).wave).toBe(2);
  });

  it("zero-kill wave-1 death and an empty log have no NaN", () => {
    const run = newRun(1, "pistol");
    const empty = summariseRun(run, "defeat", { wave: 0, id: "" });
    startWave(run.log, run, computeStats(run));
    endRun(run.log, "died");
    const s = summariseRun(run, "defeat", { wave: 0, id: "" });
    for (const x of [empty, s]) for (const v of Object.values(x)) if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
    expect(s).toMatchObject({ wave: 1, kills: 0, damageDealt: 0, damageTaken: 0 });
  });
});

describe("best wave", () => {
  it("records died and won runs, only when higher; newBest is this run's record", () => {
    const store = memStore();
    const run = twoWaveRun();
    recordBest(run.log, store);
    expect(loadBest(store)).toEqual({ wave: 2, id: run.log.id });
    expect(summariseRun(run, "defeat", loadBest(store))).toMatchObject({ best: 2, newBest: true });

    const tie = twoWaveRun(); // same wave: not a new best
    recordBest(tie.log, store);
    expect(summariseRun(tie, "defeat", loadBest(store))).toMatchObject({ best: 2, newBest: false });
  });

  it("quits don't count", () => {
    const store = memStore();
    const run = twoWaveRun();
    endRun(run.log, "quit");
    recordBest(run.log, store);
    expect(loadBest(store)).toEqual({ wave: 0, id: "" });
  });

  it("blocked, full or garbled storage: 0 and no throw", () => {
    expect(loadBest(throwing)).toEqual({ wave: 0, id: "" });
    expect(() => recordBest(twoWaveRun().log, throwing)).not.toThrow();
    expect(loadBest({ getItem: () => "{oops" })).toEqual({ wave: 0, id: "" });
    expect(loadBest({ getItem: () => '{"wave":"x"}' })).toEqual({ wave: 0, id: "" });
    expect(loadBest(undefined)).toEqual({ wave: 0, id: "" });
  });
});
