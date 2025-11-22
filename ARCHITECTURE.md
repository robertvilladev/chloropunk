# 🏗️ Architecture Guide

## Manager Pattern - Keeping Code Scalable

Your game now uses a **Manager Pattern** to keep the `GameScene.create()` method clean and organized.

### 🎯 Problem We Solved

**Before:** All logic in `GameScene.create()` - messy and hard to maintain
```typescript
create() {
  // 100+ lines of mixed player, enemy, input, UI code...
}
```

**After:** Clean separation with dedicated managers
```typescript
create() {
  this.worldManager.create();      // World setup
  this.inputManager.create();      // Input handling
  this.playerManager.create();     // Player logic
  this.waveManager.create();       // Wave system
}
```

---

## 📂 Manager Structure

### Current Managers

```
src/managers/
├── PlayerManager.ts      - Player movement, health, stats
├── InputManager.ts       - Keyboard/mouse input
├── WaveManager.ts        - Wave spawning, timing
└── WorldManager.ts       - Arena, background, boundaries
```

### Manager Responsibilities

| Manager | Responsibility | What It Does |
|---------|---------------|--------------|
| **PlayerManager** | Player entity | Create sprite, movement, health, damage |
| **InputManager** | User input | Read keyboard, normalize input, key events |
| **WaveManager** | Wave progression | Spawn enemies, track time, difficulty |
| **WorldManager** | Environment | Background, boundaries, decorations |

---

## 🔄 How It Works

### 1. GameScene Orchestrates
```typescript
export class GameScene {
  private playerManager!: PlayerManager;
  private inputManager!: InputManager;
  
  create() {
    // Initialize all managers
    this.inputManager.create();
    this.playerManager.create();
  }
  
  update() {
    // Coordinate between managers
    const input = this.inputManager.getMovementInput();
    this.playerManager.update(input.x, input.y);
  }
}
```

### 2. Managers Handle Specifics
```typescript
export class PlayerManager {
  create() {
    // ALL player setup code here
    this.player = this.scene.physics.add.sprite(...);
  }
  
  update(vx: number, vy: number) {
    // ALL player update logic here
    this.player.body.setVelocity(vx, vy);
  }
}
```

### 3. Clean Separation
- **GameScene** = Conductor (coordinates everything)
- **Managers** = Musicians (each plays their part)

---

## 📝 Adding New Features

### Example: Add Enemy System

**Step 1:** Create `EnemyManager.ts`
```typescript
export class EnemyManager {
  private enemies: Phaser.Physics.Arcade.Sprite[] = [];
  
  create() {
    // Enemy initialization
  }
  
  spawnEnemy(x: number, y: number, type: string) {
    // Spawn logic
  }
  
  update(playerPos: { x: number; y: number }) {
    // Move enemies toward player
  }
}
```

**Step 2:** Add to GameScene
```typescript
export class GameScene {
  private enemyManager!: EnemyManager;
  
  create() {
    // ... other managers
    this.enemyManager = new EnemyManager(this);
    this.enemyManager.create();
  }
  
  update() {
    // ... other updates
    const playerPos = this.playerManager.getPosition();
    this.enemyManager.update(playerPos);
  }
}
```

**That's it!** No need to clutter GameScene with 100 lines of enemy code.

---

## 🎮 Current Data Flow

```
┌─────────────────────────────────────────────────────┐
│                   GameScene                         │
│              (Orchestrates everything)              │
└────────┬────────────┬────────────┬─────────────────┘
         │            │            │
         ▼            ▼            ▼
    ┌────────┐  ┌──────────┐  ┌──────────┐
    │ Input  │  │  Player  │  │   Wave   │
    │Manager │  │ Manager  │  │ Manager  │
    └────┬───┘  └─────┬────┘  └────┬─────┘
         │            │             │
         │            │             │
    Read keys    Move player    Spawn enemies
    Return {x,y} Update pos     Track time
```

**Update Loop (60 FPS):**
1. InputManager reads keys → `{x: 1, y: 0}`
2. PlayerManager moves sprite with input
3. WaveManager checks timer, spawns enemies
4. Repeat every 16ms

---

## 🧩 Benefits of This Architecture

### 1. **Separation of Concerns**
- Player code in PlayerManager
- Input code in InputManager
- Wave code in WaveManager
- **No mixing!**

