import { describe, expect, it, vi } from "vitest";
import { BASE_STATS } from "@/core/stats";
import { seqRng } from "@/core/testRng";
import { PlayerManager } from "./PlayerManager";

// PlayerManager only uses Phaser through the scene it is given
vi.mock("phaser", () => ({ default: {} }));

function makePlayer(dodge: number, rollValue: number) {
  const emitted: string[] = [];
  const sprite = { setCollideWorldBounds: () => sprite, setDepth: () => sprite, setTint() {}, clearTint() {} };
  const scene = {
    events: { emit: (name: string) => emitted.push(name) },
    time: { delayedCall() {} },
    physics: { add: { sprite: () => sprite } },
  };
  const rng = seqRng(rollValue);
  const pm = new PlayerManager(scene as never);
  pm.create({ ...BASE_STATS, dodge }, rng);
  return { pm, rng, emitted };
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
