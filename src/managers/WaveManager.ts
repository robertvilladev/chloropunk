import { waveDuration } from "@/core/waves";
import Phaser from "phaser";

/**
 * WaveManager - Handles enemy wave spawning and progression
 * Manages wave timing, enemy spawning, and difficulty scaling
 */
export class WaveManager {
  private currentWave: number = 0;
  private waveTimer: number = 0;
  private waveDuration: number = 30;
  private isWaveActive: boolean = false;

  constructor(_scene: Phaser.Scene) {}

  /**
   * Initialize wave system
   */
  create(): void {
    console.log("✓ WaveManager: Initialized");
  }

  /**
   * Start a new wave
   */
  startWave(waveNumber: number): void {
    this.currentWave = waveNumber;
    this.isWaveActive = true;
    this.waveTimer = 0;

    this.waveDuration = waveDuration(waveNumber);
    console.log(`✓ Wave ${waveNumber} started - ${this.waveDuration}s`);
  }

  /**
   * Update wave timer and check completion
   */
  update(deltaTime: number): void {
    if (!this.isWaveActive) return;

    this.waveTimer += deltaTime / 1000; // Convert to seconds

    // Check if wave is complete
    if (this.waveTimer >= this.waveDuration) {
      this.completeWave();
    }
  }

  /**
   * Complete the current wave
   */
  private completeWave(): void {
    this.isWaveActive = false;
    console.log(`✓ Wave ${this.currentWave} completed!`);

    // TODO: Trigger shop scene or next wave
    // this.scene.scene.start(SCENE_KEYS.SHOP);
  }

  /**
   * Get current wave number
   */
  getCurrentWave(): number {
    return this.currentWave;
  }

  /**
   * Get time remaining in current wave
   */
  getTimeRemaining(): number {
    return Math.max(0, this.waveDuration - this.waveTimer);
  }

  /**
   * Check if wave is active
   */
  isActive(): boolean {
    return this.isWaveActive;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.isWaveActive = false;
  }
}
