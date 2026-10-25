import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({ default: { Math: { DegToRad: (d: number) => (d * Math.PI) / 180 } } }));
vi.mock("@/fx/sfx", () => ({ sfx: () => {} }));
const { fitImage } = await import("./ui");

/** Fake scene whose images report a texture size; records the scale fitImage sets. */
function scene(w: number, h: number) {
  const img = { width: w, height: h, scale: 1, setAngle: () => img, setScale: (s: number) => ((img.scale = s), img) };
  return { s: { add: { image: () => img } } as unknown as Phaser.Scene, img };
}

describe("fitImage", () => {
  it("fits the art's longest side to the box", () => {
    const { s, img } = scene(128, 128);
    fitImage(s, 0, 0, { key: "icon" }, 48);
    expect(img.scale).toBeCloseTo(48 / 128);
  });

  // UI art is baked at 4x design px; at RENDER_SCALE 2, scale 0.5 is one texture px per device px
  it("never stretches art past one texture pixel per device pixel", () => {
    const { s, img } = scene(96, 56); // pistol at 4x design
    fitImage(s, 0, 0, { key: "ui_weapon_pistol_t1" }, 96);
    expect(img.scale).toBe(0.5);
  });
});
