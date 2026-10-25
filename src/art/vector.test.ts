// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ACTOR_KEYS, BOSS_FRAMES, BOSS_KEYS, FRAMES, SPRITE_META, WEAPON_IDS, svg, weaponFrame, type SpriteKey } from "./vector";

const KEYS = Object.keys(SPRITE_META) as SpriteKey[];
const ACTORS = ACTOR_KEYS;
const all = KEYS.flatMap((k) => FRAMES[k].map((f) => ({ k, f, s: svg(k, f) })));

describe("vector sprites", () => {
  it("every key and frame builds an svg at 2x", () => {
    expect(all.length).toBe(78); // + 3 tells, 3 bosses x 6 poses, 5 boss projectiles
    for (const { k, f, s } of all) {
      const { w, h } = SPRITE_META[k];
      expect(s.startsWith("<svg"), `${k}@${f}`).toBe(true);
      expect(s).toContain(`viewBox="0 0 ${w} ${h}"`);
      expect(s).toContain(`width="${2 * w}"`);
      expect(s).toContain(`height="${2 * h}"`);
    }
  });

  it("svgs parse", () => {
    for (const { k, f, s } of all) {
      const doc = new DOMParser().parseFromString(s, "image/svg+xml");
      expect(doc.getElementsByTagName("parsererror").length, `${k}@${f}`).toBe(0);
    }
  });

  it("ids are unique inside one svg", () => {
    for (const { k, f, s } of all) {
      const ids = [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size, `${k}@${f}`).toBe(ids.length);
    }
  });

  it("is plain ASCII (btoa in svgUri)", () => {
    for (const { k, f, s } of all) expect(/^[ -~]*$/.test(s), `${k}@${f}`).toBe(true);
  });

  it("has no external references", () => {
    for (const { s } of all) {
      expect(s).not.toContain("href=");
      expect(s).not.toContain("url(http");
    }
  });

  it("hit and walk1 differ from walk0 for every actor", () => {
    for (const k of ACTORS) {
      expect(svg(k, "hit"), k).not.toBe(svg(k, "walk0"));
      expect(svg(k, "walk1"), k).not.toBe(svg(k, "walk0"));
    }
    expect(svg("pickup_scrap", "1")).not.toBe(svg("pickup_scrap", "0"));
  });

  it("pepper, carrot and tomato have a tell frame that differs from walk0 (board A2)", () => {
    for (const k of ["enemy_pepper", "enemy_carrot", "enemy_tomato"] as const) {
      expect(FRAMES[k], k).toContain("tell");
      expect(svg(k, "tell"), k).not.toBe(svg(k, "walk0"));
    }
    for (const k of ["player", "enemy_pea", "enemy_potato"] as const) expect(FRAMES[k], k).not.toContain("tell");
  });

  it("every boss has six distinct poses (board A3)", () => {
    expect(BOSS_KEYS).toEqual(["boss_harvester", "boss_onion", "boss_greenhouse"]);
    expect(BOSS_FRAMES).toEqual(["idle0", "idle1", "hit", "volley", "charge", "lob"]);
    for (const k of BOSS_KEYS) {
      expect(FRAMES[k], k).toEqual(BOSS_FRAMES);
      expect(new Set(BOSS_FRAMES.map((f) => svg(k, f))).size, k).toBe(6);
    }
  });

  it("the three bosses share one body: same frame, feet and centre", () => {
    const [a, ...rest] = BOSS_KEYS.map((k) => SPRITE_META[k]);
    for (const m of rest) expect(m).toEqual(a);
  });

  it("boss projectiles build", () => {
    for (const k of ["bproj_round", "bproj_shard", "bproj_cbolt", "bproj_tomato", "bproj_bulb"] as const) expect(FRAMES[k], k).toEqual(["0"]);
  });

  it("stays inside the size budget", () => {
    const total = all.reduce((n, { s }) => n + s.length, 0);
    expect(total).toBeLessThan(700 * 1024);
    // bosses are 160 px with many parts: their own per-frame budget
    for (const { k, f, s } of all) expect(s.length, `${k}@${f}`).toBeLessThan((k.startsWith("boss_") ? 24 : 16) * 1024);
  });

  it("every weapon has four tier frames that differ", () => {
    expect(WEAPON_IDS).toEqual(["pistol", "shotgun", "laser", "blade", "drone", "rocket"]);
    for (const id of WEAPON_IDS) {
      const key = `weapon_${id}` as SpriteKey;
      expect(FRAMES[key], key).toEqual(["t1", "t2", "t3", "t4"]);
      expect(new Set(FRAMES[key].map((f) => svg(key, f))).size, key).toBe(4);
    }
    expect([1, 2, 3, 4].map((t) => weaponFrame(t as 1 | 2 | 3 | 4))).toEqual(["t1", "t2", "t3", "t4"]);
  });

  it("weapon grip pivots sit inside the frame", () => {
    for (const id of WEAPON_IDS) {
      const m = SPRITE_META[`weapon_${id}` as SpriteKey];
      expect(m.px! > 0 && m.px! < m.w && m.py! > 0 && m.py! < m.h, id).toBe(true);
    }
  });

  it("the laser beam tile has no keyline, so tiles join without seams", () => {
    expect(svg("fx_beam", "0")).not.toContain("filter=");
    expect(svg("projectile_basic", "0")).toContain('filter="url(#st)"');
  });

  it("body centre sits inside the frame", () => {
    for (const k of KEYS) {
      const m = SPRITE_META[k];
      expect(m.cx).toBeGreaterThan(0);
      expect(m.cx).toBeLessThan(m.w);
      expect(m.cy).toBeLessThan(m.feet);
      expect(m.feet).toBeLessThanOrEqual(m.h);
    }
  });
});
