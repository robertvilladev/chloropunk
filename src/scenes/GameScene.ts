import { ARENA, SCENE_KEYS } from "@/config/constants";
import { setMusic } from "@/fx/music";
import { THEME_CSS } from "@/config/theme";
import { createRng, type Rng } from "@/core/rng";
import { autopilot } from "@/core/autopilot";
import { aimReport } from "@/core/run";
import { endRun, saveRun, startWave, type DamageSource, type Outcome, type WaveLog } from "@/core/runlog";
import { addXp, xpToNext } from "@/core/progression";
import { computeStats } from "@/core/stats";
import { clampDelta } from "@/core/time";
import { waveDuration } from "@/core/waves";
import { Juice } from "@/fx/Juice";
import { EnemyManager } from "@/managers/EnemyManager";
import { InputManager } from "@/managers/InputManager";
import { PickupManager } from "@/managers/PickupManager";
import { PlayerManager } from "@/managers/PlayerManager";
import { WeaponManager } from "@/managers/WeaponManager";
import { WorldManager } from "@/managers/WorldManager";
import type { EnemyDef, RunState, Stats } from "@/types";
import enemyDefs from "@assets/data/enemies.json";
import wavesData from "@assets/data/waves.json";
import { applyGlow } from "@/fx/glow";
import { followView } from "@/config/view";
import { onKeys } from "@/scenes/ui";
import Phaser from "phaser";

// Dev autopilot (F8) survives scene restarts between waves; ?autopilot starts it on
let autopilotOn = import.meta.env.DEV && new URLSearchParams(window.location.search).has("autopilot");

const BANNER_MS = 900; // matches Juice.banner total duration

// Custom events emitted on this scene; listeners are removed on shutdown
// because Phaser keeps scene.events listeners across restarts
const GAME_EVENTS = [
  "playerDied",
  "enemyKilled",
  "enemyExploded",
  "enemyHit",
  "scrapCollected",
  "speedChanged",
  "playerHealthChanged",
  "playerHit",
  "playerDodged",
  "timerUpdate",
  "runQuit",
];

/**
 * GameScene - Main gameplay scene
 * This scene orchestrates all managers and systems
 *
 * Architecture:
 * - Managers handle specific domains (player, input, waves, etc.)
 * - GameScene coordinates between managers
 * - Keep create() clean and focused on initialization
 */
export class GameScene extends Phaser.Scene {
  // Managers - each handles a specific domain
  private playerManager!: PlayerManager;
  private inputManager!: InputManager;
  private worldManager!: WorldManager;
  private enemyManager!: EnemyManager;
  private weaponManager!: WeaponManager;
  private pickupManager!: PickupManager;
  private juice!: Juice;
  // Death-burst colour per enemy id, parsed once
  private burstColors = new Map<string, number>();

  // Round timer
  private roundTimeRemaining: number = 20;
  private roundDuration: number = 20;
  private rng!: Rng;
  // Separate stream for combat rolls (crits) so spawns stay reproducible per seed
  private combatRng!: Rng;

  // Game speed control
  private gameSpeed: number = 1;

  // Stats tracking
  private enemiesKilled: number = 0;
  // Scrap (= XP) picked up this wave; XP is applied at wave end
  private waveEarned: number = 0;
  private isGameOver: boolean = false;

  // Persistent run state (wave, scrap, xp, build)
  private run!: RunState;
  private stats!: Stats;
  // This wave's run-log record (balance design §9); `touching` is set by the contact overlap each step
  private waveLog!: WaveLog;
  private touching = false;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  /**
   * Receive run state (new from LoadoutScene, or carried from the shop)
   */
  init(data: { run: RunState }) {
    this.run = data.run;
  }

