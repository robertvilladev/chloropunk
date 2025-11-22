import type { Vector2 } from "@/types";

/**
 * Math utility functions
 */

export class MathUtils {
  /**
   * Calculate distance between two points
   */
  static distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate squared distance (faster, use when you don't need exact distance)
   */
  static distanceSquared(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  /**
   * Calculate angle between two points
   */
  static angleBetween(x1: number, y1: number, x2: number, y2: number): number {
    return Math.atan2(y2 - y1, x2 - x1);
  }

  /**
   * Normalize a vector
   */
  static normalize(vec: Vector2): Vector2 {
    const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    if (length === 0) return { x: 0, y: 0 };
    return {
      x: vec.x / length,
      y: vec.y / length,
    };
  }

  /**
   * Clamp a value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Linear interpolation
   */
  static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * Random integer between min and max (inclusive)
   */
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Random float between min and max
   */
  static randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Weighted random selection
   */
  static weightedRandom<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Get random point on circle edge
   */
  static randomPointOnCircle(
    centerX: number,
    centerY: number,
    radius: number
  ): Vector2 {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  }
}
