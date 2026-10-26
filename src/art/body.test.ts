import { describe, expect, it, vi } from "vitest";
import { ART_SCALE, bobCircle, feetOffset, fitBox, fitCircle, frameSize } from "./body";
import { SPRITE_META, type SpriteKey } from "./vector";
import enemies from "@assets/data/enemies.json";
import { SPAWN_MARGIN } from "@/managers/EnemyManager";
import { HIT_SIZE } from "@/config/constants";

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

describe("projectile hit boxes", () => {
  it("keep their sizes from before the art refresh", () => {
    expect(HIT_SIZE).toEqual({ projectile_basic: [8, 8], enemy_bolt: [8, 8], proj_pellet: [6, 6], proj_rocket: [10, 6] });
  });

  it("are centred inside the bigger projectile frames", () => {
    for (const [key, [w, h]] of Object.entries(HIT_SIZE) as [SpriteKey, [number, number]][]) {
      const { s, rec } = fake();
      fitBox(s, key, w, h);
      const f = frameSize(key);
      expect(rec.scale, key).toBe(0.5);
      expect(rec.size, key).toEqual([w * 2, h * 2]);
      expect(rec.offset[0] * 2 + w * 2, key).toBeCloseTo(f.w);
      expect(rec.offset[1] * 2 + h * 2, key).toBeCloseTo(f.h);
    }
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

describe("feetOffset", () => {
  it("is the design px from the sprite centre down to the feet", () => {
    expect(feetOffset("enemy_pea")).toBe(16);
    expect(feetOffset("enemy_potato")).toBe(28);
    expect(feetOffset("player")).toBe(22);
  });
});

/** Sprite + body double that places the body the way Arcade does (Body.updateBounds / preUpdate). */
function arcade(key: SpriteKey) {
  const { w, h } = SPRITE_META[key];
  const body = {
    sourceWidth: 0, sourceHeight: 0, offset: { x: 0, y: 0 },
    setCircle(r: number, x: number, y: number) { this.sourceWidth = this.sourceHeight = r * 2; this.offset = { x, y }; return this; },
    setOffset(x: number, y: number) { this.offset = { x, y }; return this; },
  };
  const s = {
    x: 300, y: 200, flipX: false, scaleX: 1, scaleY: 1, displayOriginX: (w * ART_SCALE) / 2, displayOriginY: (h * ART_SCALE) / 2, body,
    setScale(x: number, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setDisplayOrigin(x: number, y: number) { this.displayOriginX = x; this.displayOriginY = y; return this; },
  };
  /** World circle (Arcade collides circles on centre + halfWidth) and the drawn feet. */
  const read = () => {
    const width = body.sourceWidth * s.scaleX, height = body.sourceHeight * s.scaleY;
    return {
      r: Math.floor(width / 2), rh: Math.floor(height / 2),
      cx: s.x + s.scaleX * (body.offset.x - s.displayOriginX) + Math.floor(width / 2),
      cy: s.y + s.scaleY * (body.offset.y - s.displayOriginY) + Math.floor(height / 2),
      feet: s.y + s.scaleY * (SPRITE_META[key].feet * ART_SCALE - s.displayOriginY),
    };
  };
  /** World x of the art centre: Phaser draws texture px u of a flipped frame where px (W - u) would be. */
  const artX = () => {
    const u = SPRITE_META[key].cx * ART_SCALE;
    return s.x + s.scaleX * ((s.flipX ? w * ART_SCALE - u : u) - s.displayOriginX);
  };
  return { s: s as unknown as Phaser.Physics.Arcade.Sprite, read, artX };
}

describe("bobCircle", () => {
  it("squashes and lifts the drawing about the feet but leaves the hit circle where fitCircle put it", () => {
    for (const e of Object.values(enemies)) {
      const key = e.sprite as SpriteKey;
      const { s, read } = arcade(key);
      fitCircle(s, key, e.radius);
      const rest = read();
      expect(rest.r, key).toBe(e.radius);
      for (const b of [{ sx: 1.075, sy: 0.93, dy: 0 }, { sx: 0.935, sy: 1.07, dy: -3 }, { sx: 0.2, sy: 0.2, dy: 0 }, { sx: 1, sy: 1, dy: 0 }]) {
        bobCircle(s, key, e.radius, b);
        const now = read();
        expect(now.r, `${key} r`).toBe(rest.r);
        expect(now.rh, `${key} rh`).toBe(rest.r);
        expect(now.cx, `${key} cx`).toBeCloseTo(rest.cx, 6);
        expect(now.cy, `${key} cy`).toBeCloseTo(rest.cy, 6);
        expect(now.feet, `${key} feet`).toBeCloseTo(rest.feet + b.dy, 6);
      }
    }
  });
});

describe("hit circle on a flipped sprite", () => {
  it("stays on the art centre facing either way (the carrot's art is off-centre)", () => {
    for (const e of Object.values(enemies)) {
      const key = e.sprite as SpriteKey;
      for (const flip of [false, true]) {
        const { s, read, artX } = arcade(key);
        s.flipX = flip;
        bobCircle(s, key, e.radius, { sx: 1, sy: 1, dy: 0 });
        expect(read().cx, `${key} flip ${flip}`).toBeCloseTo(artX(), 6);
      }
    }
  });
});
