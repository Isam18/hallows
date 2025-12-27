import Phaser from 'phaser';
import { COLORS, PLAYER_CONFIG, LevelConfig } from '../core/GameConfig';
import { COMBAT_TUNING, EnemyCombatConfig } from '../core/CombatConfig';
import { DEATH_CONFIG } from '../core/DeathConfig';
import gameState from '../core/GameState';
import inputManager from '../core/InputManager';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Vengefly } from '../entities/Vengefly';
import { HuskGuard } from '../entities/HuskGuard';
import { InfectedHusk } from '../entities/InfectedHusk';
import { Boss } from '../entities/Boss';
import { Pickup } from '../entities/Pickup';
import { Bench } from '../entities/Bench';
import { Portal } from '../entities/Portal';
import { DeathMarker } from '../entities/DeathMarker';
// Breakable import removed - not currently used
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { DustParticles } from '../systems/DustParticles';
import { generateForgottenCrossroads } from '../systems/RoomGenerator';

// Import level data
import fadingTownData from '../data/levels/fadingTown.json';
import ruinedCrossroadsData from '../data/levels/ruinedCrossroads.json';
import enemiesData from '../data/enemies.json';

// Generate the Forgotten Crossroads level
const forgottenCrossroadsData = generateForgottenCrossroads();

const LEVELS: Record<string, LevelConfig> = {
  fadingTown: fadingTownData as LevelConfig,
  ruinedCrossroads: ruinedCrossroadsData as LevelConfig,
  forgottenCrossroads: forgottenCrossroadsData,
};

export class GameScene extends Phaser.Scene {
  // Core entities
  player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  enemies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private benches!: Phaser.Physics.Arcade.StaticGroup;
  private portals!: Phaser.Physics.Arcade.StaticGroup;
  private deathMarker: DeathMarker | null = null;
  private boss: Boss | null = null;
  // spikes and breakables reserved for future use
  
  // Visual systems
  private parallaxBg: ParallaxBackground | null = null;
  private dustParticles: DustParticles | null = null;
  
  // Level data
  private currentLevel!: LevelConfig;
  private levelId!: string;
  private spawnId!: string;
  
  // Camera
  private cameraTarget!: Phaser.Math.Vector2;
  
  // UI event emitter
  private uiEvents!: Phaser.Events.EventEmitter;
  
  // Boss arena
  private inBossArena = false;
  private bossGateClosed = false;
  
  // Bench tracking
  private currentBench: Bench | null = null;
  private activeBenchConfig: import('../entities/Bench').BenchConfig | null = null;
  
  // Respawn tracking
  private isRespawning = false;
  
