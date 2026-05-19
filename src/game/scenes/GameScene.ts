import Phaser from 'phaser';
import { COLORS, PLAYER_CONFIG, LevelConfig } from '../core/GameConfig';
import { COMBAT_TUNING, EnemyCombatConfig } from '../core/CombatConfig';
import { MOVEMENT_TUNING } from '../core/MovementConfig';
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
import { SkullScuttler } from '../entities/SkullScuttler';
import { AdaptedSkuller } from '../entities/AdaptedSkuller';
import { SkullRavager } from '../entities/SkullRavager';
import { MegaSkullRavager } from '../entities/MegaSkullRavager';
import { FrontierScout } from '../entities/FrontierScout';
import { FrontierWarrior } from '../entities/FrontierWarrior';
import { WingedWarrior } from '../entities/WingedWarrior';
import { ColonyVanguard } from '../entities/ColonyVanguard';
import { WingedCommander } from '../entities/WingedCommander';
import { FrostCharger } from '../entities/FrostCharger';
import { FrostShard } from '../entities/FrostShard';
import { GlacialSentinel } from '../entities/GlacialSentinel';
import { FrozenGatekeeper } from '../entities/FrozenGatekeeper';
import { SiegeConstruct } from '../entities/SiegeConstruct';
import { GlacialTitan } from '../entities/GlacialTitan';
import { AutumnWraith } from '../entities/AutumnWraith';
import { OssuarySentinel } from '../entities/OssuarySentinel';
import { WarfieldReaper } from '../entities/WarfieldReaper';
import { BrokenEffigy } from '../entities/BrokenEffigy';
import { WarfieldBrute } from '../entities/WarfieldBrute';
import { ArborealWarGoliath } from '../entities/ArborealWarGoliath';
import { WarfieldMedic } from '../entities/WarfieldMedic';
import { Boss } from '../entities/Boss';
import { MossTitan } from '../entities/MossTitan';
import { AntElder } from '../entities/AntElder';
import { Ravana } from '../entities/Ravana';
import { Pickup } from '../entities/Pickup';
import { Bench } from '../entities/Bench';
import { Portal } from '../entities/Portal';
import { DeathMarker } from '../entities/DeathMarker';
import { Spike } from '../entities/Spike';
import { Breakable } from '../entities/Breakable';
import { AcidPool } from '../entities/AcidPool';
import { Lava } from '../entities/Lava';
import { Magma } from '../entities/Magma';
import { MeleeDoor } from '../entities/MeleeDoor';
import { InfectionGlobule, InfectionParticles } from '../entities/InfectionGlobule';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { DustParticles } from '../systems/DustParticles';
import { FlyingEnemySpawner } from '../systems/FlyingEnemySpawner';
import { generateForgottenCrossroads } from '../systems/RoomGenerator';
import { generateGreenway } from '../systems/GreenwayRoomGenerator';
import { GreenwayParallax } from '../systems/GreenwayParallax';
import { LeafParticles } from '../systems/LeafParticles';
import { MedullaParallax } from '../systems/MedullaParallax';

// Import level data
import fadingTownData from '../data/levels/fadingTown.json';
import ruinedCrossroadsData from '../data/levels/ruinedCrossroads.json';
import chainRoomData from '../data/levels/chainRoom.json';
import greenwayData from '../data/levels/greenway.json';
import mossTitanArenaData from '../data/levels/mossTitanArena.json';
import theMedullaData from '../data/levels/theMedulla.json';
import enemiesData from '../data/enemies.json';
import bossesData from '../data/boss.json';

