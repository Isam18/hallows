import { LevelConfig, PlatformConfig, EnemySpawnConfig, TriggerConfig, PickupConfig } from '../core/GameConfig';

export type RoomType = 
  | 'verticalShaft'
  | 'guardedCorridor'
  | 'restingStation'
  | 'infectedCuldesac'
  | 'bossRoom';

export interface SpikeConfig {
  x: number;
  y: number;
  width: number;
}

export interface BreakableConfig {
  type: 'signpost' | 'pole' | 'barrel';
  x: number;
  y: number;
}

export interface RoomData {
  platforms: PlatformConfig[];
  enemies: EnemySpawnConfig[];
  pickups: PickupConfig[];
  triggers: TriggerConfig[];
  spawns: Record<string, { x: number; y: number }>;
  spikes?: SpikeConfig[];
  breakables?: BreakableConfig[];
}

// Room dimensions - unified for all rooms
const ROOM_WIDTH = 800;
const ROOM_HEIGHT = 600;

// Seeded random number generator for reproducible randomness per session
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
 * Generate the Vertical Shaft room type with randomized platforms
 */
function generateVerticalShaft(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  const spikes: SpikeConfig[] = [];
  
  // Left and right walls
  platforms.push({
    x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall'
  });
  platforms.push({
    x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall'
  });
  
  // Ground (thin ledge at bottom for spikes)
  platforms.push({
    x: xOffset + 20, y: ROOM_HEIGHT - 20, width: ROOM_WIDTH - 40, height: 20, type: 'ground'
  });
  
  // SPIKES at the very bottom - covering most of the floor
  // Leave small safe landing zones on left and right
  const safeZoneWidth = 80;
  const spikeWidth = ROOM_WIDTH - 40 - (safeZoneWidth * 2);
  spikes.push({
    x: xOffset + 20 + safeZoneWidth,
    y: ROOM_HEIGHT - 40,
    width: spikeWidth
  });
  
  // Small safe platforms above spikes for entry/exit
  platforms.push({
    x: xOffset + 25,
    y: ROOM_HEIGHT - 60,
    width: 70,
    height: 15,
    type: 'platform'
  });
  platforms.push({
    x: xOffset + ROOM_WIDTH - 95,
    y: ROOM_HEIGHT - 60,
    width: 70,
    height: 15,
    type: 'platform'
  });
  
  // Randomized ascending platforms (zigzag pattern with variation)
  const platformCount = randomInt(5, 7);
  const heightStep = (ROOM_HEIGHT - 180) / platformCount;
  
  for (let i = 0; i < platformCount; i++) {
    const baseY = ROOM_HEIGHT - 140 - (i * heightStep);
    const xVariation = randomInt(60, ROOM_WIDTH - 180);
    const widthVariation = randomInt(100, 140);
    
    platforms.push({
      x: xOffset + xVariation,
      y: baseY + randomInt(-20, 20),
      width: widthVariation,
      height: 20,
      type: 'platform'
    });
  }
  
  // Randomized Vengefly count and positions (patrolling mid-air sections)
  const vengeflyCount = randomInt(2, 4);
  for (let i = 0; i < vengeflyCount; i++) {
    enemies.push({
      type: 'vengefly',
      x: xOffset + randomInt(100, ROOM_WIDTH - 100),
      y: randomInt(100, ROOM_HEIGHT - 250)
    });
  }
  
  // Random pickup positions on platforms
  const pickups: PickupConfig[] = [];
  const pickupCount = randomInt(1, 3);
  for (let i = 0; i < pickupCount; i++) {
    pickups.push({
      type: 'shells',
      x: xOffset + randomInt(100, ROOM_WIDTH - 100),
      y: randomInt(80, 300),
      amount: randomInt(5, 12)
    });
  }
  
  return {
    platforms,
    enemies,
    pickups,
    triggers: [],
    spikes,
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * Generate the Guarded Corridor room type with randomized layout
 */
function generateGuardedCorridor(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  const breakables: BreakableConfig[] = [];
  
  // Ground
  platforms.push({
    x: xOffset, y: ROOM_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground'
  });
  
  // Ceiling
  platforms.push({
    x: xOffset, y: 0, width: ROOM_WIDTH, height: 30, type: 'wall'
  });
  
  // Side walls
  platforms.push({
    x: xOffset, y: 30, width: 20, height: ROOM_HEIGHT - 130, type: 'wall'
  });
  platforms.push({
    x: xOffset + ROOM_WIDTH - 20, y: 30, width: 20, height: ROOM_HEIGHT - 130, type: 'wall'
  });
  
  // Randomized elevated platforms
  const platformCount = randomInt(2, 4);
  const platformSpacing = (ROOM_WIDTH - 200) / platformCount;
  
  for (let i = 0; i < platformCount; i++) {
    platforms.push({
      x: xOffset + 100 + (i * platformSpacing) + randomInt(-30, 30),
      y: ROOM_HEIGHT - randomInt(130, 200),
      width: randomInt(80, 120),
      height: 20,
      type: 'platform'
    });
  }
  
  // Randomized Husk Guard positions (at least 2 per the requirement)
  const guardCount = 2;
  const guardSpacing = (ROOM_WIDTH - 300) / guardCount;
  
  for (let i = 0; i < guardCount; i++) {
    enemies.push({
      type: 'huskGuard',
      x: xOffset + 150 + (i * guardSpacing) + randomInt(-30, 30),
      y: ROOM_HEIGHT - 120
    });
  }
  
  // BREAKABLE BACKGROUND OBJECTS (old signposts and poles that drop currency)
  const breakableCount = randomInt(2, 4);
  const breakableTypes: Array<'signpost' | 'pole' | 'barrel'> = ['signpost', 'pole', 'barrel'];
  
  for (let i = 0; i < breakableCount; i++) {
    breakables.push({
      type: randomChoice(breakableTypes),
      x: xOffset + 80 + (i * ((ROOM_WIDTH - 160) / breakableCount)) + randomInt(-20, 20),
      y: ROOM_HEIGHT - 70
    });
  }
  
  // Random ground enemies (fewer since we have guards)
  const grubCount = randomInt(0, 2);
  for (let i = 0; i < grubCount; i++) {
    enemies.push({
      type: randomChoice(['spikyGrub', 'crawlingHusk']),
      x: xOffset + randomInt(80, ROOM_WIDTH - 80),
      y: ROOM_HEIGHT - 80
    });
  }
  
  return {
    platforms,
    enemies,
    breakables,
    pickups: [
      { 
        type: 'shells', 
        x: xOffset + randomInt(150, ROOM_WIDTH - 150), 
        y: ROOM_HEIGHT - randomInt(180, 220), 
        amount: randomInt(8, 15) 
      }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * Generate the Resting Station room type (less randomization - it's a safe room)
 */
function generateRestingStation(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  
  // Ground
  platforms.push({
    x: xOffset, y: ROOM_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground'
  });
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT - 50, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT - 50, type: 'wall' }
  );
  
  // Ceiling with randomized gap position
  const gapStart = randomInt(250, 400);
  platforms.push(
    { x: xOffset, y: 0, width: gapStart, height: 25, type: 'wall' },
    { x: xOffset + gapStart + 150, y: 0, width: ROOM_WIDTH - gapStart - 150, height: 25, type: 'wall' }
  );
  
  // Small decorative platforms at random positions
  const decorPlatformCount = randomInt(1, 3);
  for (let i = 0; i < decorPlatformCount; i++) {
    platforms.push({
      x: xOffset + randomInt(80, ROOM_WIDTH - 160),
      y: ROOM_HEIGHT - randomInt(120, 180),
      width: randomInt(60, 100),
      height: 15,
      type: 'platform'
    });
  }
  
  // Bench position varies slightly
  const benchX = xOffset + randomInt(320, 440);
  
  return {
    platforms,
    enemies: [], // Safe room - no enemies
    pickups: [
      { type: 'shells', x: xOffset + randomInt(100, 200), y: ROOM_HEIGHT - 150, amount: randomInt(2, 5) }
    ],
    triggers: [
      {
        id: `bench_room${roomIndex}`,
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
      [`bench_room${roomIndex}`]: { x: benchX + 30, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * Generate the Infected Cul-de-sac room type with randomized platforming challenge
 */
function generateInfectedCuldesac(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  
  // Ground
  platforms.push({
    x: xOffset, y: ROOM_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground'
  });
  
  // Walls - dead end on right side
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT - 50, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall' }
  );
  
  // Ceiling
  platforms.push({
    x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall'
  });
  
  // Randomized platforming challenge (3-5 platforms ascending)
  const challengePlatformCount = randomInt(3, 5);
  const heightStep = (ROOM_HEIGHT - 200) / challengePlatformCount;
  
  for (let i = 0; i < challengePlatformCount; i++) {
    platforms.push({
      x: xOffset + 100 + (i * 120) + randomInt(-30, 30),
      y: ROOM_HEIGHT - 130 - (i * heightStep) + randomInt(-20, 20),
      width: randomInt(70, 110),
      height: 20,
      type: 'platform'
    });
  }
  
  // Final reward platform
  platforms.push({
    x: xOffset + ROOM_WIDTH - 120,
    y: randomInt(100, 180),
    width: 80,
    height: 20,
    type: 'platform'
  });
  
  // Passive infected husks (randomized count)
  const huskCount = randomInt(1, 3);
  const enemies: EnemySpawnConfig[] = [];
  for (let i = 0; i < huskCount; i++) {
    enemies.push({
      type: 'infectedHusk',
      x: xOffset + randomInt(150, ROOM_WIDTH - 150),
      y: ROOM_HEIGHT - 80
    });
  }
  
  return {
    platforms,
    enemies,
    pickups: [
      // Big reward at the end
      { type: 'shells', x: xOffset + ROOM_WIDTH - 90, y: randomInt(60, 140), amount: randomInt(40, 60) }
    ],
    triggers: [
      // Return portal at entrance to escape
      {
        id: `culdesac_return_${roomIndex}`,
        type: 'transition',
        x: xOffset + 25,
        y: ROOM_HEIGHT - 150,
        width: 30,
        height: 100,
        target: 'forgottenCrossroads',
        targetSpawn: `room${roomIndex - 1}_exit`
      }
    ],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 }
    }
  };
}

// Boss Arena dimensions - larger than regular rooms
const BOSS_ARENA_WIDTH = 1200;
const BOSS_ARENA_HEIGHT = 700;

/**
 * Generate the False Champion Boss Arena (FIXED - no randomization)
 * Features: Wide horizontal room, high ceiling, lock-in gates, background pillars
 */
function generateBossRoom(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  
  // Large arena floor - wide horizontal room
  platforms.push({
    x: xOffset, y: BOSS_ARENA_HEIGHT - 60, width: BOSS_ARENA_WIDTH, height: 60, type: 'ground'
  });
  
  // High ceiling
  platforms.push({
    x: xOffset, y: 0, width: BOSS_ARENA_WIDTH, height: 30, type: 'wall'
  });
  
  // Side walls with gate slots
  // Left wall (with gate position marked)
  platforms.push(
    { x: xOffset, y: 0, width: 30, height: 200, type: 'wall' },
    { x: xOffset, y: 350, width: 30, height: BOSS_ARENA_HEIGHT - 410, type: 'wall' }
  );
  
  // Right wall (with gate position marked)
  platforms.push(
    { x: xOffset + BOSS_ARENA_WIDTH - 30, y: 0, width: 30, height: 200, type: 'wall' },
    { x: xOffset + BOSS_ARENA_WIDTH - 30, y: 350, width: 30, height: BOSS_ARENA_HEIGHT - 410, type: 'wall' }
  );
  
  // Combat platforms - spread across wide arena
  platforms.push(
    // Lower side platforms for escape
    { x: xOffset + 80, y: BOSS_ARENA_HEIGHT - 180, width: 150, height: 25, type: 'platform' },
    { x: xOffset + BOSS_ARENA_WIDTH - 230, y: BOSS_ARENA_HEIGHT - 180, width: 150, height: 25, type: 'platform' },
    
    // Mid-height platforms
    { x: xOffset + 250, y: BOSS_ARENA_HEIGHT - 300, width: 130, height: 25, type: 'platform' },
    { x: xOffset + BOSS_ARENA_WIDTH - 380, y: BOSS_ARENA_HEIGHT - 300, width: 130, height: 25, type: 'platform' },
    
    // High center platform
    { x: xOffset + (BOSS_ARENA_WIDTH / 2) - 75, y: BOSS_ARENA_HEIGHT - 420, width: 150, height: 25, type: 'platform' }
  );
  
  // Background pillars (decorative markers in triggers)
  const pillarTriggers: TriggerConfig[] = [];
  const pillarPositions = [150, 350, 550, 750, 950, 1050];
  pillarPositions.forEach((px, i) => {
    pillarTriggers.push({
      id: `pillar_${i}`,
      type: 'decoration',
      x: xOffset + px,
      y: 100,
      width: 40,
      height: BOSS_ARENA_HEIGHT - 160
    });
  });
  
  return {
    platforms,
    enemies: [], // Boss spawned separately via enterBossArena
    pickups: [],
    triggers: [
      // Boss trigger zone - center of arena
      {
        id: 'bossGate',
        type: 'bossGate',
        x: xOffset + (BOSS_ARENA_WIDTH / 2) - 50,
        y: BOSS_ARENA_HEIGHT - 150,
        width: 100,
        height: 100
      },
      // Left gate (slams down)
      {
        id: 'leftGate',
        type: 'gate',
        x: xOffset + 30,
        y: 200,
        width: 30,
        height: 150
      },
      // Right gate (slams down)
      {
        id: 'rightGate',
        type: 'gate',
        x: xOffset + BOSS_ARENA_WIDTH - 60,
        y: 200,
        width: 30,
        height: 150
      },
      ...pillarTriggers
    ],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 100, y: BOSS_ARENA_HEIGHT - 120 },
      bossSpawn: { x: xOffset + BOSS_ARENA_WIDTH - 200, y: BOSS_ARENA_HEIGHT - 180 },
      arenaCenter: { x: xOffset + BOSS_ARENA_WIDTH / 2, y: BOSS_ARENA_HEIGHT - 120 }
    }
  };
}

/**
 * Generate the Starting Room - styled like Fading Town
 * A calm introductory area with basic platforming and light enemies
 */
function generateStartingRoom(xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  
  // Ground - full width
  platforms.push({
    x: xOffset, y: ROOM_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground'
  });
  
  // Side walls
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT - 50, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT - 50, type: 'wall' }
  );
  
  // Platforms similar to fadingTown layout
  platforms.push(
    { x: xOffset + 150, y: ROOM_HEIGHT - 150, width: 120, height: 20, type: 'platform' },
    { x: xOffset + 350, y: ROOM_HEIGHT - 220, width: 100, height: 20, type: 'platform' },
    { x: xOffset + 550, y: ROOM_HEIGHT - 280, width: 100, height: 20, type: 'platform' },
    { x: xOffset + 300, y: ROOM_HEIGHT - 350, width: 80, height: 20, type: 'platform' }
  );
  
  // Interior wall obstacles
  platforms.push(
    { x: xOffset + 280, y: ROOM_HEIGHT - 200, width: 20, height: 150, type: 'wall' }
  );
  
  // Light enemies - just a couple to introduce combat
  enemies.push(
    { type: 'spikyGrub', x: xOffset + 200, y: ROOM_HEIGHT - 80 },
    { type: 'vengefly', x: xOffset + 450, y: ROOM_HEIGHT - 350 }
  );
  
  return {
    platforms,
    enemies,
    pickups: [
      { type: 'shells', x: xOffset + 400, y: ROOM_HEIGHT - 250, amount: 5 },
      { type: 'shells', x: xOffset + 600, y: ROOM_HEIGHT - 80, amount: 5 }
    ],
    triggers: [],
    spawns: {
      default: { x: xOffset + 80, y: ROOM_HEIGHT - 100 },
      startingRoom_entry: { x: xOffset + 80, y: ROOM_HEIGHT - 100 },
      startingRoom_exit: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * Generate randomized room order with constraints
 */
function generateRoomOrder(): RoomType[] {
  // Must have: at least 2 resting stations, 2-3 guarded corridors, 1-2 vertical shafts, 1-2 cul-de-sacs
  const roomPool: RoomType[] = [
    'guardedCorridor',
    'guardedCorridor',
    'guardedCorridor',
    'verticalShaft',
    'verticalShaft',
    'restingStation',
    'restingStation',
    'infectedCuldesac',
    'infectedCuldesac',
    'guardedCorridor'
  ];
  
  // Shuffle the pool
  const shuffled = shuffleArray(roomPool);
  
  // Ensure first room is a corridor (easier start)
  const corridorIndex = shuffled.findIndex(r => r === 'guardedCorridor');
  if (corridorIndex > 0) {
    [shuffled[0], shuffled[corridorIndex]] = [shuffled[corridorIndex], shuffled[0]];
  }
  
  // Ensure last room before boss isn't a cul-de-sac (need exit)
  if (shuffled[9] === 'infectedCuldesac') {
    const swapIndex = shuffled.findIndex((r, i) => i < 9 && r !== 'infectedCuldesac');
    if (swapIndex >= 0) {
      [shuffled[9], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[9]];
    }
  }
  
  return shuffled;
}

/**
 * Generate a complete level with connected rooms
 */
export function generateForgottenCrossroads(): LevelConfig {
  // Reset seed for new generation
  seed = Date.now();
  
  const rooms: RoomData[] = [];
  let totalWidth = 0;
  
  // Generate starting room first (styled like Fading Town)
  const startingRoom = generateStartingRoom(totalWidth);
  rooms.push(startingRoom);
  totalWidth += ROOM_WIDTH;
  
  // Generate randomized room order
  const roomOrder = generateRoomOrder();
  
  // Generate 10 rooms after the starting room
  for (let i = 0; i < 10; i++) {
    const roomType = roomOrder[i];
    let roomData: RoomData;
    
    switch (roomType) {
      case 'verticalShaft':
        roomData = generateVerticalShaft(i + 1, totalWidth);
        break;
      case 'guardedCorridor':
        roomData = generateGuardedCorridor(i + 1, totalWidth);
        break;
      case 'restingStation':
        roomData = generateRestingStation(i + 1, totalWidth);
        break;
      case 'infectedCuldesac':
        roomData = generateInfectedCuldesac(i + 1, totalWidth);
        break;
      default:
        roomData = generateGuardedCorridor(i + 1, totalWidth);
    }
    
    rooms.push(roomData);
    totalWidth += ROOM_WIDTH;
  }
  
  // Add fixed boss room at the end
  const bossRoom = generateBossRoom(11, totalWidth);
  rooms.push(bossRoom);
  const bossRoomStartX = totalWidth;
  totalWidth += BOSS_ARENA_WIDTH;
  
  // Combine all room data
  const allPlatforms: PlatformConfig[] = [];
  const allEnemies: EnemySpawnConfig[] = [];
  const allPickups: PickupConfig[] = [];
  const allTriggers: TriggerConfig[] = [];
  const allSpawns: Record<string, { x: number; y: number }> = {};
  const allSpikes: SpikeConfig[] = [];
  const allBreakables: BreakableConfig[] = [];
  
  rooms.forEach((room) => {
    allPlatforms.push(...room.platforms);
    allEnemies.push(...room.enemies);
    allPickups.push(...room.pickups);
    allTriggers.push(...room.triggers);
    Object.assign(allSpawns, room.spawns);
    if (room.spikes) allSpikes.push(...room.spikes);
    if (room.breakables) allBreakables.push(...room.breakables);
  });
  
  // Add transition from starting room to first generated room
  allTriggers.push({
    id: 'transition_start_to_room1',
    type: 'transition',
    x: ROOM_WIDTH - 30,
    y: ROOM_HEIGHT - 150,
    width: 30,
    height: 100,
    target: 'forgottenCrossroads',
    targetSpawn: 'room1_entry'
  });
  
  // Add transitions between the 10 generated rooms
  for (let i = 0; i < 10; i++) {
    const roomType = roomOrder[i];
    const xPos = ((i + 2) * ROOM_WIDTH) - 30; // +2 because starting room is at index 0
    
    // Skip transition for cul-de-sac (dead end)
    if (roomType !== 'infectedCuldesac') {
      allTriggers.push({
        id: `transition_room${i + 1}_to_room${i + 2}`,
        type: 'transition',
        x: xPos,
        y: ROOM_HEIGHT - 150,
        width: 30,
        height: 100,
        target: 'forgottenCrossroads',
        targetSpawn: i < 9 ? `room${i + 2}_entry` : 'room11_entry'
      });
    }
  }
  
  return {
    id: 'forgottenCrossroads',
    name: 'Forgotten Crossroads',
    width: totalWidth,
    height: BOSS_ARENA_HEIGHT,
    backgroundColor: '#0a0e18',
    spawnPoint: { x: 80, y: ROOM_HEIGHT - 100 },
    platforms: allPlatforms,
    enemies: allEnemies,
    pickups: allPickups,
    triggers: allTriggers,
    spawns: {
      default: { x: 100, y: ROOM_HEIGHT - 100 },
      ...allSpawns
    },
    spikes: allSpikes,
    breakables: allBreakables,
    bossArena: {
      x: bossRoomStartX,
      y: 0,
      width: BOSS_ARENA_WIDTH,
      height: BOSS_ARENA_HEIGHT,
      bossSpawn: { x: bossRoomStartX + BOSS_ARENA_WIDTH - 200, y: BOSS_ARENA_HEIGHT - 180 }
    }
  };
}

export { ROOM_WIDTH, ROOM_HEIGHT, BOSS_ARENA_WIDTH, BOSS_ARENA_HEIGHT };
