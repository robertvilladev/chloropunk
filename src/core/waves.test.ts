import { describe, expect, it } from "vitest";
import enemies from "@assets/data/enemies.json";
import wavesJson from "@assets/data/waves.json";
import {
  buildSpawnSchedule,
  advanceCursor,
  scaleEnemy,
  waveDuration,
} from "./waves";

describe("waveDuration", () => {
  it("grows 4s per wave and caps at 60", () => {
    expect(waveDuration(1)).toBe(20);
    expect(waveDuration(5)).toBe(36);
    expect(waveDuration(20)).toBe(60);
  });
});

describe("buildSpawnSchedule", () => {
  it("expands a group", () => {
    const s = buildSpawnSchedule({
      wave: 1,
      groups: [{ enemy: "pea", count: 3, every: 2, start: 0 }],
    });
    expect(s.map((e) => e.time)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    expect(s.every((e) => e.count === 3 && e.enemy === "pea")).toBe(true);
  });

  it("respects start/end", () => {
    const s = buildSpawnSchedule({
      wave: 1,
      groups: [{ enemy: "pepper", count: 1, every: 5, start: 10, end: 20 }],
    });
    expect(s.map((e) => e.time)).toEqual([10, 15]);
  });

  it("merges and sorts groups", () => {
    const s = buildSpawnSchedule({
      wave: 1,
      groups: [
        { enemy: "pea", count: 1, every: 7, start: 0, end: 15 },
        { enemy: "pepper", count: 1, every: 5, start: 1, end: 12 },
      ],
    });
    expect(s.map((e) => e.time)).toEqual([0, 1, 6, 7, 11, 14]);
  });
});

describe("advanceCursor", () => {
  const schedule = [0, 0.5, 1.0].map((time) => ({ time, enemy: "pea", count: 1 }));

  it("fires each event exactly once across frames, incl. t=0 and zero-length frames", () => {
    let cursor = 0;
    const fired: number[] = [];
    for (const t of [0.0001, 0.0001, 0.3, 0.5, 0.51, 0.51, 1.01, 2]) {
      const next = advanceCursor(schedule, cursor, t);
      for (let i = cursor; i < next; i++) fired.push(schedule[i].time);
      cursor = next;
    }
    expect(fired).toEqual([0, 0.5, 1.0]);
  });

  it("end boundary is exclusive", () => {
    expect(advanceCursor(schedule, 0, 0.5)).toBe(1);
    expect(advanceCursor(schedule, 1, 0.5)).toBe(1);
    expect(advanceCursor(schedule, 1, 0.5001)).toBe(2);
  });

  it("handles an empty schedule", () => {
    expect(advanceCursor([], 0, 10)).toBe(0);
  });
});

describe("scaleEnemy", () => {
  it("scales hp 25% and damage 15% per wave, rounded", () => {
    expect(scaleEnemy({ hp: 20, damage: 4 }, 1)).toEqual({ hp: 20, damage: 4 });
    expect(scaleEnemy({ hp: 20, damage: 4 }, 5)).toEqual({ hp: 40, damage: 6 });
  });
});

describe("waves.json", () => {
  it("every wave is valid", () => {
    const { waves } = wavesJson;
    expect(waves.map((w) => w.wave)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const w of waves) {
      for (const g of w.groups) {
        expect(Object.keys(enemies)).toContain(g.enemy);
        expect(g.every).toBeGreaterThan(0);
      }
    }
  });
});

describe("shakeOnKill flag", () => {
  it("is set only on the potato", () => {
    const flagged = Object.values(enemies).filter((e) => (e as { shakeOnKill?: boolean }).shakeOnKill);
    expect(flagged.map((e) => e.id)).toEqual(["potato"]);
  });
});
