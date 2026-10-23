import { SCENE_KEYS, GAME_CONFIG } from "@/config/constants";
import { buildActorTextures, buildFxTextures, buildPickupTextures, registerAnimations } from "@/art/textures";
import { FONTS, THEME, THEME_CSS } from "@/config/theme";
import { initSfx } from "@/fx/sfx";
import { FONT_SPECS, loadFonts } from "./fonts";
import Phaser from "phaser";

/**
 * BootScene - Handles initial asset loading
 * This scene runs first and loads all game assets
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload() {
    // Create loading bar
    this.createLoadingBar();

    this.loadPlaceholderAssets();
  }

  create() {
    console.log("✓ BootScene: Assets loaded");
    buildActorTextures(this);
    buildPickupTextures(this);
    buildFxTextures(this);
    registerAnimations(this);
    initSfx(this.sound);

    // Canvas text can't trigger webfont loads; wait (max 3s) so Bungee never falls back to Impact
    void loadFonts(document.fonts, FONT_SPECS, 3000).then(() => this.scene.start(SCENE_KEYS.MENU));
  }

  private createLoadingBar() {
    const width = GAME_CONFIG.WIDTH;
    const height = GAME_CONFIG.HEIGHT;

    // Loading text
    const loadingText = this.add.text(
      width / 2,
      height / 2 - 50,
      "Loading...",
      {
        fontFamily: FONTS.ui,
        fontSize: "32px",
        color: THEME_CSS.text,
      }
    );
    loadingText.setOrigin(0.5);

    // Progress bar background
    const progressBox = this.add.graphics();
    progressBox.fillStyle(THEME.surface2, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 10, 320, 30);

    // Progress bar
    const progressBar = this.add.graphics();

    // Loading events
    this.load.on("progress", (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(THEME.lime, 1);
      progressBar.fillRect(width / 2 - 150, height / 2, 300 * value, 10);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  private loadPlaceholderAssets() {
    this.createPlaceholderSprites();
  }

  private createPlaceholderSprites() {
    const g = this.add.graphics();
    // Lighter 1px halo baked around each shape so it still reads as neon on Canvas (bloom adds more on WebGL).
    const bake = (key: string, w: number, h: number, color: number, draw: (x: number, y: number, pad: number) => void) => {
      if (this.textures.exists(key)) return;
      g.clear();
      g.fillStyle(THEME.text, 0.35);
      draw(0, 0, 1);
      g.fillStyle(color);
      draw(1, 1, 0);
      g.generateTexture(key, w + 2, h + 2);
    };
    const circle = (r: number) => (x: number, y: number, pad: number) => g.fillCircle(x + r + pad, y + r + pad, r + pad);
    const rect = (w: number, h: number) => (x: number, y: number, pad: number) =>
      g.fillRect(x, y, w + 2 * pad, h + 2 * pad);

    this.createEnemyTextures(g, bake, circle);

    bake("projectile_basic", 8, 8, THEME.tier[1], circle(4));
    bake("proj_pellet", 6, 6, THEME.tier[3], circle(3));
    bake("proj_rocket", 10, 6, THEME.danger, rect(10, 6));

    // Weapons (sit around the player); no icons, just coloured bars
    const weaponColors: Record<string, number> = {
      pistol: THEME.tier[1],
      shotgun: THEME.tier[3],
      laser: THEME.lime,
      blade: THEME.text,
      drone: THEME.pink,
      rocket: THEME.danger,
    };
    for (const [id, color] of Object.entries(weaponColors)) bake(`weapon_${id}`, 12, 6, color, rect(12, 6));

    // White pixel for tinted particles
    if (!this.textures.exists("pixel")) {
      g.clear();
      g.fillStyle(THEME.text);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture("pixel", 4, 4);
    }
    g.destroy();
  }

  /** Enemy bolt and spawn telegraph (enemy bodies are pixel art, see src/art/textures.ts). */
  private createEnemyTextures(
    g: Phaser.GameObjects.Graphics,
    bake: (key: string, w: number, h: number, color: number, draw: (x: number, y: number, pad: number) => void) => void,
    circle: (r: number) => (x: number, y: number, pad: number) => void
  ) {
    bake("enemy_bolt", 8, 8, THEME.tier[1], circle(4));

    // Spawn telegraph (danger ring + cross)
    if (this.textures.exists("spawn_telegraph")) return;
    g.clear();
    g.lineStyle(4, THEME.text, 0.35);
    g.strokeCircle(21, 21, 16);
    g.lineStyle(2, THEME.danger);
    g.strokeCircle(21, 21, 16);
    g.lineBetween(11, 11, 31, 31);
    g.lineBetween(31, 11, 11, 31);
    g.generateTexture("spawn_telegraph", 42, 42);
  }
}
