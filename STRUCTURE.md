> **OBSOLETE (prototype era), proposed for deletion.** Describes the original scaffold, not the current game. See [ROADMAP.md](ROADMAP.md), [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

# Project Structure Documentation

## 📁 Complete Folder Overview

```
brotato-experiment/
├── 📂 .vscode/                     # VS Code workspace settings
│   ├── extensions.json            # Recommended extensions
│   └── settings.json              # Editor configuration
│
├── 📂 assets/                      # Game assets (images, audio, data)
│   ├── 📂 sprites/                # Sprite images (TODO: add actual sprites)
│   ├── 📂 audio/                  # Sound effects and music
│   └── 📂 data/                   # JSON configuration files
│       ├── enemies.json           # Enemy type definitions
│       ├── weapons.json           # Weapon configurations
│       └── waves.json             # Wave progression data
│
├── 📂 public/                      # Static assets served at root
│   └── vite.svg                   # Favicon (can be replaced)
│
├── 📂 src/                         # Source code
│   ├── main.ts                    # 🚀 Entry point - starts Phaser
│   ├── style.css                  # Global CSS styles
│   │
│   ├── 📂 config/                 # Game configuration
│   │   ├── constants.ts           # Game constants & enums
│   │   └── gameConfig.ts          # Phaser configuration
│   │
│   ├── 📂 scenes/                 # Phaser scenes (game screens)
│   │   ├── BootScene.ts           # Asset loading scene
│   │   ├── MenuScene.ts           # Main menu
│   │   ├── GameScene.ts           # Main gameplay (TODO: implement)
│   │   ├── ShopScene.ts           # Upgrade shop (TODO: implement)
│   │   └── UIScene.ts             # HUD overlay
│   │
│   ├── 📂 ecs/                    # Entity Component System (future)
│   │   ├── 📂 components/         # Data components (Position, Health, etc.)
│   │   └── 📂 systems/            # Game logic systems (Movement, Combat, etc.)
│   │
│   ├── 📂 entities/               # Entity factories (TODO: implement)
│   │   ├── PlayerFactory.ts       # Create player entity
│   │   └── EnemyFactory.ts        # Create enemy entities
│   │
│   ├── 📂 managers/               # Game state managers (TODO: implement)
│   │   ├── WaveManager.ts         # Wave spawning logic
│   │   ├── EconomyManager.ts      # Coins & shop management
│   │   └── InputManager.ts        # Input handling
│   │
│   ├── 📂 ui/                     # UI components (TODO: implement)
│   │   ├── HUD.ts                 # In-game HUD
│   │   └── ShopUI.ts              # Shop interface
│   │
│   ├── 📂 utils/                  # Utility functions
│   │   └── MathUtils.ts           # Math helpers (distance, angles, etc.)
│   │
│   └── 📂 types/                  # TypeScript type definitions
│       └── index.ts               # All game types & interfaces
│
├── .gitignore                      # Git ignore rules
├── index.html                      # HTML entry point
├── package.json                    # NPM dependencies & scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite build configuration
└── README.md                       # Project documentation
```

## 🎯 File Purposes

### Core Files

| File | Purpose | Status |
|------|---------|--------|
| `main.ts` | Initializes Phaser game instance | ✅ Done |
| `index.html` | HTML container for game canvas | ✅ Done |
| `style.css` | Global styles (centering, pixel art) | ✅ Done |

### Configuration

| File | Purpose | Status |
|------|---------|--------|
| `config/constants.ts` | Game constants (sizes, speeds, costs) | ✅ Done |
| `config/gameConfig.ts` | Phaser initialization config | ✅ Done |
| `tsconfig.json` | TypeScript compiler settings | ✅ Done |
| `vite.config.ts` | Build tool configuration | ✅ Done |

### Scenes (Game Screens)

| Scene | Purpose | Status |
|-------|---------|--------|
| `BootScene` | Loads assets, creates placeholders | ✅ Done |
| `MenuScene` | Main menu UI | ✅ Done |
| `GameScene` | Core gameplay loop | 🚧 TODO |
| `ShopScene` | Upgrade shop UI | 🚧 TODO |
| `UIScene` | HUD overlay (health, coins) | ✅ Done |

### Data Files (JSON)

| File | Purpose | Editable? |
|------|---------|-----------|
| `assets/data/enemies.json` | Enemy stats & behavior | ✅ Yes - tweak balance here |
| `assets/data/weapons.json` | Weapon properties | ✅ Yes - add new weapons |
| `assets/data/waves.json` | Wave difficulty curve | ✅ Yes - adjust progression |

## 🔄 How Code Flows

### Startup Flow
```
index.html
  └─> main.ts (creates Phaser.Game)
       └─> gameConfig.ts (Phaser configuration)
            └─> BootScene (first scene)
                 └─> MenuScene (after loading)
                      └─> GameScene (on click "Start")
                           └─> UIScene (launched as overlay)
```

### Game Loop Flow (once implemented)
```
GameScene.update() [60 FPS]
  ├─> Input: Read WASD/Arrow keys
  ├─> Systems: Run all game systems
  │    ├─> MovementSystem (update positions)
  │    ├─> WeaponSystem (auto-fire logic)
  │    ├─> CollisionSystem (detect hits)
  │    └─> WaveManager (spawn enemies)
  ├─> Physics: Arcade physics step
  └─> Render: Phaser draws everything
```

## 📝 Where to Add Features

### Adding a New Enemy Type
1. Add entry to `assets/data/enemies.json`
2. Create sprite in `assets/sprites/` (or update placeholder)
3. Load texture in `BootScene.ts`
4. Wave system auto-spawns from JSON

### Adding a New Weapon
1. Add entry to `assets/data/weapons.json`
2. Implement behavior in `WeaponSystem.ts` (TODO)
3. Add to shop pool in `ShopScene.ts` (TODO)

### Adding a New Upgrade
1. Define in `ShopScene.ts`
2. Apply stat changes in `EconomyManager.ts`
3. Update player stats in `GameScene.ts`

### Adding Sound Effects
1. Place `.mp3` files in `assets/audio/`
2. Load in `BootScene.preload()`
3. Play with `this.sound.play('key')`

## 🛠️ Common Development Tasks

### Running the Game
```bash
npm run dev          # Start dev server at localhost:3000
```

### Building for Production
```bash
npm run build        # Creates optimized build in dist/
npm run preview      # Preview production build
```

### Type Checking
```bash
npm run type-check   # Check TypeScript without building
```

### Debugging
- Open browser DevTools (F12)
- Access game: `window.game` (dev mode only)
- Check console for scene transitions
- Enable physics debug in `gameConfig.ts`

## 📦 Next Steps (Implementation Order)

1. **Player Entity** (`entities/PlayerFactory.ts`)
   - Create sprite with physics
   - Add WASD movement
   - Set up collision body

2. **Input Handling** (`managers/InputManager.ts`)
   - Read keyboard input
   - Update player velocity

3. **Enemy Spawning** (`managers/WaveManager.ts`)
   - Load enemy data from JSON
   - Spawn at screen edges
   - Move toward player

4. **Weapon System** (`ecs/systems/WeaponSystem.ts`)
   - Find nearest enemy
   - Fire projectiles
   - Cooldown management

5. **Collision Detection** (`ecs/systems/CollisionSystem.ts`)
   - Projectile vs Enemy
   - Player vs Enemy
   - Player vs Coin

6. **Economy** (`managers/EconomyManager.ts`)
   - Track coins & XP
   - Level up system
   - Shop integration

7. **Shop UI** (`ShopScene.ts`)
   - Display upgrades
   - Purchase logic
   - Stat application

## 🎨 Asset Placeholders

Currently using colored shapes:
- 🟦 Player: Blue square (32x32)
- 🟢 Slime: Green circle (32x32)
- 🔴 Goblin: Red square (32x32)
- ⚫ Orc: Dark red square (40x40)
- 🟡 Projectile: Yellow circle (8x8)
- 💰 Coin: Gold circle (16x16)

To replace:
1. Create/find sprite images
2. Place in `assets/sprites/`
3. Update load calls in `BootScene.ts`
4. Remove placeholder generation code

## 🧪 Testing Checklist

- [ ] Game loads without errors
- [ ] Menu scene displays
- [ ] Can navigate to game scene
- [ ] Player spawns in center
- [ ] Player moves with WASD
- [ ] Enemies spawn and move
- [ ] Weapons auto-fire
- [ ] Collisions register
- [ ] Coins drop and can be collected
- [ ] Shop opens after wave
- [ ] Upgrades apply correctly
- [ ] Wave difficulty increases

---

**Ready to start implementing the MVP! 🚀**