### 2. **Easy to Test**
```typescript
// Test PlayerManager independently
const player = new PlayerManager(mockScene);
player.create();
player.update(1, 0); // Move right
expect(player.getPosition().x).toBeGreaterThan(400);
```

### 3. **Scalable**
Adding new features doesn't bloat GameScene:
- Add `WeaponManager` for guns
- Add `CollisionManager` for hits
- Add `EconomyManager` for coins
- GameScene stays ~100 lines

### 4. **Reusable**
Move managers between scenes:
```typescript
// Use PlayerManager in different scenes
import { PlayerManager } from '@/managers/PlayerManager';

export class BossScene {
  private playerManager = new PlayerManager(this);
}
```

---

## 📋 Manager Best Practices

### ✅ DO:
- **One responsibility** per manager
- **Create and destroy** properly
- **Return data** instead of modifying directly
- **Clear method names** (`getMovementInput()`, `spawnEnemy()`)

### ❌ DON'T:
- Mix responsibilities (PlayerManager shouldn't handle enemies)
- Directly access other managers' private data
- Put game logic in GameScene.update()
- Create circular dependencies

---

## 🔮 Future Managers to Add

As you build features, create these managers:

```typescript
// Combat & Enemies
EnemyManager.ts           // Spawn, move, AI
WeaponManager.ts          // Auto-fire, projectiles
CollisionManager.ts       // Detect hits

// Progression
EconomyManager.ts         // Coins, XP, shop
UpgradeManager.ts         // Apply stat bonuses
LevelManager.ts           // Player leveling

// Polish
ParticleManager.ts        // Visual effects
AudioManager.ts           // Sound effects & music
CameraManager.ts          // Screen shake, zoom
```

---

## 🎯 Example: Adding Weapon System

Let's say you want to add auto-firing weapons.

**Step 1:** Create `WeaponManager.ts`
```typescript
export class WeaponManager {
  private cooldown = 0;
  
  update(delta: number, playerPos: {x: y}, enemies: Enemy[]) {
    this.cooldown -= delta;
    
    if (this.cooldown <= 0) {
      const nearest = this.findNearestEnemy(playerPos, enemies);
      if (nearest) {
        this.fireProjectile(playerPos, nearest);
        this.cooldown = 1000; // 1 second
      }
    }
  }
}
```

**Step 2:** Add to GameScene
```typescript
update() {
  const playerPos = this.playerManager.getPosition();
  const enemies = this.enemyManager.getEnemies();
  this.weaponManager.update(delta, playerPos, enemies);
}
```

**GameScene stays clean!** All weapon logic is isolated.

---

## 🚀 Your Next Steps

1. **Get familiar** with current managers
2. **Add EnemyManager** next (see example above)
3. **Add WeaponManager** for shooting
4. **Keep GameScene clean** - always delegate to managers

---

## 💡 Pro Tips

### Tip 1: Manager Communication
Managers communicate through **GameScene**:
```typescript
// ✅ Good - GameScene coordinates
const playerPos = this.playerManager.getPosition();
this.enemyManager.update(playerPos);

// ❌ Bad - Direct manager access
this.enemyManager.player = this.playerManager.player;
```

### Tip 2: Return Data, Don't Mutate
```typescript
// ✅ Good - Return position
getPosition(): {x: number, y: number} {
  return { x: this.player.x, y: this.player.y };
}

// ❌ Bad - Return mutable reference
getPlayer(): Sprite {
  return this.player; // Now others can modify it!
}
```

### Tip 3: Lifecycle Methods
Every manager should have:
```typescript
export class MyManager {
  create() {
    // Initialize
  }
  
  update(delta: number) {
    // Per-frame logic
  }
  
  destroy() {
    // Cleanup
  }
}
```

---

## 📊 Before vs After

### Before (All in GameScene)
```typescript
create() {
  // 200+ lines of mixed code
  this.player = ...
  this.cursors = ...
  this.enemies = ...
  this.weapons = ...
  this.coins = ...
  // Hard to read, hard to maintain
}
```

### After (Manager Pattern)
```typescript
create() {
  // 10 clean lines
  this.worldManager.create();
  this.inputManager.create();
  this.playerManager.create();
  this.waveManager.create();
  // Easy to read, easy to maintain
}
```

**Result:** Scalable architecture that grows with your game! 🎉

---

**Key Takeaway:** Keep `GameScene` as the **conductor**, and managers as the **specialists**. Each manager owns its domain completely.
