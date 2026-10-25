import { describe, expect, it, vi } from "vitest";
import { BASE_STATS } from "@/core/stats";
import { seqRng } from "@/core/testRng";
import { SPRITE_META, type SpriteKey } from "@/art/vector";
import { WeaponManager } from "./WeaponManager";
import type { OwnedWeapon } from "@/types";

// WeaponManager only uses Phaser through the scene it is given
vi.mock("phaser", () => ({ default: {} }));

type Img = { key: string; frame?: string; last: Record<string, unknown[]> };
/** Image double: records the last arguments of every setter and returns itself. */
function image(key: string, frame?: string): Img {
  const t: Img = { key, frame, last: {} };
  const p: unknown = new Proxy(t, {
    get: (o, prop: string) => (prop in o ? o[prop as keyof Img] : (...a: unknown[]) => { o.last[prop] = a; return p; }),
  });
  return p as Img;
}

function makeWeapons(weapons: OwnedWeapon[]) {
  const images: Img[] = [];
  const scene = {
    add: { image: (_x: number, _y: number, key: string, frame?: string) => { const i = image(key, frame); images.push(i); return i; } },
    physics: { add: { group: () => ({ children: { entries: [] }, get: () => null }), overlap() {} } },
  };
  const wm = new WeaponManager(scene as never);
  wm.create({ weapons, stats: BASE_STATS, rng: seqRng(0.99), enemyGroup: {} as never, hit: () => {}, juice: {} as never });
  return { wm, images };
}

const pea = (x: number, y: number) => ({ x, y, active: true, getData: () => ({ radius: 12 }) }) as never;

describe("WeaponManager sprites", () => {
  it("shows each weapon with its tier frame, pivoting on the grip", () => {
    const { images } = makeWeapons([{ id: "pistol", tier: 3 }, { id: "laser", tier: 1 }]);
    const pistol = images.find((i) => i.key === "weapon_pistol")!;
    expect(pistol.frame).toBe("t3");
    expect(images.find((i) => i.key === "weapon_laser")!.frame).toBe("t1");
    const m = SPRITE_META["weapon_pistol" as SpriteKey];
    expect(pistol.last.setScale).toEqual([0.5]);
    expect(pistol.last.setOrigin).toEqual([m.px! / m.w, m.py! / m.h]);
  });

  it("flips a weapon aiming left so it stays upright", () => {
    const { wm, images } = makeWeapons([{ id: "pistol", tier: 1 }]);
    const pistol = images.find((i) => i.key === "weapon_pistol")!;
    const m = SPRITE_META["weapon_pistol" as SpriteKey];
    wm.update(1, { x: 0, y: 0 }, [pea(-100, 0)]);
    expect(pistol.last.setFlipY).toEqual([true]);
    expect(pistol.last.setOrigin).toEqual([m.px! / m.w, 1 - m.py! / m.h]);
    wm.update(1, { x: 0, y: 0 }, [pea(100, 0)]);
    expect(pistol.last.setFlipY).toEqual([false]);
  });

  it("draws the laser as a beam sprite reaching the weapon's range", () => {
    const { wm, images } = makeWeapons([{ id: "laser", tier: 1 }]);
    wm.update(5000, { x: 0, y: 0 }, [pea(100, 0)]);
    const beam = images.find((i) => i.key === "fx_beam")!;
    expect(beam.last.setVisible).toEqual([true]);
    expect(beam.last.setDisplaySize).toEqual([360, 10]); // laser range 360, width 10
  });
});