  /**
   * Initialize the game - create all managers and systems
   */
  create() {
    setMusic("game");
    // 1. Create world/environment
    this.worldManager = new WorldManager(this);
    this.worldManager.create();
    applyGlow(this);

    // 2. Initialize input handling
    this.inputManager = new InputManager(this);
    this.inputManager.create();

    // 3. Create player
    this.stats = computeStats(this.run);
    this.waveLog = startWave(this.run.log, this.run, this.stats);
    this.touching = false;
    this.rng = createRng(this.run.seed + this.run.wave);
    this.combatRng = createRng(this.run.seed + this.run.wave + 7919);
    this.playerManager = new PlayerManager(this);
    this.playerManager.create(this.stats, this.combatRng);
    followView(this.cameras.main, this.playerManager.getSprite(), ARENA);

    // 4. Initialize enemy system and start this wave's spawn schedule
    this.roundDuration = waveDuration(this.run.wave);
    this.enemyManager = new EnemyManager(this);
    this.enemyManager.create();
    this.enemyManager.startWave(this.run.wave, this.rng);


    // 7. Initialize pickups
    this.pickupManager = new PickupManager(this);
    this.waveEarned = 0;
    this.events.on("scrapCollected", this.onScrapCollected, this);

    // 7b. Feedback effects
    for (const def of Object.values(enemyDefs)) {
      this.burstColors.set(def.id, Phaser.Display.Color.HexStringToColor(def.color ?? THEME_CSS.text).color);
    }
    this.juice = new Juice(this);

    // 6. Weapons (after Juice: rockets use its blast)
    this.weaponManager = new WeaponManager(this);
    this.weaponManager.create({
      weapons: this.run.weapons,
      stats: this.stats,
      rng: this.combatRng,
      enemyGroup: this.enemyManager.getEnemyGroup(),
      juice: this.juice,
      hit: (enemy, damage, crit, angle, knockback) => {
        if (knockback > 0) this.enemyManager.knockback(enemy, angle, knockback);
        this.enemyManager.damageEnemy(enemy, damage, crit);
      },
    });
    this.juice.banner(`WAVE ${String(this.run.wave).padStart(2, "0")}`, this.run.wave);
    this.events.on("enemyHit", this.onEnemyHit, this);
    this.events.on("playerHit", this.onPlayerHit, this);
    this.events.on("playerHealthChanged", this.onHealthChanged, this);
    this.events.on("playerDodged", () => this.waveLog.dodged++);

    // 8. Set up collision detection
    this.setupCollisions();

    // 9. Set up scene controls
    this.setupSceneControls();

    // 10. Launch UI overlay
    this.scene.launch(SCENE_KEYS.UI);

    // 10. Initialize round timer
    this.roundTimeRemaining = this.roundDuration;
    this.enemiesKilled = 0;
    this.gameSpeed = 1;
    this.physics.world.timeScale = 1;
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.isGameOver = false;

    // Listen for player death
    this.events.on("playerDied", this.onPlayerDeath, this);

    // Listen for enemy kills
    this.events.on("enemyKilled", this.onEnemyKilled, this);
    this.events.on("enemyExploded", this.onEnemyExploded, this);

    // Listen for speed changes
    this.events.on("speedChanged", this.onSpeedChanged, this);

    // Quit from the pause menu: keep the partial run in the log
    this.events.on("runQuit", () => {
      if (this.isGameOver) return;
      this.bankAim();
      this.saveLog("quit");
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    console.log("✓ GameScene: Initialized with modular architecture");
  }

  /**
   * Game loop - runs every frame (60 FPS)
   */
  update(_time: number, delta: number) {
    // Don't update if game is over
    if (this.isGameOver) return;

    // Clamp stalls (tab switch) then apply game speed
    const dt = clampDelta(delta) * this.gameSpeed;

    // Update round timer
    this.roundTimeRemaining -= dt / 1000;
    if (this.roundTimeRemaining <= 0) {
      this.roundTimeRemaining = 0;
      this.onRoundComplete();
      return;
    }

    // Player sprite doubles as its position (read once per frame)
    const player = this.playerManager.getSprite();

    // 1. Get input
    const movement = this.inputManager.getMovementInput();

    // 2. Update player
    this.playerManager.update(movement.x, movement.y, dt);

    // 3. Update enemy system (elapsed = seconds into this wave)
    this.enemyManager.update(
      dt,
      this.roundDuration - this.roundTimeRemaining,
      player
    );

    // 3b. Pull nearby scrap toward the player
    this.pickupManager.update(player, this.stats.pickupRadius);

    // 4. Update weapon system
    this.weaponManager.update(
      dt,
      player,
      this.enemyManager.getEnemies()
    );

    // 5. Run log: peak alive and time in contact
    const w = this.waveLog;
    w.peakAlive = Math.max(w.peakAlive, this.enemyManager.getEnemyCount());
    if (this.touching) w.contactTime += dt / 1000;
    this.touching = false;

    // 6. Update UI (via events)
    this.updateUI();
  }

  /**
   * Set up collision detection between game entities
   */
  private setupCollisions(): void {
    // Player <-> Enemy collisions (player takes damage)
    this.physics.add.overlap(
      this.playerManager.getSprite(),
      this.enemyManager.getEnemyGroup(),
      (_playerObj, enemyObj) => {
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
        if (!enemy.active) return;
        const def = enemy.getData("def") as EnemyDef;
        if (def.behavior === "exploder") {
          // Touching the player detonates it; no drops, so walking into
          // tomatoes during i-frames isn't free scrap
          this.enemyManager.killEnemy(enemy, false);
          return;
        }
        this.touching = true;
        this.hurt(enemy.getData("state").damage, "contact");
      },
      undefined,
      this
    );

    // Enemy bolts -> player
    this.physics.add.overlap(
      this.playerManager.getSprite(),
      this.enemyManager.getEnemyProjectileGroup(),
      (_playerObj, boltObj) => {
        const bolt = boltObj as Phaser.Physics.Arcade.Sprite;
        if (!bolt.active) return;
        this.hurt(bolt.getData("damage"), "bolt");
        this.enemyManager.removeBolt(bolt);
      },
      undefined,
      this
    );

    // Player <-> scrap collisions
    this.physics.add.overlap(
      this.playerManager.getSprite(),
      this.pickupManager.getGroup(),
      (_playerObj, scrapObj) => {
        this.pickupManager.collect(scrapObj as Phaser.Physics.Arcade.Sprite);
      },
      undefined,
      this
    );
  }

  /**
   * Set up scene-level controls (Esc/P and losing focus open the pause menu)
   */
  private setupSceneControls(): void {
    onKeys(this, (e) => {
      if (e.code === "Escape" || e.code === "KeyP") this.openPause();
    });
    const ev = this.game.events;
    ev.on(Phaser.Core.Events.BLUR, this.openPause, this);
    ev.on(Phaser.Core.Events.HIDDEN, this.openPause, this);
    const onResume = () => this.juice.refreshSettings();
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ev.off(Phaser.Core.Events.BLUR, this.openPause, this);
      ev.off(Phaser.Core.Events.HIDDEN, this.openPause, this);
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
    });
    if (import.meta.env.DEV) this.setupDevKeys();
  }

