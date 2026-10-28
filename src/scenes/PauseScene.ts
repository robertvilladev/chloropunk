import { GAME_CONFIG, SCENE_KEYS } from "@/config/constants";
import { THEME, THEME_CSS } from "@/config/theme";
import { stepIndex } from "@/core/menuNav";
import { nextVolume } from "@/core/music";
import { loadSettings, saveSettings, type Settings } from "@/core/settings";
import { duckMusic, setMusicVolume } from "@/fx/music";
import { setSfxVolume, sfx } from "@/fx/sfx";
import { button, num, onKeys, panel, scanlines, text } from "./ui";
import Phaser from "phaser";

type View = "main" | "settings" | "confirm";
type VolumeKey = "masterVolume" | "musicVolume" | "sfxVolume";
const PANEL_H = 400; // fits the 5-row settings view
interface Item {
  label: string;
  run: () => void;
  primary?: boolean;
}

/**
 * PauseScene - overlay on a paused GameScene + UIScene (both are paused by
 * GameScene.openPause). Views: main, settings, quit confirmation. Mouse and
 * keyboard (up/down + Enter; Esc backs out, P resumes). MenuScene launches it
 * with `{ fromMenu: true }` for settings only: BACK/Esc close it, no music duck.
 */
export class PauseScene extends Phaser.Scene {
  private view: View = "main";
  private items: Item[] = [];
  private buttons: Phaser.GameObjects.Container[] = [];
  private focus = 0;
  private body?: Phaser.GameObjects.Container;
  private fromMenu = false;

  constructor() {
    super({ key: SCENE_KEYS.PAUSE });
  }

  create(data?: { fromMenu?: boolean }) {
    const { WIDTH: width, HEIGHT: height } = GAME_CONFIG;
    this.fromMenu = data?.fromMenu === true;
    this.view = "main";
    this.scene.bringToTop();
    if (!this.fromMenu) duckMusic(true);
    // Dim the frozen arena; also swallows clicks so nothing underneath reacts
    this.add.rectangle(0, 0, width, height, THEME.bg, 0.7).setOrigin(0).setInteractive();
    scanlines(this);
    const pw = 420, ph = PANEL_H;
    panel(this, width / 2 - pw / 2, height / 2 - ph / 2, pw, ph, { frame: THEME.lime, shadow: THEME.pink });

    onKeys(this, (e) => {
      if (this.fromMenu && (e.code === "Escape" || e.code === "KeyP")) this.close();
      else if (e.code === "KeyP") this.resume();
      else if (e.code === "Escape") (this.view === "main" ? this.resume() : this.show("main"));
      else if (e.code === "ArrowUp" || e.code === "KeyW") this.moveFocus(-1);
      else if (e.code === "ArrowDown" || e.code === "KeyS") this.moveFocus(1);
      else if (e.code === "Enter" || e.code === "Space") {
        sfx("uiConfirm");
        this.items[this.focus]?.run();
      }
    });
    this.show(this.fromMenu ? "settings" : "main");
  }

  private show(view: View): void {
    this.view = view;
    this.body?.destroy();
    const { WIDTH: width, HEIGHT: height } = GAME_CONFIG;
    const cx = width / 2;
    const top = height / 2 - PANEL_H / 2;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (parts.push(o), o);

    let title = "PAUSED";
    let sub = "";
    if (view === "main") {
      this.items = [
        { label: "RESUME", run: () => this.resume(), primary: true },
        { label: "SETTINGS", run: () => this.show("settings") },
        { label: "QUIT RUN", run: () => this.show("confirm") },
      ];
    } else if (view === "settings") {
      title = "SETTINGS";
      const s = loadSettings();
      this.items = [
        { label: `REDUCED SHAKE: ${s.reducedShake ? "ON" : "OFF"}`, run: () => this.saveSetting({ reducedShake: !s.reducedShake }) },
        { label: `MASTER VOLUME: ${Math.round(s.masterVolume * 100)}%`, run: () => this.cycleVolume("masterVolume") },
        { label: `MUSIC VOLUME: ${Math.round(s.musicVolume * 100)}%`, run: () => this.cycleVolume("musicVolume") },
        { label: `SFX VOLUME: ${Math.round(s.sfxVolume * 100)}%`, run: () => this.cycleVolume("sfxVolume") },
        { label: "BACK", run: () => (this.fromMenu ? this.close() : this.show("main")), primary: true },
      ];
    } else {
      title = "QUIT RUN?";
      sub = "This run's progress will be lost.";
      this.items = [
        { label: "YES, QUIT", run: () => this.quit() },
        { label: "NO, KEEP PLAYING", run: () => this.show("main"), primary: true },
      ];
    }

    add(num(this, cx, top + 55, title, 40, view === "confirm" ? THEME_CSS.danger : THEME_CSS.lime).setOrigin(0.5));
    if (sub) add(text(this, cx, top + 100, sub, 14, THEME_CSS.textMuted).setOrigin(0.5));
    this.buttons = this.items.map((it, i) =>
      add(
        button(this, cx, top + 150 + i * (this.items.length > 3 ? 48 : 60), it.label, it.run, it.primary, true, {
          size: it.primary ? 20 : 14,
          font: it.primary ? "display" : "ui",
          w: 260,
          h: it.primary ? 48 : 40,
        })
      )
    );
    this.body = this.add.container(0, 0, parts);
    this.focus = view === "confirm" ? 1 : 0; // quit confirmation defaults to the safe NO
    this.applyFocus();
  }

  /** Reuse the button's own hover look as the keyboard focus ring. */
  private applyFocus(): void {
    this.buttons.forEach((b, i) => b.emit(i === this.focus ? "pointerover" : "pointerout"));
  }

  private moveFocus(dir: 1 | -1): void {
    this.focus = stepIndex(this.focus, this.items.length, dir);
    sfx("uiMove");
    this.applyFocus();
  }

  /** 0% → 100% in 20% steps, wrapping; master/SFX play a preview blip (music is ducked but audible). */
  private cycleVolume(key: VolumeKey): void {
    const next = nextVolume(loadSettings()[key]);
    if (key === "masterVolume") this.sound.volume = next;
    else if (key === "musicVolume") setMusicVolume(next);
    else setSfxVolume(next);
    this.saveSetting({ [key]: next });
    if (key !== "musicVolume") sfx("pickup");
  }

  /** Save a settings change and redraw the settings view, keeping focus. */
  private saveSetting(change: Partial<Settings>): void {
    saveSettings({ ...loadSettings(), ...change });
    const keep = this.focus;
    this.show("settings");
    this.focus = keep;
    this.applyFocus();
  }

  /** Menu mode: just remove the overlay; the menu underneath was never paused. */
  private close(): void {
    this.scene.stop();
  }

  private resume(): void {
    duckMusic(false);
    this.scene.resume(SCENE_KEYS.GAME);
    this.scene.resume(SCENE_KEYS.UI);
    this.scene.stop();
  }

  private quit(): void {
    this.scene.get(SCENE_KEYS.GAME).events.emit("runQuit"); // saves the run log
    this.scene.stop(SCENE_KEYS.UI);
    this.scene.stop(SCENE_KEYS.GAME); // paused underneath; stopping runs its cleanup
    this.scene.start(SCENE_KEYS.MENU); // also stops this scene
  }
}
