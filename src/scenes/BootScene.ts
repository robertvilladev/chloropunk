import { SCENE_KEYS, GAME_CONFIG } from "@/config/constants";
import { buildFxTextures, buildSpriteTextures, preloadSprites, registerAnimations } from "@/art/textures";
import { FONTS, THEME, THEME_CSS } from "@/config/theme";
import { loadSettings } from "@/core/settings";
import { initMusic } from "@/fx/music";
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

    preloadSprites(this);
    this.loadPlaceholderAssets();
  }

  create() {
    console.log("✓ BootScene: Assets loaded");
    buildSpriteTextures(this);
    buildFxTextures(this);
    registerAnimations(this);
    this.sound.volume = loadSettings().masterVolume;
    initSfx(this.sound);
    initMusic(this.sound);

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

  /** Spawn telegraph and the particle pixel; sprites, weapons and projectiles are vector art (src/art/vector.ts). */
  private createPlaceholderSprites() {
    const g = this.add.graphics();
    if (!this.textures.exists("spawn_telegraph")) {
      // danger ring + cross, lighter halo so it still reads on Canvas
      g.lineStyle(4, THEME.text, 0.35);
      g.strokeCircle(21, 21, 16);
      g.lineStyle(2, THEME.danger);
      g.strokeCircle(21, 21, 16);
      g.lineBetween(11, 11, 31, 31);
      g.lineBetween(31, 11, 11, 31);
      g.generateTexture("spawn_telegraph", 42, 42);
    }
    // White pixel for tinted particles
    if (!this.textures.exists("pixel")) {
      g.clear();
      g.fillStyle(THEME.text);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture("pixel", 4, 4);
    }
    g.destroy();
  }
}
