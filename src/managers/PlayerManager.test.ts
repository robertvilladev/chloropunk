import { describe, expect, it, vi } from "vitest";
import { BASE_STATS } from "@/core/stats";
import { seqRng } from "@/core/testRng";
import { PlayerManager } from "./PlayerManager";

// PlayerManager only uses Phaser through the scene it is given
vi.mock("phaser", () => ({ default: {} }));

function makePlayer(dodge: number, rollValue: number) {
  const emitted: string[] = [];
  const later: (() => void)[] = [];
  // no setTint: the Canvas renderer can't draw tints, so the hurt flash must be the baked "hit" frame
  const sprite = {
    active: true, frame: { name: "walk0" }, anims: { paused: false, currentFrame: { textureFrame: "walk1" }, pause() { this.paused = true; }, resume() { this.paused = false; } },
    setCollideWorldBounds: () => sprite, setDepth: () => sprite, setScale: () => sprite, play() {},
    setFrame(f: string) { sprite.frame = { name: f }; return sprite; },
    body: { setSize() { return this; }, setOffset() { return this; } },
  };
  const scene = {
    events: { emit: (name: string) => emitted.push(name) },
    time: { delayedCall: (_ms: number, fn: () => void) => later.push(fn) },
    physics: { add: { sprite: () => sprite } },
  };
  const rng = seqRng(rollValue);
  const pm = new PlayerManager(scene as never);
  pm.create({ ...BASE_STATS, dodge }, rng);
  return { pm, rng, emitted, sprite, later };
}

describe("PlayerManager.takeDamage", () => {
  it("a dodge grants invulnerability, so contact on the next frame doesn't re-roll", () => {
    const { pm, rng, emitted } = makePlayer(60, 0); // roll 0 < 0.6: dodge
    pm.takeDamage(10);
    pm.takeDamage(10); // same contact, next physics step
    expect(rng.draws).toBe(1);
    expect(pm.getHealth()).toBe(100);
    expect(emitted.filter((e) => e === "playerDodged")).toHaveLength(1);
  });

  it("with no dodge, damage lands without an RNG draw", () => {
    const { pm, rng } = makePlayer(0, 0);
    pm.takeDamage(10);
    expect(pm.getHealth()).toBe(90);
    expect(rng.draws).toBe(0);
  });
});

describe("PlayerManager hurt flash", () => {
  it("shows the baked hit frame, then goes back to walking", () => {
    const { pm, sprite, later } = makePlayer(0, 0);
    pm.takeDamage(10);
    expect(sprite.frame.name).toBe("hit");
    expect(sprite.anims.paused).toBe(true);
    later.forEach((fn) => fn());
    expect(sprite.anims.paused).toBe(false);
    expect(sprite.frame.name).toBe("walk1");
  });
});
