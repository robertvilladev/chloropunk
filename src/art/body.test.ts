import { describe, expect, it, vi } from "vitest";
import { ART_SCALE, fitBox, fitCircle, frameSize } from "./body";
import { SPRITE_META, type SpriteKey } from "./vector";
import enemies from "@assets/data/enemies.json";
import { SPAWN_MARGIN } from "@/managers/EnemyManager";

// EnemyManager only uses Phaser through the scene it is given
vi.mock("phaser", () => ({ default: {} }));

/** Records the last scale, circle, size and offset set on a sprite and its body. */
function fake() {
  const rec = { scale: 0, circle: [0, 0, 0], size: [0, 0], offset: [0, 0] };
  const body = {
    setCircle: (r: number, x: number, y: number) => { rec.circle = [r, x, y]; return body; },
    setSize: (w: number, h: number) => { rec.size = [w, h]; return body; },
    setOffset: (x: number, y: number) => { rec.offset = [x, y]; return body; },
  };
  const s = { body, setScale: (v: number) => { rec.scale = v; return s; } };
  return { s: s as unknown as Phaser.Physics.Arcade.Sprite, rec };
}

describe("frameSize", () => {
  it("is design px times ART_SCALE", () => {
    expect(ART_SCALE).toBe(2);
    expect(frameSize("enemy_potato")).toEqual({ w: 136, h: 120 });
  });
});

describe("fitCircle", () => {
  it("centres the circle on the body centre, inside the frame", () => {
    for (const e of Object.values(enemies)) {
      const key = e.sprite as SpriteKey;
      const { cx, cy } = SPRITE_META[key];
      const { s, rec } = fake();
      fitCircle(s, key, e.radius);
      const [r, ox, oy] = rec.circle;
      expect(rec.scale, key).toBe(0.5);
      expect(r, key).toBe(e.radius * 2);
      expect(ox + r, key).toBe(cx * 2);
      expect(oy + r, key).toBe(cy * 2);
      const f = frameSize(key);
      expect(ox, key).toBeGreaterThanOrEqual(0);
      expect(oy, key).toBeGreaterThanOrEqual(0);
      expect(ox + 2 * r, key).toBeLessThanOrEqual(f.w);
      expect(oy + 2 * r, key).toBeLessThanOrEqual(f.h);
    }
  });

  it("sets scale and circle on every call (recycled sprites)", () => {
    const { s, rec } = fake();
    fitCircle(s, "enemy_potato", 26);
    rec.scale = 1;
    fitCircle(s, "enemy_pea", 12);
    expect(rec.scale).toBe(0.5);
    expect(rec.circle).toEqual([24, 16, 20]);
  });
});

describe("fitBox", () => {
  it("centres the player box on the body centre", () => {
    const { s, rec } = fake();
    fitBox(s, "player", 32, 32);
    expect(rec.scale).toBe(0.5);
    expect(rec.size).toEqual([64, 64]);
    expect(rec.offset).toEqual([48 - 32, 64 - 32]);
    expect(rec.offset[1] + 64).toBeLessThanOrEqual(frameSize("player").h);
  });
});

describe("hit areas", () => {
  it("radii follow the owner's sizes", () => {
    const r = Object.fromEntries(Object.values(enemies).map((e) => [e.id, e.radius]));
    expect(r).toMatchObject({ pea: 12, pepper: 14, carrot: 15, tomato: 17, potato: 26 });
  });

  it("SPAWN_MARGIN covers the largest enemy plus the group spread", () => {
    const max = Math.max(...Object.values(enemies).map((e) => e.radius));
    expect(SPAWN_MARGIN).toBeGreaterThanOrEqual(max + 24);
  });
});
