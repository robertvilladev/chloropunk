import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({ default: { Scene: class {} } }));
const sfx = vi.fn();
vi.mock("@/fx/sfx", () => ({ sfx: (n: string) => sfx(n) }));
vi.mock("@/fx/music", () => ({ setMusic: () => {} }));
const pop = vi.fn();
vi.mock("./ui", () => ({ legendaryPop: (...a: unknown[]) => pop(...a) }));

const { LevelUpScene } = await import("./LevelUpScene");
const { newRun } = await import("@/core/run");

function scene(tier: 1 | 2 | 3 | 4) {
  const s = Object.create(LevelUpScene.prototype) as InstanceType<typeof LevelUpScene> & Record<string, unknown>;
  const run = newRun(1, "pistol");
  run.pendingLevelUps = 1;
  const go = vi.fn();
  Object.assign(s, {
    run,
    choices: [{ stat: "damage", tier, amount: 16 }],
    offered: [],
    rerolls: 0,
    picked: false,
    scene: { restart: go, start: go },
    time: { delayedCall: (_ms: number, fn: () => void) => fn() },
  });
  return { s, run, go };
}

describe("LevelUpScene.pick", () => {
  beforeEach(() => {
    sfx.mockClear();
    pop.mockClear();
  });

  it("a T4 pick plays the legendary sound and effect once and applies once", () => {
    const { s, run, go } = scene(4);
    (s as unknown as { pick(i: number): void }).pick(0);
    (s as unknown as { pick(i: number): void }).pick(0);
    expect(sfx.mock.calls.filter(([n]) => n === "legendary")).toHaveLength(1);
    expect(pop).toHaveBeenCalledTimes(1);
    expect(run.levelMods.damage).toBe(16);
    expect(run.log.levelups).toHaveLength(1);
    expect(go).toHaveBeenCalledTimes(1);
  });

  it("a lower tier pick plays no legendary effect", () => {
    const { s } = scene(2);
    (s as unknown as { pick(i: number): void }).pick(0);
    expect(sfx).not.toHaveBeenCalledWith("legendary");
    expect(pop).not.toHaveBeenCalled();
  });
});
