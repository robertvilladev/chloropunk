import { GAME_CONFIG, SCENE_KEYS } from "@/config/constants";
import { THEME, THEME_CSS } from "@/config/theme";
import { stepIndex } from "@/core/menuNav";
import { loadSettings, saveSettings } from "@/core/settings";
import { button, onKeys, panel, scanlines, text } from "./ui";
import Phaser from "phaser";

type View = "main" | "settings" | "confirm";
interface Item {
  label: string;
  run: () => void;
  primary?: boolean;
}

/**
 * PauseScene - overlay on a paused GameScene + UIScene (both are paused by
 * GameScene.openPause). Views: main, settings, quit confirmation. Mouse and
 * keyboard (up/down + Enter; Esc backs out, P resumes).
 */
export class PauseScene extends Phaser.Scene {
  private view: View = "main";
  private items: Item[] = [];
  private buttons: Phaser.GameObjects.Container[] = [];
  private focus = 0;
  private body?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.PAUSE });
  }

  create() {
    const { WIDTH: width, HEIGHT: height } = GAME_CONFIG;
    this.view = "main";
    this.scene.bringToTop();
    // Dim the frozen arena; also swallows clicks so nothing underneath reacts
    this.add.rectangle(0, 0, width, height, THEME.bg, 0.7).setOrigin(0).setInteractive();
    scanlines(this);
    const pw = 420, ph = 330;
    panel(this, width / 2 - pw / 2, height / 2 - ph / 2, pw, ph, { border: THEME.lime, shadow: true });

    onKeys(this, (e) => {
      if (e.code === "KeyP") this.resume();
      else if (e.code === "Escape") (this.view === "main" ? this.resume() : this.show("main"));
      else if (e.code === "ArrowUp" || e.code === "KeyW") this.moveFocus(-1);
      else if (e.code === "ArrowDown" || e.code === "KeyS") this.moveFocus(1);
      else if (e.code === "Enter" || e.code === "Space") this.items[this.focus]?.run();
    });
    this.show("main");
  }

  private show(view: View): void {
    this.view = view;
    this.body?.destroy();
    const { WIDTH: width, HEIGHT: height } = GAME_CONFIG;
    const cx = width / 2;
    const top = height / 2 - 165;
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
      const on = loadSettings().reducedShake;
      this.items = [
        { label: `REDUCED SHAKE: ${on ? "ON" : "OFF"}`, run: () => this.toggleShake() },
        { label: "BACK", run: () => this.show("main"), primary: true },
      ];
    } else {
      title = "QUIT RUN?";
      sub = "This run's progress will be lost.";
      this.items = [
        { label: "YES, QUIT", run: () => this.quit() },
        { label: "NO, KEEP PLAYING", run: () => this.show("main"), primary: true },
      ];
    }

    add(text(this, cx, top + 55, title, 40, view === "confirm" ? THEME_CSS.danger : THEME_CSS.lime, "display").setOrigin(0.5));
    if (sub) add(text(this, cx, top + 100, sub, 14, THEME_CSS.textMuted).setOrigin(0.5));
    this.buttons = this.items.map((it, i) =>
      add(
        button(this, cx, top + 150 + i * 60, it.label, it.run, it.primary, true, {
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
    this.applyFocus();
  }

  private toggleShake(): void {
    const s = loadSettings();
    saveSettings({ ...s, reducedShake: !s.reducedShake });
    const keep = this.focus;
    this.show("settings");
    this.focus = keep;
    this.applyFocus();
  }

  private resume(): void {
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
