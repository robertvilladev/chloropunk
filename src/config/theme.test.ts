import { describe, expect, it } from "vitest";
import { DAMAGE_NUMBER, FONTS, THEME_CSS, numberStroke } from "./theme";

describe("type", () => {
  it("has only Bungee and Plex Mono", () => {
    expect(Object.keys(FONTS).sort()).toEqual(["display", "ui"]);
  });

  it("Bungee numbers get a 3 px ink stroke from 24 px up, 2 px below", () => {
    expect(numberStroke(12)).toBe(2);
    expect(numberStroke(23)).toBe(2);
    expect(numberStroke(24)).toBe(3);
    expect(numberStroke(40)).toBe(3);
  });
});

describe("damage numbers (board U1)", () => {
  it("normal hits are white Bungee 16 with a 2 px ink stroke", () => {
    expect(DAMAGE_NUMBER.normal).toMatchObject({ fontFamily: FONTS.display, fontSize: "16px", color: THEME_CSS.text, stroke: THEME_CSS.deep, strokeThickness: 2 });
  });

  it("crits are amber, bigger, thicker and pop", () => {
    expect(DAMAGE_NUMBER.crit).toMatchObject({ fontFamily: FONTS.display, fontSize: "22px", color: THEME_CSS.tier[3], stroke: THEME_CSS.deep, strokeThickness: 3 });
    expect(DAMAGE_NUMBER.crit.pop).toBeGreaterThan(1);
    expect(DAMAGE_NUMBER.normal.pop).toBe(1);
  });
});
