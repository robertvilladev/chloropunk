# 🥕 Veggie Vendetta

A top-down 2D roguelike shooter built with **Phaser 3**, **TypeScript**, and **Vite**.

## 📋 Project Overview

This is a top-down roguelike shooter where you:

- Control a character in a 2D arena
- Fight waves of enemies
- Collect coins dropped by defeated enemies
- Upgrade weapons and stats in a shop between waves
- Survive progressively harder waves

## 🏗️ Architecture

### Technology Stack

- **Phaser 3.90** - Game framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool with HMR
- **bitECS** - Entity Component System (for future scalability)

### Project Structure

```
veggie-vendetta/
├── src/
│   ├── main.ts                    # Entry point
│   ├── config/
│   │   ├── constants.ts          # Game constants
│   │   └── gameConfig.ts         # Phaser configuration
│   ├── scenes/
│   │   ├── BootScene.ts          # Asset loading
│   │   ├── MenuScene.ts          # Main menu
│   │   ├── GameScene.ts          # Main gameplay
│   │   ├── ShopScene.ts          # Between-wave shop
│   │   └── UIScene.ts            # HUD overlay
│   ├── ecs/                      # Entity Component System (future)
│   │   ├── components/           # Data components
│   │   └── systems/              # Game logic systems
│   ├── entities/                 # Entity factories
│   ├── managers/                 # Game managers
│   ├── ui/                       # UI components
│   ├── utils/                    # Utility functions
│   └── types/                    # TypeScript types
├── assets/
│   ├── sprites/                  # Sprite images
│   ├── audio/                    # Sound effects & music
│   └── data/                     # JSON configurations
│       ├── enemies.json          # Enemy definitions
│       ├── weapons.json          # Weapon data
│       └── waves.json            # Wave progression
└── public/                       # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+ (you have 20.11, consider upgrading)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check without building
npm run type-check
```

### Development Server

The dev server will start at `http://localhost:3000` with hot module replacement enabled.

## 🎯 Development Roadmap

### Phase 1: MVP (Weeks 1-3) ✅ In Progress

- [x] Project setup with Vite + TypeScript
- [x] Phaser 3 configuration
- [x] Scene management (Boot, Menu, Game, Shop, UI)
- [x] Folder structure
- [ ] Player character with WASD movement
- [ ] Basic weapon system (auto-targeting)
- [ ] Enemy spawning system
- [ ] Collision detection
- [ ] Health & damage system
- [ ] Coin drops
- [ ] Simple shop UI

### Phase 2: Core Gameplay (Weeks 4-6)

- [ ] Multiple weapon types
- [ ] Wave manager with progression
- [ ] Enemy variety (3+ types)
- [ ] Player stats & upgrades
- [ ] Experience & leveling
- [ ] Particle effects
- [ ] Sound effects

### Phase 3: Polish & ECS Refactor (Weeks 7-10)

- [ ] Refactor to bitECS architecture
- [ ] Advanced enemy AI
- [ ] Special abilities/weapons
- [ ] Visual effects & screen shake
- [ ] Music & audio polish
- [ ] Meta-progression system
- [ ] Balance & difficulty tuning

## 🎮 Game Design

### Core Loop

1. **Wave Phase**: Survive for 30-60 seconds while enemies spawn
2. **Shop Phase**: Spend coins on upgrades and new weapons
3. **Repeat**: Waves get progressively harder

### Player Mechanics

- **Movement**: WASD or Arrow keys (8-directional)
- **Combat**: Weapons auto-fire at nearest enemy in range
- **Progression**: Collect coins and XP to become stronger

### Enemy Types

- **Slime**: Weak, slow, common (5 coins, 10 XP)
- **Goblin**: Medium health, faster (10 coins, 20 XP)
- **Orc**: Tanky, slow, rare (20 coins, 40 XP)

### Weapon System

- **Basic Gun**: Balanced fire rate and damage
- **Shotgun**: Close range, spread shots
- **Rifle**: High damage, slow fire rate

