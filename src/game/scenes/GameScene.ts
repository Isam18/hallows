import Phaser from 'phaser';
import { COLORS, PLAYER_CONFIG, LevelConfig } from '../core/GameConfig';
import { COMBAT_TUNING, EnemyCombatConfig } from '../core/CombatConfig';
import { DEATH_CONFIG } from '../core/DeathConfig';
import gameState from '../core/GameState';
import inputManager from '../core/InputManager';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { BasicHusk } from '../entities/BasicHusk';
import { Vengefly } from '../entities/Vengefly';
import { Aspid } from '../entities/Aspid';
import { HuskGuard } from '../entities/HuskGuard';
import { InfectedHusk } from '../entities/InfectedHusk';
import { Mosskin } from '../entities/Mosskin';
import { MossCreep } from '../entities/MossCreep';
import { MossWarrior } from '../entities/MossWarrior';
import { Squit } from '../entities/Squit';
import { Boss } from '../entities/Boss';
import { MossTitan } from '../entities/MossTitan';
import { Pickup } from '../entities/Pickup';
import { Bench } from '../entities/Bench';
import { Portal } from '../entities/Portal';
import { DeathMarker } from '../entities/DeathMarker';
import { Spike } from '../entities/Spike';
import { Breakable } from '../entities/Breakable';
import { AcidPool } from '../entities/AcidPool';
import { MeleeDoor } from '../entities/MeleeDoor';
import { InfectionGlobule, InfectionParticles } from '../entities/InfectionGlobule';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { DustParticles } from '../systems/DustParticles';
import { FlyingEnemySpawner } from '../systems/FlyingEnemySpawner';
import { generateForgottenCrossroads } from '../systems/RoomGenerator';
import { generateGreenway } from '../systems/GreenwayRoomGenerator';
import { GreenwayParallax } from '../systems/GreenwayParallax';
import { LeafParticles } from '../systems/LeafParticles';

// Import level data
import fadingTownData from '../data/levels/fadingTown.json';
import ruinedCrossroadsData from '../data/levels/ruinedCrossroads.json';
import chainRoomData from '../data/levels/chainRoom.json';
import greenwayData from '../data/levels/greenway.json';
import mossTitanArenaData from '../data/levels/mossTitanArena.json';
import enemiesData from '../data/enemies.json';

// Generate procedural levels
const forgottenCrossroadsData = generateForgottenCrossroads();
const greenwayGeneratedData = generateGreenway();

