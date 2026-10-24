import { describe, expect, it } from "vitest";
import type { Vector2 } from "@/types";
import enemies from "@assets/data/enemies.json";
import wavesJson from "@assets/data/waves.json";
import {
  buildSpawnSchedule,
  advanceCursor,
  edgePoint,
  offscreenPoint,
  scaleEnemy,
  waveDuration,
} from "./waves";

describe("waveDuration", () => {
  it("starts at 32 s, grows 2 s per wave and caps at 60", () => {
    expect(waveDuration(1)).toBe(32);
    expect(waveDuration(5)).toBe(40);
    expect(waveDuration(9)).toBe(48);
    expect(waveDuration(15)).toBe(60);
    expect(waveDuration(20)).toBe(60);
  });
});

describe("buildSpawnSchedule", () => {
  it("expands a group", () => {
    const s = buildSpawnSchedule({
      wave: 1,
      groups: [{ enemy: "pea", count: 3, every: 2, start: 0 }],
    });
    expect(s.map((e) => e.time)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]); // 32 s wave
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
  it("scales hp quadratically and damage linearly per wave, rounded", () => {
    const k = { hp: 0.3, hpQuad: 0.07, damage: 0.15 };
    expect(scaleEnemy({ hp: 20, damage: 4 }, 1, k)).toEqual({ hp: 20, damage: 4 });
    expect(scaleEnemy({ hp: 20, damage: 4 }, 5, k)).toEqual({ hp: 66, damage: 6 });
    expect(scaleEnemy({ hp: 20, damage: 4 }, 5)).toEqual(scaleEnemy({ hp: 20, damage: 4 }, 5, wavesJson.scaling));
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

describe("edgePoint", () => {
  const far = { x: -10000, y: -10000 };
  it("is on the inset rectangle", () => {
    for (let i = 0; i < 10; i++) {
      const p = edgePoint(i / 10, far, 800, 600, 40, 160);
      const onX = p.x === 40 || p.x === 760;
      const onY = p.y === 40 || p.y === 560;
      expect(onX || onY).toBe(true);
    }
  });

  it("keeps minDist from the player", () => {
    for (let gx = 0; gx < 9; gx++) {
      for (let gy = 0; gy < 9; gy++) {
        const player = { x: (gx / 8) * 800, y: (gy / 8) * 600 };
        for (let i = 0; i < 50; i++) {
          const p = edgePoint(i / 50, player, 800, 600, 40, 160);
          expect(Math.hypot(p.x - player.x, p.y - player.y)).toBeGreaterThanOrEqual(160);
        }
      }
    }
  });
});

describe("offscreenPoint", () => {
  const arena = { w: 1600, h: 1200 };
  const M = 50;
  // the camera clamps to the arena, like followView
  const viewAt = (px: number, py: number) => ({
    x: Math.min(Math.max(px - 400, 0), arena.w - 800),
    y: Math.min(Math.max(py - 300, 0), arena.h - 600),
    width: 800,
    height: 600,
  });
  const offView = (p: Vector2, v: ReturnType<typeof viewAt>) =>
    p.x <= v.x - M || p.x >= v.x + v.width + M || p.y <= v.y - M || p.y >= v.y + v.height + M;
  const inArena = (p: Vector2) => p.x >= 40 && p.x <= arena.w - 40 && p.y >= 40 && p.y <= arena.h - 40;

  it("lies a margin outside the view, inside the arena and >= minDist away, wherever the player stands", () => {
    for (let gx = 0; gx <= 16; gx++) {
      for (let gy = 0; gy <= 12; gy++) {
        const player = { x: (gx / 16) * arena.w, y: (gy / 12) * arena.h };
        const v = viewAt(player.x, player.y);
        for (let i = 0; i < 40; i++) {
          const p = offscreenPoint(i / 40, player, v, arena, M, 40, 160);
          expect(offView(p, v)).toBe(true);
          expect(inArena(p)).toBe(true);
          expect(Math.hypot(p.x - player.x, p.y - player.y)).toBeGreaterThanOrEqual(160);
        }
      }
    }
  });

  it("centred player: on the ring 50 px outside the view", () => {
    const v = viewAt(800, 600);
    const p = offscreenPoint(0.1, { x: 800, y: 600 }, v, arena, M, 40, 160);
    expect(p).toEqual({ x: 350 + 0.1 * 3200, y: 250 }); // top side starts at the ring's top-left
  });

  it("arena no bigger than the view: same points as edgePoint", () => {
    const small = { w: 800, h: 600 };
    const v = { x: 0, y: 0, width: 800, height: 600 };
    const player = { x: 400, y: 300 };
    for (let i = 0; i < 20; i++) {
      expect(offscreenPoint(i / 20, player, v, small, M, 40, 160)).toEqual(edgePoint(i / 20, player, 800, 600, 40, 160));
    }
  });

  it("is deterministic for equal u", () => {
    const v = viewAt(100, 100);
    expect(offscreenPoint(0.37, { x: 100, y: 100 }, v, arena, M, 40, 160)).toEqual(
      offscreenPoint(0.37, { x: 100, y: 100 }, v, arena, M, 40, 160)
    );
  });
});