## 🔧 Configuration Files

### Game Data (JSON)

All game balance and content is data-driven:

- `assets/data/enemies.json` - Enemy stats and behavior
- `assets/data/weapons.json` - Weapon properties
- `assets/data/waves.json` - Wave progression

Modify these files to tweak game balance without touching code!

## 📚 Code Concepts

### Understanding Game Architecture

If you're coming from web development, here's how game concepts map to what you know:

| Game Concept | Web Development Equivalent |
|-------------|---------------------------|
| **Scene** | Page/Route - self-contained view |
| **Game Loop** | setInterval/RAF - runs every frame |
| **Sprite** | DOM Element - visual object |
| **Physics Body** | Bounding box for collision |
| **Game Object** | Class instance - entity in game |
| **Asset Loading** | Lazy loading images/resources |
| **State Management** | Redux/Context - global game state |

### Key Phaser Concepts

1. **Scenes**: Like React components, but for game screens
2. **Game Objects**: Everything visible (sprites, text, graphics)
3. **Update Loop**: Runs 60 times per second, updates game logic
4. **Physics**: Handles movement and collision automatically
5. **Input**: Keyboard, mouse, touch events (like DOM events)

### ECS Pattern (Future)

**Entity Component System** separates:

- **Entities**: IDs (like database primary keys)
- **Components**: Pure data (like database columns)
- **Systems**: Pure logic (like database queries + business logic)

This scales better than OOP for games with 100+ entities.

## 🐛 Debugging

In development mode, the game instance is available as `window.game`:

```javascript
// In browser console
game.scene.scenes // See all scenes
game.scene.getScene('GameScene') // Get specific scene
```

Physics debug is enabled in development (press F12 to see hitboxes).

## 🎨 Assets

Currently using placeholder graphics (colored shapes).

To add real sprites:

1. Place images in `assets/sprites/`
2. Load in `BootScene.ts` using `this.load.image()`
3. Update `ASSET_KEYS` in `constants.ts`

## 📝 Code Style

- **TypeScript strict mode** enabled
- **Path aliases** configured (`@/`, `@scenes/`, etc.)
- **ESM modules** only
- **Functional + OOP hybrid** approach

## 🤝 Contributing

This is a learning project! Key principles:

1. **Separation of Concerns**: Keep scenes, entities, and systems separate
2. **Data-Driven**: Use JSON configs for game content
3. **Type Safety**: Leverage TypeScript fully
4. **Readability**: Write code like you'd write web apps

## 📖 Learning Resources

### Phaser 3

- [Official Examples](https://labs.phaser.io) - 2000+ code examples
- [Making Your First Game](https://phaser.io/tutorials/making-your-first-phaser-3-game) - Official tutorial
- [Phaser by Example](https://phaser.io/examples) - Free book

### Game Architecture

- [ECS FAQ](https://github.com/SanderMertens/ecs-faq) - Understanding ECS
- [Game Programming Patterns](https://gameprogrammingpatterns.com/) - Free online book
- [RogueBasin](http://www.roguebasin.com/) - Roguelike development wiki

### TypeScript + Phaser

- [Phaser 3 TypeScript Examples](https://github.com/photonstorm/phaser3-typescript-project-template)
- [bitECS Documentation](https://github.com/NateTheGreatt/bitECS)

## 🚨 Common Issues

### "Cannot find module '@/config/constants'"

Run `npm install` to ensure dependencies are installed and Vite is configured.

### Physics not working

Ensure `physics.arcade` is enabled in `gameConfig.ts` and game objects have physics bodies.

### Sprites not appearing

Check that:

1. Assets are loaded in `BootScene.preload()`
2. Sprites are added in scene's `create()` method
3. Textures exist (check browser console for errors)

## 📄 License

MIT License - Feel free to learn from and modify this code!

---

**Built with** ❤️ **by a web developer learning game development**
