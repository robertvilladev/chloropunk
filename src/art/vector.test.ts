// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { FRAMES, SPRITE_META, svg, type SpriteKey } from "./vector";

const KEYS = Object.keys(SPRITE_META) as SpriteKey[];
const ACTORS = KEYS.filter((k) => k !== "pickup_scrap");
const all = KEYS.flatMap((k) => FRAMES[k].map((f) => ({ k, f, s: svg(k, f) })));

describe("vector sprites", () => {
  it("every key and frame builds an svg at 2x", () => {
    expect(all.length).toBe(20);
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

  it("stays inside the size budget", () => {
    const total = all.reduce((n, { s }) => n + s.length, 0);
    expect(total).toBeLessThan(300 * 1024);
    for (const { k, f, s } of all) expect(s.length, `${k}@${f}`).toBeLessThan(16 * 1024);
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
