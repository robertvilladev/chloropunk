import Phaser from "phaser";
import { phaserConfig } from "@/config/gameConfig";
import { loadRuns } from "@/core/runlog";
import "./style.css";

/**
 * Main entry point for the game
 * Initializes Phaser with our configuration
 */

// Ensure the DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  // Create Phaser game instance
  const game = new Phaser.Game(phaserConfig);

  // Expose game instance to window for debugging in development
  if (import.meta.env.DEV) {
    (window as any).game = game;
    console.log("🎮 Game initialized in development mode");
    console.log("Access game instance via window.game");
    // F4 downloads the stored run logs as runs.json (balance design §9.2)
    window.addEventListener("keydown", (e) => {
      if (e.code !== "F4") return;
      e.preventDefault();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(loadRuns(), null, 1)], { type: "application/json" }));
      a.download = "runs.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }
});