// Medulla room data (16 rooms)
import medullaRoom1Data from '../data/levels/medulla/room1-ribGate.json';
import medullaRoom3Data from '../data/levels/medulla/room3-marrowTap4B.json';
import medullaRoom5Data from '../data/levels/medulla/room5-thermalVent.json';
import medullaRoom7Data from '../data/levels/medulla/room7-ossuaryGate.json';
import medullaRoom8Data from '../data/levels/medulla/room8-theTyrant.json';
import medullaRoom11Data from '../data/levels/medulla/room11-incubationWall.json';
import medullaRoom14Data from '../data/levels/medulla/room14-tyrantRematch.json';
import medullaRoom17Data from '../data/levels/medulla/room17-hangingRibs.json';
import medullaRoom20Data from '../data/levels/medulla/room20-tyrantSnipingPerch.json';
import medullaRoom23Data from '../data/levels/medulla/room23-trinityArena.json';
import medullaRoom25Data from '../data/levels/medulla/room25-deepStomach.json';
import medullaRoom27Data from '../data/levels/medulla/room27-teethOfTheTitan.json';
import medullaRoom29Data from '../data/levels/medulla/room29-lipOfTheBeast.json';
import medullaRoom31Data from '../data/levels/medulla/room31-finalPassage.json';
import medullaRoom32Data from '../data/levels/medulla/room32-bossArena.json';
import skullRavagerArenaData from '../data/levels/medulla/skullRavagerArena.json';
import chamberOfTheHunterData from '../data/levels/medulla/chamberOfTheHunter.json';
import huntersMarchData from '../data/levels/huntersMarch.json';
import huntersMarchRoom2Data from '../data/levels/huntersMarchRoom2.json';
import huntersMarchRoom3Data from '../data/levels/huntersMarchRoom3.json';
import huntersMarchRoom4Data from '../data/levels/huntersMarchRoom4.json';
import huntersMarchRoom5Data from '../data/levels/huntersMarchRoom5.json';
import huntersMarchRoom6Data from '../data/levels/huntersMarchRoom6.json';
import huntersMarchRemix1Data from '../data/levels/huntersMarchRemix1.json';
import huntersMarchRemix2Data from '../data/levels/huntersMarchRemix2.json';
import huntersMarchRemix3Data from '../data/levels/huntersMarchRemix3.json';
import huntersMarchRemix4Data from '../data/levels/huntersMarchRemix4.json';
import huntersMarchBenchRoomData from '../data/levels/huntersMarchBenchRoom.json';
import huntersMarchBossArenaData from '../data/levels/huntersMarchBossArena.json';
import chainRoomPostAntElderData from '../data/levels/chainRoomPostAntElder.json';
import shroomialLandsData from '../data/levels/shroomialLands.json';
import freezingPlainsData from '../data/levels/freezingPlains.json';
import freezingPlainsRoom2Data from '../data/levels/freezingPlainsRoom2.json';
import freezingPlainsRoom3Data from '../data/levels/freezingPlainsRoom3.json';
import freezingPlainsRoom4Data from '../data/levels/freezingPlainsRoom4.json';
import freezingPlainsRoom5Data from '../data/levels/freezingPlainsRoom5.json';
import freezingPlainsRoom6Data from '../data/levels/freezingPlainsRoom6.json';
import freezingPlainsRoom7Data from '../data/levels/freezingPlainsRoom7.json';
import freezingPlainsBenchData from '../data/levels/freezingPlainsBench.json';
import freezingPlainsRoom8Data from '../data/levels/freezingPlainsRoom8.json';
import freezingPlainsRoom9Data from '../data/levels/freezingPlainsRoom9.json';
import freezingPlainsRoom10Data from '../data/levels/freezingPlainsRoom10.json';
import freezingPlainsRoom11Data from '../data/levels/freezingPlainsRoom11.json';
import freezingPlainsRoom12Data from '../data/levels/freezingPlainsRoom12.json';
import freezingPlainsRoom13Data from '../data/levels/freezingPlainsRoom13.json';
import freezingPlainsRoom14Data from '../data/levels/freezingPlainsRoom14.json';
import freezingPlainsRoom15Data from '../data/levels/freezingPlainsRoom15.json';
import freezingPlainsRoom16Data from '../data/levels/freezingPlainsRoom16.json';
import glacialTitanArenaData from '../data/levels/glacialTitanArena.json';
import forgottenBattlefieldData from '../data/levels/forgottenBattlefield.json';
import endlessArenaData from '../data/levels/endlessArena.json';
import gatekeeperArena1Data from '../data/levels/gatekeeperArena1.json';
import gatekeeperArena2Data from '../data/levels/gatekeeperArena2.json';
import gatekeeperArena3Data from '../data/levels/gatekeeperArena3.json';
import gatekeeperArena4Data from '../data/levels/gatekeeperArena4.json';

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
  theMedulla: theMedullaData as LevelConfig,
  // Medulla rooms (16 rooms)
  medullaRoom1: medullaRoom1Data as unknown as LevelConfig,
  medullaRoom3: medullaRoom3Data as unknown as LevelConfig,
  medullaRoom5: medullaRoom5Data as unknown as LevelConfig,
  medullaRoom7: medullaRoom7Data as unknown as LevelConfig,
  medullaRoom8: medullaRoom8Data as unknown as LevelConfig,
  medullaRoom11: medullaRoom11Data as unknown as LevelConfig,
  medullaRoom14: medullaRoom14Data as unknown as LevelConfig,
  medullaRoom17: medullaRoom17Data as unknown as LevelConfig,
  medullaRoom20: medullaRoom20Data as unknown as LevelConfig,
  medullaRoom23: medullaRoom23Data as unknown as LevelConfig,
  medullaRoom25: medullaRoom25Data as unknown as LevelConfig,
  medullaRoom27: medullaRoom27Data as unknown as LevelConfig,
  medullaRoom29: medullaRoom29Data as unknown as LevelConfig,
  medullaRoom31: medullaRoom31Data as unknown as LevelConfig,
  medullaRoom32: medullaRoom32Data as unknown as LevelConfig,
  skullRavagerArena: skullRavagerArenaData as unknown as LevelConfig,
  chamberOfTheHunter: chamberOfTheHunterData as unknown as LevelConfig,
  huntersMarch: huntersMarchData as unknown as LevelConfig,
  huntersMarchRoom2: huntersMarchRoom2Data as unknown as LevelConfig,
  huntersMarchRoom3: huntersMarchRoom3Data as unknown as LevelConfig,
  huntersMarchRoom4: huntersMarchRoom4Data as unknown as LevelConfig,
  huntersMarchRoom5: huntersMarchRoom5Data as unknown as LevelConfig,
  huntersMarchRoom6: huntersMarchRoom6Data as unknown as LevelConfig,
  huntersMarchRemix1: huntersMarchRemix1Data as unknown as LevelConfig,
  huntersMarchRemix2: huntersMarchRemix2Data as unknown as LevelConfig,
  huntersMarchRemix3: huntersMarchRemix3Data as unknown as LevelConfig,
  huntersMarchRemix4: huntersMarchRemix4Data as unknown as LevelConfig,
  huntersMarchBenchRoom: huntersMarchBenchRoomData as unknown as LevelConfig,
  huntersMarchBossArena: huntersMarchBossArenaData as unknown as LevelConfig,
  chainRoomPostAntElder: chainRoomPostAntElderData as unknown as LevelConfig,
  shroomialLands: shroomialLandsData as unknown as LevelConfig,
  freezingPlains: freezingPlainsData as unknown as LevelConfig,
  freezingPlainsRoom2: freezingPlainsRoom2Data as unknown as LevelConfig,
  freezingPlainsRoom3: freezingPlainsRoom3Data as unknown as LevelConfig,
  freezingPlainsRoom4: freezingPlainsRoom4Data as unknown as LevelConfig,
  freezingPlainsRoom5: freezingPlainsRoom5Data as unknown as LevelConfig,
  freezingPlainsRoom6: freezingPlainsRoom6Data as unknown as LevelConfig,
  freezingPlainsRoom7: freezingPlainsRoom7Data as unknown as LevelConfig,
  freezingPlainsBench: freezingPlainsBenchData as unknown as LevelConfig,
  freezingPlainsRoom8: freezingPlainsRoom8Data as unknown as LevelConfig,
  freezingPlainsRoom9: freezingPlainsRoom9Data as unknown as LevelConfig,
  freezingPlainsRoom10: freezingPlainsRoom10Data as unknown as LevelConfig,
  freezingPlainsRoom11: freezingPlainsRoom11Data as unknown as LevelConfig,
  freezingPlainsRoom12: freezingPlainsRoom12Data as unknown as LevelConfig,
  freezingPlainsRoom13: freezingPlainsRoom13Data as unknown as LevelConfig,
  freezingPlainsRoom14: freezingPlainsRoom14Data as unknown as LevelConfig,
  freezingPlainsRoom15: freezingPlainsRoom15Data as unknown as LevelConfig,
  freezingPlainsRoom16: freezingPlainsRoom16Data as unknown as LevelConfig,
  glacialTitanArena: glacialTitanArenaData as unknown as LevelConfig,
  forgottenBattlefield: forgottenBattlefieldData as unknown as LevelConfig,
  endlessArena: endlessArenaData as unknown as LevelConfig,
  gatekeeperArena1: gatekeeperArena1Data as unknown as LevelConfig,
  gatekeeperArena2: gatekeeperArena2Data as unknown as LevelConfig,
  gatekeeperArena3: gatekeeperArena3Data as unknown as LevelConfig,
  gatekeeperArena4: gatekeeperArena4Data as unknown as LevelConfig,
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
  private lavaPools!: Phaser.Physics.Arcade.StaticGroup;
  private magmaPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private meleeDoors!: Phaser.Physics.Arcade.StaticGroup;
  private deathMarker: DeathMarker | null = null;
  private boss: Boss | null = null;
  
  // Energy wave projectiles (spawned by player Y key)
  private energyWaves: { sprite: Phaser.GameObjects.Container; vx: number; hitIds: Set<any>; life: number }[] = [];
  
  // Safe position tracking for acid respawn
  private lastSafeX = 0;
  private lastSafeY = 0;
  
  // Visual systems
  private parallaxBg: ParallaxBackground | null = null;
  private greenwayParallax: GreenwayParallax | null = null;
  private medullaParallax: MedullaParallax | null = null;
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
  
  // Track last biome for title display
  private static lastEnteredBiome: string | null = null;
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  
  // Boss summon tracking
  private bossSummoned = false;

  // Endless mode
  public endlessMode = false;
  private endlessKills = 0;
  private endlessWave = 1;
  private endlessSpawnTimer = 0;
  private endlessActiveEnemies = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { levelId: string; spawnId: string; respawning?: boolean; debugMode?: boolean; endlessMode?: boolean }): void {
    this.levelId = data.levelId || 'fadingTown';
    this.spawnId = data.spawnId || 'default';
    this.isRespawning = data.respawning || false;
    this.debugModeEnabled = data.debugMode || this.registry.get('debugMode') || false;
    this.endlessMode = data.endlessMode || false;
    this.inBossArena = false;
    this.bossGateClosed = false;
    this.fakeBenchTriggered = false;
    this.lockedDoorPortal = null;
    this.lockedDoorBlocker = null;
    this.lockedDoorPrompt = null;
    this.waveArenaActive = false;
    this.currentWaveIndex = 0;
    this.waveArenaComplete = false;
    this.waveBenchBlocker = null;
    this.waveBenchMidRest = false;
    this.waveArenaWaves = null;
    this.waveArenaText = null;
    this.bossExitDoorOpened = false;
    
    // Clear endless mode registry if not in endless
    if (!this.endlessMode) {
      this.registry.set('endlessMode', false);
    }
  }

  create(): void {
    // Randomize endless arena on first load too
    if (this.endlessMode) {
      this.randomizeEndlessArena();
    }

    // Load level
    this.currentLevel = LEVELS[this.levelId];
    if (!this.currentLevel) {
      console.error(`Level not found: ${this.levelId}`);
      this.currentLevel = LEVELS.fadingTown;
    }
    
    // Randomize enemies for remix rooms
    if ((this.currentLevel as any).isRemix) {
      this.currentLevel = { ...this.currentLevel, enemies: this.generateRemixEnemies() };
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
    this.lavaPools = this.physics.add.staticGroup();
    this.magmaPlatforms = this.physics.add.staticGroup();
    this.meleeDoors = this.physics.add.staticGroup();
    
    // Create visual effects based on level biome
    const biome = (this.currentLevel as any).biome || 'crossroads';
    const isMedullaRoom = this.levelId.startsWith('medullaRoom');
    if (this.levelId === 'forgottenCrossroads' || this.levelId === 'ruinedCrossroads') {
      this.parallaxBg = new ParallaxBackground(this);
      this.dustParticles = new DustParticles(this);
    } else if (biome === 'greenway' || this.levelId === 'greenway' || this.levelId === 'greenwayGenerated' || this.levelId === 'mossTitanArena') {
      this.greenwayParallax = new GreenwayParallax(this);
      this.leafParticles = new LeafParticles(this, this.currentLevel.height);
      this.createGreenwayEnvironment();
    } else if (biome === 'medulla' || this.levelId === 'theMedulla' || isMedullaRoom) {
      this.medullaParallax = new MedullaParallax(this);
      this.createMedullaEnvironment();
    } else if (biome === 'huntersMarch') {
      this.createHuntersMarchEnvironment(biome !== GameScene.lastEnteredBiome);
    } else if (biome === 'ice') {
      this.createIceEnvironment();
    } else if (this.levelId === 'forgottenBattlefield' || (this.currentLevel as any).theme === 'autumn') {
      this.createForgottenWarfieldEnvironment();
    }
    GameScene.lastEnteredBiome = biome;
    
    // Build level
    this.buildLevel();
    
    // Create player at spawn, snapped to nearest ground below
    const spawn = this.currentLevel.spawns[this.spawnId] || this.currentLevel.spawnPoint;
    const snappedY = this.findGroundBelow(spawn.x, spawn.y);
    this.player = new Player(this, spawn.x, snappedY);
    this.lastSafeX = spawn.x;
    this.lastSafeY = snappedY;
    
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
    if ((this.levelId === 'mossTitanArena' || this.levelId === 'glacialTitanArena') && this.currentLevel.bossArena) {
      this.time.delayedCall(500, () => {
        this.enterBossArena();
      });
    }

    // Endless mode setup
    if (this.endlessMode) {
      this.endlessKills = 0;
      this.endlessWave = 1;
      this.endlessSpawnTimer = 2000; // First wave after 2s
      this.endlessActiveEnemies = 0;
      this.registry.set('endlessMode', true);
      this.registry.set('endlessKills', 0);
      this.registry.set('endlessWave', 1);
      // Set 6 HP and full soul for endless
      gameState.setHp(6);
      gameState.refillSoul();
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

  private getBiomePlatformColors(): { main: number; light: number; wall: number } {
    const biome = this.currentLevel?.biome || 'crossroads';
    switch (biome) {
      case 'greenway':
        return { main: 0x1a2e1a, light: 0x2a4a2a, wall: 0x0e1a0e };
      case 'medulla':
        return { main: 0x2a1010, light: 0x3a1818, wall: 0x1a0808 };
      case 'huntersMarch':
        return { main: 0x2a2010, light: 0x3a3018, wall: 0x1a1508 };
      case 'ice':
        return { main: 0x1a2030, light: 0x2a3848, wall: 0x101820 };
      case 'autumn':
        return { main: 0x2a1a10, light: 0x3a2818, wall: 0x1a1008 };
      case 'fungus':
        return { main: 0x22200a, light: 0x343010, wall: 0x181606 };
      default: // crossroads
        return { main: COLORS.platform, light: COLORS.platformLight, wall: COLORS.wall };
    }
  }

  private buildLevel(): void {
    // Platforms and walls
    const biomeCols = this.getBiomePlatformColors();
    this.currentLevel.platforms.forEach(p => {
      const color = p.type === 'wall' ? biomeCols.wall : biomeCols.main;
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
          biomeCols.light
        );
      }
    });

    // Add invisible boundary walls on left and right edges to keep enemies in bounds
    const wallThickness = 20;
    const lvlW = this.currentLevel.width;
    const lvlH = this.currentLevel.height;
    const leftWall = this.add.rectangle(-wallThickness / 2, lvlH / 2, wallThickness, lvlH, 0x000000, 0);
    this.physics.add.existing(leftWall, true);
    this.walls.add(leftWall);
    const rightWall = this.add.rectangle(lvlW + wallThickness / 2, lvlH / 2, wallThickness, lvlH, 0x000000, 0);
    this.physics.add.existing(rightWall, true);
    this.walls.add(rightWall);
    
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
      } else if (t.type === 'skeleton') {
        // Skeleton with new weapon
        this.createSkeletonVisual(t.x, t.y, t.width, t.height);
      } else if (t.type === 'lavaDoor') {
        // Lava door to The Medulla
        this.createLavaDoor(t.x, t.y, t.width, t.height);
      } else if (t.type === 'verdantDoor') {
        // Light green plant door (unopenable for now)
        this.createVerdantDoor(t.x, t.y, t.width, t.height);
      } else if (t.type === 'fungusDoor') {
        // Fungus door - disintegrates if player died in shroomial lands
        if (gameState.diedInShroomialLands) {
          this.createDisintegratingFungusDoor(t.x, t.y, t.width, t.height);
        } else {
          this.createFungusDoor(t.x, t.y, t.width, t.height);
        }
      } else if (t.type === 'iceDoor') {
        // Ice door only appears after dying in shroomial lands
        if (gameState.diedInShroomialLands) {
          this.createIceDoor(t.x, t.y, t.width, t.height);
        }
      } else if (t.type === 'bossExitTransition') {
        // Hidden exit that appears after boss is defeated
        this.createBossExitDoor(t.x, t.y, t.width, t.height, t.target, t.targetSpawn);
      } else if (t.type === 'verdainaDoor') {
        if (t.target) {
          // Functional mossy door that transitions
          this.createVerdainaDoorTransition(t.x, t.y, t.width, t.height, t.target, t.targetSpawn || 'default');
        } else {
          // Sealed mossy door (does nothing yet)
          this.createVerdainaDoor(t.x, t.y, t.width, t.height);
        }
      } else if (t.type === 'fakeBench') {
        this.createFakeBench(t.x, t.y, t as any);
      } else if (t.type === 'lockedVerdainaDoor') {
        this.createLockedVerdainaDoor(t.x, t.y, t.width, t.height, t.target!, t.targetSpawn || 'default');
      } else if (t.type === 'waveArena') {
        this.setupWaveArena();
      } else if (t.type === 'campfire') {
        this.createCampfire(t.x, t.y);
      } else if (t.type === 'crimsonKeyDoor') {
        this.createCrimsonKeyDoor(t.x, t.y, t.width, t.height);
      }
    });
    
    // Setup boss arena background fauna if applicable
    if ((this.currentLevel as any).isBossArena && (this.currentLevel as any).backgroundFauna) {
      this.setupHunterBossArena((this.currentLevel as any).backgroundFauna);
    }

    // Draw mushroom in Shroomial Lands
    if (this.levelId === 'shroomialLands') {
      this.drawShroomialLandsMushroom();
    }
    
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
        } else if (e.type === 'skullScuttler') {
          // Skull Scuttler - passive patrol enemy
          const skullScuttler = new SkullScuttler(this, e.x, e.y, config);
          this.enemies.add(skullScuttler);
        } else if (e.type === 'adaptedSkuller') {
          // Adapted Skuller - rare aggressive variant with charge
          const adaptedSkuller = new AdaptedSkuller(this, e.x, e.y, config);
          this.enemies.add(adaptedSkuller);
        } else if (e.type === 'skullRavanger' || e.type === 'skullRavager') {
          // Skull Ravager - mini boss
          const skullRavager = new SkullRavager(this, e.x, e.y, config);
          this.enemies.add(skullRavager);
        } else if (e.type === 'megaSkullRavager') {
          // Mega Skull Ravager - huge boss with horns and projectiles
          const megaRavager = new MegaSkullRavager(this, e.x, e.y, config);
          this.enemies.add(megaRavager);
        } else if (e.type === 'frontierScout') {
          const scout = new FrontierScout(this, e.x, e.y, config);
          this.enemies.add(scout);
        } else if (e.type === 'wingedWarrior') {
          const wingedConfig = (enemiesData as any)['wingedWarrior'] as EnemyCombatConfig || config;
          const winged = new WingedWarrior(this, e.x, e.y - 80, wingedConfig);
          this.enemies.add(winged);
        } else if (e.type === 'frontierWarrior') {
          // 30% chance to spawn as Winged Warrior variant (unless guaranteed)
          if (!e.guaranteed && Math.random() < 0.3) {
            const wingedConfig = (enemiesData as any)['wingedWarrior'] as EnemyCombatConfig || config;
            const winged = new WingedWarrior(this, e.x, e.y - 80, wingedConfig);
            this.enemies.add(winged);
          } else {
            const warrior = new FrontierWarrior(this, e.x, e.y, config);
            this.enemies.add(warrior);
          }
        } else if (e.type === 'colonyVanguard') {
          const vanguard = new ColonyVanguard(this, e.x, e.y, config);
          this.enemies.add(vanguard);
        } else if (e.type === 'wingedCommander') {
          const commander = new WingedCommander(this, e.x, e.y - 60, config);
          this.enemies.add(commander);
        } else if (e.type === 'frostCharger') {
          const charger = new FrostCharger(this, e.x, e.y, config);
          this.enemies.add(charger);
        } else if (e.type === 'frostShard') {
          const shard = new FrostShard(this, e.x, e.y, config);
          this.enemies.add(shard);
        } else if (e.type === 'glacialSentinel') {
          const sentinel = new GlacialSentinel(this, e.x, e.y, config);
          this.enemies.add(sentinel);
        } else if (e.type === 'frozenGatekeeper') {
          const stage = (e as any).stage || 1;
          const gatekeeper = new FrozenGatekeeper(this, e.x, e.y, config, stage);
          this.enemies.add(gatekeeper);
        } else if (e.type === 'siegeConstruct') {
          const siege = new SiegeConstruct(this, e.x, e.y, config);
          this.enemies.add(siege);
        } else if (e.type === 'autumnWraith') {
          const wraith = new AutumnWraith(this, e.x, e.y, config);
          this.enemies.add(wraith);
        } else if (e.type === 'ossuarySentinel') {
          const sentinel = new OssuarySentinel(this, e.x, e.y, config);
          this.enemies.add(sentinel);
        } else if (e.type === 'warfieldReaper') {
          const reaper = new WarfieldReaper(this, e.x, e.y, config);
          this.enemies.add(reaper);
        } else if (e.type === 'brokenEffigy') {
          const effigy = new BrokenEffigy(this, e.x, e.y, config);
          this.enemies.add(effigy);
        } else if (e.type === 'warfieldBrute') {
          const brute = new WarfieldBrute(this, e.x, e.y, config);
          this.enemies.add(brute);
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
    
    // Lava pools (The Medulla hazard)
    if ((this.currentLevel as any).lavaPools) {
      (this.currentLevel as any).lavaPools.forEach((l: any) => {
        const lava = new Lava(this, l.x, l.y, l.width, l.height || 40);
        this.lavaPools.add(lava);
      });
    }
    
    // Magma platforms (The Medulla - replace normal platforms)
    if ((this.currentLevel as any).magmaPlatforms) {
      (this.currentLevel as any).magmaPlatforms.forEach((m: any) => {
        const magma = new Magma(this, m.x, m.y, m.width, m.height || 20);
        this.magmaPlatforms.add(magma);
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
    
    // Player vs lava pools (The Medulla hazard)
    this.physics.add.overlap(this.player, this.lavaPools,
      (player, lava) => {
        const l = lava as Lava;
        l.onPlayerContact(this.player);
      }
    );
    
    // Player vs magma platforms (The Medulla - time-based damage)
    this.physics.add.collider(this.player, this.magmaPlatforms);
    this.physics.add.overlap(this.player, this.magmaPlatforms,
      (player, magma) => {
        const m = magma as Magma;
        m.onPlayerContact(this.player);
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
      
      // Update active energy wave projectiles
      this.updateEnergyWaves(delta);
      
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
      
      // Update Medulla parallax (with time for pulsing lava)
      if (this.medullaParallax) {
        this.medullaParallax.update(time);
      }
      
      // Check if all enemies are dead in boss arena and summon boss
      this.checkBossSummon();

      // Endless mode wave spawning
      if (this.endlessMode) {
        this.updateEndlessMode(delta);
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
    const baseDamage = PLAYER_CONFIG.attackDamage + gameState.getCharmModifier('damageMod');
    const damage = gameState.isInstakillMode() ? 100000 : baseDamage;
    let hitSomething = false;
    
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as any; // Could be Enemy, BasicHusk, Vengefly, etc.
      if (!e || !e.active || !e.takeDamage) return;
      if (!(e.isDying?.() ?? e.isDead) && !(e.isInvulnerable?.() ?? false)) {
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
    if (this.boss && this.boss.active && !this.boss.isDying()) {
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
  
  /**
   * Spawn an energy wave projectile from the player.
   * Pierces through enemies, dealing sword-equivalent damage to each.
   * Travels in the player's facing direction. Costs 1 soul line (33).
   */
  spawnEnergyWave(x: number, y: number, facing: 1 | -1): void {
    const container = this.add.container(x, y);
    container.setDepth(11);
    
    // Outer glow ring
    const glow = this.add.ellipse(0, 0, 70, 50, 0xffffff, 0.35);
    // Inner crescent (use two arcs to suggest a wave shape)
    const core = this.add.ellipse(0, 0, 50, 36, 0xaaddff, 0.95);
    const inner = this.add.ellipse(0, 0, 28, 22, 0xffffff, 1);
    container.add([glow, core, inner]);
    container.setScale(facing, 1);
    
    // Pulse tween
    this.tweens.add({
      targets: glow,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0.1,
      duration: 250,
      yoyo: true,
      repeat: -1,
    });
    
    const speed = 720;
    this.energyWaves.push({
      sprite: container,
      vx: facing * speed,
      hitIds: new Set(),
      life: 900, // ms
    });
  }
  
  private updateEnergyWaves(delta: number): void {
    if (this.energyWaves.length === 0) return;
    const baseDamage = PLAYER_CONFIG.attackDamage + gameState.getCharmModifier('damageMod');
    const damage = gameState.isInstakillMode() ? 100000 : baseDamage;
    
    for (let i = this.energyWaves.length - 1; i >= 0; i--) {
      const w = this.energyWaves[i];
      w.sprite.x += w.vx * (delta / 1000);
      w.life -= delta;
      
      // Build a hit rect around the wave
      const hb = new Phaser.Geom.Rectangle(w.sprite.x - 35, w.sprite.y - 25, 70, 50);
      
      // Hit enemies (pierces - one hit each)
      this.enemies.getChildren().forEach((enemy) => {
        const e = enemy as any;
        if (!e || !e.active || !e.takeDamage) return;
        if (w.hitIds.has(e)) return;
        if ((e.isDying?.() ?? e.isDead) || (e.isInvulnerable?.() ?? false)) return;
        const eb = e.getHitRect ? e.getHitRect() : e.getBounds();
        if (Phaser.Geom.Rectangle.Overlaps(hb, eb)) {
          e.takeDamage(damage, w.sprite.x, -1);
          w.hitIds.add(e);
        }
      });
      
      // Hit boss
      if (this.boss && this.boss.active && !this.boss.isDying() && !w.hitIds.has(this.boss)) {
        const headBounds = this.boss.getHeadBounds();
        const bossRect = this.boss.getHitRect();
        if ((headBounds && Phaser.Geom.Rectangle.Overlaps(hb, headBounds)) ||
            Phaser.Geom.Rectangle.Overlaps(hb, bossRect)) {
          this.boss.takeDamage(damage, w.sprite.x);
          w.hitIds.add(this.boss);
          this.emitUIEvent('bossHpChange', { hp: this.boss.getHp(), maxHp: this.boss.getMaxHp() });
        }
      }
      
      // Despawn if expired or off-world
      if (w.life <= 0 || w.sprite.x < -100 || w.sprite.x > this.currentLevel.width + 100) {
        w.sprite.destroy();
        this.energyWaves.splice(i, 1);
      }
    }
  }
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
    
    const damage = typeof (enemy as any).getContactDamage === 'function'
      ? (enemy as any).getContactDamage()
      : 1;
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
    
    console.log(`[TRANSITION] From ${this.levelId} to ${levelId} (spawn: ${spawnId})`);
    
    // Fade out camera
    this.cameras.main.fadeOut(300, 0, 0, 0);
    
    // Wait for fade to complete, then restart scene with new level
    this.cameras.main.once('camerafadeoutcomplete', () => {
      console.log(`[TRANSITION] Fade complete, restarting scene...`);
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
    } else if (this.levelId === 'glacialTitanArena') {
      // Spawn Glacial Titan - snap to ground platform
      const gtCfg = (bossesData as any).glacialTitan || {};
      const spawnY = this.getLivePlatformSpawnY(arena.bossSpawn.x, (gtCfg.height || 120) * (gtCfg.scale || 3.5));
      const glacialTitan = new GlacialTitan(this, arena.bossSpawn.x, spawnY);
      this.boss = glacialTitan as any;
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
    
    // In endless mode, don't teleport or trigger victory state
    if (this.endlessMode) {
      gameState.addShells(50);
      this.emitUIEvent('shellsChange', gameState.getPlayerData().shells);
      
      // Show "BOSS DEFEATED" text
      const centerX = this.cameras.main.width / 2;
      const centerY = this.cameras.main.height / 2;
      const defeatText = this.add.text(centerX, centerY, 'BOSS DEFEATED', {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: '#ff4444',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
      });
      defeatText.setOrigin(0.5);
      defeatText.setScrollFactor(0);
      defeatText.setDepth(1000);
      defeatText.setAlpha(0);
      
      this.tweens.add({
        targets: defeatText,
        alpha: 1,
        duration: 500,
        yoyo: true,
        hold: 1500,
        onComplete: () => defeatText.destroy(),
      });
      
      // Clean up boss reference so endless mode continues
      this.boss = null;
      this.endlessBossWaveActive = false;
      this.restoreEndlessPlatforms();
      return;
    }
    
    gameState.addShells(100);
    gameState.setState('victory');
    this.player.jumpMultiplier = 1;
    
    this.emitUIEvent('bossDefeated', {
      reward: 100,
    });
    this.emitUIEvent('shellsChange', gameState.getPlayerData().shells);

    // Determine which boss was defeated and show appropriate victory
    if (this.levelId === 'huntersMarchBossArena') {
      this.showAntElderVictory();
    } else if (this.levelId === 'glacialTitanArena') {
      this.showGlacialTitanVictory();
    }
  }

  showAntElderVictory(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Background bar
    const bgBar = this.add.rectangle(centerX, centerY, 0, 80, 0x000000, 0.9);
    bgBar.setScrollFactor(0);
    bgBar.setDepth(1000);

    // Victory text - red and dark green
    const victoryText = this.add.text(centerX, centerY, 'ANT ELDER HAS BEEN DEFEATED', {
      fontFamily: 'Georgia, serif',
      fontSize: '36px',
      color: '#cc2222',
      fontStyle: 'bold italic',
      stroke: '#1a3a1a',
      strokeThickness: 6,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#002200',
        blur: 5,
        fill: true
      }
    });
    victoryText.setOrigin(0.5);
    victoryText.setScrollFactor(0);
    victoryText.setDepth(1001);
    victoryText.setAlpha(0);

    this.tweens.add({
      targets: bgBar,
      width: 700,
      duration: 400,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      scale: { from: 0.8, to: 1 },
      duration: 600,
      delay: 300,
      ease: 'Elastic.easeOut'
    });

    // After 4 seconds, transition to the post-Ant-Elder chain room
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: [victoryText, bgBar],
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          victoryText.destroy();
          bgBar.destroy();
          this.transitionToLevel('chainRoomPostAntElder', 'fromBoss');
        }
      });
    });
  }
  
  showMossTitanVictory(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    // Background bar
    const bgBar = this.add.rectangle(centerX, centerY, 0, 80, 0x000000, 0.9);
    bgBar.setScrollFactor(0);
    bgBar.setDepth(1000);
    
    // Victory text - green fancy letters
    const victoryText = this.add.text(centerX, centerY, 'MOSS TITAN HAS BEEN DEFEATED', {
      fontFamily: 'Georgia, serif',
      fontSize: '36px',
      color: '#44ff44',
      fontStyle: 'bold italic',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#006600',
        blur: 5,
        fill: true
      }
    });
    victoryText.setOrigin(0.5);
    victoryText.setScrollFactor(0);
    victoryText.setDepth(1001);
    victoryText.setAlpha(0);
    
    // Animate in
    this.tweens.add({
      targets: bgBar,
      width: 700,
      duration: 400,
      ease: 'Power2'
    });
    
    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      scale: { from: 0.8, to: 1 },
      duration: 600,
      delay: 300,
      ease: 'Elastic.easeOut'
    });
    
    // Hold for 4 seconds, then transition to Chain Room
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: [victoryText, bgBar],
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          victoryText.destroy();
          bgBar.destroy();
          // Transition to Chain Room first
          this.transitionToLevel('chainRoom', 'fromBoss');
        }
      });
    });
  }

  showGlacialTitanVictory(): void {
    // Now handled by React UI (GlacialTitanVictoryDialog)
    // This is kept as fallback but the UI event triggers the dialog
  }

  transitionToForgottenBattlefield(): void {
    this.transitionToLevel('forgottenBattlefield', 'fromTitanVictory');
  }

  /**
   * Handle player death - drop currency, show death screen
   */
  handlePlayerDeath(): void {
    // Track if died in shroomial lands (before guard, since setHp(0) may already set death state)
    if (this.levelId === 'shroomialLands') {
      gameState.setDiedInShroomialLands();
    }
    
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
    
    // For endless mode, store final stats in registry
    if (this.endlessMode) {
      this.registry.set('endlessFinalkills', this.endlessKills);
      this.registry.set('endlessFinalWave', this.endlessWave);
    }
    
    // Set death state
    gameState.setState('death');
    
    // Emit death event
    this.emitUIEvent('playerDied', {
      shells: playerData.shells,
      x: this.player.x,
      y: this.player.y,
      endless: this.endlessMode,
      endlessKills: this.endlessKills,
      endlessWave: this.endlessWave,
    });
  }

  /**
   * Respawn player at last bench
   */
  respawnPlayer(): void {
    // Endless mode: restart the arena fresh
    if (this.endlessMode) {
      this.randomizeEndlessArena();
      (gameState as any).playerData.maxHp = 6;
      (gameState as any).playerData.hp = 6;
      gameState.refillSoul();
      gameState.setState('playing');
      this.scene.restart({
        levelId: 'endlessArena',
        spawnId: 'default',
        endlessMode: true,
      });
      return;
    }

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
    // If this is a mid-arena bench rest, don't respawn enemies - continue waves
    if (this.waveArenaActive && this.waveBenchMidRest && !this.waveArenaComplete) {
      // Clear bench tracking
      this.currentBench = null;
      this.activeBenchConfig = null;
      
      // Resume gameplay
      gameState.setState('playing');
      this.emitUIEvent('benchClosed', null);
      
      // Teleport back and continue arena
      this.resumeArenaAfterBenchRest();
      return;
    }
    
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
    
    // Check lava door interaction
    if (this.lavaDoorZone && this.lavaDoorPromptText) {
      const inRange = this.physics.overlap(this.player, this.lavaDoorZone);
      this.lavaDoorPromptText.setVisible(inRange);
      if (inRange && inputManager.justPressed('interact')) {
        this.emitUIEvent('showTheMedullaDialog', null);
      }
    }

    // Check verdant door proximity
    if ((this as any)._verdantDoorZone && (this as any)._verdantDoorText) {
      const inRange = this.physics.overlap(this.player, (this as any)._verdantDoorZone);
      (this as any)._verdantDoorText.setVisible(inRange);
    }

    // Check fungus door proximity and interaction
    if ((this as any)._fungusDoorZone && (this as any)._fungusDoorText) {
      const inRange = this.physics.overlap(this.player, (this as any)._fungusDoorZone);
      (this as any)._fungusDoorText.setVisible(inRange);
      if (inRange && inputManager.justPressed('interact')) {
        this.enterShroomialLands();
      }
    }

    // Check ice door proximity and interaction
    if ((this as any)._iceDoorZone && (this as any)._iceDoorText) {
      const inRange = this.physics.overlap(this.player, (this as any)._iceDoorZone);
      (this as any)._iceDoorText.setVisible(inRange);
      if (inRange && inputManager.justPressed('interact')) {
        this.enterFreezingPlains();
      }
    }

    // Check verdaina door proximity
    if ((this as any)._verdainaDoorZone && (this as any)._verdainaDoorText) {
      const inRange = this.physics.overlap(this.player, (this as any)._verdainaDoorZone);
      (this as any)._verdainaDoorText.setVisible(inRange);
    }

    // Check verdaina transition door proximity
    if ((this as any)._verdainaDoorTransZone && (this as any)._verdainaDoorTransPrompt) {
      const inRange = this.physics.overlap(this.player, (this as any)._verdainaDoorTransZone);
      (this as any)._verdainaDoorTransPrompt.setVisible(inRange);
      if (inRange && inputManager.justPressed('interact')) {
        this.transitionToLevel((this as any)._verdainaDoorTransTarget, (this as any)._verdainaDoorTransSpawn);
      }
    }

    // Check boss exit door interaction
    if (this.bossExitZone && this.bossExitPrompt) {
      const inRange = this.physics.overlap(this.player, this.bossExitZone);
      const doorVisible = this.bossExitDoorVisuals.length > 0 && (this.bossExitDoorVisuals[0] as any).alpha > 0.5;
      this.bossExitPrompt.setVisible(inRange && doorVisible);
      if (inRange && doorVisible && inputManager.justPressed('interact')) {
        this.transitionToLevel(this.bossExitTarget, this.bossExitTargetSpawn);
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
  
  private createSkeletonVisual(x: number, y: number, width: number, height: number): void {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Skeleton body (ribcage)
    const ribcage = this.add.rectangle(centerX, centerY - 10, 20, 25, 0xcccccc);
    ribcage.setDepth(6);
    
    // Skull
    const skull = this.add.ellipse(centerX, centerY - 30, 15, 18, 0xd0d0d0);
    skull.setDepth(7);
    
    // Eye sockets
    this.add.ellipse(centerX - 4, centerY - 32, 4, 5, 0x1a1a20).setDepth(8);
    this.add.ellipse(centerX + 4, centerY - 32, 4, 5, 0x1a1a20).setDepth(8);
    
    // Arms
    this.add.rectangle(centerX - 12, centerY - 5, 5, 25, 0xcccccc).setDepth(6);
    this.add.rectangle(centerX + 12, centerY - 5, 5, 25, 0xcccccc).setDepth(6);
    
    // Legs
    this.add.rectangle(centerX - 5, centerY + 15, 6, 20, 0xcccccc).setDepth(6);
    this.add.rectangle(centerX + 5, centerY + 15, 6, 20, 0xcccccc).setDepth(6);
    
    // New weapon (placeholder - glowing sword)
    const weapon = this.add.rectangle(centerX + 20, centerY, 5, 35, 0x44aaff);
    weapon.setDepth(7);
    const weaponGlow = this.add.rectangle(centerX + 20, centerY, 8, 38, 0x4488ff, 0.3);
    weaponGlow.setDepth(6);
    
    // Weapon glow animation
    this.tweens.add({
      targets: weaponGlow,
      alpha: { from: 0.3, to: 0.6 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    
    // Faint glow around skeleton
    const glow = this.add.ellipse(centerX, centerY, 50, 60, 0xffffff, 0.05);
    glow.setDepth(5);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.03, to: 0.08 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });
  }
  
  private lavaDoorZone: Phaser.GameObjects.Zone | null = null;
  private lavaDoorPromptText: Phaser.GameObjects.Text | null = null;
  
  private createLavaDoor(x: number, y: number, width: number, height: number): void {
    const doorX = x + width / 2;
    const doorY = y + height / 2;
    
    // Door frame with burnt stone texture
    const frame = this.add.rectangle(doorX, doorY, width + 20, height + 10, 0x2a2020);
    frame.setDepth(5);
    
    // Door panels with lava cracks
    const door = this.add.rectangle(doorX, doorY, width, height, 0x3a3030);
    door.setDepth(6);
    
    // Lava crack lines
    const crack1 = this.add.rectangle(doorX - 6, doorY - 20, 2, 40, 0xff6600).setDepth(7);
    const crack2 = this.add.rectangle(doorX + 8, doorY + 15, 2, 30, 0xff4400).setDepth(7);
    const crack3 = this.add.rectangle(doorX, doorY, 3, 25, 0xff5500).setDepth(7);
    
    // Lava glow
    const glow = this.add.rectangle(doorX, doorY, width + 30, height + 20, 0xff4400, 0.15);
    glow.setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.1, to: 0.25 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });
    
    // Lava dripping effect
    for (let i = 0; i < 5; i++) {
      const drop = this.add.ellipse(doorX - 10 + i * 8, doorY - height / 2, 3, 5, 0xff6600, 0.8);
      drop.setDepth(8);
      
      // Animate lava drip
      this.tweens.add({
        targets: drop,
        y: doorY + height / 2,
        alpha: 0,
        scaleY: 0.3,
        duration: 1500 + i * 300,
        delay: i * 200,
        repeat: -1,
        onStart: () => {
          drop.setAlpha(0.8);
          drop.setScale(1);
          drop.setY(doorY - height / 2);
        },
        ease: 'Linear'
      });
    }
    
    // Prompt text - store reference for update loop
    this.lavaDoorPromptText = this.add.text(doorX, doorY + 60, '[ENTER]', {
      fontSize: '14px',
      color: '#ff6600',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 }
    });
    this.lavaDoorPromptText.setOrigin(0.5);
    this.lavaDoorPromptText.setDepth(100);
    this.lavaDoorPromptText.setVisible(false);
    
    // Interaction zone
    this.lavaDoorZone = this.add.zone(doorX, doorY, width + 40, height + 40);
    this.physics.add.existing(this.lavaDoorZone, true);
  }

  private createVerdantDoor(x: number, y: number, width: number, height: number): void {
    const doorX = x + width / 2;
    const doorY = y + height / 2;

    // Dark stone door frame
    const doorFrame = this.add.rectangle(doorX, doorY, width + 10, height + 10, 0x2a2a2a);
    doorFrame.setStrokeStyle(3, 0x1a1a1a);
    doorFrame.setDepth(5);

    // Door surface - stone
    const doorSurface = this.add.rectangle(doorX, doorY, width, height, 0x3a3a3a);
    doorSurface.setStrokeStyle(2, 0x2a2a2a);
    doorSurface.setDepth(6);

    // Light green plant vines growing on the door
    const vineColor = 0x88dd88; // Light green, lighter than greenway
    for (let i = 0; i < 6; i++) {
      const vx = doorX + Phaser.Math.Between(-15, 15);
      const vy = doorY + Phaser.Math.Between(-40, 40);
      const vine = this.add.ellipse(vx, vy, 8 + Math.random() * 6, 12 + Math.random() * 10, vineColor, 0.7);
      vine.setDepth(7);
    }

    // Small leaf clusters
    for (let i = 0; i < 4; i++) {
      const lx = doorX + Phaser.Math.Between(-20, 20);
      const ly = doorY + Phaser.Math.Between(-35, 35);
      const leaf = this.add.ellipse(lx, ly, 5, 8, 0xaaeebb, 0.6);
      leaf.setRotation(Math.random() * Math.PI);
      leaf.setDepth(7);
    }

    // "Sealed" text when player approaches
    const sealedText = this.add.text(doorX, doorY - 60, 'The way is sealed...', {
      fontSize: '12px',
      color: '#88dd88',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    });
    sealedText.setOrigin(0.5);
    sealedText.setDepth(100);
    sealedText.setVisible(false);

    // Interaction zone to show text
    const zone = this.add.zone(doorX, doorY, width + 40, height + 40);
    this.physics.add.existing(zone, true);

    // Poll for proximity in update - store refs
    (this as any)._verdantDoorZone = zone;
    (this as any)._verdantDoorText = sealedText;
  }

  private createFungusDoor(x: number, y: number, width: number, height: number): void {
    const doorX = x + width / 2;
    const doorY = y + height / 2;

    // Dark frame
    const doorFrame = this.add.rectangle(doorX, doorY, width + 12, height + 12, 0x1a1a0a);
    doorFrame.setStrokeStyle(3, 0x0a0a00);
    doorFrame.setDepth(5);

    // Door surface - dark with yellow fungus streaks
    const doorSurface = this.add.rectangle(doorX, doorY, width, height, 0x2a2a1a);
    doorSurface.setStrokeStyle(2, 0x1a1a0a);
    doorSurface.setDepth(6);

    // Yellow/black fungus growths
    const fungusColors = [0xccaa22, 0xddbb33, 0x998811, 0x111100];
    for (let i = 0; i < 8; i++) {
      const fx = doorX + Phaser.Math.Between(-18, 18);
      const fy = doorY + Phaser.Math.Between(-40, 40);
      const color = Phaser.Utils.Array.GetRandom(fungusColors);
      const blob = this.add.ellipse(fx, fy, 6 + Math.random() * 8, 8 + Math.random() * 10, color, 0.8);
      blob.setDepth(7);
    }

    // Black veins
    for (let i = 0; i < 3; i++) {
      const vx = doorX + Phaser.Math.Between(-12, 12);
      const vy = doorY + Phaser.Math.Between(-30, 30);
      const vein = this.add.rectangle(vx, vy, 2, 20 + Math.random() * 15, 0x111100, 0.7);
      vein.setRotation(Math.random() * 0.5 - 0.25);
      vein.setDepth(7);
    }

    // Pulsing yellow glow
    const glow = this.add.rectangle(doorX, doorY, width + 25, height + 20, 0xccaa22, 0.08);
    glow.setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.04, to: 0.15 },
      duration: 2500,
      yoyo: true,
      repeat: -1
    });

    // "Sealed" text
    const sealedText = this.add.text(doorX, doorY - 60, 'Press UP to enter', {
      fontSize: '12px',
      color: '#ccaa22',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    });
    sealedText.setOrigin(0.5);
    sealedText.setDepth(100);
    sealedText.setVisible(false);

    // Interaction zone
    const zone = this.add.zone(doorX, doorY, width + 40, height + 40);
    this.physics.add.existing(zone, true);

    (this as any)._fungusDoorZone = zone;
    (this as any)._fungusDoorText = sealedText;
  }

  private createDisintegratingFungusDoor(x: number, y: number, width: number, height: number): void {
    const doorX = x + width / 2;
    const doorY = y + height / 2;

    // Create the door visuals but immediately start disintegrating
    const doorFrame = this.add.rectangle(doorX, doorY, width + 12, height + 12, 0x1a1a0a);
    doorFrame.setStrokeStyle(3, 0x0a0a00);
    doorFrame.setDepth(5);

    const doorSurface = this.add.rectangle(doorX, doorY, width, height, 0x2a2a1a);
    doorSurface.setStrokeStyle(2, 0x1a1a0a);
    doorSurface.setDepth(6);

    // Fungus blobs
    const blobs: Phaser.GameObjects.Ellipse[] = [];
    const fungusColors = [0xccaa22, 0xddbb33, 0x998811, 0x111100];
    for (let i = 0; i < 8; i++) {
      const fx = doorX + Phaser.Math.Between(-18, 18);
      const fy = doorY + Phaser.Math.Between(-40, 40);
      const color = Phaser.Utils.Array.GetRandom(fungusColors);
      const blob = this.add.ellipse(fx, fy, 6 + Math.random() * 8, 8 + Math.random() * 10, color, 0.8);
      blob.setDepth(7);
      blobs.push(blob);
    }

    // Disintegration: after 0.5s, particles fly off and door fades
    this.time.delayedCall(500, () => {
      // Scatter blobs
      blobs.forEach((blob, i) => {
        this.tweens.add({
          targets: blob,
          x: blob.x + Phaser.Math.Between(-80, 80),
          y: blob.y + Phaser.Math.Between(-60, -120),
          alpha: 0,
          scaleX: 0.2,
          scaleY: 0.2,
          duration: 600 + i * 100,
          ease: 'Power2',
          onComplete: () => blob.destroy()
        });
      });

      // Fade door
      this.tweens.add({
        targets: [doorFrame, doorSurface],
        alpha: 0,
        duration: 1200,
        ease: 'Power2',
        onComplete: () => {
          doorFrame.destroy();
          doorSurface.destroy();
        }
      });

      // Dust particles where the door was
      for (let i = 0; i < 12; i++) {
        const p = this.add.circle(
          doorX + Phaser.Math.Between(-20, 20),
          doorY + Phaser.Math.Between(-40, 40),
          2 + Math.random() * 3,
          0x998811, 0.6
        );
        p.setDepth(8);
        this.tweens.add({
          targets: p,
          y: p.y - 40 - Math.random() * 40,
          alpha: 0,
          duration: 800 + Math.random() * 400,
          onComplete: () => p.destroy()
        });
      }
    });
  }

  private createIceDoor(x: number, y: number, width: number, height: number): void {
    const doorX = x + width / 2;
    const doorY = y + height / 2;

    // Icy blue door frame
    const doorFrame = this.add.rectangle(doorX, doorY, width + 12, height + 12, 0x1a2a3a);
    doorFrame.setStrokeStyle(3, 0x4488cc);
    doorFrame.setDepth(5);

    // Door surface - icy blue
    const doorSurface = this.add.rectangle(doorX, doorY, width, height, 0x2a4a6a);
    doorSurface.setStrokeStyle(2, 0x5599dd);
    doorSurface.setDepth(6);

    // Ice crystals on door
    for (let i = 0; i < 6; i++) {
      const cx2 = doorX + Phaser.Math.Between(-15, 15);
      const cy2 = doorY + Phaser.Math.Between(-35, 35);
      const crystal = this.add.polygon(cx2, cy2, [
        [0, -8], [4, 0], [0, 8], [-4, 0]
      ], 0x88ccff, 0.6);
      crystal.setDepth(7);
      crystal.setScale(0.5 + Math.random() * 0.8);
      crystal.setRotation(Math.random() * Math.PI);
    }

    // Frost glow
    const glow = this.add.rectangle(doorX, doorY, width + 25, height + 20, 0x4488cc, 0.08);
    glow.setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.04, to: 0.15 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });

    // Prompt text
    const promptText = this.add.text(doorX, doorY - 60, 'Press UP to enter', {
      fontSize: '12px',
      color: '#88ccff',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    });
    promptText.setOrigin(0.5);
    promptText.setDepth(100);
    promptText.setVisible(false);

    // Interaction zone
    const zone = this.add.zone(doorX, doorY, width + 40, height + 40);
    this.physics.add.existing(zone, true);

    (this as any)._iceDoorZone = zone;
    (this as any)._iceDoorText = promptText;
  }

  private _enteringFreezingPlains = false;
  private enterFreezingPlains(): void {
    if (this._enteringFreezingPlains) return;
    this._enteringFreezingPlains = true;
    // Freeze player
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    // Black overlay
    const overlay = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(2000);

    // Fade to black
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 800,
      onComplete: () => {
        // Show "Freezing Plains" in icy letters
        const title = this.add.text(cx, cy, 'Freezing Plains', {
          fontSize: '56px',
          color: '#aaddff',
          fontFamily: 'Georgia, serif',
          fontStyle: 'bold',
        });
        title.setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(2001);
        title.setAlpha(0);

        // Add icy shimmer effect with stroke
        title.setStroke('#4488cc', 3);
        title.setShadow(0, 0, '#4488ff', 12, true, true);

        // Frost particles around title
        const frostParticles: Phaser.GameObjects.Arc[] = [];
        for (let i = 0; i < 20; i++) {
          const p = this.add.circle(
            cx + Phaser.Math.Between(-200, 200),
            cy + Phaser.Math.Between(-60, 60),
            1 + Math.random() * 2,
            0xaaddff, 0
          );
          p.setScrollFactor(0);
          p.setDepth(2001);
          frostParticles.push(p);
          this.tweens.add({
            targets: p,
            alpha: { from: 0, to: 0.6 },
            y: p.y - 20 - Math.random() * 30,
            duration: 1500 + Math.random() * 1000,
            yoyo: true,
            repeat: -1,
          });
        }

        // Fade in title
        this.tweens.add({
          targets: title,
          alpha: 1,
          duration: 1200,
          onComplete: () => {
            this.time.delayedCall(2000, () => {
              this.tweens.add({
                targets: [title, ...frostParticles],
                alpha: 0,
                duration: 800,
                onComplete: () => {
                  title.destroy();
                  frostParticles.forEach(p => p.destroy());
                  overlay.destroy();
                  this.transitionToLevel('freezingPlains', 'fromIceDoor');
                }
              });
            });
          }
        });
      }
    });
  }

  private createIceEnvironment(): void {
    const w = this.currentLevel.width;
    const h = this.currentLevel.height;
    const groundY = h - 50;

    // Set player ice flag
    this.player.onIce = true;

    // Dark blue gradient background
    const bgTop = this.add.rectangle(w / 2, 0, w, h / 2, 0x0a1428);
    bgTop.setOrigin(0.5, 0);
    bgTop.setDepth(-10);
    const bgBot = this.add.rectangle(w / 2, h / 2, w, h / 2, 0x0d1a30);
    bgBot.setOrigin(0.5, 0);
    bgBot.setDepth(-10);

    // Ice sheen on the ground
    const iceSheen = this.add.rectangle(w / 2, groundY - 2, w, 6, 0x88ccff, 0.25);
    iceSheen.setDepth(1);
    this.tweens.add({
      targets: iceSheen,
      alpha: { from: 0.15, to: 0.35 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });

    // Scattered ice crystal decorations
    for (let i = 0; i < 15; i++) {
      const cx2 = Phaser.Math.Between(50, w - 50);
      const cy2 = groundY - Phaser.Math.Between(5, 15);
      const crystal = this.add.polygon(cx2, cy2, [
        [0, -6], [3, 0], [0, 6], [-3, 0]
      ], 0x88ccff, 0.3 + Math.random() * 0.2);
      crystal.setDepth(2);
      crystal.setScale(0.6 + Math.random() * 1.2);
      crystal.setRotation(Math.random() * Math.PI * 0.3);
    }

    // Freezing flowers - icy blue/white flowers along the ground
    const flowerPositions = [120, 350, 580, 850, 1100, 1350, 1600, 1900, 2150];
    for (const fx of flowerPositions) {
      const fy = groundY - 2;
      const flowerContainer = this.add.container(fx, fy);
      flowerContainer.setDepth(3);

      // Stem - thin icy blue
      const stem = this.add.rectangle(0, -12, 2, 18, 0x6699aa, 0.7);
      flowerContainer.add(stem);

      // Petals - 5 icy petals in a circle
      const petalCount = 5;
      const petalColors = [0xaaddff, 0x88ccee, 0xbbddff, 0x99ccff, 0xcceeFF];
      for (let p = 0; p < petalCount; p++) {
        const angle = (p / petalCount) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * 6;
        const py = -22 + Math.sin(angle) * 6;
        const petal = this.add.ellipse(px, py, 5, 8, petalColors[p], 0.6);
        petal.setRotation(angle + Math.PI / 2);
        flowerContainer.add(petal);
      }

      // Center - frosty white
      const center = this.add.circle(0, -22, 3, 0xeeffff, 0.8);
      flowerContainer.add(center);

      // Frost sparkle on flower
      const sparkle = this.add.circle(Phaser.Math.Between(-3, 3), -24, 1.5, 0xffffff, 0);
      flowerContainer.add(sparkle);
      this.tweens.add({
        targets: sparkle,
        alpha: { from: 0, to: 0.8 },
        duration: 1200 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000
      });

      // Gentle sway
      this.tweens.add({
        targets: flowerContainer,
        rotation: { from: -0.06, to: 0.06 },
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Ice particles around some flowers
      if (Math.random() > 0.5) {
        for (let s = 0; s < 3; s++) {
          const sp = this.add.circle(
            fx + Phaser.Math.Between(-10, 10),
            fy - Phaser.Math.Between(15, 30),
            1, 0xaaddff, 0
          );
          sp.setDepth(3);
          this.tweens.add({
            targets: sp,
            alpha: { from: 0, to: 0.5 },
            y: sp.y - 15,
            duration: 2000 + Math.random() * 1500,
            yoyo: true,
            repeat: -1,
            delay: Math.random() * 3000
          });
        }
      }
    }

    // Floating snow particles
    for (let i = 0; i < 25; i++) {
      const snowX = Phaser.Math.Between(0, w);
      const snowY = Phaser.Math.Between(0, h);
      const flake = this.add.circle(snowX, snowY, 1 + Math.random() * 1.5, 0xffffff, 0.3 + Math.random() * 0.3);
      flake.setDepth(0);
      this.tweens.add({
        targets: flake,
        y: h + 10,
        x: flake.x + Phaser.Math.Between(-30, 30),
        duration: 4000 + Math.random() * 4000,
        repeat: -1,
        onRepeat: () => {
          flake.y = -10;
          flake.x = Phaser.Math.Between(0, w);
        }
      });
    }
  }

  private createForgottenWarfieldEnvironment(): void {
    const w = this.currentLevel.width;
    const h = this.currentLevel.height;
    const groundY = h - 50;

    // Warm autumn gradient background
    const bgTop = this.add.rectangle(w / 2, 0, w, h / 2, 0x1a0f05);
    bgTop.setOrigin(0.5, 0);
    bgTop.setDepth(-10);
    const bgBot = this.add.rectangle(w / 2, h / 2, w, h / 2, 0x2a1a0a);
    bgBot.setOrigin(0.5, 0);
    bgBot.setDepth(-10);

    // Corpse piles - dead player-like figures stacked
    const pilePositions = [180, 450, 650, 850, 1050, 1250, 1450, 1650, 1900, 2150];
    for (let pi = 0; pi < pilePositions.length; pi++) {
      const px = pilePositions[pi];
      const hasFlowers = pi % 2 === 1;
      const pileSize = Phaser.Math.Between(7, 13);
      
      for (let b = 0; b < pileSize; b++) {
        const bx = px + Phaser.Math.Between(-45, 45);
        const by = groundY - b * 7 - Phaser.Math.Between(0, 6);
        const bodyAngle = Phaser.Math.Between(-50, 50);
        
        const body = this.add.rectangle(bx, by, 16, 20, 0x222222, 0.7);
        body.setAngle(bodyAngle);
        body.setDepth(2);
        
        const headX = bx + Math.sin(bodyAngle * Math.PI / 180) * 9;
        const headY = by - 11 - Math.abs(Math.cos(bodyAngle * Math.PI / 180)) * 3;
        const head = this.add.circle(headX, headY, 5, 0x1a1a1a, 0.7);
        head.setDepth(2);
        
        const cloak = this.add.rectangle(bx, by + 5, 18, 7, 0x111111, 0.5);
        cloak.setAngle(bodyAngle + Phaser.Math.Between(-10, 10));
        cloak.setDepth(1.9);

        if (b % 2 === 0) {
          const arm = this.add.rectangle(bx + Phaser.Math.Between(-12, 12), by + Phaser.Math.Between(-3, 3), 10, 3, 0x1a1a1a, 0.5);
          arm.setAngle(bodyAngle + Phaser.Math.Between(-30, 30));
          arm.setDepth(1.8);
        }
      }
      
      // Flowers on every pile
      const flowerCount = hasFlowers ? Phaser.Math.Between(9, 15) : Phaser.Math.Between(5, 8);
      for (let f = 0; f < flowerCount; f++) {
        const fx = px + Phaser.Math.Between(-40, 40);
        const fy = groundY - pileSize * 5 - Phaser.Math.Between(3, 22);
        const container = this.add.container(fx, fy);
        container.setDepth(3);
        
        const stemH = Phaser.Math.Between(10, 28);
        const stem = this.add.rectangle(0, -stemH / 2, 2, stemH, 0x556633, 0.8);
        container.add(stem);
        
        const petalColors = [0xcc4422, 0xdd6633, 0xee8844, 0xffaa55, 0xcc3355, 0xbb2244, 0xff7733];
        const petalCount = Phaser.Math.Between(4, 7);
        for (let p = 0; p < petalCount; p++) {
          const angle = (p / petalCount) * Math.PI * 2;
          const petal = this.add.ellipse(Math.cos(angle) * 5, -stemH + Math.sin(angle) * 5, 4, 7, petalColors[p % petalColors.length], 0.7);
          petal.setRotation(angle + Math.PI / 2);
          container.add(petal);
        }
        
        container.add(this.add.circle(0, -stemH, 2.5, 0xffdd88, 0.8));
        
        this.tweens.add({
          targets: container,
          rotation: { from: -0.05, to: 0.05 },
          duration: 2500 + Math.random() * 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }

    // Falling autumn leaves particles
    for (let i = 0; i < 20; i++) {
      const leafX = Phaser.Math.Between(0, w);
      const leafY = Phaser.Math.Between(0, h);
      const leafColors = [0xcc4400, 0xdd6611, 0xee8822, 0xbb3300, 0xcc7733, 0xaa5500];
      const leaf = this.add.ellipse(leafX, leafY, 6, 4, Phaser.Math.RND.pick(leafColors), 0.6);
      leaf.setDepth(0);
      leaf.setRotation(Math.random() * Math.PI * 2);
      this.tweens.add({
        targets: leaf,
        y: h + 10,
        x: leaf.x + Phaser.Math.Between(-50, 50),
        rotation: leaf.rotation + Phaser.Math.Between(-3, 3),
        duration: 5000 + Math.random() * 5000,
        repeat: -1,
        onRepeat: () => {
          leaf.y = -10;
          leaf.x = Phaser.Math.Between(0, w);
        }
      });
    }

    // Soft amber fog layers
    for (let i = 0; i < 4; i++) {
      const fogX = Phaser.Math.Between(0, w);
      const fog = this.add.ellipse(fogX, groundY - 30, Phaser.Math.Between(200, 400), 60, 0x8B4513, 0.08);
      fog.setDepth(-1);
      this.tweens.add({
        targets: fog,
        x: fog.x + Phaser.Math.Between(-80, 80),
        alpha: { from: 0.05, to: 0.12 },
        duration: 6000 + Math.random() * 4000,
        yoyo: true,
        repeat: -1
      });
    }
  }

  private bossExitDoorVisuals: Phaser.GameObjects.GameObject[] = [];
  private bossExitZone: Phaser.GameObjects.Zone | null = null;
  private bossExitTarget: string = '';
  private bossExitTargetSpawn: string = '';
  private bossExitPrompt: Phaser.GameObjects.Text | null = null;

  private createBossExitDoor(x: number, y: number, width: number, height: number, target: string, targetSpawn: string): void {
    this.bossExitTarget = target || 'chamberOfTheHunter';
    this.bossExitTargetSpawn = targetSpawn || 'default';

    // Initially hidden - will be revealed when boss dies
    const doorX = x + width / 2;
    const doorY = y + height / 2;

    const doorFrame = this.add.rectangle(doorX, doorY, width + 10, height + 10, 0x3a3a3a);
    doorFrame.setStrokeStyle(3, 0x1a1a1a);
    doorFrame.setDepth(5);
    doorFrame.setAlpha(0);

    const doorSurface = this.add.rectangle(doorX, doorY, width, height, 0x555555);
    doorSurface.setStrokeStyle(2, 0x444444);
    doorSurface.setDepth(6);
    doorSurface.setAlpha(0);

    const prompt = this.add.text(doorX, doorY - 60, '[E] ENTER', {
      fontSize: '14px',
      color: '#aaddaa',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 }
    });
    prompt.setOrigin(0.5);
    prompt.setDepth(100);
    prompt.setVisible(false);
    this.bossExitPrompt = prompt;

    this.bossExitDoorVisuals = [doorFrame, doorSurface];

    const zone = this.add.zone(doorX, doorY, width + 40, height + 40);
    this.physics.add.existing(zone, true);
    this.bossExitZone = zone;
  }

  openBossExitDoor(): void {
    // Reveal the exit door with a tween
    this.bossExitDoorVisuals.forEach(v => {
      this.tweens.add({
        targets: v,
        alpha: 1,
        duration: 1000,
        ease: 'Power2'
      });
    });

    // Screen shake
    this.cameras.main.shake(300, 0.02);
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
  
  // The Medulla environment visuals - volcanic hellscape
  private createMedullaEnvironment(): void {
    const width = this.currentLevel.width;
    const height = this.currentLevel.height;
    
    // Deep red volcanic gradient background
    const bgGradient = this.add.graphics();
    bgGradient.fillStyle(0x2a0808);
    bgGradient.fillRect(0, 0, width, height);
    bgGradient.setDepth(-15);
    
    // Add more cauterized bodies reaching from walls
    this.createCauterizedBodies();
    
    // Create glowing lava cracks on the ground
    for (let i = 0; i < 8; i++) {
      const crackX = Phaser.Math.Between(100, width - 100);
      const crackWidth = Phaser.Math.Between(40, 80);
      const crack = this.add.rectangle(crackX, height - 45, crackWidth, 6, 0xff4400);
      crack.setAlpha(0.6);
      crack.setDepth(-4);
      
      // Pulse glow
      this.tweens.add({
        targets: crack,
        alpha: 0.3,
        duration: 1000 + Math.random() * 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    // Obsidian glass reflections on platforms
    this.currentLevel.platforms.forEach(p => {
      if (p.type === 'platform') {
        // Glass-like reflection on top
        const reflection = this.add.rectangle(
          p.x + p.width / 2,
          p.y + 3,
          p.width - 10,
          4,
          0x332020
        );
        reflection.setAlpha(0.5);
        reflection.setDepth(2);
      }
    });
    
    // Ambient heat distortion zones
    for (let i = 0; i < 5; i++) {
      const heatX = Phaser.Math.Between(100, width - 100);
      const heatY = Phaser.Math.Between(200, height - 200);
      const heat = this.add.ellipse(heatX, heatY, 80, 40, 0xff2200, 0.05);
      heat.setDepth(-3);
      
      // Shimmer effect
      this.tweens.add({
        targets: heat,
        scaleX: 1.2,
        scaleY: 0.8,
        alpha: 0.02,
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }
  
  // Create cauterized explorers fused into walls
  private createCauterizedBodies(): void {
    const height = this.currentLevel.height;
    
    const bodyPositions = [
      { x: 80, y: 400, flipX: false },
      { x: 1120, y: 500, flipX: true },
      { x: 70, y: 700, flipX: false },
      { x: 1130, y: 750, flipX: true },
    ];
    
    bodyPositions.forEach(pos => {
      const g = this.add.graphics();
      g.setDepth(-8);
      
      const dir = pos.flipX ? -1 : 1;
      
      // Body merged with rock
      g.fillStyle(0x2a1a1a, 0.9);
      g.fillEllipse(pos.x, pos.y, 35, 55);
      
      // Reaching arm
      g.lineStyle(10, 0x1a1010, 0.9);
      g.beginPath();
      g.moveTo(pos.x, pos.y - 15);
      g.lineTo(pos.x + dir * 35, pos.y - 40);
      g.lineTo(pos.x + dir * 60, pos.y - 60);
      g.strokePath();
      
      // Hand
      g.fillStyle(0x1a0808, 0.95);
      g.fillCircle(pos.x + dir * 60, pos.y - 60, 10);
      
      // Spread fingers reaching out desperately
      for (let i = 0; i < 5; i++) {
        const angle = (i - 2) * 0.25 + (pos.flipX ? Math.PI : 0);
        const fingerLen = 10 + Math.random() * 5;
        g.lineStyle(3, 0x1a0808, 0.9);
        g.beginPath();
        g.moveTo(pos.x + dir * 60, pos.y - 60);
        g.lineTo(
          pos.x + dir * 60 + Math.cos(angle) * fingerLen * dir,
          pos.y - 60 - Math.sin(angle) * fingerLen
        );
        g.strokePath();
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
  private bossExitDoorOpened = false;

  private checkBossSummon(): void {
    // Check Skull Ravager Arena - open exit door when all enemies dead
    if (this.levelId === 'skullRavagerArena' && !this.bossExitDoorOpened) {
      const activeEnemies = this.enemies.getChildren().filter((enemy) => {
        const e = enemy as any;
        return !(e.isDying?.() ?? e.isDead);
      });
      if (activeEnemies.length === 0) {
        this.bossExitDoorOpened = true;
        this.time.delayedCall(1500, () => {
          this.openBossExitDoor();
        });
      }
    }

    // Only for Moss Titan Arena level
    if (this.levelId !== 'mossTitanArena') return;
    
    // If boss already summoned or player is already in boss fight, don't check
    if (this.bossSummoned || this.inBossArena) return;
    
    // Check if all enemies are dead
    const activeEnemies = this.enemies.getChildren().filter((enemy) => {
      const e = enemy as any;
      return !(e.isDying?.() ?? e.isDead);
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

  private createHuntersMarchEnvironment(showTitle: boolean): void {
    const w = this.currentLevel.width;
    const h = this.currentLevel.height;

    // Dark red background
    const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x1a0808);
    bg.setDepth(-10);

    // Blood-red stains on ground
    for (let i = 0; i < 30; i++) {
      const mx = Phaser.Math.Between(40, w - 40);
      const my = Phaser.Math.Between(h - 80, h - 20);
      const stain = this.add.ellipse(mx, my, Phaser.Math.Between(20, 50), Phaser.Math.Between(8, 16), 
        Phaser.Math.RND.pick([0x5a1e1e, 0x7a2a2a, 0x8a3a3a, 0x4a1212]), 0.7);
      stain.setDepth(0);
    }

    // Red streaks on walls
    for (let wy = 50; wy < h - 50; wy += 30) {
      const lm = this.add.ellipse(35 + Math.random() * 15, wy, Phaser.Math.Between(10, 25), Phaser.Math.Between(8, 18), 0x6a1e1e, 0.5);
      lm.setDepth(0);
      const rm = this.add.ellipse(w - 35 - Math.random() * 15, wy, Phaser.Math.Between(10, 25), Phaser.Math.Between(8, 18), 0x6a1e1e, 0.5);
      rm.setDepth(0);
    }

    // Crimson stalactites hanging from ceiling
    for (let i = 0; i < 15; i++) {
      const vx = Phaser.Math.Between(50, w - 50);
      const vineLen = Phaser.Math.Between(30, 80);
      const spike = this.add.rectangle(vx, 30 + vineLen / 2, 3, vineLen, 0x8a2a2a, 0.6);
      spike.setDepth(0);
      const tip = this.add.triangle(vx, 30 + vineLen, 0, 0, 8, 0, 4, 8, 0xaa4444, 0.7);
      tip.setDepth(0);
    }

    // Scattered dark red patches
    for (let i = 0; i < 12; i++) {
      const cx = Phaser.Math.Between(50, w - 50);
      const cy = Phaser.Math.Between(100, h - 120);
      const clump = this.add.ellipse(cx, cy, Phaser.Math.Between(12, 30), Phaser.Math.Between(6, 14), 0x7a2a2a, 0.4);
      clump.setDepth(0);
    }

    if (showTitle) {
      this.showAreaTitle("HUNTER'S MARCH", '~ The path of crimson ~', '#cc4444', '#dd6666', '#551111', '#440000');
    }
  }


  private showAreaTitle(title: string, subtitle: string, titleColor: string, subtitleColor: string, strokeColor: string, shadowColor: string): void {
    const cam = this.cameras.main;
    const titleText = this.add.text(cam.width / 2, cam.height / 2 - 20, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '52px',
      color: titleColor,
      fontStyle: 'bold',
      stroke: strokeColor,
      strokeThickness: 8,
      shadow: { offsetX: 3, offsetY: 3, color: shadowColor, blur: 15, fill: true }
    });
    titleText.setOrigin(0.5);
    titleText.setScrollFactor(0);
    titleText.setDepth(1001);
    titleText.setAlpha(0);

    const subText = this.add.text(cam.width / 2, cam.height / 2 + 30, subtitle, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: subtitleColor,
      fontStyle: 'italic',
      stroke: '#000000',
      strokeThickness: 4,
    });
    subText.setOrigin(0.5);
    subText.setScrollFactor(0);
    subText.setDepth(1001);
    subText.setAlpha(0);

    this.tweens.add({ targets: [titleText, subText], alpha: 1, duration: 600, ease: 'Power2' });
    this.time.delayedCall(2500, () => {
      if (this.scene.isActive()) {
        this.tweens.add({ targets: [titleText, subText], alpha: 0, duration: 600, ease: 'Power2', onComplete: () => { titleText.destroy(); subText.destroy(); } });
      }
    });
  }

  private createVerdainaDoor(x: number, y: number, width: number, height: number): void {
    const doorX = x + width / 2;
    const doorY = y + height / 2;

    // Stone door frame
    const doorFrame = this.add.rectangle(doorX, doorY, width + 10, height + 10, 0x2a3a2a);
    doorFrame.setStrokeStyle(3, 0x1a2a1a);
    doorFrame.setDepth(5);

    // Door surface
    const doorSurface = this.add.rectangle(doorX, doorY, width, height, 0x3a4a3a);
    doorSurface.setStrokeStyle(2, 0x2a3a2a);
    doorSurface.setDepth(6);

    // Moss/vine decorations on door
    for (let i = 0; i < 8; i++) {
      const vx = doorX + Phaser.Math.Between(-18, 18);
      const vy = doorY + Phaser.Math.Between(-40, 40);
      const vine = this.add.ellipse(vx, vy, 6 + Math.random() * 8, 10 + Math.random() * 12, 0x44aa44, 0.6);
      vine.setDepth(7);
    }

    // "Sealed" text
    const sealedText = this.add.text(doorX, doorY - 60, 'The path ahead is not yet clear...', {
      fontSize: '12px',
      color: '#44cc44',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    });
    sealedText.setOrigin(0.5);
    sealedText.setDepth(100);
    sealedText.setVisible(false);

    const zone = this.add.zone(doorX, doorY, width + 40, height + 40);
    this.physics.add.existing(zone, true);

    (this as any)._verdainaDoorZone = zone;
    (this as any)._verdainaDoorText = sealedText;
  }

  private createVerdainaDoorTransition(x: number, y: number, width: number, height: number, target: string, targetSpawn: string): void {
    const doorX = x + width / 2;
    const doorY = y + height / 2;

    // Red-themed door visuals for Hunter's March
    const doorFrame = this.add.rectangle(doorX, doorY, width + 10, height + 10, 0x3a1a1a);
    doorFrame.setStrokeStyle(3, 0x2a0a0a);
    doorFrame.setDepth(5);

    const doorSurface = this.add.rectangle(doorX, doorY, width, height, 0x4a2a2a);
    doorSurface.setStrokeStyle(2, 0x3a1a1a);
    doorSurface.setDepth(6);

    for (let i = 0; i < 8; i++) {
      const vx = doorX + Phaser.Math.Between(-18, 18);
      const vy = doorY + Phaser.Math.Between(-40, 40);
      const vine = this.add.ellipse(vx, vy, 6 + Math.random() * 8, 10 + Math.random() * 12, 0xaa4444, 0.6);
      vine.setDepth(7);
    }

    // Interact prompt
    const prompt = this.add.text(doorX, doorY - 60, 'Press E to enter', {
      fontSize: '12px',
      color: '#cc4444',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    });
    prompt.setOrigin(0.5);
    prompt.setDepth(100);
    prompt.setVisible(false);

    const zone = this.add.zone(doorX, doorY, width + 40, height + 40);
    this.physics.add.existing(zone, true);

    (this as any)._verdainaDoorTransZone = zone;
    (this as any)._verdainaDoorTransPrompt = prompt;
    (this as any)._verdainaDoorTransTarget = target;
    (this as any)._verdainaDoorTransSpawn = targetSpawn;
  }

  private findGroundBelow(x: number, startY: number): number {
    if (!this.currentLevel) return startY;
    const playerHeight = 40;
    let bestY = startY;
    for (const p of this.currentLevel.platforms) {
      const platformTop = p.y;
      // Check if x is within platform horizontal bounds
      if (x >= p.x && x <= p.x + p.width) {
        // Platform must be at or below spawn
        if (platformTop >= startY - playerHeight && platformTop > bestY - 200) {
          // Snap player so feet rest on top of platform
          const landY = platformTop - playerHeight / 2;
          if (landY < bestY || bestY === startY) {
            bestY = landY;
          }
        }
      }
    }
    return bestY;
  }

  // ── Fake Bench Trap ──
  private fakeBenchTriggered = false;
  private lockedDoorPortal: Portal | null = null;
  private lockedDoorBlocker: Phaser.GameObjects.Rectangle | null = null;
  private lockedDoorPrompt: Phaser.GameObjects.Text | null = null;

  // ── Wave Arena ──
  private waveArenaActive = false;
  private currentWaveIndex = 0;
  private waveArenaComplete = false;
  private waveBenchBlocker: Phaser.GameObjects.Rectangle | null = null;
  private waveBenchMidRest = false;
  private waveArenaWaves: any[] | null = null;
  private waveArenaText: Phaser.GameObjects.Text | null = null;

  private createFakeBench(x: number, y: number, data: any): void {
    const benchSeat = this.add.rectangle(x, y, 50, 12, 0x8b7355);
    benchSeat.setStrokeStyle(2, 0x6b5335);
    benchSeat.setDepth(5);

    const legL = this.add.rectangle(x - 18, y + 14, 6, 16, 0x6b5335);
    legL.setDepth(5);
    const legR = this.add.rectangle(x + 18, y + 14, 6, 16, 0x6b5335);
    legR.setDepth(5);

    const glow = this.add.circle(x, y - 10, 30, 0xffffcc, 0.08);
    glow.setDepth(4);
    this.tweens.add({ targets: glow, alpha: 0.15, duration: 1500, yoyo: true, repeat: -1 });

    const prompt = this.add.text(x, y - 40, 'Rest?', {
      fontSize: '12px', color: '#ccaa66', fontFamily: 'Georgia, serif', fontStyle: 'italic'
    });
    prompt.setOrigin(0.5).setDepth(100).setVisible(false);

    // Deferred proximity check (player doesn't exist during buildLevel)
    const checkTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!this.player || this.fakeBenchTriggered) {
          if (this.fakeBenchTriggered) { prompt.setVisible(false); checkTimer.remove(); }
          return;
        }
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
        if (dist < 120) prompt.setVisible(true);
        else prompt.setVisible(false);

        if (dist < 50) {
          this.fakeBenchTriggered = true;
          prompt.setVisible(false);
          checkTimer.remove();

          this.tweens.add({
            targets: [benchSeat, legL, legR, glow],
            alpha: 0, scaleX: 0.2, scaleY: 0.2, duration: 250,
            onComplete: () => { benchSeat.destroy(); legL.destroy(); legR.destroy(); glow.destroy(); }
          });

          for (let i = 0; i < 8; i++) {
            const p = this.add.circle(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-20, 10), 3, 0xff4444, 0.8);
            this.tweens.add({ targets: p, y: p.y - 40, alpha: 0, duration: 400 + i * 50, onComplete: () => p.destroy() });
          }

          this.cameras.main.shake(300, 0.01);

          this.time.delayedCall(500, () => {
            const spawnX = data.spawnX || x;
            const spawnY = data.spawnY || y;
            const config = (enemiesData as Record<string, EnemyCombatConfig>)[data.spawnEnemy || 'colonyVanguard'];
            if (config) {
              const vanguard = new ColonyVanguard(this, spawnX, spawnY, config);
              this.enemies.add(vanguard);
              const flash = this.add.circle(spawnX, spawnY, 40, 0xaa3333, 0.6);
              this.tweens.add({ targets: flash, radius: 60, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
            }
          });
        }
      }
    });
  }

  private createCampfire(x: number, y: number): void {
    // Fire base (logs)
    const log1 = this.add.rectangle(x - 8, y + 8, 24, 6, 0x5c3a1a);
    log1.setAngle(15);
    log1.setDepth(3);
    const log2 = this.add.rectangle(x + 8, y + 8, 24, 6, 0x4a2e14);
    log2.setAngle(-15);
    log2.setDepth(3);

    // Fire glow on ground
    const glow = this.add.circle(x, y, 50, 0xff6600, 0.08);
    glow.setDepth(1);

    // Animated fire particles
    const fireColors = [0xff4400, 0xff6600, 0xffaa00, 0xffcc00];
    const fireParticles: Phaser.GameObjects.Arc[] = [];

    for (let i = 0; i < 8; i++) {
      const color = fireColors[Phaser.Math.Between(0, fireColors.length - 1)];
      const particle = this.add.circle(x, y, Phaser.Math.Between(3, 6), color, 0.8);
      particle.setDepth(4);
      fireParticles.push(particle);
    }

    // Animate fire particles
    this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        fireParticles.forEach(p => {
          p.x = x + Phaser.Math.Between(-10, 10);
          p.y = y + Phaser.Math.Between(-20, -2);
          p.setScale(Phaser.Math.FloatBetween(0.5, 1.2));
          p.setAlpha(Phaser.Math.FloatBetween(0.4, 0.9));
          const color = fireColors[Phaser.Math.Between(0, fireColors.length - 1)];
          p.setFillStyle(color);
        });
        // Flicker glow
        glow.setAlpha(Phaser.Math.FloatBetween(0.06, 0.12));
      },
    });
  }

  private createCrimsonKeyDoor(x: number, y: number, width: number, height: number): void {
    const doorX = x + width / 2;
    const doorY = y + height / 2;

    // Door is hidden initially — only appears after all enemies are dead
    const doorFrame = this.add.rectangle(doorX, doorY, width + 10, height + 10, 0x3a0a0a);
    doorFrame.setStrokeStyle(3, 0x5a1515);
    doorFrame.setDepth(5);
    doorFrame.setVisible(false);

    const doorSurface = this.add.rectangle(doorX, doorY, width, height, 0x6a1a1a);
    doorSurface.setStrokeStyle(2, 0x8a2a2a);
    doorSurface.setDepth(6);
    doorSurface.setVisible(false);

    // Crimson rune markings
    const rune1 = this.add.circle(doorX, doorY - 20, 6, 0xcc3333, 0.8);
    rune1.setDepth(7).setVisible(false);
    const rune2 = this.add.circle(doorX, doorY + 20, 6, 0xcc3333, 0.8);
    rune2.setDepth(7).setVisible(false);
    const runeCenter = this.add.circle(doorX, doorY, 10, 0xff4444, 0.6);
    runeCenter.setDepth(7).setVisible(false);

    // Lock symbol
    const lockIcon = this.add.text(doorX, doorY, '🔒', { fontSize: '20px' });
    lockIcon.setOrigin(0.5).setDepth(8).setVisible(false);

    // Prompt text
    const promptText = this.add.text(doorX, doorY - 65, 'This door requires a Crimson Key', {
      fontSize: '10px', color: '#cc4444', fontFamily: 'Georgia, serif', fontStyle: 'italic'
    });
    promptText.setOrigin(0.5).setDepth(100).setVisible(false);

    const doorParts = [doorFrame, doorSurface, rune1, rune2, runeCenter, lockIcon];

    const zone = this.add.zone(doorX, doorY, width + 40, height + 40);
    this.physics.add.existing(zone, true);

    let doorRevealed = false;

    // Check for all enemies dead, then reveal door and hide campfire
    const checkReveal = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (doorRevealed) return;
        const aliveEnemies = this.enemies.getChildren().filter(e => {
          const enemy = e as any;
          return enemy.active && !enemy.isDying?.();
        });
        if (aliveEnemies.length === 0) {
          doorRevealed = true;
          checkReveal.remove();

          // Show door with fade-in
          doorParts.forEach(p => {
            p.setVisible(true);
            p.setAlpha(0);
            this.tweens.add({ targets: p, alpha: 1, duration: 600 });
          });

          // Pulse the runes
          this.tweens.add({
            targets: [rune1, rune2, runeCenter],
            alpha: { from: 0.4, to: 1 },
            duration: 1200,
            yoyo: true,
            repeat: -1
          });

          // Set up interaction
          this.physics.add.overlap(this.player, zone, () => {
            promptText.setVisible(true);
          });
        }
      }
    });

    // Hide prompt when not overlapping (checked in update via a flag)
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!doorRevealed) return;
        const inRange = this.physics.overlap(this.player, zone);
        if (!inRange) promptText.setVisible(false);
      }
    });
  }

  private createLockedVerdainaDoor(x: number, y: number, width: number, height: number, target: string, targetSpawn: string): void {
    const doorX = x + width / 2;
    const doorY = y + height / 2;

    // Door visuals (same as verdainaDoor but with chains)
    const doorFrame = this.add.rectangle(doorX, doorY, width + 10, height + 10, 0x3a1a1a);
    doorFrame.setStrokeStyle(3, 0x2a0a0a);
    doorFrame.setDepth(5);

    const doorSurface = this.add.rectangle(doorX, doorY, width, height, 0x4a2a2a);
    doorSurface.setStrokeStyle(2, 0x3a1a1a);
    doorSurface.setDepth(6);

    // Chain/lock visuals
    const chain1 = this.add.rectangle(doorX, doorY - 20, width + 6, 6, 0x888888, 0.8);
    chain1.setDepth(8);
    const chain2 = this.add.rectangle(doorX, doorY + 20, width + 6, 6, 0x888888, 0.8);
    chain2.setDepth(8);
    const lock = this.add.circle(doorX, doorY, 8, 0xaa8844);
    lock.setStrokeStyle(2, 0x886622);
    lock.setDepth(9);

    // "Locked" prompt
    const lockedText = this.add.text(doorX, doorY - 65, 'Defeat the guardian...', {
      fontSize: '11px', color: '#cc4444', fontFamily: 'Georgia, serif', fontStyle: 'italic'
    });
    lockedText.setOrigin(0.5).setDepth(100).setVisible(false);

    const zone = this.add.zone(doorX, doorY, width + 40, height + 40);
    this.physics.add.existing(zone, true);

    // Store references for unlocking
    this.lockedDoorPrompt = lockedText;

    // Check each frame if enemies are dead
    const checkUnlock = () => {
      const aliveEnemies = this.enemies.getChildren().filter(e => {
        const enemy = e as any;
        return enemy.active && !enemy.isDying?.();
      });

      if (aliveEnemies.length === 0 && (this.fakeBenchTriggered || this.waveArenaComplete)) {
        // Unlock the door!
        this.tweens.add({
          targets: [chain1, chain2, lock],
          alpha: 0, duration: 400,
          onComplete: () => { chain1.destroy(); chain2.destroy(); lock.destroy(); }
        });

        lockedText.setText('Press E to enter');
        lockedText.setColor('#44cc44');

        // Now make it function as a real door
        this.physics.add.overlap(this.player, zone, () => {
          lockedText.setVisible(true);
          if (this.input.keyboard && Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('E'))) {
            this.transitionToLevel(target, targetSpawn);
          }
        });

        // Stop checking
        if (unlockEvent) unlockEvent.remove();
      }
    };

    const unlockEvent = this.time.addEvent({ delay: 500, callback: checkUnlock, loop: true });

    // Show locked text on approach
    this.physics.add.overlap(this.player, zone, () => {
      if (!this.fakeBenchTriggered && !this.waveArenaActive) return;
      const aliveEnemies = this.enemies.getChildren().filter(e => {
        const enemy = e as any;
        return enemy.active && !enemy.isDying?.();
      });
      if (aliveEnemies.length > 0) {
        lockedText.setVisible(true);
      }
    });
  }

  // ── Wave Arena System ──
  private setupWaveArena(): void {
    const special = (this.currentLevel as any).special;
    if (!special?.waveArena || !special.waves) return;

    // Trigger waves when player enters the arena zone
    const trigger = this.currentLevel.triggers.find(t => t.type === 'waveArena' as any);
    if (!trigger) return;

    const zone = this.add.zone(trigger.x + trigger.width / 2, trigger.y + trigger.height / 2, trigger.width, trigger.height);
    this.physics.add.existing(zone, true);

    // Block the bench with a barrier until needed
    const benchTrigger = this.currentLevel.triggers.find(t => t.type === 'bench' as any);
    if (benchTrigger) {
      this.waveBenchBlocker = this.add.rectangle(
        benchTrigger.x + 30, benchTrigger.y - 10, 80, 60, 0x882222, 0.6
      );
      this.physics.add.existing(this.waveBenchBlocker, true);
      this.physics.add.collider(this.player!, this.waveBenchBlocker);
    }

    // Wave counter text
    const waveText = this.add.text(this.currentLevel.width / 2, 60, '', {
      fontSize: '18px', color: '#ff6644', fontFamily: 'Georgia, serif', fontStyle: 'bold'
    });
    waveText.setOrigin(0.5).setDepth(200).setVisible(false).setScrollFactor(0);
    this.waveArenaText = waveText;
    this.waveArenaWaves = special.waves;

    const startWaves = () => {
      if (this.waveArenaActive) return;
      this.waveArenaActive = true;
      this.currentWaveIndex = 0;

      // Screen shake and announcement
      this.cameras.main.shake(400, 0.015);
      waveText.setText('THE GATE IS SEALED').setVisible(true);
      this.time.delayedCall(2000, () => this.spawnNextWave(special.waves, waveText));
    };

    // Deferred check - player may not exist during buildLevel
    const checkTimer = this.time.addEvent({
      delay: 200, loop: true,
      callback: () => {
        if (!this.player || this.waveArenaActive) { 
          if (this.waveArenaActive) checkTimer.remove();
          return; 
        }
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          trigger.x + trigger.width / 2, trigger.y + trigger.height / 2
        );
        if (dist < 400) {
          checkTimer.remove();
          startWaves();
        }
      }
    });
  }

  private spawnNextWave(waves: any[], waveText: Phaser.GameObjects.Text): void {
    if (this.currentWaveIndex >= waves.length) {
      // All waves complete!
      this.waveArenaComplete = true;
      waveText.setText('THE GATE OPENS').setColor('#44cc44');
      this.cameras.main.shake(300, 0.01);
      this.time.delayedCall(2000, () => waveText.setVisible(false));
      
      // Permanently remove bench blocker
      if (this.waveBenchBlocker) {
        this.waveBenchBlocker.destroy();
        this.waveBenchBlocker = null;
      }
      return;
    }

    const wave = waves[this.currentWaveIndex];
    waveText.setText(`Wave ${this.currentWaveIndex + 1} / ${waves.length}`).setColor('#ff6644').setVisible(true);

    // Spawn enemies for this wave
    wave.enemies.forEach((e: any) => {
      const config = (enemiesData as Record<string, EnemyCombatConfig>)[e.type];
      if (!config) return;

      let enemy: any = null;
      if (e.type === 'frontierScout') {
        enemy = new FrontierScout(this, e.x, e.y, config);
      } else if (e.type === 'frontierWarrior') {
        // Wave warriors never become winged variants
        enemy = new FrontierWarrior(this, e.x, e.y, config);
      } else if (e.type === 'wingedWarrior') {
        enemy = new WingedWarrior(this, e.x, e.y - 80, config);
      } else if (e.type === 'colonyVanguard') {
        enemy = new ColonyVanguard(this, e.x, e.y, config);
      } else if (e.type === 'wingedCommander') {
        enemy = new WingedCommander(this, e.x, e.y - 60, config);
      }

      if (enemy) {
        this.enemies.add(enemy);
        // Spawn flash
        const flash = this.add.circle(e.x, e.y, 30, 0xaa3333, 0.6);
        this.tweens.add({ targets: flash, radius: 50, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
      }
    });

    // Check when all enemies in this wave are dead, then spawn next
    const checkWaveClear = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        const alive = this.enemies.getChildren().filter(e => {
          const en = e as any;
          return en.active && !en.isDying?.();
        });
        if (alive.length === 0) {
          checkWaveClear.remove();
          this.currentWaveIndex++;
          
          // After wave 2 (index becomes 2), grant mid-arena bench rest
          if (this.currentWaveIndex === 2 && !this.waveBenchMidRest) {
            this.waveBenchMidRest = true;
            this.grantMidArenaBenchRest(waves, waveText);
          } else {
            this.time.delayedCall(1500, () => this.spawnNextWave(waves, waveText));
          }
        }
      }
    });
  }

  /**
   * After wave 2, remove bench blocker, teleport player to bench for a rest
   */
  private grantMidArenaBenchRest(waves: any[], waveText: Phaser.GameObjects.Text): void {
    // Remove the bench blocker
    if (this.waveBenchBlocker) {
      this.waveBenchBlocker.destroy();
      this.waveBenchBlocker = null;
    }

    // Show message
    waveText.setText('REST AT THE BENCH').setColor('#44bbff').setVisible(true);

    // Teleport player to bench location
    const benchTrigger = this.currentLevel.triggers.find(t => t.type === 'bench' as any);
    if (benchTrigger && this.player) {
      this.player.setPosition(benchTrigger.x + 30, benchTrigger.y - 20);
      this.player.setVelocity(0, 0);
    }
  }

  /**
   * After mid-arena bench rest, teleport player back, re-block bench, continue waves
   */
  private resumeArenaAfterBenchRest(): void {
    // Teleport player back to the floor
    if (this.player) {
      this.player.setPosition(600, 600);
      this.player.setVelocity(0, 0);
    }

    // Re-block the bench
    const benchTrigger = this.currentLevel.triggers.find(t => t.type === 'bench' as any);
    if (benchTrigger) {
      this.waveBenchBlocker = this.add.rectangle(
        benchTrigger.x + 30, benchTrigger.y - 10, 80, 60, 0x882222, 0.6
      );
      this.physics.add.existing(this.waveBenchBlocker, true);
      if (this.player) {
        this.physics.add.collider(this.player, this.waveBenchBlocker);
      }
    }

    // Continue waves
    if (this.waveArenaWaves && this.waveArenaText) {
      this.time.delayedCall(1500, () => this.spawnNextWave(this.waveArenaWaves!, this.waveArenaText!));
    }
  }

  private generateRemixEnemies(): Array<{ type: string; x: number; y: number; behavior: string; guaranteed?: boolean }> {
    const groundTypes = ['frontierScout', 'frontierWarrior'];
    const flyingTypes = ['wingedWarrior'];
    const rareGroundTypes = ['colonyVanguard'];
    const rareFlyingTypes = ['wingedCommander'];
    const allTypes = [...groundTypes, ...flyingTypes];
    
    const groundY = this.currentLevel.height - 100;
    const flyingY = this.currentLevel.height - 250;
    const minX = 150;
    const maxX = this.currentLevel.width - 150;
    
    // Random count: 2-5 enemies
    const count = Phaser.Math.Between(2, 5);
    const enemies: Array<{ type: string; x: number; y: number; behavior: string; guaranteed?: boolean }> = [];
    
    // 20% chance to include one rare enemy per room
    let hasRare = false;
    if (Math.random() < 0.2) {
      hasRare = true;
      const rareType = Phaser.Utils.Array.GetRandom([...rareGroundTypes, ...rareFlyingTypes]);
      const isFlying = rareFlyingTypes.includes(rareType);
      const x = Phaser.Math.Between(minX, maxX);
      const y = isFlying ? flyingY : groundY;
      enemies.push({ type: rareType, x, y, behavior: 'patrol', guaranteed: true });
    }
    
    const remaining = hasRare ? count - 1 : count;
    for (let i = 0; i < remaining; i++) {
      const type = Phaser.Utils.Array.GetRandom(allTypes);
      const isFlying = flyingTypes.includes(type);
      const x = Phaser.Math.Between(minX, maxX);
      const y = isFlying ? flyingY : groundY;
      enemies.push({ type, x, y, behavior: 'patrol', guaranteed: true });
    }
    
    return enemies;
  }

  private hunterArenaFauna: Phaser.GameObjects.GameObject[] = [];
  private hunterArenaSealed = false;
  private hunterArenaEntranceDoor: Phaser.GameObjects.Rectangle | null = null;

  private setupHunterBossArena(fauna: Array<{ type: string; x: number; y: number }>): void {
    // Create decorative background creatures (non-interactive)
    fauna.forEach(f => {
      const colors: Record<string, number> = {
        frontierScout: 0xcc4444,
        frontierWarrior: 0xaa2222,
        wingedWarrior: 0xdd5555,
        colonyVanguard: 0x991111,
        wingedCommander: 0xff3333,
      };
      const sizes: Record<string, { w: number; h: number }> = {
        frontierScout: { w: 30, h: 40 },
        frontierWarrior: { w: 40, h: 50 },
        wingedWarrior: { w: 35, h: 35 },
        colonyVanguard: { w: 50, h: 60 },
        wingedCommander: { w: 55, h: 50 },
      };
      const color = colors[f.type] || 0xcc4444;
      const size = sizes[f.type] || { w: 30, h: 40 };
      
      // Silhouette in background - darker, slightly transparent
      const creature = this.add.rectangle(f.x, f.y, size.w, size.h, color, 0.4);
      creature.setDepth(-2);
      
      // Idle sway animation
      this.tweens.add({
        targets: creature,
        y: f.y + Phaser.Math.Between(-5, 5),
        x: f.x + Phaser.Math.Between(-3, 3),
        duration: Phaser.Math.Between(1500, 2500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      this.hunterArenaFauna.push(creature);
    });

    // Set up entry trigger - when player walks past x=200, seal the arena
    this.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.hunterArenaSealed && this.player && this.player.x > 200) {
          this.sealHunterBossArena();
        }
      },
      loop: true
    });
  }

  private sealHunterBossArena(): void {
    this.hunterArenaSealed = true;

    // Seal entrance door - find and block it
    // Create a solid gate over the entrance
    const gate = this.add.rectangle(65, 600, 60, 120, 0x3a1a1a);
    gate.setStrokeStyle(3, 0x661111);
    gate.setDepth(5);
    this.hunterArenaEntranceDoor = gate;
    
    // Add physics body so player can't walk through
    this.physics.add.existing(gate, true);
    this.physics.add.collider(this.player, gate);

    // Dramatic gate slam
    this.cameras.main.shake(200, 0.02);

    // Fade out all background fauna with a dramatic effect
    this.time.delayedCall(500, () => {
      this.hunterArenaFauna.forEach((creature, i) => {
        this.time.delayedCall(i * 80, () => {
          this.tweens.add({
            targets: creature,
            alpha: 0,
            scale: 0.5,
            duration: 400,
            ease: 'Power2',
            onComplete: () => (creature as Phaser.GameObjects.Rectangle).destroy()
          });
        });
      });
      this.hunterArenaFauna = [];
    });

    // After fauna disappear, spawn the Ant Elder boss
    this.time.delayedCall(2000, () => {
      const antElder = new AntElder(this, 700, 550);
      this.boss = antElder as any;
      this.inBossArena = true;
      this.player.jumpMultiplier = 2;
      gameState.setState('boss');

      this.physics.add.collider(this.boss, this.platforms);
      this.physics.add.collider(this.boss, this.walls);
      this.physics.add.overlap(this.player, this.boss,
        () => this.handlePlayerBossContact()
      );
    });
  }

  private _enteringShroomialLands = false;
  private enterShroomialLands(): void {
    if (this._enteringShroomialLands) return;
    this._enteringShroomialLands = true;
    // Freeze player
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    // Black overlay
    const overlay = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(2000);

    // Fade to black
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 800,
      onComplete: () => {
        // Show "Shroomial Lands" title in yellow
        const title = this.add.text(cx, cy, 'Shroomial Lands', {
          fontSize: '48px',
          color: '#ddcc22',
          fontFamily: 'Georgia, serif',
          fontStyle: 'bold',
        });
        title.setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(2001);
        title.setAlpha(0);

        // Fade in title
        this.tweens.add({
          targets: title,
          alpha: 1,
          duration: 1000,
          onComplete: () => {
            // Hold, then fade out
            this.time.delayedCall(2000, () => {
              this.tweens.add({
                targets: title,
                alpha: 0,
                duration: 800,
                onComplete: () => {
                  title.destroy();
                  overlay.destroy();
                  this.transitionToLevel('shroomialLands', 'fromFungusDoor');
                }
              });
            });
          }
        });
      }
    });
  }

  private drawShroomialLandsMushroom(): void {
    const cx = 400;
    const groundY = 550;

    // Container for all mushroom parts so we can scale together
    const container = this.add.container(cx, groundY);
    container.setDepth(3);

    // Mushroom stem
    const stem = this.add.rectangle(0, -60, 30, 120, 0xddcc88);

    // Mushroom cap (large dome)
    const cap = this.add.ellipse(0, -130, 120, 70, 0xccaa22);

    // Cap spots
    const spotObjects: Phaser.GameObjects.Arc[] = [];
    const spotsData = [
      { x: -30, y: -140, r: 8 },
      { x: 20, y: -145, r: 6 },
      { x: -10, y: -125, r: 7 },
      { x: 35, y: -130, r: 5 },
    ];
    spotsData.forEach(s => {
      const dot = this.add.circle(s.x, s.y, s.r, 0x1a1800, 0.6);
      spotObjects.push(dot);
    });

    // Face - eyes
    const leftEye = this.add.ellipse(-15, -80, 8, 10, 0x111100);
    const rightEye = this.add.ellipse(15, -80, 8, 10, 0x111100);

    // Eye highlights
    const leftHighlight = this.add.circle(-13, -83, 2, 0xffffcc);
    const rightHighlight = this.add.circle(17, -83, 2, 0xffffcc);

    // Mouth - friendly smile
    const mouth = this.add.graphics();
    mouth.lineStyle(2, 0x111100);
    mouth.beginPath();
    mouth.arc(0, -60, 12, 0.2, Math.PI - 0.2, false);
    mouth.strokePath();

    container.add([stem, cap, ...spotObjects, leftEye, rightEye, leftHighlight, rightHighlight, mouth]);

    // Gentle idle bob
    this.tweens.add({
      targets: container,
      y: groundY - 3,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Phase 2: After 2 seconds - become SAD and smaller
    this.time.delayedCall(2000, () => {
      // Shrink
      this.tweens.add({
        targets: container,
        scaleX: 0.7,
        scaleY: 0.7,
        duration: 800,
        ease: 'Sine.easeInOut',
      });

      // Sad eyes - droop down
      this.tweens.add({ targets: leftEye, y: -75, scaleY: 0.7, duration: 600 });
      this.tweens.add({ targets: rightEye, y: -75, scaleY: 0.7, duration: 600 });
      this.tweens.add({ targets: leftHighlight, y: -78, duration: 600 });
      this.tweens.add({ targets: rightHighlight, y: -78, duration: 600 });

      // Replace smile with frown
      this.tweens.add({
        targets: mouth,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          mouth.clear();
          mouth.lineStyle(2, 0x111100);
          mouth.beginPath();
          // Frown (inverted arc)
          mouth.arc(0, -50, 10, Math.PI + 0.3, -0.3, false);
          mouth.strokePath();
          mouth.setAlpha(1);
        }
      });

      // Change cap color to a more muted/blue-ish sad tone
      cap.setFillStyle(0x999955);
    });

    // Phase 3: After 12 seconds total (10 more) - become ANGRY and bigger
    this.time.delayedCall(12000, () => {
      // Grow big
      this.tweens.add({
        targets: container,
        scaleX: 4,
        scaleY: 4,
        duration: 1000,
        ease: 'Back.easeOut',
      });

      // Angry eyes - sharp and angled
      this.tweens.add({ targets: leftEye, y: -85, scaleX: 1.3, scaleY: 0.6, duration: 500 });
      this.tweens.add({ targets: rightEye, y: -85, scaleX: 1.3, scaleY: 0.6, duration: 500 });
      this.tweens.add({ targets: leftHighlight, alpha: 0, duration: 300 });
      this.tweens.add({ targets: rightHighlight, alpha: 0, duration: 300 });

      // Angry eyebrows
      const leftBrow = this.add.rectangle(-18, -95, 16, 3, 0x111100);
      leftBrow.setRotation(-0.4);
      const rightBrow = this.add.rectangle(18, -95, 16, 3, 0x111100);
      rightBrow.setRotation(0.4);
      container.add([leftBrow, rightBrow]);

      // Angry mouth - jagged snarl
      mouth.clear();
      mouth.lineStyle(3, 0x111100);
      mouth.beginPath();
      mouth.moveTo(-15, -55);
      mouth.lineTo(-8, -50);
      mouth.lineTo(0, -55);
      mouth.lineTo(8, -50);
      mouth.lineTo(15, -55);
      mouth.strokePath();

      // Turn cap red/angry
      cap.setFillStyle(0xcc4422);

      // Screen shake
      this.cameras.main.shake(500, 0.01);

      // Aggressive bob
      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        y: groundY - 8,
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      // Phase 4: After 5 more seconds of anger - dead mushrooms + turn sad
      this.time.delayedCall(5000, () => {
        this.cameras.main.shake(300, 0.008);

        // Revert to sad face
        leftEye.setScale(1, 0.7);
        rightEye.setScale(1, 0.7);
        this.tweens.add({ targets: leftEye, y: -75, scaleX: 1, scaleY: 0.7, duration: 600 });
        this.tweens.add({ targets: rightEye, y: -75, scaleX: 1, scaleY: 0.7, duration: 600 });

        // Sad mouth
        mouth.clear();
        mouth.lineStyle(2, 0x111100);
        mouth.beginPath();
        mouth.arc(0, -50, 10, Math.PI + 0.3, -0.3, false);
        mouth.strokePath();

        // Muted sad cap color
        cap.setFillStyle(0x887744);

        // Stop aggressive bob, gentle slow bob
        this.tweens.killTweensOf(container);
        this.tweens.add({
          targets: container,
          y: groundY - 2,
          duration: 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // Spawn 60 dead mushrooms
        const deadColors = [0x554422, 0x443311, 0x665533, 0x332211, 0x3a2a18];
        for (let i = 0; i < 60; i++) {
          const mx = Phaser.Math.Between(35, 765);
          const my = Phaser.Math.Between(150, 545);
          const scale = 0.2 + Math.random() * 0.9;
          const color = Phaser.Utils.Array.GetRandom(deadColors);

          const dStem = this.add.rectangle(mx, my, 8 * scale, 30 * scale, 0x443322, 0.7);
          dStem.setDepth(1);

          const dCap = this.add.ellipse(mx, my - 18 * scale, 30 * scale, 16 * scale, color, 0.7);
          dCap.setDepth(1);
          dCap.setRotation(Phaser.Math.Between(-4, 4) * 0.15);

          dStem.setAlpha(0);
          dCap.setAlpha(0);
          this.tweens.add({ targets: dStem, alpha: 0.7, duration: 400, delay: i * 40 });
          this.tweens.add({ targets: dCap, alpha: 0.7, duration: 400, delay: i * 40 });
        }
        // Phase 5: After dead mushrooms finish spawning - dialogue + boss intro
        const dialogueDelay = 60 * 40 + 1000; // wait for all mushrooms to fade in + 1s
        this.time.delayedCall(dialogueDelay, () => {
          // Dialogue at top of screen - typed out slowly
          const cam = this.cameras.main;
          const dialogueLines = [
            { text: 'The last.....', delay: 0 },
            { text: 'one......', delay: 1200 },
            { text: 'of...', delay: 2200 },
            { text: 'my..kind...', delay: 3000 },
            { text: 'gone', delay: 4200 },
          ];

          const dialogueTexts: Phaser.GameObjects.Text[] = [];
          let fullText = '';

          dialogueLines.forEach(line => {
            this.time.delayedCall(line.delay, () => {
              fullText += line.text;
              // Remove old texts
              dialogueTexts.forEach(t => t.destroy());
              dialogueTexts.length = 0;

              const dt = this.add.text(cam.width / 2, 60, fullText, {
                fontSize: '20px',
                color: '#ccaa22',
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                wordWrap: { width: 600 },
                align: 'center',
              });
              dt.setOrigin(0.5);
              dt.setScrollFactor(0);
              dt.setDepth(2000);
              dialogueTexts.push(dt);
            });
          });

          // After dialogue finishes - yellow flash + boss title
          this.time.delayedCall(6000, () => {
            // Clean up dialogue
            dialogueTexts.forEach(t => t.destroy());

            // Yellow flash
            const flash = this.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x887711, 0);
            flash.setScrollFactor(0);
            flash.setDepth(3000);

            this.tweens.add({
              targets: flash,
              alpha: 1,
              duration: 200,
              onComplete: () => {
                // Boss title - black text on yellow
                const bossTitle = this.add.text(cam.width / 2, cam.height / 2 - 30, 'Shroomial Overlord', {
                  fontSize: '52px',
                  color: '#111100',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'bold',
                  align: 'center',
                });
                bossTitle.setOrigin(0.5);
                bossTitle.setScrollFactor(0);
                bossTitle.setDepth(3001);

                const bossSubtitle = this.add.text(cam.width / 2, cam.height / 2 + 25, 'The Last Shroom', {
                  fontSize: '22px',
                  color: '#222200',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  align: 'center',
                });
                bossSubtitle.setOrigin(0.5);
                bossSubtitle.setScrollFactor(0);
                bossSubtitle.setDepth(3001);

                // Hold title for 3 seconds, then fade to normal with repositioned shroom
                this.time.delayedCall(3000, () => {
                  this.tweens.add({
                    targets: [flash, bossTitle, bossSubtitle],
                    alpha: 0,
                    duration: 800,
                    onComplete: () => {
                      flash.destroy();
                      bossTitle.destroy();
                      bossSubtitle.destroy();

                      // Move mushroom to CENTER, horrifying final form
                      this.tweens.killTweensOf(container);
                      container.setPosition(400, groundY - 80);
                      container.setScale(4, 4);

                      // === DISTORTED HORROR FACE ===
                      // Eyes - one melting down, one bulging out
                      leftEye.setPosition(-14, -82);
                      leftEye.setScale(2.5, 0.2); // stretched horizontal slit
                      rightEye.setPosition(16, -78);
                      rightEye.setScale(0.4, 2.8); // tall vertical slit

                      // Pupils - twitching, wrong sizes
                      leftHighlight.setAlpha(1);
                      leftHighlight.setPosition(-10, -83);
                      leftHighlight.setScale(0.2);
                      rightHighlight.setAlpha(1);
                      rightHighlight.setPosition(18, -80);
                      rightHighlight.setScale(3);

                      // Third eye - bloodshot, on forehead
                      const thirdEye = this.add.ellipse(3, -108, 14, 16, 0x330000);
                      const thirdEyeInner = this.add.ellipse(3, -108, 10, 12, 0x660000);
                      const thirdPupil = this.add.circle(3, -108, 3, 0xffff00);
                      container.add([thirdEye, thirdEyeInner, thirdPupil]);

                      // Bloodshot veins from third eye
                      const veinGfx = this.add.graphics();
                      veinGfx.lineStyle(1, 0x880000, 0.7);
                      for (let v = 0; v < 6; v++) {
                        const angle = (v / 6) * Math.PI * 2;
                        veinGfx.beginPath();
                        veinGfx.moveTo(3, -108);
                        const endX = 3 + Math.cos(angle) * (12 + Math.random() * 8);
                        const endY = -108 + Math.sin(angle) * (12 + Math.random() * 8);
                        const midX = (3 + endX) / 2 + (Math.random() - 0.5) * 6;
                        const midY = (-108 + endY) / 2 + (Math.random() - 0.5) * 6;
                        veinGfx.lineTo(midX, midY);
                        veinGfx.lineTo(endX, endY);
                        veinGfx.strokePath();
                      }
                      container.add(veinGfx);

                      // Gaping distorted mouth - asymmetric hole
                      mouth.clear();
                      mouth.fillStyle(0x0a0000, 1);
                      mouth.beginPath();
                      mouth.moveTo(-25, -55);
                      mouth.lineTo(-18, -65);
                      mouth.lineTo(-10, -48);
                      mouth.lineTo(-3, -63);
                      mouth.lineTo(6, -40);
                      mouth.lineTo(14, -60);
                      mouth.lineTo(22, -42);
                      mouth.lineTo(28, -53);
                      mouth.lineTo(28, -35);
                      mouth.lineTo(-25, -38);
                      mouth.closePath();
                      mouth.fillPath();
                      // Mouth outline - uneven strokes
                      mouth.lineStyle(2, 0x330000);
                      mouth.strokePath();

                      // Crooked teeth - different sizes, some broken
                      const teethGfx = this.add.graphics();
                      teethGfx.fillStyle(0xbbbb88, 0.9);
                      const teethData = [
                        { x: -20, w: 5, h: 8 }, { x: -12, w: 4, h: 11 },
                        { x: -6, w: 6, h: 6 }, { x: 2, w: 3, h: 13 },
                        { x: 8, w: 7, h: 7 }, { x: 16, w: 4, h: 10 },
                        { x: 22, w: 5, h: 5 },
                      ];
                      teethData.forEach(t => {
                        teethGfx.fillTriangle(t.x, -42, t.x + t.w / 2, -42 + t.h, t.x + t.w, -42);
                      });
                      // Bottom teeth
                      teethGfx.fillStyle(0xaaaa77, 0.8);
                      [{ x: -16, w: 6, h: -7 }, { x: -4, w: 5, h: -9 }, { x: 10, w: 7, h: -6 }, { x: 20, w: 4, h: -8 }]
                        .forEach(t => {
                          teethGfx.fillTriangle(t.x, -55, t.x + t.w / 2, -55 + t.h, t.x + t.w, -55);
                        });
                      container.add(teethGfx);

                      // Dripping ooze/gore from cap and mouth
                      for (let d = 0; d < 8; d++) {
                        const drip = this.add.ellipse(
                          Phaser.Math.Between(-45, 45),
                          -120 + Phaser.Math.Between(0, 15),
                          2 + Math.random() * 3,
                          6 + Math.random() * 15,
                          d < 4 ? 0x442200 : 0x550000, 0.8
                        );
                        container.add(drip);
                        this.tweens.add({
                          targets: drip,
                          y: drip.y + 30,
                          alpha: 0,
                          duration: 1500 + Math.random() * 1500,
                          repeat: -1,
                          delay: d * 300,
                        });
                      }

                      // Cracks/fissures on stem
                      const crackGfx = this.add.graphics();
                      crackGfx.lineStyle(1, 0x331100, 0.6);
                      for (let c = 0; c < 4; c++) {
                        const cy = -20 - c * 25;
                        crackGfx.beginPath();
                        crackGfx.moveTo(-8 + Math.random() * 16, cy);
                        crackGfx.lineTo(-5 + Math.random() * 10, cy + 10);
                        crackGfx.lineTo(-3 + Math.random() * 6, cy + 20);
                        crackGfx.strokePath();
                      }
                      container.add(crackGfx);

                      // Dark blood-red cap, rotting stem
                      cap.setFillStyle(0x551111);
                      stem.setFillStyle(0x554433);

                      // Menacing pulse with slight rotation glitch
                      this.tweens.add({
                        targets: container,
                        scaleX: 4.2,
                        scaleY: 4.2,
                        duration: 800,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut',
                      });

                      // Random rotation twitching
                      this.time.addEvent({
                        delay: 1500,
                        loop: true,
                        callback: () => {
                          const twitch = (Math.random() - 0.5) * 0.06;
                          this.tweens.add({
                            targets: container,
                            rotation: twitch,
                            duration: 100,
                            yoyo: true,
                          });
                        },
                      });

                      // Third eye glitch
                      this.tweens.add({
                        targets: thirdPupil,
                        scaleX: 2.5,
                        scaleY: 0.2,
                        duration: 100,
                        yoyo: true,
                        repeat: -1,
                        repeatDelay: 1500,
                      });

                      // Eye twitching
                      this.time.addEvent({
                        delay: 2000,
                        loop: true,
                        callback: () => {
                          this.tweens.add({ targets: leftEye, x: leftEye.x + Phaser.Math.Between(-3, 3), duration: 80, yoyo: true });
                          this.tweens.add({ targets: rightEye, y: rightEye.y + Phaser.Math.Between(-4, 4), duration: 80, yoyo: true });
                        },
                      });

                      // === FAKE HEALTH BAR (doesn't decrease) ===
                      const hpBarBg = this.add.rectangle(cam.width / 2, 30, 300, 16, 0x222222, 0.9);
                      hpBarBg.setScrollFactor(0);
                      hpBarBg.setDepth(2000);
                      hpBarBg.setStrokeStyle(2, 0x444444);

                      const hpBarFill = this.add.rectangle(cam.width / 2, 30, 296, 12, 0xcc2222, 1);
                      hpBarFill.setScrollFactor(0);
                      hpBarFill.setDepth(2001);

                      const hpLabel = this.add.text(cam.width / 2, 12, 'SHROOMIAL OVERLORD', {
                        fontSize: '10px',
                        color: '#ccaa22',
                        fontFamily: 'Georgia, serif',
                        fontStyle: 'bold',
                      });
                      hpLabel.setOrigin(0.5);
                      hpLabel.setScrollFactor(0);
                      hpLabel.setDepth(2002);

                      // Set respawn to chain room for this fight
                      gameState.setLastBench('chainRoomPostAntElder', 'default');

                      // === HEATSEAKING PROJECTILES - every 1 second ===
                      const playerSpeed = MOVEMENT_TUNING.maxRunSpeed;
                      const projectileSpeed = playerSpeed * 0.9;
                      const activeProjectiles: Phaser.GameObjects.Arc[] = [];

                      const projectileTimer = this.time.addEvent({
                        delay: 1000,
                        loop: true,
                        callback: () => {
                          if (!this.player || !this.player.active) return;

                          // Spawn from third eye
                          const spawnX = container.x;
                          const spawnY = container.y + (-108) * container.scaleY;

                          const proj = this.add.circle(spawnX, spawnY, 6, 0xffcc00);
                          proj.setDepth(100);
                          this.physics.add.existing(proj);
                          const projBody = proj.body as Phaser.Physics.Arcade.Body;
                          projBody.setAllowGravity(false);

                          // Initial direction toward player
                          const angle = Phaser.Math.Angle.Between(spawnX, spawnY, this.player.x, this.player.y);
                          projBody.setVelocity(Math.cos(angle) * projectileSpeed, Math.sin(angle) * projectileSpeed);

                          activeProjectiles.push(proj);

                          // Eerie glow
                          const glow = this.add.circle(spawnX, spawnY, 12, 0xffcc00, 0.2);
                          glow.setDepth(99);
                          this.tweens.add({ targets: glow, alpha: 0, scaleX: 0, scaleY: 0, duration: 300, onComplete: () => glow.destroy() });

                          // Instakill on overlap
                          this.physics.add.overlap(this.player, proj, () => {
                            proj.destroy();
                            gameState.setHp(0);
                            this.handlePlayerDeath();
                          });

                          // Destroy after 8 seconds
                          this.time.delayedCall(8000, () => {
                            if (proj && proj.active) proj.destroy();
                          });
                        },
                      });

                      // Heatseaking update - steer projectiles toward player each frame
                      const heatseekEvent = this.time.addEvent({
                        delay: 50,
                        loop: true,
                        callback: () => {
                          if (!this.player || !this.player.active) return;
                          for (let i = activeProjectiles.length - 1; i >= 0; i--) {
                            const p = activeProjectiles[i];
                            if (!p || !p.active) {
                              activeProjectiles.splice(i, 1);
                              continue;
                            }
                            const pb = p.body as Phaser.Physics.Arcade.Body;
                            const desired = Phaser.Math.Angle.Between(p.x, p.y, this.player.x, this.player.y);
                            const current = Math.atan2(pb.velocity.y, pb.velocity.x);
                            // Smooth turning - steer toward player
                            const turnRate = 0.08;
                            let diff = desired - current;
                            if (diff > Math.PI) diff -= Math.PI * 2;
                            if (diff < -Math.PI) diff += Math.PI * 2;
                            const newAngle = current + diff * turnRate;
                            pb.setVelocity(Math.cos(newAngle) * projectileSpeed, Math.sin(newAngle) * projectileSpeed);
                          }
                        },
                      });

                      this.events.once('shutdown', () => {
                        projectileTimer.destroy();
                        heatseekEvent.destroy();
                      });
                    }
                  });
                });
              }
            });
          });
        });
      });
    });
  }


  // ===================== ENDLESS MODE =====================
  private readonly ENDLESS_TIERS: { maxWave: number; pool: string[] }[] = [
    { maxWave: 3, pool: ['basicHusk', 'vengefly', 'squit', 'mosskin', 'infectedHusk'] },
    { maxWave: 6, pool: ['huskGuard', 'frontierScout', 'aspid', 'frostShard', 'skullScuttler'] },
    { maxWave: 10, pool: ['frontierWarrior', 'mossWarrior', 'frostCharger', 'autumnWraith', 'glacialSentinel', 'colonyVanguard'] },
    { maxWave: 15, pool: ['wingedWarrior', 'skullRavanger', 'ossuarySentinel', 'warfieldReaper', 'warfieldMedic'] },
    { maxWave: Infinity, pool: ['wingedCommander', 'frozenGatekeeper', 'siegeConstruct', 'megaSkullRavager', 'brokenEffigy', 'warfieldBrute', 'arborealWarGoliath'] },
  ];

  private getEndlessEnemyPool(): string[] {
    const pool: string[] = [];
    for (const tier of this.ENDLESS_TIERS) {
      pool.push(...tier.pool);
      if (this.endlessWave <= tier.maxWave) break;
    }
    return pool;
  }

  private readonly ENDLESS_BOSS_TIERS: { maxWave: number; pool: string[] }[] = [
    { maxWave: 5, pool: ['mossTitan'] },
    { maxWave: 10, pool: ['antElder'] },
    { maxWave: 15, pool: ['falseChampion'] },
    { maxWave: 20, pool: ['glacialTitan'] },
    { maxWave: Infinity, pool: ['ravana'] },
  ];

  private getEndlessBossPool(): string[] {
    const pool: string[] = [];
    for (const tier of this.ENDLESS_BOSS_TIERS) {
      pool.push(...tier.pool);
      if (this.endlessWave <= tier.maxWave) break;
    }
    return pool;
  }

  // Track stored platforms for boss wave removal/restoration
  private endlessStoredPlatforms: any[] | null = null;
  private endlessBossWaveActive = false;

  private updateEndlessMode(delta: number): void {
    // Remove enemies that fell off the map and count as kills
    const levelHeight = this.currentLevel?.height || 600;
    const fallThreshold = levelHeight + 100;
    this.enemies.getChildren().forEach((e: any) => {
      if (e.active && e.y > fallThreshold) {
        this.endlessKills++;
        this.registry.set('endlessKills', this.endlessKills);
        e.destroy();
      }
    });
    if (this.boss && (this.boss as any).active && (this.boss as any).y > fallThreshold) {
      this.endlessKills++;
      this.registry.set('endlessKills', this.endlessKills);
      (this.boss as any).destroy();
      this.boss = null;
    }

    // Count alive enemies
    const aliveCount = this.enemies.getChildren().filter(
      (e: any) => e.active && !e.isDying?.()
    ).length;

    // Also count alive bosses for boss waves
    const bossAlive = this.boss && (this.boss as any).active && !(this.boss as any).isDying?.();
    const totalAlive = aliveCount + (bossAlive ? 1 : 0);

    // Track kills
    const prevAlive = this.endlessActiveEnemies;
    if (totalAlive < prevAlive) {
      const killed = prevAlive - totalAlive;
      this.endlessKills += killed;
      this.registry.set('endlessKills', this.endlessKills);
    }
    this.endlessActiveEnemies = totalAlive;

    // If boss wave just ended, restore platforms
    if (this.endlessBossWaveActive && totalAlive === 0) {
      this.endlessBossWaveActive = false;
      this.restoreEndlessPlatforms();
    }

    // If all enemies dead, start spawn timer for next wave
    if (totalAlive === 0) {
      this.endlessSpawnTimer -= delta;
      if (this.endlessSpawnTimer <= 0) {
        this.endlessWave++;
        this.registry.set('endlessWave', this.endlessWave);

        if (this.endlessWave % 5 === 0) {
          this.spawnEndlessBossWave();
        } else {
          this.spawnEndlessWave();
        }
        this.endlessSpawnTimer = 1500;
      }
    }
  }

  private createSpawnCircle(x: number, y: number, isBoss: boolean): Phaser.GameObjects.Graphics {
    const radius = isBoss ? 48 : 20;
    const color = isBoss ? 0xff4400 : 0x44aaff;
    const g = this.add.graphics({ x, y });
    g.setDepth(5);

    const draw = (alpha: number, scale: number) => {
      g.clear();
      g.fillStyle(color, alpha * 0.5);
      g.fillCircle(0, 0, radius * scale);
      g.lineStyle(2, color, alpha);
      g.strokeCircle(0, 0, radius * scale);
    };

    const state = { a: 0, s: 0.3 };
    draw(state.a, state.s);

    // Fade in & grow
    this.tweens.add({
      targets: state,
      a: 0.9,
      s: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onUpdate: () => draw(state.a, state.s),
    });

    // Pulse
    this.tweens.add({
      targets: state,
      a: 0.4,
      duration: 300,
      delay: 400,
      yoyo: true,
      repeat: 2,
      onUpdate: () => draw(state.a, state.s),
    });

    // Fade out & destroy
    this.tweens.add({
      targets: state,
      a: 0,
      s: 1.5,
      duration: 300,
      delay: 1600,
      onUpdate: () => draw(state.a, state.s),
      onComplete: () => g.destroy(),
    });

    return g;
  }

  private spawnEndlessWave(): void {
    // Every 10 waves permanently adds +1 enemy, caps at 10 extra
    // Wave 1 = 3 enemies, +1 per wave, hard cap at 12
    const spawnCount = Math.min(12, 2 + this.endlessWave);
    const arenaWidth = this.currentLevel.width;

    // Gather spawn data first
    const spawnEntries: { x: number; isBoss: boolean; bossTypeId?: string; typeId?: string; config?: any }[] = [];

    for (let i = 0; i < spawnCount; i++) {
      const spawnBoss = Math.random() < 0.02;
      let spawnX: number;
      if (this.player) {
        const minDist = 120;
        const offset = Phaser.Math.Between(minDist, 300) * (Math.random() < 0.5 ? -1 : 1);
        spawnX = this.player.x + offset;
      } else {
        spawnX = 80 + Math.random() * (arenaWidth - 160);
      }
      const clampedX = Phaser.Math.Clamp(spawnX, 60, arenaWidth - 60);

      if (spawnBoss) {
        const bossTypeId = this.endlessWave === 50 ? 'ravana' : Phaser.Math.RND.pick(this.getEndlessBossPool());
        const bossData = (bossesData as any)[bossTypeId];
        if (bossData) {
          spawnEntries.push({ x: clampedX, isBoss: true, bossTypeId });
          continue;
        }
      }

      const currentPool = this.getEndlessEnemyPool();
      const typeId = Phaser.Math.RND.pick(currentPool);
      const config = (enemiesData as Record<string, EnemyCombatConfig>)[typeId];
      if (!config) continue;
      spawnEntries.push({ x: clampedX, isBoss: false, typeId, config });
    }

    // Show spawn circles at positions
    for (const entry of spawnEntries) {
      const circleY = this.getLivePlatformSpawnY(entry.x, entry.isBoss ? 120 : (entry.config?.height ?? 40));
      this.createSpawnCircle(entry.x, circleY, entry.isBoss);
    }

    // Delay actual spawning by 1.8 seconds (after circles animate)
    this.time.delayedCall(1800, () => {
      let spawned = 0;
      for (const entry of spawnEntries) {
        if (entry.isBoss && entry.bossTypeId) {
          const bossSpawnY = this.getLivePlatformSpawnY(entry.x, 120);
          let bossEntity: any;
          if (entry.bossTypeId === 'mossTitan') {
            bossEntity = new MossTitan(this, entry.x, bossSpawnY);
          } else if (entry.bossTypeId === 'glacialTitan') {
            bossEntity = new GlacialTitan(this, entry.x, bossSpawnY);
          } else if (entry.bossTypeId === 'antElder') {
            bossEntity = new AntElder(this, entry.x, bossSpawnY);
          } else if (entry.bossTypeId === 'ravana') {
            bossEntity = new Ravana(this, entry.x, bossSpawnY);
          } else {
            bossEntity = new Boss(this, entry.x, bossSpawnY);
          }
          this.snapEntityToLivePlatforms(bossEntity);
          this.physics.add.collider(bossEntity, this.platforms);
          this.physics.add.collider(bossEntity, this.walls);
          this.physics.add.overlap(this.player, bossEntity, () => this.handlePlayerBossContact());
          this.enemies.add(bossEntity);
          spawned++;
        } else if (entry.typeId && entry.config) {
          const spawnY = (entry.config as any).isFlying
            ? Phaser.Math.Between(350, 450)
            : 0;
          this.spawnEndlessEnemy(entry.typeId, entry.x, spawnY, entry.config);
          spawned++;
        }
      }
      this.endlessActiveEnemies = spawned;
      this.cameras.main.flash(200, 60, 0, 0);
    });
  }

  private spawnEndlessBossWave(): void {
    this.endlessBossWaveActive = true;

    // Remove platforms for boss wave
    this.removeEndlessPlatforms();

    const arenaWidth = this.currentLevel.width;
    const bossCount = 4;

    // Mix bosses and mini-bosses
    const currentPool = this.getEndlessEnemyPool();
    const bossPool = this.getEndlessBossPool();
    const pool = [...bossPool, ...currentPool.filter(e => 
      ['megaSkullRavager', 'siegeConstruct', 'frozenGatekeeper', 'skullRavanger', 'brokenEffigy', 'warfieldBrute', 'arborealWarGoliath'].includes(e)
    )];

    // Gather spawn data
    const spawnEntries: { x: number; isBoss: boolean; typeId: string; config?: any }[] = [];
    for (let i = 0; i < bossCount; i++) {
      const typeId = Phaser.Math.RND.pick(pool);
      const isBoss = bossPool.includes(typeId);
      const spawnX = 100 + (i / (bossCount - 1)) * (arenaWidth - 200);
      if (isBoss) {
        const bossData = (bossesData as any)[typeId];
        if (!bossData) continue;
        spawnEntries.push({ x: spawnX, isBoss: true, typeId });
      } else {
        const config = (enemiesData as Record<string, EnemyCombatConfig>)[typeId];
        if (!config) continue;
        spawnEntries.push({ x: spawnX, isBoss: false, typeId, config });
      }
    }

    // Show spawn circles
    for (const entry of spawnEntries) {
      const circleY = this.getLivePlatformSpawnY(entry.x, entry.isBoss ? 120 : (entry.config?.height ?? 40));
      this.createSpawnCircle(entry.x, circleY, entry.isBoss);
    }

    // Delay actual spawning
    this.time.delayedCall(1800, () => {
      let spawned = 0;
      for (const entry of spawnEntries) {
        if (entry.isBoss) {
          const bossSpawnY = this.getLivePlatformSpawnY(entry.x, 120);
          let bossEntity: any;
          if (entry.typeId === 'mossTitan') {
            bossEntity = new MossTitan(this, entry.x, bossSpawnY);
          } else if (entry.typeId === 'glacialTitan') {
            bossEntity = new GlacialTitan(this, entry.x, bossSpawnY);
          } else if (entry.typeId === 'antElder') {
            bossEntity = new AntElder(this, entry.x, bossSpawnY);
          } else if (entry.typeId === 'ravana') {
            bossEntity = new Ravana(this, entry.x, bossSpawnY);
          } else {
            bossEntity = new Boss(this, entry.x, bossSpawnY);
          }
          this.snapEntityToLivePlatforms(bossEntity);
          this.physics.add.collider(bossEntity, this.platforms);
          this.physics.add.collider(bossEntity, this.walls);
          this.physics.add.overlap(this.player, bossEntity, () => this.handlePlayerBossContact());
          this.enemies.add(bossEntity);
          spawned++;
        } else {
          const spawnY = (entry.config as any)?.isFlying
            ? Phaser.Math.Between(350, 450)
            : this.getLivePlatformSpawnY(entry.x, entry.config?.height ?? 40);
          this.spawnEndlessEnemy(entry.typeId, entry.x, spawnY, entry.config);
          spawned++;
        }
      }
      this.endlessActiveEnemies = spawned;
      this.cameras.main.flash(400, 120, 0, 0);
    });
  }

  private removeEndlessPlatforms(): void {
    this.endlessStoredPlatforms = [];
    const toRemove: Phaser.GameObjects.GameObject[] = [];

    this.platforms.getChildren().forEach((p: any) => {
      const width = p.displayWidth ?? p.width ?? 0;
      const height = p.displayHeight ?? p.height ?? 0;
      const top = p.y - height / 2;

      if (top < 550) {
        this.endlessStoredPlatforms!.push({ x: p.x, y: p.y, width, height });
        toRemove.push(p);
      }
    });

    toRemove.forEach(p => p.destroy());
  }

  private restoreEndlessPlatforms(): void {
    if (!this.endlessStoredPlatforms) return;

    const biomeCols = this.getBiomePlatformColors();
    this.endlessStoredPlatforms.forEach(p => {
      const platform = this.add.rectangle(p.x, p.y, p.width, p.height, biomeCols.main);
      this.platforms.add(platform);
      this.add.rectangle(p.x, p.y - p.height / 2 + 2, p.width, 4, biomeCols.light);
    });

    this.endlessStoredPlatforms = null;
  }

  private getLivePlatformSpawnY(x: number, entityHeight: number): number {
    let surfaceTop: number | null = null;

    this.platforms.getChildren().forEach((platform: any) => {
      const width = platform.displayWidth ?? platform.width ?? 0;
      const height = platform.displayHeight ?? platform.height ?? 0;
      const left = platform.x - width / 2;
      const right = platform.x + width / 2;
      const top = platform.y - height / 2;

      if (x >= left && x <= right) {
        if (surfaceTop === null || top < surfaceTop) {
          surfaceTop = top;
        }
      }
    });

    const fallbackTop = this.currentLevel.height - 40;
    return (surfaceTop ?? fallbackTop) - entityHeight / 2;
  }

  private snapEntityToLivePlatforms(entity: any): void {
    const body = entity?.body as Phaser.Physics.Arcade.Body | undefined;
    if (!entity || !body || body.allowGravity === false) return;

    const snappedY = this.getLivePlatformSpawnY(entity.x, body.height || entity.height || 40);
    entity.setPosition(entity.x, snappedY);
    body.reset(entity.x, snappedY);
  }

  private spawnEndlessEnemy(typeId: string, x: number, y: number, config: EnemyCombatConfig): void {
    let entity: any;
    switch (typeId) {
      case 'huskGuard': case 'colonyVanguard':
        entity = new HuskGuard(this, x, y, config); break;
      case 'mosskin':
        entity = new Mosskin(this, x, y, config); break;
      case 'mossWarrior':
        entity = new MossWarrior(this, x, y, config); break;
      case 'frontierScout':
        entity = new FrontierScout(this, x, y, config); break;
      case 'frontierWarrior':
        entity = new FrontierWarrior(this, x, y, config); break;
      case 'frostCharger':
        entity = new FrostCharger(this, x, y, config); break;
      case 'glacialSentinel':
        entity = new GlacialSentinel(this, x, y, config); break;
      case 'autumnWraith':
        entity = new AutumnWraith(this, x, y, config); break;
      case 'ossuarySentinel':
        entity = new OssuarySentinel(this, x, y, config); break;
      case 'warfieldReaper':
        entity = new WarfieldReaper(this, x, y, config); break;
      case 'vengefly':
        entity = new Vengefly(this, x, y, config); break;
      case 'aspid':
        entity = new Aspid(this, x, y, config); break;
      case 'squit':
        entity = new Squit(this, x, y, config); break;
      case 'infectedHusk':
        entity = new InfectedHusk(this, x, y, config); break;
      case 'mossCreep':
        entity = new MossCreep(this, x, y, config); break;
      case 'skullScuttler':
        entity = new SkullScuttler(this, x, y, config); break;
      case 'adaptedSkuller':
        entity = new AdaptedSkuller(this, x, y, config); break;
      case 'skullRavanger':
        entity = new SkullRavager(this, x, y, config); break;
      case 'megaSkullRavager':
        entity = new MegaSkullRavager(this, x, y, config); break;
      case 'wingedWarrior':
        entity = new WingedWarrior(this, x, y, config); break;
      case 'wingedCommander':
        entity = new WingedCommander(this, x, y, config); break;
      case 'frozenGatekeeper':
        entity = new FrozenGatekeeper(this, x, y, config); break;
      case 'siegeConstruct':
        entity = new SiegeConstruct(this, x, y, config); break;
      case 'frostShard':
        entity = new FrostShard(this, x, y, config); break;
      case 'basicHusk':
        entity = new BasicHusk(this, x, y, config); break;
      case 'brokenEffigy':
        entity = new BrokenEffigy(this, x, y, config); break;
      case 'warfieldBrute':
        entity = new WarfieldBrute(this, x, y, config); break;
      case 'arborealWarGoliath':
        entity = new ArborealWarGoliath(this, x, y, config); break;
      case 'warfieldMedic':
        entity = new WarfieldMedic(this, x, y, config); break;
      default:
        entity = new Enemy(this, x, y, config); break;
    }
    this.enemies.add(entity);
    this.snapEntityToLivePlatforms(entity);
    this.physics.add.collider(entity, this.platforms);
    this.physics.add.collider(entity, this.walls);
  }

  /**
   * Randomize the endless arena layout before a restart.
   * Mutates the LEVELS.endlessArena platforms so each run feels different.
   */
  private randomizeEndlessArena(): void {
    const arena = LEVELS.endlessArena;
    if (!arena) return;

    const W = arena.width;
    // Always keep ground floor
    const ground = { x: 0, y: 560, width: W, height: 40, type: 'ground' as const };

    // Generate 5-7 random platforms that are reachable
    const platCount = Phaser.Math.Between(5, 7);
    const platforms: any[] = [ground];

    // Divide arena into columns for variety
    const colWidth = (W - 80) / platCount;

    for (let i = 0; i < platCount; i++) {
      const px = 40 + i * colWidth + Phaser.Math.Between(0, Math.floor(colWidth * 0.5));
      const py = Phaser.Math.Between(370, 490); // Always reachable by jump
      const pw = Phaser.Math.Between(80, 180);
      platforms.push({ x: px, y: py, width: pw, height: 20, type: 'platform' });
    }

    (arena as any).platforms = platforms;

    // Randomize background color slightly
    // Randomize biome style for visual variety
    const biomeOptions = [
      { biome: 'crossroads', bg: '#0a0808' },
      { biome: 'greenway', bg: '#080e08' },
      { biome: 'medulla', bg: '#100808' },
      { biome: 'huntersMarch', bg: '#0c0a06' },
      { biome: 'ice', bg: '#080a10' },
      { biome: 'autumn', bg: '#0e0a06' },
    ];
    const picked = Phaser.Math.RND.pick(biomeOptions);
    (arena as any).biome = picked.biome;
    (arena as any).backgroundColor = picked.bg;
    if (picked.biome === 'autumn') {
      (arena as any).theme = 'autumn';
    } else {
      delete (arena as any).theme;
    }
  }
}
