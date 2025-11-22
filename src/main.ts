import Phaser from "phaser";
import { phaserConfig } from "@/config/gameConfig";
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
  }
});
