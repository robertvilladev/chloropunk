# Importing Assets Guide

> Only JSON data is in use today. Sprites are generated in code by `BootScene`; real sprite/audio assets arrive in M3 (see [ROADMAP.md](ROADMAP.md)). `@ecs` and `@ui` aliases exist in `vite.config.ts` but their folders do not.

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

## Image/Audio Assets (Future)

When you add actual sprites and sounds:

```typescript
// In BootScene.preload()
this.load.image('player', 'assets/sprites/player.png');
this.load.audio('shoot', 'assets/audio/shoot.mp3');

// Use in scene
this.add.sprite(x, y, 'player');
this.sound.play('shoot');
```

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
