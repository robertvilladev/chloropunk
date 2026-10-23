# Importing Assets Guide

> Only JSON data is in use today. Sprites are pixel grids in `src/art/` (data, not files; see below); SFX are ZzFX parameter arrays (see Audio below); music files are still to come. `@ecs` and `@ui` aliases exist in `vite.config.ts` but their folders do not.

## JSON Data Files

### Path Alias
We've configured `@assets` as a path alias for the `assets/` folder.

### How to Import JSON

```typescript
// ✅ Correct way - use @assets alias
import enemyData from "@assets/data/enemies.json";
import weaponData from "@assets/data/weapons.json";
import waveData from "@assets/data/waves.json";

// ❌ Wrong - don't use @/ for assets
import enemyData from "@/assets/data/enemies.json"; // Won't work!
```

### Type Safety

All JSON imports are typed! Check `src/types/json.d.ts` for type declarations.

```typescript
import waveData from "@assets/data/waves.json";
// waveData is typed as: { waves: WaveDef[] }

import enemyData from "@assets/data/enemies.json";
// enemyData is typed as: Record<string, EnemyDef>
```

### Usage Example

```typescript
import type { EnemyDef } from "@/types";
import enemyDataJson from "@assets/data/enemies.json";

export class EnemyManager {
  private enemyData: Record<string, EnemyDef>;
  
  constructor() {
    this.enemyData = enemyDataJson;
  }
  
  getEnemyStats(type: string): EnemyDef {
    return this.enemyData[type];
  }
}
```

## Sprite grids (`src/art/`)

Sprites are authored as text grids, one palette letter per pixel (`.` = transparent, at most 16x16), and rendered to textures at boot (`src/art/textures.ts`: one CanvasTexture per actor, 3x, frames `walk0`/`walk1`/`hit`, baked shadow; animations `<key>_walk`). Game code refers to sprites only by texture key.

- `palette.ts` - letter -> hex (`PALETTE`); `grid.ts` - `parseGrid`, `gridBounds`, `validateActor`.
- `actors.ts` - `ACTORS`: each actor has `walk0`, `walk1` (legs swapped, or body bobbed) and `hit` (white flash, `>_<` face, one row lower). Always draw facing right; flipping is runtime.
- `pickups.ts` - 8x8 two-frame pickups.
- To add an actor: append an `ActorArt` to `ACTORS`; `npx vitest run src/art` validates it (width/rows, letters, bounds, hit differs from walk0).

## Audio

**SFX are code, not files.** Each one is a [ZzFX](https://killedbyapixel.github.io/ZzFX/) parameter array in `src/fx/sounds.ts`, played with `sfx("name")` from `src/fx/sfx.ts` ([audio addendum](docs/superpowers/specs/2026-10-23-audio-addendum.md)). To add or retune one, design it in the ZzFX page, paste the array (keep index 1, randomness, at `0`) and pick a voice limit (`max` copies at once, `gapMs` between starts). `npx vitest run src/fx` checks that every sound renders short and unclipped.

**Music (planned, not built yet):** 1–2 free-licence loops go in `assets/audio/`, each listed in `assets/audio/CREDITS.md` (title, author, source URL, licence). Load them with `this.load.audio(key, url)` in `BootScene.preload()` and play them with `this.sound.add(key, { loop: true })`. They share Phaser's AudioContext with SFX.

## Path Aliases Reference

| Alias | Resolves To | Use For |
|-------|-------------|---------|
| `@/` | `src/` | Source code files |
| `@scenes/` | `src/scenes/` | Scene files |
| `@managers/` | `src/managers/` | Manager classes |
| `@config/` | `src/config/` | Configuration |
| `@types/` | `src/types/` | Type definitions |
| `@assets/` | `assets/` | **JSON, images, audio** |

## Troubleshooting

### TypeScript Error: "Cannot find module"
1. Check you're using `@assets/` not `@/assets/`
2. Restart VS Code (Ctrl+Shift+P → "Reload Window")
3. Run `npm run type-check` to verify

### Vite Build Error
1. Make sure `vite.config.ts` has the `@assets` alias
2. Restart dev server (`Ctrl+C` then `npm run dev`)

### JSON not typed correctly
Check `src/types/json.d.ts` has declarations for your JSON files.