  // Debug mode
  private debugModeEnabled = false;
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { levelId: string; spawnId: string; respawning?: boolean; debugMode?: boolean }): void {
    this.levelId = data.levelId || 'fadingTown';
    this.spawnId = data.spawnId || 'default';
    this.isRespawning = data.respawning || false;
    this.debugModeEnabled = data.debugMode || this.registry.get('debugMode') || false;
    this.inBossArena = false;
    this.bossGateClosed = false;
  }

  create(): void {
    // Load level
    this.currentLevel = LEVELS[this.levelId];
    if (!this.currentLevel) {
      console.error(`Level not found: ${this.levelId}`);
      this.currentLevel = LEVELS.fadingTown;
    }
    
    // Set up world bounds
    this.physics.world.setBounds(0, 0, this.currentLevel.width, this.currentLevel.height);
    
    // Background
    const bgColor = Phaser.Display.Color.HexStringToColor(this.currentLevel.backgroundColor);
    this.cameras.main.setBackgroundColor(bgColor.color);
    
    // Create groups
    this.platforms = this.physics.add.staticGroup();
    this.walls = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.benches = this.physics.add.staticGroup();
    this.portals = this.physics.add.staticGroup();
    
    // Create visual effects for Forgotten Crossroads style levels
    if (this.levelId === 'forgottenCrossroads' || this.levelId === 'ruinedCrossroads') {
      this.parallaxBg = new ParallaxBackground(this);
      this.dustParticles = new DustParticles(this);
    }
    
    // Build level
    this.buildLevel();
    
    // Create player at spawn
    const spawn = this.currentLevel.spawns[this.spawnId] || this.currentLevel.spawnPoint;
    this.player = new Player(this, spawn.x, spawn.y);
    
    // Set up collisions
    this.setupCollisions();
    
    // Camera setup
    this.setupCamera();
    
    // Check for death marker in this level
    this.checkDeathMarker();
    
    // UI events
    this.uiEvents = new Phaser.Events.EventEmitter();
    this.registry.set('uiEvents', this.uiEvents);
    
    // Listen for game state changes
    gameState.on('stateChange', this.handleStateChange.bind(this));
    
    // Fade in
    this.cameras.main.fadeIn(300);
    
    // Emit level loaded
    this.emitUIEvent('levelLoaded', { 
      levelId: this.levelId, 
      levelName: this.currentLevel.name 
    });
    
    // Apply respawn invulnerability if coming from death
    if (this.isRespawning) {
      this.applyRespawnInvulnerability();
      this.isRespawning = false;
    }
    
    // Setup debug mode visuals if enabled
    if (this.debugModeEnabled) {
      this.setupDebugMode();
    }
  }
  
  private setupDebugMode(): void {
    // Enable physics debug
    this.physics.world.createDebugGraphic();
    
    // Create debug overlay graphics
    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(1000);
    
    // Show debug info text
    const debugText = this.add.text(10, 10, 'DEBUG MODE', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      color: '#ff6644',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 3 }
    });
    debugText.setScrollFactor(0);
    debugText.setDepth(1001);
    
    // Add keyboard shortcuts for debug
    this.input.keyboard?.on('keydown-ONE', () => this.teleportToLevel('fadingTown'));
    this.input.keyboard?.on('keydown-TWO', () => this.teleportToLevel('forgottenCrossroads'));
    this.input.keyboard?.on('keydown-THREE', () => this.teleportToLevel('ruinedCrossroads'));
    this.input.keyboard?.on('keydown-B', () => {
      if (this.currentLevel.bossArena) this.enterBossArena();
    });
    this.input.keyboard?.on('keydown-H', () => {
      gameState.fullHeal();
      this.emitUIEvent('hpChange', gameState.getPlayerData());
    });
    this.input.keyboard?.on('keydown-G', () => {
      this.giveShells(100);
    });
  }

  private buildLevel(): void {
    // Platforms and walls
    this.currentLevel.platforms.forEach(p => {
      const color = p.type === 'wall' ? COLORS.wall : COLORS.platform;
      const platform = this.add.rectangle(
        p.x + p.width / 2,
        p.y + p.height / 2,
        p.width,
        p.height,
        color
      );
      
      if (p.type === 'wall') {
        this.walls.add(platform);
      } else {
        this.platforms.add(platform);
      }
      
      // Add subtle top highlight for platforms
      if (p.type !== 'wall') {
        this.add.rectangle(
          p.x + p.width / 2,
          p.y + 2,
          p.width,
          4,
          COLORS.platformLight
        );
      }
    });
    
    // Triggers (benches, portals)
    this.currentLevel.triggers.forEach(t => {
      if (t.type === 'bench') {
        // Extract bench type from trigger data if available, otherwise use default
        const benchTypeId = (t as any).benchTypeId || 'basic_bench';
        const roomId = (t as any).roomId || this.levelId;
        const bench = new Bench(this, t.x, t.y, t.id, benchTypeId, roomId);
        this.benches.add(bench);
      } else if (t.type === 'transition') {
        const portal = new Portal(this, t.x, t.y, t.width, t.height, {
          target: t.target!,
          targetSpawn: t.targetSpawn!,
        });
        this.portals.add(portal);
      } else if (t.type === 'bossGate') {
        const portal = new Portal(this, t.x, t.y, t.width, t.height, {
          target: 'boss',
          targetSpawn: 'arena',
        });
        this.portals.add(portal);
      }
    });
    
    // Enemies
    this.currentLevel.enemies.forEach(e => {
      const config = (enemiesData as Record<string, EnemyCombatConfig>)[e.type];
      if (config) {
        // Use appropriate class based on enemy type
        if (e.type === 'vengefly' || (config as any).isFlying) {
          const vengefly = new Vengefly(this, e.x, e.y, config);
          this.enemies.add(vengefly);
        } else if (e.type === 'huskGuard' || (config as any).isElite) {
          const huskGuard = new HuskGuard(this, e.x, e.y, config);
          this.enemies.add(huskGuard);
        } else if (e.type === 'infectedHusk' || (config as any).isPassive) {
          const infectedHusk = new InfectedHusk(this, e.x, e.y, config);
          this.enemies.add(infectedHusk);
        } else {
          const enemy = new Enemy(this, e.x, e.y, config);
          this.enemies.add(enemy);
        }
      }
    });
    
    // Pickups
    this.currentLevel.pickups.forEach(p => {
      if (p.type === 'shells') {
        const pickup = new Pickup(this, p.x, p.y, 'shells', p.amount);
        this.pickups.add(pickup);
      }
    });
  }

  private setupCollisions(): void {
    // Player vs platforms/walls
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.walls, 
      (player, wall) => this.player.handleWallCollision(wall as Phaser.GameObjects.Rectangle)
    );
    
    // Enemies vs platforms/walls
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.enemies, this.walls);
    
    // Player vs enemies (contact damage)
    this.physics.add.overlap(this.player, this.enemies, 
      (player, enemy) => this.handlePlayerEnemyContact(enemy as Enemy)
    );
    
    // Player vs pickups
    this.physics.add.overlap(this.player, this.pickups,
      (player, pickup) => this.handlePickup(pickup as Pickup)
    );
    
    // Player vs benches
    this.physics.add.overlap(this.player, this.benches,
      (player, bench) => this.handleBenchOverlap(bench as Bench)
    );
    
    // Player vs portals
    this.physics.add.overlap(this.player, this.portals,
      (player, portal) => this.handlePortalOverlap(portal as Portal)
    );
    
    // Boss collisions (if boss exists)
    if (this.boss) {
      this.physics.add.collider(this.boss, this.platforms);
      this.physics.add.collider(this.boss, this.walls);
      this.physics.add.overlap(this.player, this.boss,
        () => this.handlePlayerBossContact()
      );
    }
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    // Use improved camera lerp from movement config
    cam.startFollow(this.player, true, 0.12, 0.10);
    cam.setBounds(0, 0, this.currentLevel.width, this.currentLevel.height);
    cam.setZoom(1);
    cam.setDeadzone(20, 30); // Small deadzone for stability
  }

  private checkDeathMarker(): void {
    const dropped = gameState.getDroppedShells();
    if (dropped && dropped.levelId === this.levelId) {
      this.deathMarker = new DeathMarker(this, dropped.x, dropped.y, dropped.amount);
      this.physics.add.overlap(this.player, this.deathMarker,
        () => this.handleDeathMarkerPickup()
      );
    }
  }

  update(time: number, delta: number): void {
    // Check pause BEFORE clearing inputs
    if (inputManager.justPressed('pause')) {
      if (gameState.getState() === 'playing') {
        gameState.setState('paused');
        this.scene.pause();
        this.emitUIEvent('pause', null);
        // Clear input state at end of frame
        inputManager.update();
        return;
      }
    }
    
    // Update player
    if (gameState.getState() === 'playing' || gameState.getState() === 'boss') {
      this.player.update(time, delta);
      
      // Update camera look-ahead based on player facing
      this.updateCameraLookAhead();
      
      // Update enemies (all types: ground, flying, elite, passive)
      this.enemies.getChildren().forEach((enemy) => {
        const e = enemy as Enemy | Vengefly | HuskGuard | InfectedHusk;
        e.update(time, delta, this.player);
      });
      
      // Update boss
      if (this.boss && this.inBossArena) {
        this.boss.update(time, delta, this.player);
      }
      
      // Update death marker animation
      if (this.deathMarker) {
        this.deathMarker.update();
      }
      
      // Update bench proximity and prompts
      this.updateBenchProximity(delta);
      
      // Update parallax background
      if (this.parallaxBg) {
        this.parallaxBg.update();
      }
    }
    
    // Clear just-pressed/released states at END of frame so all systems can read them
    inputManager.update();
  }

  private cameraLookAheadX = 0;
  
  private updateCameraLookAhead(): void {
    const targetOffset = this.player.getFacing() * 40; // Look ahead distance
    this.cameraLookAheadX += (targetOffset - this.cameraLookAheadX) * 0.08;
    this.cameras.main.setFollowOffset(-this.cameraLookAheadX, 0);
  }
  
  /**
   * Update bench proximity for all benches
   */
  private updateBenchProximity(delta: number): void {
    const playerBounds = this.player.getBounds();
    
    this.benches.getChildren().forEach((benchObj) => {
      const bench = benchObj as Bench;
      bench.update(delta);
      
      // Check if player is in range
      const benchBounds = bench.getBounds();
      const inRange = Phaser.Geom.Rectangle.Overlaps(playerBounds, benchBounds);
      
      // Only set out of range here - in range is set by collision callback
      if (!inRange) {
        bench.setPlayerInRange(false);
      }
    });
  }

  // Current swing ID for tracking one-hit-per-swing
  private currentSwingId = 0;
  
  // Player attack hit check - called by Player when attack hitbox is active
  checkAttackHit(hitbox: Phaser.Geom.Rectangle, swingId: number): void {
    const damage = PLAYER_CONFIG.attackDamage + gameState.getCharmModifier('damageMod');
    let hitSomething = false;
    
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as Enemy;
      if (!e.isDying() && !e.isInvulnerable()) {
        if (Phaser.Geom.Rectangle.Overlaps(hitbox, e.getBounds())) {
          if (e.takeDamage(damage, this.player.x, swingId)) {
            hitSomething = true;
          }
        }
      }
    });
    
    // Check boss hitbox (use getHitRect)
    if (this.boss && !this.boss.isDying()) {
      // Check head hitbox first (when staggered and exposed)
      const headBounds = this.boss.getHeadBounds();
      if (headBounds && Phaser.Geom.Rectangle.Overlaps(hitbox, headBounds)) {
        this.boss.takeDamage(damage, this.player.x);
        hitSomething = true;
        this.emitUIEvent('bossHpChange', { 
          hp: this.boss.getHp(), 
          maxHp: this.boss.getMaxHp() 
        });
      } else if (Phaser.Geom.Rectangle.Overlaps(hitbox, this.boss.getHitRect())) {
        this.boss.takeDamage(damage, this.player.x);
        hitSomething = true;
        this.emitUIEvent('bossHpChange', { 
          hp: this.boss.getHp(), 
          maxHp: this.boss.getMaxHp() 
        });
      }
    }
    
    if (hitSomething) {
      this.applyHitstop();
    }
  }
  
  // Get pickups group for enemy drops
  getPickupsGroup(): Phaser.Physics.Arcade.Group {
    return this.pickups;
  }
  
  // Get new swing ID for attack tracking (prevents multi-hit per swing)
  getNextSwingId(): number {
    return ++this.currentSwingId;
  }

  private applyHitstop(): void {
    this.time.timeScale = 0.1;
    this.time.delayedCall(COMBAT_TUNING.hitstopMs, () => {
      this.time.timeScale = 1;
    });
  }

  private handlePlayerEnemyContact(enemy: Enemy): void {
    if (this.player.isInvulnerable()) return;
    
    const damage = enemy.getContactDamage();
    this.player.takeDamage(damage, enemy.x);
  }

  private handlePlayerBossContact(): void {
    if (!this.boss || this.player.isInvulnerable()) return;
    
    const damage = 2; // Boss contact damage
    this.player.takeDamage(damage, this.boss.x);
  }

  private handlePickup(pickup: Pickup): void {
    if (pickup.isCollected()) return;
    
    pickup.collect();
    gameState.addShells(pickup.getAmount());
    this.emitUIEvent('shellsChange', gameState.getPlayerData().shells);
  }

  private handleDeathMarkerPickup(): void {
    if (!this.deathMarker) return;
    
    const amount = gameState.recoverShells();
    this.deathMarker.collect();
    this.deathMarker.destroy();
    this.deathMarker = null;
    
    this.emitUIEvent('shellsRecovered', amount);
    this.emitUIEvent('shellsChange', gameState.getPlayerData().shells);
  }

  private handleBenchOverlap(bench: Bench): void {
    // Update bench proximity state
    bench.setPlayerInRange(true);
    
    // Check for interaction input
    if (inputManager.justPressed('interact') && gameState.getState() === 'playing') {
      if (bench.tryInteract()) {
        this.activateBench(bench);
      }
    }
  }
  
  /**
   * Activate a bench - set respawn, heal, open UI
   */
  private activateBench(bench: Bench): void {
    const config = bench.getConfig();
    this.currentBench = bench;
    this.activeBenchConfig = config;
    
    // 1. Set respawn point if configured
    if (config.setsRespawn) {
      gameState.setLastBench(this.levelId, bench.getSpawnId());
    }
    
    // 2. Heal player based on config
    if (config.healMode === 'full') {
      gameState.fullHeal();
    } else if (config.healMode === 'amount' && config.healAmount > 0) {
      gameState.heal(config.healAmount);
    }
    
    // 3. Enter bench state and open UI
    gameState.setState('bench');
    this.emitUIEvent('benchActivated', {
      levelId: this.levelId,
      benchId: bench.getSpawnId(),
      config: config,
    });
  }
  
  /**
   * Get the currently active bench config (for UI)
   */
  getCurrentBenchConfig(): import('../entities/Bench').BenchConfig | null {
    return this.activeBenchConfig;
  }

  private handlePortalOverlap(portal: Portal): void {
    if (!portal.canUse()) return;
    
    const data = portal.getData();
    
    if (data.target === 'boss') {
      this.enterBossArena();
    } else {
      this.transitionToLevel(data.target, data.targetSpawn);
    }
  }

  private transitionToLevel(levelId: string, spawnId: string): void {
    // Check if level exists
    if (!LEVELS[levelId]) {
      console.warn(`Level ${levelId} not found, wrapping to current level entrance`);
      levelId = this.levelId;
      spawnId = 'default';
    }
    
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ levelId, spawnId });
    });
  }

  private enterBossArena(): void {
    if (this.inBossArena || !this.currentLevel.bossArena) return;
    
    this.inBossArena = true;
    gameState.setState('boss');
    
    // Teleport player to arena
    const arena = this.currentLevel.bossArena;
    this.player.setPosition(arena.x + 50, arena.bossSpawn.y);
    
    // Spawn boss
    this.boss = new Boss(this, arena.bossSpawn.x, arena.bossSpawn.y);
    this.physics.add.collider(this.boss, this.platforms);
    this.physics.add.collider(this.boss, this.walls);
    this.physics.add.overlap(this.player, this.boss,
      () => this.handlePlayerBossContact()
    );
    
    // Create and close gates
    this.createBossGates(arena.x, arena.y, arena.width, arena.height);
    
    // Close gate
    this.bossGateClosed = true;
    
    // Emit boss start
    this.emitUIEvent('bossStart', {
      name: this.boss.getName(),
      maxHp: this.boss.getMaxHp(),
    });
  }
  
  private bossLeftGate: Phaser.GameObjects.Rectangle | null = null;
  private bossRightGate: Phaser.GameObjects.Rectangle | null = null;
  
  private createBossGates(arenaX: number, arenaY: number, arenaWidth: number, arenaHeight: number): void {
    // Create gate visuals that slam down
    const gateColor = 0x444455;
    const gateHeight = 200;
    
    // Left gate
    this.bossLeftGate = this.add.rectangle(arenaX + 30, arenaY - gateHeight, 30, gateHeight, gateColor);
    this.physics.add.existing(this.bossLeftGate, true);
    this.walls.add(this.bossLeftGate);
    
    // Right gate
    this.bossRightGate = this.add.rectangle(arenaX + arenaWidth - 30, arenaY - gateHeight, 30, gateHeight, gateColor);
    this.physics.add.existing(this.bossRightGate, true);
    this.walls.add(this.bossRightGate);
    
    // Animate gates slamming down
    this.tweens.add({
      targets: [this.bossLeftGate, this.bossRightGate],
      y: arenaY + gateHeight / 2,
      duration: 500,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.cameras.main.shake(200, 0.02);
        // Pass gates to boss for opening later
        if (this.boss && this.bossLeftGate && this.bossRightGate) {
          this.boss.lockGates(this.bossLeftGate, this.bossRightGate);
        }
      }
    });
  }

  handleBossDefeated(): void {
    if (!this.boss) return;
    
    gameState.addShells(100);
    gameState.setState('victory');
    
    this.emitUIEvent('bossDefeated', {
      reward: 100,
    });
    this.emitUIEvent('shellsChange', gameState.getPlayerData().shells);
  }

  /**
   * Handle player death - drop currency, show death screen
   */
  handlePlayerDeath(): void {
    // Guard against multiple death calls
    if (gameState.getState() === 'death') return;
    
    const playerData = gameState.getPlayerData();
    
    // Drop shells at death location with room ID
    gameState.dropShells(this.levelId, this.player.x, this.player.y, this.levelId);
    
    // Destroy existing death marker if replacing
    if (this.deathMarker) {
      this.deathMarker.destroy();
      this.deathMarker = null;
    }
    
    // Play death animation on player
    this.player.setTint(0xff4444);
    this.player.setAlpha(0.7);
    
    // Set death state
    gameState.setState('death');
    
    // Emit death event
    this.emitUIEvent('playerDied', {
      shells: playerData.shells,
      x: this.player.x,
      y: this.player.y,
    });
  }

  /**
   * Respawn player at last bench
   */
  respawnPlayer(): void {
    const lastBench = gameState.getLastBench();
    
    // Heal player
    gameState.fullHeal();
    gameState.setState('playing');
    
    if (lastBench) {
      // Respawn at bench
      this.scene.restart({ 
        levelId: lastBench.levelId, 
        spawnId: lastBench.spawnId,
        respawning: true
      });
    } else {
      // No bench - restart from beginning
      gameState.resetRun();
      this.scene.restart({ 
        levelId: 'fadingTown', 
        spawnId: 'default',
        respawning: true
      });
    }
  }
  
  /**
   * Apply respawn invulnerability to player
   */
  private applyRespawnInvulnerability(): void {
    if (this.player && DEATH_CONFIG.respawnInvulnMs > 0) {
      this.player.setRespawnInvulnerability(DEATH_CONFIG.respawnInvulnMs);
    }
  }

  resumeFromBench(): void {
    // Handle enemy respawn based on bench config
    if (this.activeBenchConfig) {
      const respawnMode = this.activeBenchConfig.enemyRespawnMode;
      const delay = this.activeBenchConfig.enemyRespawnDelayMs || 0;
      
      if (respawnMode !== 'none') {
        if (delay > 0) {
          this.time.delayedCall(delay, () => this.respawnEnemies(respawnMode));
        } else {
          this.respawnEnemies(respawnMode);
        }
      }
    }
    
    // Clear bench tracking
    this.currentBench = null;
    this.activeBenchConfig = null;
    
    // Resume gameplay
    gameState.setState('playing');
    this.emitUIEvent('benchClosed', null);
  }
  
  /**
   * Respawn enemies based on mode
   */
  private respawnEnemies(mode: string): void {
    const roomId = this.currentBench?.getRoomId() || this.levelId;
    
    // Clear existing enemies
    this.enemies.getChildren().forEach((enemy) => {
      (enemy as Enemy).destroy();
    });
    this.enemies.clear(true, true);
    
    // Respawn from level data
    this.currentLevel.enemies.forEach(e => {
      const config = (enemiesData as Record<string, EnemyCombatConfig>)[e.type];
      if (config) {
        // Check room filter for currentRoom mode
        const enemyRoomId = (e as any).roomId || this.levelId;
        
        if (mode === 'all' || mode === 'currentBiome' || 
            (mode === 'currentRoom' && enemyRoomId === roomId)) {
          const enemy = new Enemy(this, e.x, e.y, config);
          this.enemies.add(enemy);
        }
      }
    });
    
    // Re-setup enemy collisions
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.enemies, this.walls);
  }

  resumeFromPause(): void {
    gameState.setState('playing');
    this.scene.resume();
    this.emitUIEvent('unpause', null);
  }

  private handleStateChange({ newState }: { oldState: string; newState: string }): void {
    this.emitUIEvent('stateChange', newState);
  }

  private emitUIEvent(event: string, data: any): void {
    // Emit to registry for React UI to pick up
    this.registry.set('lastUIEvent', { event, data, timestamp: Date.now() });
    this.uiEvents?.emit(event, data);
  }

  // Debug methods
  teleportToLevel(levelId: string, spawnId = 'default'): void {
    this.transitionToLevel(levelId, spawnId);
  }

  toggleHitboxes(show: boolean): void {
    this.physics.world.drawDebug = show;
  }

  giveShells(amount: number): void {
    gameState.addShells(amount);
    this.emitUIEvent('shellsChange', gameState.getPlayerData().shells);
  }
}
