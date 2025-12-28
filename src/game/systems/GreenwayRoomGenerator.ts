import { LevelConfig, PlatformConfig, EnemySpawnConfig, TriggerConfig, PickupConfig } from '../core/GameConfig';

export type GreenwayRoomType = 
  | 'overgrownParkour'
  | 'mosskinGauntlet'
  | 'hiddenGrove'
  | 'verticalThicket'
  | 'restingGlade'
  | 'acidWaterfallChamber'
  | 'thicketGauntlet'
  | 'infectedOvergrowth';

export interface InfectionGlobuleConfig {
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large';
}

export interface MeleeDoorConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  doorId: string;
}

export interface AcidPoolConfig {
  x: number;
  y: number;
  width: number;
  height?: number;
}

export interface BreakableVineConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MovingPlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  moveDistance: number;
  moveSpeed: number;
  direction: 'horizontal' | 'vertical';
}

export interface GreenwayRoomData {
  platforms: PlatformConfig[];
  enemies: EnemySpawnConfig[];
  pickups: PickupConfig[];
  triggers: TriggerConfig[];
  spawns: Record<string, { x: number; y: number }>;
  acidPools?: AcidPoolConfig[];
  breakableVines?: BreakableVineConfig[];
  movingPlatforms?: MovingPlatformConfig[];
  hasInfection?: boolean;
  infectionGlobules?: InfectionGlobuleConfig[];
  meleeDoors?: MeleeDoorConfig[];
}

// Room dimensions
const ROOM_WIDTH = 800;
const ROOM_HEIGHT = 600;

// Seeded random for reproducibility
let seed = Date.now();
function random(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff);
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Overgrown Parkour - Medium room with small mossy platforms over acid lake
 * Platform spacing reduced by 25% for manageable jumps
 */
function generateOvergrownParkour(roomIndex: number, xOffset: number): GreenwayRoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  const acidPools: AcidPoolConfig[] = [];
  const infectionGlobules: InfectionGlobuleConfig[] = [];
  const meleeDoors: MeleeDoorConfig[] = [];
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' }
  );
  
  // Ceiling
  platforms.push({ x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall' });
  
  // Large acid lake at bottom
  acidPools.push({
    x: xOffset + 20,
    y: ROOM_HEIGHT - 50,
    width: ROOM_WIDTH - 40,
    height: 50
  });
  
  // Entry/exit safe platforms (wider for safety)
  platforms.push(
    { x: xOffset + 20, y: ROOM_HEIGHT - 80, width: 100, height: 20, type: 'platform' },
    { x: xOffset + ROOM_WIDTH - 120, y: ROOM_HEIGHT - 80, width: 100, height: 20, type: 'platform' }
  );
  
  // Main jumping platforms - REDUCED SPACING (75% of original)
  // Create a path of platforms with max 90px horizontal gaps (down from 120px)
  const platformPath = [
    { x: xOffset + 130, y: ROOM_HEIGHT - 120, width: 80 },
    { x: xOffset + 230, y: ROOM_HEIGHT - 160, width: 70 },
    { x: xOffset + 320, y: ROOM_HEIGHT - 200, width: 75 },
    { x: xOffset + 420, y: ROOM_HEIGHT - 180, width: 80 },
    { x: xOffset + 520, y: ROOM_HEIGHT - 220, width: 70 },
    { x: xOffset + 610, y: ROOM_HEIGHT - 260, width: 75 },
    { x: xOffset + ROOM_WIDTH - 220, y: ROOM_HEIGHT - 180, width: 80 }
  ];
  
  platformPath.forEach(p => {
    platforms.push({
      x: p.x,
      y: p.y,
      width: p.width,
      height: 18,
      type: 'platform'
    } as any);
  });
  
  // Add stepping stones in longer acid sections for safety
  platforms.push(
    { x: xOffset + 180, y: ROOM_HEIGHT - 60, width: 40, height: 15, type: 'platform' },
    { x: xOffset + 370, y: ROOM_HEIGHT - 60, width: 40, height: 15, type: 'platform' },
    { x: xOffset + 560, y: ROOM_HEIGHT - 60, width: 40, height: 15, type: 'platform' }
  );
  
  // Moss creeps on walls
  enemies.push(
    { type: 'mossCreep', x: xOffset + 20, y: randomInt(200, 400) },
    { type: 'mossCreep', x: xOffset + ROOM_WIDTH - 20, y: randomInt(250, 450) }
  );
  
  // Add Mosskins on some platforms
  enemies.push({
    type: 'mosskin',
    x: platformPath[2].x + 30,
    y: platformPath[2].y - 30
  });
  
  // Add infection globules on walls
  infectionGlobules.push(
    { x: xOffset + 25, y: randomInt(100, 200), size: 'medium' },
    { x: xOffset + ROOM_WIDTH - 35, y: randomInt(150, 300), size: 'small' }
  );
  
  // Add melee door at exit (first room only)
  if (roomIndex === 0) {
    meleeDoors.push({
      x: xOffset + ROOM_WIDTH - 60,
      y: ROOM_HEIGHT - 180,
      width: 40,
      height: 100,
      doorId: `greenway_door_${roomIndex}`
    });
  }
  
  return {
    platforms,
    enemies,
    acidPools,
    infectionGlobules,
    meleeDoors,
    pickups: [
      { type: 'shells', x: xOffset + ROOM_WIDTH / 2, y: randomInt(150, 250), amount: randomInt(8, 15) }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 120 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 120 }
    }
  };
}