  /**
   * Freeze the wave (scene pause halts physics, timers and tweens, so the
   * banner and timers continue where they stopped) and show PauseScene.
   * Not while paused already or once the wave is over (banner hand-off, game over).
   */
  private openPause(): void {
    if (this.isGameOver || !this.scene.isActive()) return;
    this.scene.pause();
    this.scene.pause(SCENE_KEYS.UI);
    this.scene.launch(SCENE_KEYS.PAUSE);
  }

  /** Dev only: F2 spawns 150 peas, F3 toggles an FPS readout, F8 toggles the autopilot. */
  private setupDevKeys(): void {
    const kb = this.input.keyboard!;
    kb.addCapture("F3,F8"); // keep the browser's find bar / F-key defaults out
    const scrap = this.pickupManager.getGroup().getChildren() as Phaser.Physics.Arcade.Sprite[];
    const steer = () =>
      autopilot(
        this.playerManager.getSprite(),
        this.enemyManager.getEnemies(),
        scrap.filter((s) => s.active),
        ARENA.w,
        ARENA.h
      );
    const pilot = () => {
      this.inputManager.autopilot = autopilotOn ? steer : null;
      console.info(`[dev] autopilot ${autopilotOn ? "on" : "off"}`);
    };
    const togglePilot = () => {
      autopilotOn = !autopilotOn;
      pilot();
    };
    if (autopilotOn) pilot();
    const fps = this.add
      .text(8, 8, "", { fontFamily: "monospace", fontSize: "14px", color: THEME_CSS.lime })
      .setDepth(1000)
      .setVisible(false);
    const spawn = () => this.enemyManager.debugSpawn("pea", 150);
    const toggle = () => fps.setVisible(!fps.visible);
    const tick = () => {
      if (fps.visible) fps.setText(`${Math.round(this.game.loop.actualFps)} fps`);
    };
    kb.on("keydown-F2", spawn);
    kb.on("keydown-F3", toggle);
    kb.on("keydown-F8", togglePilot);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, tick);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off("keydown-F2", spawn);
      kb.off("keydown-F3", toggle);
      kb.off("keydown-F8", togglePilot);
      kb.removeCapture("F3,F8");
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, tick);
    });
  }

  /**
   * Update UI scene with current game state
   */
  private updateUI(): void {
    const uiScene = this.scene.get(SCENE_KEYS.UI);
    if (uiScene && uiScene.scene.isActive()) {
      // Send timer update
      this.events.emit("timerUpdate", this.roundTimeRemaining);
      // Other UI updates happen via events from managers
    }
  }

  /** Damage the player and log it by source. */
  private hurt(raw: number, source: DamageSource): void {
    const lost = this.playerManager.takeDamage(raw);
    this.waveLog.taken[source] += lost;
    if (source === "contact" && lost > 0) this.waveLog.contactHits++;
  }

  /** Add this wave's shots, hits and kills to the run totals and close the wave's log record. */
  private bankAim(): void {
    const a = this.run.aim;
    const t = this.weaponManager.tally;
    this.run.aim = { shots: a.shots + t.shots, hits: a.hits + t.hits, kills: a.kills + this.enemiesKilled };
    Object.assign(this.waveLog, {
      duration: this.roundDuration - this.roundTimeRemaining,
      spawned: this.enemyManager.spawned,
      killed: this.enemiesKilled,
      aliveAtEnd: this.enemyManager.getEnemyCount(),
      shots: t.shots,
      hits: t.hits,
      hpEnd: this.playerManager.getHealth(),
    });
  }

  /** Finish the run log and keep it (localStorage, last 50). */
  private saveLog(outcome: Outcome): void {
    endRun(this.run.log, outcome);
    saveRun(this.run.log);
    console.info(aimReport(this.run.aim, this.run.wave));
  }

  /**
   * Handle player death
   */
  private onPlayerDeath(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    console.log("Game Over!");
    this.bankAim();
    this.waveLog.deathTime = this.waveLog.duration;
    // after hurt() has logged the killing blow (this runs inside takeDamage)
    queueMicrotask(() => this.saveLog("died"));
    this.scene.pause();
    this.scene.launch(SCENE_KEYS.GAME_OVER);
  }

  /**
   * Handle round completion
   */
  private onRoundComplete(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    console.log("Round Complete!");
    this.bankAim();
    // Clear enemies and bolts first so nothing can hurt the player after the
    // wave is over (no drops, no blasts)
    this.enemyManager.clearAll();
    this.weaponManager.clear();
    this.juice.banner("WAVE CLEARED", this.run.wave, "waveClear");

    // Leftover scrap is auto-collected
    const leftover = this.pickupManager.collectAll();
    this.run.scrap += leftover;
    this.waveEarned += leftover;

    const xp = addXp(this.run, this.waveEarned);
    // Harvesting: bonus scrap at wave end (scrap only, never XP)
    this.run.scrap += this.stats.harvesting;
    this.waveEarned += this.stats.harvesting;
    this.waveLog.scrapBanked = leftover;
    this.waveLog.harvesting = this.stats.harvesting;
    if (this.run.wave >= wavesData.waves.length) this.saveLog("won");
    this.playerManager.getSprite().setVelocity(0, 0);
    // Let the banner play before handing off; the timer dies with the scene
    // on shutdown, and isGameOver (set above) prevents a second call
    this.time.delayedCall(BANNER_MS, () => {
      this.scene.pause();
      this.scene.launch(SCENE_KEYS.VICTORY, {
        enemiesKilled: this.enemiesKilled,
        scrapEarned: this.waveEarned,
        run: {
          ...this.run,
          wave: this.run.wave + 1,
          level: xp.level,
          xp: xp.xp,
          pendingLevelUps: this.run.pendingLevelUps + xp.levelsGained,
        },
      });
    });
  }

  /**
   * Handle enemy killed
   */
  private onEnemyKilled(x: number, y: number, def: EnemyDef, drops: boolean): void {
    this.enemiesKilled++;
    if (drops) this.waveLog.scrapDropped += def.scrap;

    this.juice.deathBurst(x, y, this.burstColors.get(def.id)!);
    if (def.shakeOnKill) this.juice.shake("kill");

    if (drops) this.pickupManager.spawnScrap(x, y, def.scrap);
  }

  private onEnemyHit(
    enemy: Phaser.Physics.Arcade.Sprite,
    amount: number,
    crit: boolean
  ): void {
    this.waveLog.damageDealt += amount;
    this.juice.damageNumber(enemy.x, enemy.y - 16, amount, crit);
    this.juice.hitFlash(enemy);
  }

  private onPlayerHit(): void {
    this.juice.shake("hit");
  }

  private onHealthChanged(health: number, maxHealth: number): void {
    this.juice.lowHp(health / maxHealth);
  }

  private onScrapCollected(value: number): void {
    this.waveLog.scrapLive += value;
    this.run.scrap += value;
    this.waveEarned += value;
  }

  /**
   * Exploder blast: hurt the player if inside the radius
   */
  private onEnemyExploded(
    x: number,
    y: number,
    radius: number,
    damage: number
  ): void {
    const p = this.playerManager.getPosition();
    if (Math.hypot(p.x - x, p.y - y) <= radius) {
      this.hurt(damage, "blast");
    }
  }

  /**
   * Handle speed change
   */
  private onSpeedChanged(speed: number): void {
    this.gameSpeed = speed;
    // Arcade: lower timeScale = faster. Code-driven timers use the scaled dt.
    this.physics.world.timeScale = 1 / speed;
    this.time.timeScale = speed;
    this.tweens.timeScale = speed;
    console.log(`Game speed changed to ${speed}x`);
  }

  /**
   * Cleanup when leaving scene
   */
  private cleanup(): void {
    this.playerManager?.destroy();
    this.enemyManager?.destroy();
    this.weaponManager?.destroy();
    this.worldManager?.destroy();
    this.inputManager?.destroy();
    GAME_EVENTS.forEach((event) => this.events.removeAllListeners(event));
  }

  /**
   * Current player stats for the HUD
   */
  getPlayerStats() {
    // Level/XP including this wave's pickups (committed at wave end)
    const xp = addXp(this.run, this.waveEarned);
    return {
      wave: this.run.wave,
      health: this.playerManager.getHealth(),
      maxHealth: this.playerManager.getMaxHealth(),
      stats: this.stats,
      weapons: this.run.weapons,
      scrap: this.run.scrap,
      pending: this.run.pendingLevelUps + xp.levelsGained,
      level: xp.level,
      xp: xp.xp,
      xpNeeded: xpToNext(xp.level),
    };
  }
}
