import { describe, expect, it } from "vitest";
import { ACTORS } from "./actors";
import { ACTOR_FRAME, bodyOffset } from "./body";
import enemies from "@assets/data/enemies.json";

describe("bodyOffset", () => {
  it("centres enemy_pea on the frame", () => {
    const o = bodyOffset("enemy_pea", 14);
    expect(o.x + 14).toBe(ACTOR_FRAME.w / 2);
  });
  it("keeps every actor's circle inside the frame", () => {
    const radius: Record<string, number> = { player: 14 };
    for (const e of Object.values(enemies)) radius[e.sprite] = e.radius;
    for (const a of ACTORS) {
      const r = radius[a.key];
      const o = bodyOffset(a.key, r);
      expect(o.x, a.key).toBeGreaterThanOrEqual(0);
      expect(o.y, a.key).toBeGreaterThanOrEqual(0);
      expect(o.x + 2 * r, a.key).toBeLessThanOrEqual(ACTOR_FRAME.w);
      expect(o.y + 2 * r, a.key).toBeLessThanOrEqual(ACTOR_FRAME.h);
    }
  });
});