/**
 * Mosskin Gauntlet - Long horizontal room, acid floor, platforms with Mosskins
 * Platform spacing reduced for manageable jumps
 */
function generateMosskinGauntlet(roomIndex: number, xOffset: number): GreenwayRoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  const acidPools: AcidPoolConfig[] = [];
  const infectionGlobules: InfectionGlobuleConfig[] = [];
  const meleeDoors: MeleeDoorConfig[] = [];
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' }
  );
  
  // Ceiling
  platforms.push({ x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall' });
  
  // Acid covering most of floor
  acidPools.push({
    x: xOffset + 100,
    y: ROOM_HEIGHT - 40,
    width: ROOM_WIDTH - 200,
    height: 40
  });
  
  // Safe ground at entry/exit (wider)
  platforms.push(
    { x: xOffset + 20, y: ROOM_HEIGHT - 50, width: 100, height: 50, type: 'ground' },
    { x: xOffset + ROOM_WIDTH - 120, y: ROOM_HEIGHT - 50, width: 100, height: 50, type: 'ground' }
  );
  
  // Platform bridges over acid - REDUCED SPACING (75% of original)
  const bridgeCount = 6;
  const spacing = (ROOM_WIDTH - 240) / bridgeCount; // ~93px apart instead of 125px
  
  for (let i = 0; i < bridgeCount; i++) {
    const px = xOffset + 120 + i * spacing;
    const py = ROOM_HEIGHT - randomInt(100, 160);
    const width = randomInt(75, 95); // Slightly wider platforms
    
    platforms.push({
      x: px,
      y: py,
      width,
      height: 20,
      type: 'platform'
    } as any);
    
    // Mosskin on alternating platforms
    if (i % 2 === 1) {
      enemies.push({
        type: 'mosskin',
        x: px + width / 2,
        y: py - 30
      });
    }
  }
  
  // Add stepping stones in acid for emergency recovery
  platforms.push(
    { x: xOffset + 200, y: ROOM_HEIGHT - 50, width: 35, height: 12, type: 'platform' },
    { x: xOffset + 400, y: ROOM_HEIGHT - 50, width: 35, height: 12, type: 'platform' },
    { x: xOffset + 600, y: ROOM_HEIGHT - 50, width: 35, height: 12, type: 'platform' }
  );
  
  // Upper escape route platforms
  platforms.push(
    { x: xOffset + 150, y: ROOM_HEIGHT - 260, width: 100, height: 18, type: 'platform' },
    { x: xOffset + ROOM_WIDTH - 250, y: ROOM_HEIGHT - 280, width: 100, height: 18, type: 'platform' }
  );
  
  // Infection globules on ceiling
  infectionGlobules.push(
    { x: xOffset + 300, y: 40, size: 'large' },
    { x: xOffset + 550, y: 50, size: 'medium' }
  );
  
  // Melee door at room entry
  meleeDoors.push({
    x: xOffset + ROOM_WIDTH - 60,
    y: ROOM_HEIGHT - 150,
    width: 40,
    height: 100,
    doorId: `greenway_gauntlet_door_${roomIndex}`
  });
  
  return {
    platforms,
    enemies,
    acidPools,
    infectionGlobules,
    meleeDoors,
    pickups: [
      { type: 'shells', x: xOffset + ROOM_WIDTH / 2 + randomInt(-50, 50), y: randomInt(200, 300), amount: randomInt(10, 18) }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * Hidden Grove - Small lush room with lots of Geo, hidden behind breakable vines
 */
function generateHiddenGrove(roomIndex: number, xOffset: number): GreenwayRoomData {
  const platforms: PlatformConfig[] = [];
  const breakableVines: BreakableVineConfig[] = [];
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' }
  );
  
  // Ceiling and ground
  platforms.push({ x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall' });
  platforms.push({ x: xOffset, y: ROOM_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground' });
  
  // Breakable vine wall at entrance
  breakableVines.push({
    x: xOffset + 80,
    y: ROOM_HEIGHT - 200,
    width: 30,
    height: 150
  });
  
  // Lush platforms inside
  platforms.push(
    { x: xOffset + 150, y: ROOM_HEIGHT - 130, width: 120, height: 20, type: 'platform' },
    { x: xOffset + 350, y: ROOM_HEIGHT - 200, width: 100, height: 20, type: 'platform' },
    { x: xOffset + 550, y: ROOM_HEIGHT - 280, width: 130, height: 20, type: 'platform' },
    { x: xOffset + ROOM_WIDTH - 150, y: ROOM_HEIGHT - 150, width: 100, height: 20, type: 'platform' }
  );
  
  // Lots of shells (hidden reward)
  const pickups: PickupConfig[] = [
    { type: 'shells', x: xOffset + 200, y: ROOM_HEIGHT - 80, amount: 25 },
    { type: 'shells', x: xOffset + 400, y: ROOM_HEIGHT - 230, amount: 30 },
    { type: 'shells', x: xOffset + 600, y: ROOM_HEIGHT - 310, amount: 35 },
    { type: 'shells', x: xOffset + ROOM_WIDTH - 100, y: ROOM_HEIGHT - 180, amount: 40 }
  ];
  
  return {
    platforms,
    enemies: [], // Safe hidden room
    acidPools: [],
    breakableVines,
    pickups,
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * Vertical Thicket - Tall climbing room with narrow platforms and flying enemies
 * Entry from bottom-left, exit at top-right leading to next room
 */
function generateVerticalThicket(roomIndex: number, xOffset: number): GreenwayRoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  const acidPools: AcidPoolConfig[] = [];
  const triggers: TriggerConfig[] = [];
  
  // Left wall (full height)
  platforms.push({ x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' });
  
  // Right wall with gap at top for exit
  platforms.push({ x: xOffset + ROOM_WIDTH - 20, y: 80, width: 20, height: ROOM_HEIGHT - 80, type: 'wall' });
  
  // Ceiling with gap on right side for exit
  platforms.push({ x: xOffset, y: 0, width: ROOM_WIDTH - 100, height: 25, type: 'wall' });
  
  // Top exit platform
  platforms.push({ 
    x: xOffset + ROOM_WIDTH - 100, 
    y: 60, 
    width: 100, 
    height: 20, 
    type: 'platform' 
  });
  
  // Acid at very bottom
  acidPools.push({
    x: xOffset + 20,
    y: ROOM_HEIGHT - 40,
    width: ROOM_WIDTH - 40,
    height: 40
  });
  
  // Entry platform at bottom-left
  platforms.push({ x: xOffset + 20, y: ROOM_HEIGHT - 70, width: 70, height: 20, type: 'platform' });
  
  // Ascending narrow platforms (zigzag pattern leading to top-right)
  const levels = 7;
  const heightStep = (ROOM_HEIGHT - 150) / levels;
  
  for (let i = 0; i < levels; i++) {
    const leftSide = i % 2 === 0;
    const px = leftSide 
      ? xOffset + 50 + randomInt(0, 80) 
      : xOffset + ROOM_WIDTH - 170 - randomInt(0, 60);
    const py = ROOM_HEIGHT - 100 - (i * heightStep);
    
    platforms.push({
      x: px,
      y: py,
      width: randomInt(60, 100),
      height: 18,
      type: 'platform'
    } as any);
  }
  
  // Final platform near top-right exit
  platforms.push({
    x: xOffset + ROOM_WIDTH - 180,
    y: 120,
    width: 80,
    height: 18,
    type: 'platform'
  } as any);
  
  // Flying enemies to knock player down - use Squits in Greenway
  const flyerCount = randomInt(3, 5);
  for (let i = 0; i < flyerCount; i++) {
    enemies.push({
      type: 'squit',
      x: xOffset + randomInt(100, ROOM_WIDTH - 100),
      y: randomInt(100, ROOM_HEIGHT - 200)
    });
  }
  
  // Moss creeps on walls
  enemies.push(
    { type: 'mossCreep', x: xOffset + 20, y: randomInt(150, 350) },
    { type: 'mossCreep', x: xOffset + ROOM_WIDTH - 20, y: randomInt(200, 400) }
  );
  
  // Top-right exit trigger to next room
  triggers.push({
    id: `verticalThicket_topExit_${roomIndex}`,
    type: 'transition',
    x: xOffset + ROOM_WIDTH - 30,
    y: 30,
    width: 30,
    height: 80,
    target: 'greenwayGenerated',
    targetSpawn: `room${roomIndex + 1}_entry`
  });
  
  return {
    platforms,
    enemies,
    acidPools,
    pickups: [
      { type: 'shells', x: xOffset + ROOM_WIDTH / 2, y: 100, amount: randomInt(15, 25) }
    ],
    triggers,
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 55, y: ROOM_HEIGHT - 110 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: 90 }
    }
  };
}

/**
 * Resting Glade - Safe room with bench (mossy version)
 */
function generateRestingGlade(roomIndex: number, xOffset: number): GreenwayRoomData {
  const platforms: PlatformConfig[] = [];
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' }
  );
  
  // Ceiling and ground
  platforms.push({ x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall' });
  platforms.push({ x: xOffset, y: ROOM_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground' });
  
  // Decorative platforms
  platforms.push(
    { x: xOffset + 100, y: ROOM_HEIGHT - 150, width: 80, height: 18, type: 'platform' },
    { x: xOffset + ROOM_WIDTH - 180, y: ROOM_HEIGHT - 130, width: 80, height: 18, type: 'platform' }
  );
  
  const benchX = xOffset + ROOM_WIDTH / 2 - 30;
  
  return {
    platforms,
    enemies: [], // Safe room
    acidPools: [],
    pickups: [],
    triggers: [
      {
        id: `mossyBench_room${roomIndex}`,
        type: 'bench',
        x: benchX,
        y: ROOM_HEIGHT - 95,
        width: 60,
        height: 45
      }
    ],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 100 },
      [`mossyBench_room${roomIndex}`]: { x: benchX + 30, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * NEW: Acid Waterfall Chamber - Vertical room with acid waterfalls and moving platforms
 */
function generateAcidWaterfallChamber(roomIndex: number, xOffset: number): GreenwayRoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  const acidPools: AcidPoolConfig[] = [];
  const movingPlatforms: MovingPlatformConfig[] = [];
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' }
  );
  
  // Ceiling
  platforms.push({ x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall' });
  
  // Large acid pool at bottom
  acidPools.push({
    x: xOffset + 20,
    y: ROOM_HEIGHT - 60,
    width: ROOM_WIDTH - 40,
    height: 60
  });
  
  // Acid waterfalls on sides (visual + hazard strips)
  acidPools.push(
    { x: xOffset + 20, y: 50, width: 40, height: ROOM_HEIGHT - 110 },
    { x: xOffset + ROOM_WIDTH - 60, y: 80, width: 40, height: ROOM_HEIGHT - 140 }
  );
  
  // Entry/exit safe platforms
  platforms.push(
    { x: xOffset + 70, y: ROOM_HEIGHT - 90, width: 80, height: 20, type: 'platform' },
    { x: xOffset + ROOM_WIDTH - 150, y: ROOM_HEIGHT - 90, width: 80, height: 20, type: 'platform' }
  );
  
  // Moving platforms that slide through acid streams
  const movingCount = randomInt(3, 5);
  for (let i = 0; i < movingCount; i++) {
    const py = ROOM_HEIGHT - 150 - (i * 80);
    movingPlatforms.push({
      x: xOffset + 150 + randomInt(0, 100),
      y: py,
      width: 80,
      height: 18,
      moveDistance: 200 + randomInt(0, 100),
      moveSpeed: 40 + randomInt(0, 30),
      direction: 'horizontal'
    });
    
    // Moss creep on underside of some platforms
    if (i % 2 === 0) {
      enemies.push({
        type: 'mossCreep',
        x: xOffset + 180 + randomInt(0, 100),
        y: py + 25
      });
    }
  }
  
  // Static stepping stones
  platforms.push(
    { x: xOffset + 200, y: ROOM_HEIGHT - 200, width: 60, height: 18, type: 'platform' },
    { x: xOffset + ROOM_WIDTH - 260, y: ROOM_HEIGHT - 280, width: 60, height: 18, type: 'platform' }
  );
  
  return {
    platforms,
    enemies,
    acidPools,
    movingPlatforms,
    pickups: [
      { type: 'shells', x: xOffset + ROOM_WIDTH / 2, y: 120, amount: randomInt(15, 25) }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 110, y: ROOM_HEIGHT - 130 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 110, y: ROOM_HEIGHT - 130 }
    }
  };
}

/**
 * NEW: Thicket Gauntlet - Tight corridor with thorny vines and chasing Mosskins
 */
function generateThicketGauntlet(roomIndex: number, xOffset: number): GreenwayRoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  const acidPools: AcidPoolConfig[] = [];
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' }
  );
  
  // Ceiling
  platforms.push({ x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall' });
  
  // Ground with gaps (acid pits)
  platforms.push(
    { x: xOffset + 20, y: ROOM_HEIGHT - 50, width: 150, height: 50, type: 'ground' },
    { x: xOffset + 250, y: ROOM_HEIGHT - 50, width: 100, height: 50, type: 'ground' },
    { x: xOffset + 430, y: ROOM_HEIGHT - 50, width: 100, height: 50, type: 'ground' },
    { x: xOffset + 610, y: ROOM_HEIGHT - 50, width: 170, height: 50, type: 'ground' }
  );
  
  // Acid in gaps
  acidPools.push(
    { x: xOffset + 170, y: ROOM_HEIGHT - 40, width: 80, height: 40 },
    { x: xOffset + 350, y: ROOM_HEIGHT - 40, width: 80, height: 40 },
    { x: xOffset + 530, y: ROOM_HEIGHT - 40, width: 80, height: 40 }
  );
  
  // Thorny obstacles (using narrow wall segments)
  platforms.push(
    { x: xOffset + 180, y: ROOM_HEIGHT - 180, width: 20, height: 100, type: 'wall' },
    { x: xOffset + 340, y: ROOM_HEIGHT - 200, width: 20, height: 120, type: 'wall' },
    { x: xOffset + 500, y: ROOM_HEIGHT - 160, width: 20, height: 80, type: 'wall' }
  );
  
  // Platforms to navigate around thorns
  platforms.push(
    { x: xOffset + 120, y: ROOM_HEIGHT - 130, width: 50, height: 18, type: 'platform' },
    { x: xOffset + 210, y: ROOM_HEIGHT - 180, width: 60, height: 18, type: 'platform' },
    { x: xOffset + 370, y: ROOM_HEIGHT - 150, width: 60, height: 18, type: 'platform' },
    { x: xOffset + 530, y: ROOM_HEIGHT - 120, width: 70, height: 18, type: 'platform' }
  );
  
  // Hidden alcove in ceiling with big geo cache
  platforms.push(
    { x: xOffset + 350, y: 80, width: 100, height: 18, type: 'platform' }
  );
  
  // Chasing Mosskins
  enemies.push(
    { type: 'mosskin', x: xOffset + ROOM_WIDTH - 100, y: ROOM_HEIGHT - 90 },
    { type: 'mosskin', x: xOffset + ROOM_WIDTH - 180, y: ROOM_HEIGHT - 90 }
  );
  
  // Moss Warrior guarding the hidden geo (rare spawn)
  if (random() > 0.6) {
    enemies.push({
      type: 'mossWarrior',
      x: xOffset + 400,
      y: 50
    });
  }
  
  return {
    platforms,
    enemies,
    acidPools,
    pickups: [
      // Hidden ceiling cache - 100 geo!
      { type: 'shells', x: xOffset + 380, y: 50, amount: 100 },
      // Smaller pickup on path
      { type: 'shells', x: xOffset + 300, y: ROOM_HEIGHT - 180, amount: 10 }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * NEW: Infected Overgrowth - Bridge room with collapsed center, orange infection theme
 */
function generateInfectedOvergrowth(roomIndex: number, xOffset: number): GreenwayRoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  const acidPools: AcidPoolConfig[] = [];
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' }
  );
  
  // Ceiling
  platforms.push({ x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall' });
  
  // Bridge platforms on sides (center collapsed)
  platforms.push(
    { x: xOffset + 20, y: ROOM_HEIGHT - 100, width: 200, height: 30, type: 'ground' },
    { x: xOffset + ROOM_WIDTH - 220, y: ROOM_HEIGHT - 100, width: 200, height: 30, type: 'ground' }
  );
  
  // Massive acid pit in center (collapsed floor)
  acidPools.push({
    x: xOffset + 220,
    y: ROOM_HEIGHT - 80,
    width: ROOM_WIDTH - 440,
    height: 80
  });
  
  // Stepping stone platforms across the pit
  const stoneCount = randomInt(3, 5);
  const pitWidth = ROOM_WIDTH - 440;
  const stoneSpacing = pitWidth / (stoneCount + 1);
  
  for (let i = 0; i < stoneCount; i++) {
    platforms.push({
      x: xOffset + 220 + (i + 1) * stoneSpacing - 30,
      y: ROOM_HEIGHT - randomInt(130, 180),
      width: randomInt(50, 70),
      height: 18,
      type: 'platform'
    } as any);
  }
  
  // Higher platforms for safety
  platforms.push(
    { x: xOffset + 150, y: ROOM_HEIGHT - 220, width: 80, height: 18, type: 'platform' },
    { x: xOffset + ROOM_WIDTH - 230, y: ROOM_HEIGHT - 240, width: 80, height: 18, type: 'platform' },
    { x: xOffset + ROOM_WIDTH / 2 - 40, y: ROOM_HEIGHT - 300, width: 80, height: 18, type: 'platform' }
  );
  
  // Flying enemies - use Squits in Greenway
  const flyerCount = randomInt(3, 5);
  for (let i = 0; i < flyerCount; i++) {
    enemies.push({
      type: 'squit',
      x: xOffset + 100 + randomInt(0, ROOM_WIDTH - 200),
      y: randomInt(100, ROOM_HEIGHT - 250)
    });
  }
  
  return {
    platforms,
    enemies,
    acidPools,
    hasInfection: true, // Flag for visual effects
    pickups: [
      { type: 'shells', x: xOffset + ROOM_WIDTH / 2, y: ROOM_HEIGHT - 330, amount: randomInt(20, 30) }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 100, y: ROOM_HEIGHT - 150 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 100, y: ROOM_HEIGHT - 150 }
    }
  };
}

/**
 * Generate room order with variety including new room types
 */
function generateGreenwayRoomOrder(): GreenwayRoomType[] {
  const roomPool: GreenwayRoomType[] = [
    'overgrownParkour',      // Tutorial room first
    'mosskinGauntlet',
    'acidWaterfallChamber',  // NEW
    'verticalThicket',
    'restingGlade',          // Midpoint rest
    'thicketGauntlet',       // NEW
    'hiddenGrove',
    'infectedOvergrowth',    // NEW
    'overgrownParkour',
    'mosskinGauntlet'
  ];
  
  const shuffled = shuffleArray(roomPool);
  
  // First room should be Overgrown Parkour (tutorial for acid)
  const parkourIdx = shuffled.findIndex(r => r === 'overgrownParkour');
  if (parkourIdx > 0) {
    [shuffled[0], shuffled[parkourIdx]] = [shuffled[parkourIdx], shuffled[0]];
  }
  
  // Ensure resting glade is in middle
  const gladeIdx = shuffled.findIndex(r => r === 'restingGlade');
  if (gladeIdx !== 4 && gladeIdx !== 5) {
    const targetIdx = 4;
    [shuffled[targetIdx], shuffled[gladeIdx]] = [shuffled[gladeIdx], shuffled[targetIdx]];
  }
  
  // Place hidden grove before the bench
  const groveIdx = shuffled.findIndex(r => r === 'hiddenGrove');
  const benchIdx = shuffled.findIndex(r => r === 'restingGlade');
  if (groveIdx > benchIdx) {
    [shuffled[benchIdx - 1], shuffled[groveIdx]] = [shuffled[groveIdx], shuffled[benchIdx - 1]];
  }
  
  return shuffled;
}

/**
 * Generate the complete Greenway level with 10 rooms
 */
export function generateGreenway(): LevelConfig & { acidPools?: AcidPoolConfig[], breakableVines?: BreakableVineConfig[], movingPlatforms?: MovingPlatformConfig[] } {
  seed = Date.now();
  
  const rooms: GreenwayRoomData[] = [];
  let totalWidth = 0;
  
  const roomOrder = generateGreenwayRoomOrder();
  
  // Generate 20 rooms (extended Greenway with Moss Titan at room 20)
  for (let i = 0; i < 20; i++) {
    const roomType = roomOrder[i % roomOrder.length];
    let roomData: GreenwayRoomData;
    
    switch (roomType) {
      case 'overgrownParkour':
        roomData = generateOvergrownParkour(i, totalWidth);
        break;
      case 'mosskinGauntlet':
        roomData = generateMosskinGauntlet(i, totalWidth);
        break;
      case 'hiddenGrove':
        roomData = generateHiddenGrove(i, totalWidth);
        break;
      case 'verticalThicket':
        roomData = generateVerticalThicket(i, totalWidth);
        break;
      case 'restingGlade':
        roomData = generateRestingGlade(i, totalWidth);
        break;
      case 'acidWaterfallChamber':
        roomData = generateAcidWaterfallChamber(i, totalWidth);
        break;
      case 'thicketGauntlet':
        roomData = generateThicketGauntlet(i, totalWidth);
        break;
      case 'infectedOvergrowth':
        roomData = generateInfectedOvergrowth(i, totalWidth);
        break;
      default:
        roomData = generateOvergrownParkour(i, totalWidth);
    }
    
    rooms.push(roomData);
    totalWidth += ROOM_WIDTH;
  }
  
  // Combine all room data
  const allPlatforms: PlatformConfig[] = [];
  const allEnemies: EnemySpawnConfig[] = [];
  const allPickups: PickupConfig[] = [];
  const allTriggers: TriggerConfig[] = [];
  const allSpawns: Record<string, { x: number; y: number }> = {};
  const allAcidPools: AcidPoolConfig[] = [];
  const allBreakableVines: BreakableVineConfig[] = [];
  const allMovingPlatforms: MovingPlatformConfig[] = [];
  const allInfectionGlobules: InfectionGlobuleConfig[] = [];
  const allMeleeDoors: MeleeDoorConfig[] = [];
  
  rooms.forEach((room) => {
    allPlatforms.push(...room.platforms);
    allEnemies.push(...room.enemies);
    allPickups.push(...room.pickups);
    allTriggers.push(...room.triggers);
    Object.assign(allSpawns, room.spawns);
    if (room.acidPools) allAcidPools.push(...room.acidPools);
    if (room.breakableVines) allBreakableVines.push(...room.breakableVines);
    if (room.movingPlatforms) allMovingPlatforms.push(...room.movingPlatforms);
    if (room.infectionGlobules) allInfectionGlobules.push(...room.infectionGlobules);
    if (room.meleeDoors) allMeleeDoors.push(...room.meleeDoors);
  });
  
  // Add Moss Titan boss in room 20 (last room)
  const bossRoomX = 19 * ROOM_WIDTH;
  allEnemies.push({
    type: 'mossTitan',
    x: bossRoomX + ROOM_WIDTH / 2,
    y: ROOM_HEIGHT - 150
  });
  
  // Add transitions between rooms
  for (let i = 0; i < 19; i++) {
    const xPos = (i + 1) * ROOM_WIDTH - 30;
    
    allTriggers.push({
      id: `transition_greenway_room${i}_to_room${i + 1}`,
      type: 'transition',
      x: xPos,
      y: ROOM_HEIGHT - 150,
      width: 30,
      height: 100,
      target: 'greenwayGenerated',
      targetSpawn: `room${i + 1}_entry`
    });
  }
  
  // Exit back to chain room at the start
  allTriggers.push({
    id: 'exitToChainRoom',
    type: 'transition',
    x: 0,
    y: ROOM_HEIGHT - 150,
    width: 30,
    height: 100,
    target: 'chainRoom',
    targetSpawn: 'fromGreenway'
  });
  
  return {
    id: 'greenwayGenerated',
    name: 'Greenway',
    width: totalWidth,
    height: ROOM_HEIGHT,
    backgroundColor: '#0a1810',
    spawnPoint: { x: 60, y: ROOM_HEIGHT - 120 },
    platforms: allPlatforms,
    enemies: allEnemies,
    pickups: allPickups,
    triggers: allTriggers,
    spawns: {
      default: { x: 60, y: ROOM_HEIGHT - 120 },
      entrance: { x: 60, y: ROOM_HEIGHT - 120 },
      fromChainRoom: { x: 60, y: ROOM_HEIGHT - 120 },
      ...allSpawns
    },
    acidPools: allAcidPools,
    breakableVines: allBreakableVines,
    movingPlatforms: allMovingPlatforms,
    infectionGlobules: allInfectionGlobules,
    meleeDoors: allMeleeDoors,
    biome: 'greenway'
  } as any;
}

export { ROOM_WIDTH as GREENWAY_ROOM_WIDTH, ROOM_HEIGHT as GREENWAY_ROOM_HEIGHT };