const LEVELS: Record<string, LevelConfig> = {
  fadingTown: fadingTownData as LevelConfig,
  ruinedCrossroads: ruinedCrossroadsData as LevelConfig,
  forgottenCrossroads: forgottenCrossroadsData,
  chainRoom: chainRoomData as LevelConfig,
  greenway: greenwayData as LevelConfig,
  greenwayGenerated: greenwayGeneratedData as LevelConfig,
  mossTitanArena: mossTitanArenaData as LevelConfig,
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
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private breakables!: Phaser.Physics.Arcade.StaticGroup;
  private acidPools!: Phaser.Physics.Arcade.StaticGroup;
  private meleeDoors!: Phaser.Physics.Arcade.StaticGroup;
  private deathMarker: DeathMarker | null = null;
  private boss: Boss | null = null;
  
  // Safe position tracking for acid respawn
  private lastSafeX = 0;
  private lastSafeY = 0;
  
  // Visual systems
  private parallaxBg: ParallaxBackground | null = null;
  private greenwayParallax: GreenwayParallax | null = null;
  private dustParticles: DustParticles | null = null;
  private leafParticles: LeafParticles | null = null;
  private flyingSpawner: FlyingEnemySpawner | null = null;
  
  // Level data
  currentLevel!: LevelConfig;
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
  
  // Boss summon tracking
  private bossSummoned = false;

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
    this.spikes = this.physics.add.staticGroup();
    this.breakables = this.physics.add.staticGroup();
    this.acidPools = this.physics.add.staticGroup();
    this.meleeDoors = this.physics.add.staticGroup();
    
    // Create visual effects based on level biome
    const biome = (this.currentLevel as any).biome || 'crossroads';
    if (this.levelId === 'forgottenCrossroads' || this.levelId === 'ruinedCrossroads') {
      this.parallaxBg = new ParallaxBackground(this);
      this.dustParticles = new DustParticles(this);
    } else if (biome === 'greenway' || this.levelId === 'greenway' || this.levelId === 'greenwayGenerated' || this.levelId === 'mossTitanArena') {
      this.greenwayParallax = new GreenwayParallax(this);
      this.leafParticles = new LeafParticles(this, this.currentLevel.height);
      this.createGreenwayEnvironment();
    }
    
    // Build level
    this.buildLevel();
    
    // Create player at spawn
    const spawn = this.currentLevel.spawns[this.spawnId] || this.currentLevel.spawnPoint;
    this.player = new Player(this, spawn.x, spawn.y);
    this.lastSafeX = spawn.x;
    this.lastSafeY = spawn.y;
    
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
    
    // Auto-enter boss arena if loading a dedicated boss arena level
    if (this.levelId === 'mossTitanArena' && this.currentLevel.bossArena) {
      this.time.delayedCall(500, () => {
        this.enterBossArena();
      });
    }
  }
  
  private setupDebugMode(): void {
    // Enable physics debug
    this.physics.world.createDebugGraphic();
    
    // Create debug overlay graphics
    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(1000);
    
    // Show debug info text with controls
    const debugText = this.add.text(10, 10, 
      `DEBUG MODE\n1: Fading Town | 2: Forgotten Crossroads | 3: Ruins\n4: Chain Room | 5: Greenway | 6: Boss Arena\nB: Boss | H: Heal | G: +100 Shells\nI: Instakill [${gameState.isInstakillMode() ? 'ON' : 'OFF'}]`, {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#ff6644',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 6 },
      lineSpacing: 4
    });
    debugText.setScrollFactor(0);
    debugText.setDepth(1001);
    
    // Store reference to update text
    this.registry.set('debugText', debugText);
    
    // Add keyboard shortcuts for debug using correct Phaser key codes
    if (this.input.keyboard) {
      // Number keys for level teleport
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if (event.key === '1') {
          console.log('Teleporting to fadingTown');
          this.teleportToLevel('fadingTown');
        } else if (event.key === '2') {
          console.log('Teleporting to forgottenCrossroads');
          this.teleportToLevel('forgottenCrossroads');
        } else if (event.key === '3') {
          console.log('Teleporting to ruinedCrossroads');
          this.teleportToLevel('ruinedCrossroads');
        } else if (event.key === '4') {
          console.log('Teleporting to chainRoom');
          this.teleportToLevel('chainRoom');
        } else if (event.key === '5') {
          console.log('Teleporting to greenway');
          this.teleportToLevel('greenway');
        } else if (event.key === '6') {
          console.log('Teleporting to Moss Titan Arena');
          this.teleportToLevel('mossTitanArena');
        } else if (event.key === 'b' || event.key === 'B') {
          if (this.currentLevel.bossArena) {
            console.log('Entering boss arena');
            this.enterBossArena();
          } else {
            console.log('No boss arena in this level');
          }
        } else if (event.key === 'h' || event.key === 'H') {
          console.log('Full heal');
          gameState.fullHeal();
          this.emitUIEvent('hpChange', gameState.getPlayerData());
        } else if (event.key === 'g' || event.key === 'G') {
          console.log('Giving 100 shells');
          this.giveShells(100);
        } else if (event.key === 'i' || event.key === 'I') {
          const newState = !gameState.isInstakillMode();
          gameState.setInstakillMode(newState);
          console.log(`Instakill mode: ${newState ? 'ON' : 'OFF'}`);
          // Update debug text
          const debugTextObj = this.registry.get('debugText') as Phaser.GameObjects.Text;
          if (debugTextObj) {
            debugTextObj.setText(`DEBUG MODE\n1: Fading Town | 2: Forgotten Crossroads | 3: Ruins\n4: Chain Room | 5: Greenway | 6: Boss Arena\nB: Boss | H: Heal | G: +100 Shells\nI: Instakill [${newState ? 'ON' : 'OFF'}]`);
          }
        }
      });
    }
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
      } else if (t.type === 'chain') {
        // Giant chain - create visual and interaction zone
        this.createChainVisual(t.x, t.y, t.width, t.height);
      } else if (t.type === 'shop') {
        // Charm shop NPC
        this.createShopNPC(t.x, t.y);
      } else if (t.type === 'endDoor') {
        // End game door (legacy)
        this.createEndDoor(t.x, t.y, t.width, t.height);
      } else if (t.type === 'greenwayDoor') {
        // Door to Greenway with dialogue
        this.createGreenwayDoor(t.x, t.y, t.width, t.height);
      }
    });
    
    // Initialize flying enemy spawner
    this.flyingSpawner = new FlyingEnemySpawner(this, this.enemies);
    
    // Enemies
    this.currentLevel.enemies.forEach(e => {
      const config = (enemiesData as Record<string, EnemyCombatConfig>)[e.type];
      if (config) {
        // Greenway-specific enemies
        if (e.type === 'mosskin') {
          const mosskin = new Mosskin(this, e.x, e.y, config);
          this.enemies.add(mosskin);
        } else if (e.type === 'mossCreep') {
          const surface = (e as any).surface || 'floor';
          const mossCreep = new MossCreep(this, e.x, e.y, config, surface);
          this.enemies.add(mossCreep);
        } else if (e.type === 'mossWarrior') {
          // Elite Moss Warrior - dual-state enemy
          const mossWarrior = new MossWarrior(this, e.x, e.y, config);
          this.enemies.add(mossWarrior);
        } else if (e.type === 'squit') {
          // Squit - Greenway flying enemy with lunge attack
          const squit = new Squit(this, e.x, e.y, config);
          this.enemies.add(squit);
        }
        // Use FlyingEnemySpawner for flying enemies (vengefly type uses random spawner)
        else if (e.type === 'vengefly' || ((config as any).isFlying && e.type !== 'squit')) {
          // Use spawner for random Vengefly/Aspid selection
          this.flyingSpawner!.spawnAt(e.x, e.y);
        } else if (e.type === 'aspid') {
          // Force Aspid if explicitly specified
          this.flyingSpawner!.spawnAt(e.x, e.y, 'aspid');
        } else if (e.type === 'huskGuard') {
          const huskGuard = new HuskGuard(this, e.x, e.y, config);
          this.enemies.add(huskGuard);
        } else if ((config as any).isElite && e.type !== 'mossWarrior') {
          // Other elite enemies use HuskGuard behavior
          const huskGuard = new HuskGuard(this, e.x, e.y, config);
          this.enemies.add(huskGuard);
        } else if (e.type === 'infectedHusk' || (config as any).isPassive) {
          const infectedHusk = new InfectedHusk(this, e.x, e.y, config);
          this.enemies.add(infectedHusk);
        } else if (e.type === 'basicHusk') {
          // Explicit BasicHusk spawn
          const huskConfig = (enemiesData as Record<string, EnemyCombatConfig>)['basicHusk'];
          const husk = new BasicHusk(this, e.x, e.y, huskConfig);
          this.enemies.add(husk);
        } else {
          // Basic crawler enemies - 40% chance to replace with BasicHusk
          const replaceWithHusk = Math.random() < 0.4;
          if (replaceWithHusk) {
            const huskConfig = (enemiesData as Record<string, EnemyCombatConfig>)['basicHusk'];
            const husk = new BasicHusk(this, e.x, e.y, huskConfig);
            this.enemies.add(husk);
          } else {
            const enemy = new Enemy(this, e.x, e.y, config);
            this.enemies.add(enemy);
          }
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
    
    // Spikes (hazards)
    if (this.currentLevel.spikes) {
      this.currentLevel.spikes.forEach(s => {
        const spike = new Spike(this, s.x, s.y, s.width);
        this.spikes.add(spike);
      });
    }
    
    // Breakables (environmental objects that drop currency)
    if (this.currentLevel.breakables) {
      this.currentLevel.breakables.forEach(b => {
        const breakable = new Breakable(this, b.x, b.y, b.type);
        this.breakables.add(breakable);
      });
    }
    
    // Acid pools (Greenway hazard)
    if ((this.currentLevel as any).acidPools) {
      (this.currentLevel as any).acidPools.forEach((a: any) => {
        const acid = new AcidPool(this, a.x, a.y, a.width, a.height || 30);
        this.acidPools.add(acid);
      });
    }
    
    // Melee doors
    if ((this.currentLevel as any).meleeDoors) {
      (this.currentLevel as any).meleeDoors.forEach((d: any) => {
        const door = new MeleeDoor(this, d.x, d.y, d.width, d.height, d.doorId);
        this.meleeDoors.add(door);
      });
    }
    
    // Infection globules (decorative)
    if ((this.currentLevel as any).infectionGlobules) {
      (this.currentLevel as any).infectionGlobules.forEach((g: any) => {
        new InfectionGlobule(this, g.x, g.y, g.size);
      });
    }
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
    
    // Player vs spikes (hazard damage)
    this.physics.add.overlap(this.player, this.spikes,
      (player, spike) => {
        const s = spike as Spike;
        s.onPlayerContact(this.player);
      }
    );
    
    // Player vs acid pools (Greenway hazard)
    this.physics.add.overlap(this.player, this.acidPools,
      (player, acid) => {
        const a = acid as AcidPool;
        a.onPlayerContact(this.player, this.lastSafeX, this.lastSafeY);
      }
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
    // Reset camera look-ahead to prevent offset issues on level load
    this.cameraLookAheadX = 0;
    cam.setFollowOffset(0, 0);
    
    // Use improved camera lerp from movement config
    cam.startFollow(this.player, true, 0.12, 0.10);
    cam.setBounds(0, 0, this.currentLevel.width, this.currentLevel.height);
    cam.setZoom(1);
    cam.setDeadzone(20, 30); // Small deadzone for stability
    
    // Immediately center camera on player to prevent off-screen start
    cam.centerOn(this.player.x, this.player.y);
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
      
      // Track last safe position for acid pool respawn
      if (this.player.isOnGround()) {
        this.lastSafeX = this.player.x;
        this.lastSafeY = this.player.y;
      }
      
      // Update camera look-ahead based on player facing
      this.updateCameraLookAhead();
      
      // Update enemies (all types: ground, flying, elite, passive)
      this.enemies.getChildren().forEach((enemy) => {
        const e = enemy as Enemy | Vengefly | HuskGuard | InfectedHusk;
        e.update(time, delta, this.player);
      });
      
      // Update portals cooldown
      this.portals.getChildren().forEach((portal) => {
        const p = portal as Portal;
        p.update(delta);
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
      
      // Update chain room interactions
      this.updateChainRoomInteractions();
      
      // Update parallax background
      if (this.parallaxBg) {
        this.parallaxBg.update();
      }
      
      // Check if all enemies are dead in boss arena and summon boss
      this.checkBossSummon();
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
    const baseDamage = PLAYER_CONFIG.attackDamage + gameState.getCharmModifier('damageMod');
    const damage = gameState.isInstakillMode() ? 100000 : baseDamage;
    let hitSomething = false;
    
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as any; // Could be Enemy, BasicHusk, Vengefly, etc.
      if (!e.isDying() && !e.isInvulnerable()) {
        // Use getHitRect if available, otherwise getBounds
        const enemyBounds = e.getHitRect ? e.getHitRect() : e.getBounds();
        if (Phaser.Geom.Rectangle.Overlaps(hitbox, enemyBounds)) {
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
      // Add soul on successful hit
      gameState.addSoulOnHit();
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
    
    // Notify BasicHusk that it hit the player (to stop charging)
    if ((enemy as any).onHitPlayer) {
      (enemy as any).onHitPlayer();
    }
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
    
    // Trigger the portal use to set cooldowns
    portal.triggerUse();
    
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
    
    // Spawn appropriate boss based on level
    if (this.levelId === 'mossTitanArena') {
      // Spawn Moss Titan
      const mossTitan = new MossTitan(this, arena.bossSpawn.x, arena.bossSpawn.y);
      this.boss = mossTitan as any;
    } else {
      // Spawn default boss
      this.boss = new Boss(this, arena.bossSpawn.x, arena.bossSpawn.y);
    }
    
    this.physics.add.collider(this.boss, this.platforms);
    this.physics.add.collider(this.boss, this.walls);
    this.physics.add.overlap(this.player, this.boss,
      () => this.handlePlayerBossContact()
    );
    
    // Create and close gates
    this.createBossGates(arena.x, arena.y, arena.width, arena.height);
    
    // Close gate
    this.bossGateClosed = true;
    
    // Show boss name intro
    this.showBossIntro(this.boss.getName());
    
    // Emit boss start (after intro delay)
    this.time.delayedCall(2000, () => {
      this.emitUIEvent('bossStart', {
        name: this.boss?.getName(),
        maxHp: this.boss?.getMaxHp(),
      });
    });
  }
  
  private showBossIntro(bossName: string): void {
    // Create dramatic boss name display
    const centerX = this.cameras.main.width / 2;
    const bottomY = this.cameras.main.height - 100;
    
    // Get boss config for color and subtitle
    let nameColor = '#ffffff';
    let subtitleText = '~ Champion of the Forgotten ~';
    
    if (this.boss && (this.boss as any).getNameColor) {
      nameColor = (this.boss as any).getNameColor();
      subtitleText = (this.boss as any).getSubtitle();
    }
    
    // Background bar
    const bgBar = this.add.rectangle(centerX, bottomY, 0, 70, 0x000000, 0.8);
    bgBar.setScrollFactor(0);
    bgBar.setDepth(1000);
    
    // Boss name text
    const nameText = this.add.text(centerX, bottomY - 10, bossName.toUpperCase(), {
      fontFamily: 'Georgia, serif',
      fontSize: '48px',
      color: nameColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    nameText.setOrigin(0.5);
    nameText.setScrollFactor(0);
    nameText.setDepth(1001);
    nameText.setAlpha(0);
    
    // Subtitle
    const subtitle = this.add.text(centerX, bottomY + 35, subtitleText, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: nameColor,
      fontStyle: 'italic',
    });
    subtitle.setOrigin(0.5);
    subtitle.setScrollFactor(0);
    subtitle.setDepth(1001);
    subtitle.setAlpha(0);
    
    // Animate in
    this.tweens.add({
      targets: bgBar,
      width: 600,
      duration: 300,
      ease: 'Power2'
    });
    
    this.tweens.add({
      targets: [nameText, subtitle],
      alpha: 1,
      duration: 500,
      delay: 200,
      ease: 'Power2'
    });
    
    // Hold for 2 seconds, then fade out
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [nameText, subtitle, bgBar],
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          nameText.destroy();
          subtitle.destroy();
          bgBar.destroy();
        }
      });
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
  
  // Chain Room elements
  private chainZone: Phaser.GameObjects.Zone | null = null;
  private shopZone: Phaser.GameObjects.Zone | null = null;
  private endDoorZone: Phaser.GameObjects.Zone | null = null;
  private greenwayDoorZone: Phaser.GameObjects.Zone | null = null;
  
  // Interaction tracking (for checking input in update loop)
  private chainPromptText: Phaser.GameObjects.Text | null = null;
  private shopPromptText: Phaser.GameObjects.Text | null = null;
  private greenwayPromptText: Phaser.GameObjects.Text | null = null;
  
  private updateChainRoomInteractions(): void {
    // Check chain interaction
    if (this.chainZone && this.chainPromptText) {
      const inRange = this.physics.overlap(this.player, this.chainZone);
      this.chainPromptText.setVisible(inRange);
      if (inRange && inputManager.justPressed('interact')) {
        this.emitUIEvent('climbChain', null);
      }
    }
    
    // Check shop interaction
    if (this.shopZone && this.shopPromptText) {
      const inRange = this.physics.overlap(this.player, this.shopZone);
      this.shopPromptText.setVisible(inRange);
      if (inRange && inputManager.justPressed('interact')) {
        this.emitUIEvent('openShop', null);
      }
    }
    
    // Check greenway door interaction
    if (this.greenwayDoorZone && this.greenwayPromptText) {
      const inRange = this.physics.overlap(this.player, this.greenwayDoorZone);
      this.greenwayPromptText.setVisible(inRange);
      if (inRange && inputManager.justPressed('interact')) {
        this.emitUIEvent('showGreenwayDialog', null);
      }
    }
  }
  
  private createChainVisual(x: number, y: number, width: number, height: number): void {
    // Create the giant chain visual
    const chainCenterX = x + width / 2;
    
    // Chain background (dark iron)
    const chainBg = this.add.rectangle(chainCenterX, y + height / 2, width - 10, height, 0x3a3a40);
    chainBg.setDepth(5);
    
    // Chain links
    const linkCount = Math.floor(height / 30);
    for (let i = 0; i < linkCount; i++) {
      const linkY = y + 15 + i * 30;
      const link = this.add.ellipse(chainCenterX, linkY, width - 20, 25, 0x555560);
      link.setStrokeStyle(3, 0x666670);
      link.setDepth(6);
    }
    
    // Chain glow effect
    const glow = this.add.rectangle(chainCenterX, y + height / 2, width + 20, height + 20, 0x5599dd, 0.1);
    glow.setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.05, to: 0.15 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });
    
    // Create interaction zone
    this.chainZone = this.add.zone(chainCenterX, y + height - 100, width + 40, 150);
    this.physics.add.existing(this.chainZone, true);
    
    // Prompt text - store reference for update loop
    this.chainPromptText = this.add.text(chainCenterX, y + height - 30, '[INTERACT]', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 }
    });
    this.chainPromptText.setOrigin(0.5);
    this.chainPromptText.setDepth(100);
    this.chainPromptText.setVisible(false);
  }
  
  private createShopNPC(x: number, y: number): void {
    // Create shop NPC visual
    const npcX = x + 40;
    const npcY = y + 35;
    
    // NPC body
    const npcBody = this.add.ellipse(npcX, npcY, 40, 50, 0x6a5a50);
    npcBody.setDepth(10);
    
    // NPC head/mask
    const npcHead = this.add.ellipse(npcX, npcY - 30, 30, 25, 0xe8e0d8);
    npcHead.setDepth(11);
    
    // Eyes
    this.add.circle(npcX - 6, npcY - 32, 4, 0x1a1a20).setDepth(12);
    this.add.circle(npcX + 6, npcY - 32, 4, 0x1a1a20).setDepth(12);
    
    // Shop sign
    const signBg = this.add.rectangle(npcX, npcY - 70, 80, 25, 0x2a2a30);
    signBg.setDepth(10);
    const signText = this.add.text(npcX, npcY - 70, 'CHARMS', {
      fontSize: '12px',
      color: '#d4a84b',
      fontStyle: 'bold'
    });
    signText.setOrigin(0.5);
    signText.setDepth(11);
    
    // Interaction zone
    this.shopZone = this.add.zone(npcX, npcY, 100, 100);
    this.physics.add.existing(this.shopZone, true);
    
    // Prompt - store reference for update loop
    this.shopPromptText = this.add.text(npcX, npcY + 50, '[SHOP]', {
      fontSize: '14px',
      color: '#d4a84b',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 }
    });
    this.shopPromptText.setOrigin(0.5);
    this.shopPromptText.setDepth(100);
    this.shopPromptText.setVisible(false);
  }
  
  private createEndDoor(x: number, y: number, width: number, height: number): void {
    // Heavy stone door visual
    const doorX = x + width / 2;
    const doorY = y + height / 2;
    
    // Door frame
    const frame = this.add.rectangle(doorX, doorY, width + 20, height + 10, 0x2a2a30);
    frame.setDepth(5);
    
    // Door panels
    const door = this.add.rectangle(doorX, doorY, width, height, 0x4a4a50);
    door.setDepth(6);
    
    // Door details
    this.add.rectangle(doorX - 8, doorY, 3, height - 20, 0x3a3a40).setDepth(7);
    this.add.rectangle(doorX + 8, doorY, 3, height - 20, 0x3a3a40).setDepth(7);
    
    // Mysterious glow
    const glow = this.add.rectangle(doorX, doorY, width + 30, height + 20, 0x5599dd, 0.1);
    glow.setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.05, to: 0.2 },
      duration: 3000,
      yoyo: true,
      repeat: -1
    });
    
    // Interaction zone
    this.endDoorZone = this.add.zone(doorX, doorY, width + 20, height + 20);
    this.physics.add.existing(this.endDoorZone, true);
    
    this.physics.add.overlap(this.player, this.endDoorZone, () => {
      this.emitUIEvent('showEnding', null);
    });
  }
  
  private createGreenwayDoor(x: number, y: number, width: number, height: number): void {
    // Heavy stone door with green/moss glow
    const doorX = x + width / 2;
    const doorY = y + height / 2;
    
    // Door frame
    const frame = this.add.rectangle(doorX, doorY, width + 20, height + 10, 0x2a3a2a);
    frame.setDepth(5);
    
    // Door panels with mossy tint
    const door = this.add.rectangle(doorX, doorY, width, height, 0x4a5a4a);
    door.setDepth(6);
    
    // Door details - vine-like lines
    this.add.rectangle(doorX - 8, doorY, 3, height - 20, 0x3a4a3a).setDepth(7);
    this.add.rectangle(doorX + 8, doorY, 3, height - 20, 0x3a4a3a).setDepth(7);
    
    // Green glow
    const glow = this.add.rectangle(doorX, doorY, width + 30, height + 20, 0x55dd88, 0.1);
    glow.setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.05, to: 0.2 },
      duration: 3000,
      yoyo: true,
      repeat: -1
    });
    
    // Vines decoration
    for (let i = 0; i < 3; i++) {
      const vine = this.add.ellipse(doorX - 20 + i * 20, doorY - 40, 4, 30, 0x55aa55);
      vine.setDepth(8);
    }
    
    // Prompt text - store reference for update loop
    this.greenwayPromptText = this.add.text(doorX, doorY + 60, '[ENTER]', {
      fontSize: '14px',
      color: '#55dd88',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 }
    });
    this.greenwayPromptText.setOrigin(0.5);
    this.greenwayPromptText.setDepth(100);
    this.greenwayPromptText.setVisible(false);
    
    // Interaction zone
    this.greenwayDoorZone = this.add.zone(doorX, doorY, width + 40, height + 40);
    this.physics.add.existing(this.greenwayDoorZone, true);
  }
  
  // Greenway environment visuals
  private createGreenwayEnvironment(): void {
    const width = this.currentLevel.width;
    const height = this.currentLevel.height;
    
    // Background gradient - deep green
    const bgGradient = this.add.graphics();
    bgGradient.fillGradientStyle(0x0a1810, 0x0a1810, 0x142818, 0x142818, 1);
    bgGradient.fillRect(0, 0, width, height);
    bgGradient.setDepth(-10);
    
    // Hanging vines in background
    for (let i = 0; i < 20; i++) {
      const vineX = Phaser.Math.Between(50, width - 50);
      const vineLength = Phaser.Math.Between(80, 200);
      const vine = this.add.rectangle(vineX, vineLength / 2, 3, vineLength, 0x3a6a3a);
      vine.setAlpha(0.3 + Math.random() * 0.3);
      vine.setDepth(-5);
      
      // Animate vine sway
      this.tweens.add({
        targets: vine,
        x: vine.x + Phaser.Math.Between(-5, 5),
        duration: 2000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Leaf particles
    for (let i = 0; i < 15; i++) {
      const leafX = Phaser.Math.Between(0, width);
      const leafY = Phaser.Math.Between(0, height);
      const leaf = this.add.ellipse(leafX, leafY, 6, 4, 0x6ec472);
      leaf.setAlpha(0.4 + Math.random() * 0.3);
      leaf.setDepth(1);
      
      // Float animation
      this.tweens.add({
        targets: leaf,
        x: leaf.x + Phaser.Math.Between(-30, 30),
        y: leaf.y + Phaser.Math.Between(20, 50),
        alpha: 0,
        duration: 4000 + Math.random() * 3000,
        onComplete: () => {
          leaf.setPosition(Phaser.Math.Between(0, width), -10);
          leaf.setAlpha(0.4 + Math.random() * 0.3);
          this.tweens.add({
            targets: leaf,
            x: leaf.x + Phaser.Math.Between(-30, 30),
            y: height + 20,
            alpha: 0,
            duration: 5000 + Math.random() * 3000,
            repeat: -1
          });
        }
      });
    }
    
    // Glowing moss spots on ground
    for (let i = 0; i < 10; i++) {
      const mossX = Phaser.Math.Between(100, width - 100);
      const moss = this.add.ellipse(mossX, height - 60, 40, 15, 0x4a8a4a, 0.3);
      moss.setDepth(-4);
      
      // Pulse glow
      this.tweens.add({
        targets: moss,
        alpha: 0.15,
        duration: 1500 + Math.random() * 1000,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Add moss to platforms (visual only)
    this.currentLevel.platforms.forEach(p => {
      if ((p as any).mossy && p.type === 'platform') {
        // Moss top layer
        const mossTop = this.add.rectangle(
          p.x + p.width / 2,
          p.y + 5,
          p.width + 10,
          10,
          0x5a9a5a
        );
        mossTop.setDepth(3);
        
        // Small glowing plants
        for (let i = 0; i < 3; i++) {
          const plantX = p.x + 10 + i * (p.width / 3);
          const plant = this.add.ellipse(plantX, p.y - 5, 4, 8, 0x7acc7a);
          plant.setDepth(4);
          
          this.tweens.add({
            targets: plant,
            scaleY: 1.2,
            duration: 1000 + Math.random() * 500,
            yoyo: true,
            repeat: -1
          });
        }
      }
    });
  }
  
  // Transition to Greenway (called from React UI)
  transitionToGreenway(): void {
    this.transitionToLevel('greenwayGenerated', 'fromChainRoom');
  }
  
  /**
   * Check if all enemies are dead and summon boss for Moss Titan Arena
   */
  private checkBossSummon(): void {
    // Only for Moss Titan Arena level
    if (this.levelId !== 'mossTitanArena') return;
    
    // If boss already summoned or player is already in boss fight, don't check
    if (this.bossSummoned || this.inBossArena) return;
    
    // Check if all enemies are dead
    const activeEnemies = this.enemies.getChildren().filter((enemy) => {
      const e = enemy as any;
      return !e.isDying();
    });
    
    if (activeEnemies.length === 0 && !this.bossSummoned) {
      // All enemies dead, spawn boss
      this.bossSummoned = true;
      
      // Delay slightly before spawning
      this.time.delayedCall(1000, () => {
        this.enterBossArena();
      });
    }
  }
}
