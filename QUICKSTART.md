> **OBSOLETE (prototype era), proposed for deletion.** Describes the original scaffold, not the current game. See [ROADMAP.md](ROADMAP.md), [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

# 🚀 Quick Start Guide

Welcome to your Brotato-inspired roguelike project! This guide will help you understand the setup and start coding.

## ✅ Current Status

Your project is **fully set up and ready for development**! 

**What's Done:**
- ✅ Vite + TypeScript project initialized
- ✅ Phaser 3.90 installed and configured
- ✅ Folder structure organized by best practices
- ✅ 5 scenes created (Boot, Menu, Game, Shop, UI)
- ✅ TypeScript path aliases configured (`@/`, `@scenes/`, etc.)
- ✅ Game data files (enemies, weapons, waves)
- ✅ Development server running at `http://localhost:3000`

**What's Next:**
- 🚧 Implement player movement
- 🚧 Add enemy spawning
- 🚧 Create weapon system
- 🚧 Build collision detection
- 🚧 Add shop functionality

## 🎮 Test Your Setup

The dev server should be running. Open your browser to:
```
http://localhost:3000
```

You should see:
1. A black screen with "Loading..." briefly
2. Then a menu with "BROTATO EXPERIMENT" title
3. Click "START GAME" to see the game scene (currently a placeholder)

## 📚 Understanding the Code Structure

### As a Web Developer, Think of It Like This:

| Web Dev Concept | Game Dev Equivalent | File |
|-----------------|---------------------|------|
| App.tsx / main route | GameScene | `scenes/GameScene.ts` |
| React Component | Phaser Scene | `scenes/*.ts` |
| useState/Redux | Game Properties | Variables in scene |
| useEffect/interval | update() method | Runs 60 FPS |
| Event listeners | Input handling | `this.input.keyboard` |
| CSS styles | Sprite properties | `sprite.setTint()`, positions |
| API call | Load JSON data | `this.load.json()` |

### Key Phaser Concepts

**Scene = A Screen/Page**
```typescript
export class GameScene extends Phaser.Scene {
  create() {
    // Called once when scene starts (like componentDidMount)
    // Set up your game objects here
  }

  update(time, delta) {
    // Called every frame (60 FPS)
    // Update game logic here (like game loop)
  }
}
```

**Sprite = Visual Object**
```typescript
// Like creating a <div> in React
const player = this.add.sprite(400, 300, 'player');

// Like CSS positioning
player.x = 100;
player.y = 200;

// Like inline styles
player.setTint(0xff0000); // Red tint
```

**Physics = Auto-movement & Collision**
```typescript
// Enable physics on sprite (makes it moveable)
this.physics.add.existing(player);

// Set velocity (it moves automatically!)
player.body.setVelocity(100, 0); // Moves right

// Detect collisions (like onClick)
this.physics.add.overlap(player, enemy, () => {
  console.log('Hit!');
});
```

## 🛠️ Your First Task: Make the Player Move

Let's implement player movement to get familiar with the codebase.

### Step 1: Open GameScene.ts

File: `src/scenes/GameScene.ts`

### Step 2: Add Player in create()

Replace the placeholder text with:

```typescript
create() {
  // Create player sprite at center
  this.player = this.physics.add.sprite(
    GAME_CONFIG.PLAYER_START_X,
    GAME_CONFIG.PLAYER_START_Y,
    'player'
  );
  
  // Set up keyboard input
  this.cursors = this.input.keyboard?.createCursorKeys();
  this.wasd = {
    W: this.input.keyboard?.addKey('W'),
    A: this.input.keyboard?.addKey('A'),
    S: this.input.keyboard?.addKey('S'),
    D: this.input.keyboard?.addKey('D'),
  };
}
```

### Step 3: Add Movement in update()

Replace the empty update with:

```typescript
update(time: number, delta: number) {
  if (!this.player) return;

  // Reset velocity
  this.player.body.setVelocity(0);

  // Check input and move
  const speed = GAME_CONFIG.INITIAL_PLAYER_SPEED;
  
  if (this.cursors?.left.isDown || this.wasd?.A.isDown) {
    this.player.body.setVelocityX(-speed);
  }
  if (this.cursors?.right.isDown || this.wasd?.D.isDown) {
    this.player.body.setVelocityX(speed);
  }
  if (this.cursors?.up.isDown || this.wasd?.W.isDown) {
    this.player.body.setVelocityY(-speed);
  }
  if (this.cursors?.down.isDown || this.wasd?.S.isDown) {
    this.player.body.setVelocityY(speed);
  }

  // Normalize diagonal movement
  if (this.player.body.velocity.x !== 0 && this.player.body.velocity.y !== 0) {
    this.player.body.velocity.normalize().scale(speed);
  }
}
```

### Step 4: Add Type Declarations

At the top of the class, add properties:

```typescript
export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // ... rest of the class
}
```

### Step 5: Test It!

Save the file. Vite will hot-reload. Go to the game and press WASD or arrows - your blue square should move!

## 🎯 Next Steps After Player Movement

1. **Spawn an Enemy**
   - Create sprite at random position
   - Move toward player using angle calculation
   - File: Create `entities/EnemyFactory.ts`

2. **Add Weapon**
   - Create projectile sprites
   - Fire toward nearest enemy
   - File: Create `ecs/systems/WeaponSystem.ts`

3. **Detect Collisions**
   - Projectile hits enemy = enemy dies
   - Enemy touches player = player takes damage
   - Use `this.physics.add.overlap()`

4. **Drop Coins**
   - When enemy dies, spawn coin sprite
   - Player touches coin = collect it
   - Update UI with coin count

5. **Build Shop**
   - After wave ends, show shop scene
   - Display upgrade options
   - Apply stat changes on purchase

## 🆘 Common Issues

### "Cannot find module '@/config/constants'"
- Make sure you ran `npm install`
- Restart VS Code to reload TypeScript
- Check `vite.config.ts` has path aliases

### Player doesn't move
- Check console for errors (F12)
- Verify physics is enabled in `gameConfig.ts`
- Make sure you called `this.physics.add.existing(player)`

### Changes not showing
- Vite hot reload is automatic
- If stuck, stop server (Ctrl+C) and run `npm run dev` again
- Hard refresh browser (Ctrl+Shift+R)

### Physics debug not showing
- Set `debug: true` in `gameConfig.ts` under `arcade`
- You'll see green boxes around physics bodies

## 📖 Learn More

### Phaser 3 Official Docs
- [Making Your First Game](https://phaser.io/tutorials/making-your-first-phaser-3-game) - 1 hour tutorial
- [Examples](https://labs.phaser.io) - 2000+ code examples
- [API Docs](https://photonstorm.github.io/phaser3-docs/) - Full reference

### Helpful Examples to Copy From
- [Arcade Physics](https://labs.phaser.io/index.html?dir=physics/arcade/&q=) - Movement & collision
- [Input](https://labs.phaser.io/index.html?dir=input/keyboard/&q=) - Keyboard controls
- [Sprites](https://labs.phaser.io/index.html?dir=sprites/&q=) - Working with images

## 🎨 Replacing Placeholder Graphics

Currently using colored shapes. To use real sprites:

1. **Find/Create Sprites**
   - Use [OpenGameArt](https://opengameart.org/)
   - Or create in [Piskel](https://www.piskelapp.com/) (pixel art)
   - Or use [Kenney Assets](https://kenney.nl/) (free!)

2. **Add to Project**
   ```
   assets/sprites/player.png
   assets/sprites/enemy_slime.png
   assets/sprites/projectile.png
   ```

3. **Load in BootScene**
   ```typescript
   preload() {
     this.load.image('player', 'assets/sprites/player.png');
     this.load.image('enemy_slime', 'assets/sprites/enemy_slime.png');
   }
   ```

4. **Remove Placeholder Code**
   - Delete `createPlaceholderSprites()` from `BootScene.ts`

## 💡 Development Tips

**Hot Reload**
- Save any file → browser updates automatically
- Console logs persist → great for debugging

**Debug Mode**
- Access game: `window.game` (in browser console)
- Access scene: `window.game.scene.scenes[0]`
- Inspect objects: `window.game.scene.getScene('GameScene')`

**Type Safety**
- Hover over any Phaser method to see docs
- TypeScript will catch errors before runtime
- Use `!` for variables you know exist (e.g., `this.player!`)

**Performance**
- Keep sprites reused in object pools
- Use `setVelocity()` instead of changing x/y every frame
- Texture atlas for many sprites (future optimization)

## 🎉 You're Ready!

Your game foundation is solid and follows best practices. Start with player movement, then add features one at a time. Test frequently!

**Questions?**
- Check `README.md` for architecture overview
- Check `STRUCTURE.md` for file organization
- Read Phaser examples for specific features
- Console log everything while learning!

---

**Happy coding! Let's build this roguelike! 🎮✨**
