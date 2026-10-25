# Importing Assets Guide

> Only JSON data is in use today. Sprites are SVG strings in `src/art/vector.ts` (code, not files; see below); SFX are ZzFX parameter arrays (see Audio below); music is two OGG files in `assets/audio/`. `@ecs` and `@ui` aliases exist in `vite.config.ts` but their folders do not.

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

## Vector sprites (`src/art/`)

Sprites are SVG strings in design px (vector style, keyline outline: [addendum §4](docs/superpowers/specs/2026-10-23-arena-map-addendum.md)), ported from the [sprites canvas](https://claude.ai/artifact/TnsQjaTcJEYoShEC5AyMXM) file `project/vector.js`, which stays the source of truth: change the art there, then copy it into `vector.ts`. At boot `textures.ts` loads each frame as a base64 SVG at 2x, composes one CanvasTexture per key (frames `walk0`/`walk1`/`hit`, scrap `0`/`1`, weapons `t1`–`t4`, projectiles and effects `0`; shadow baked under actors, LINEAR filter; animations `<key>_walk`) plus an 8x `player_portrait` for the menu and loadout. Sprites are drawn at scale 1/2 (`ART_SCALE`). Game code refers to sprites only by texture key.

- `vector.ts` - `svg(key, frame)`, `SPRITE_META` (frame size, feet row, body centre `cx`/`cy`), `FRAMES`. Always draw facing right; flipping is runtime. `hit` = the walk0 art all white with `><` eyes (baked, no tint, so it also shows on Canvas).
- Weapons `weapon_<id>`: drawn pointing right, tier trim baked per frame (`weaponFrame(tier)`), grip pivot `px`/`py` in `SPRITE_META` (the sprite's origin; flipped vertically when aiming left). Projectiles `projectile_basic`, `proj_pellet`, `proj_rocket`, `enemy_bolt` keep their `HIT_SIZE` boxes. Effects: `fx_muzzle`, `fx_beam` (one tile stretched along the laser, no keyline), `fx_swoosh` (120° arc scaled from `SWOOSH` to the blade reach), `fx_blast` (ring scaled from `BLAST_R` to the blast radius).
- `body.ts` - `fitCircle` / `fitBox`: hit areas in design px, centred on `(cx, cy)`; radii live in `enemies.json`, projectile boxes in `HIT_SIZE`.
- To add an actor: add it to `A` in `vector.ts` and to `FRAMES`; `pnpm exec vitest run src/art` checks size, parse, ids, ASCII, frames and the body fit.

## Rooftop layout (`assets/data/arena.json`)

`{ w, h, props }` for the 1600×1200 arena: each prop is `{ kind, x, y, w, h, label?, solid? }` in arena px (top-left), kind one of `vent`, `sign`, `pad`, `puddle`, `rail`, `zone`, `crate` (`ArenaProp`, `src/types`). `solid: true` makes a prop an obstacle (today the 4 vents): it blocks the player, enemies, enemy bolts and scrap, player shots fly over, enemies steer around it, and spawns and drops are moved off it. `src/art/arena.ts` draws solids as raised blocks (drop shadow, dark front face with violet hazard stripes, lighter top with a bright `solidRim` edge, `THEME_CSS.decor.solid*`), so they read apart from the flat decor; collision adds no sprite. `src/art/arena.ts` bakes it once into `arena_floor_1600x1200` (zones under the grid, the rest on top). Rules (checked by `src/core/arena.test.ts`): props inside the arena and clear of the 160 px circle around the centre start; solids at most 144×96 and at least 80 px from the arena edge and from each other (a potato fits through); pink only for the billboard (`sign`), since pink is the telegraph colour. Colours come from `THEME_CSS.decor` (Night violet, `#rrggbbaa` with alpha baked in); decor stays darker than anything that moves, and cyan/amber are reserved for projectiles. Any other arena size (`?arena=small`) gets the plain grid.

## Audio

**SFX are code, not files.** Each one is a [ZzFX](https://killedbyapixel.github.io/ZzFX/) parameter array in `src/fx/sounds.ts`, played with `sfx("name")` from `src/fx/sfx.ts` ([audio addendum](docs/superpowers/specs/2026-10-23-audio-addendum.md)). To add or retune one, design it in the ZzFX page, paste the array (keep index 1, randomness, at `0`) and pick a voice limit (`max` copies at once, `gapMs` between starts) and `pitchVar` (random pitch spread per play). The house style is filtered (negative last value = low-pass) saw/triangle tones with light bitcrush; menus use the same family, quieter. `pnpm exec vitest run src/fx` checks that every sound renders short and unclipped.

**Music is streamed OGG files** in `assets/audio/`, each listed in `assets/audio/CREDITS.md` (title, author, source, licence, changes) and in `MUSIC_CREDITS` (`src/fx/music.ts`, shown on the menu). They are imported as URLs and played by `<audio>` elements routed into Phaser's AudioContext, not loaded with `this.load.audio` (that would decode ~120 MB per 5-minute track). To add a track: drop the OGG in, add it to `SRC`/`TRIM` in `src/fx/music.ts` and to `TrackId`/`TRACK_FOR` in `src/core/music.ts`, and credit it. Encode with OGG Vorbis ~q4, trim silence, and never commit WAVs.

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
3. Run `pnpm type-check` to verify

### Vite Build Error
1. Make sure `vite.config.ts` has the `@assets` alias
2. Restart dev server (`Ctrl+C` then `pnpm dev`)

### JSON not typed correctly
Check `src/types/json.d.ts` has declarations for your JSON files.
