import { LevelConfig, PlatformConfig, EnemySpawnConfig, TriggerConfig, PickupConfig } from '../core/GameConfig';

export type RoomType = 
  | 'verticalShaft'
  | 'guardedCorridor'
  | 'restingStation'
  | 'infectedCuldesac'
  | 'bossRoom';

export interface RoomData {
  platforms: PlatformConfig[];
  enemies: EnemySpawnConfig[];
  pickups: PickupConfig[];
  triggers: TriggerConfig[];
  spawns: Record<string, { x: number; y: number }>;
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
  
  // Left and right walls
  platforms.push({
    x: xOffset, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall'
  });
  platforms.push({
    x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: ROOM_HEIGHT, type: 'wall'
  });
  
  // Ground
  platforms.push({
    x: xOffset + 20, y: ROOM_HEIGHT - 30, width: ROOM_WIDTH - 40, height: 30, type: 'ground'
  });
  
  // Randomized ascending platforms (zigzag pattern with variation)
  const platformCount = randomInt(5, 7);
  const heightStep = (ROOM_HEIGHT - 150) / platformCount;
  
  for (let i = 0; i < platformCount; i++) {
    const baseY = ROOM_HEIGHT - 100 - (i * heightStep);
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
  
  // Randomized Vengefly count and positions
  const vengeflyCount = randomInt(2, 4);
  for (let i = 0; i < vengeflyCount; i++) {
    enemies.push({
      type: 'vengefly',
      x: xOffset + randomInt(100, ROOM_WIDTH - 100),
      y: randomInt(100, ROOM_HEIGHT - 200)
    });
  }
  
  // Random pickup positions
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
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 100, y: ROOM_HEIGHT - 80 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 80 }
    }
  };
}

/**
 * Generate the Guarded Corridor room type with randomized layout
 */
function generateGuardedCorridor(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  
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
  
  // Randomized Husk Guard positions (1-2)
  const guardCount = randomInt(1, 2);
  const guardSpacing = (ROOM_WIDTH - 200) / guardCount;
  
  for (let i = 0; i < guardCount; i++) {
    enemies.push({
      type: 'huskGuard',
      x: xOffset + 150 + (i * guardSpacing) + randomInt(-50, 50),
      y: ROOM_HEIGHT - 120
    });
  }
  
  // Random ground enemies
  const grubCount = randomInt(1, 3);
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
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * Generate the Boss Room (FIXED - no randomization)
 */
function generateBossRoom(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  
  // Large arena floor
  platforms.push({
    x: xOffset, y: ROOM_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground'
  });
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 25, height: ROOM_HEIGHT - 50, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 25, y: 0, width: 25, height: ROOM_HEIGHT - 50, type: 'wall' }
  );
  
  // Ceiling
  platforms.push({
    x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall'
  });
  
  // Fixed combat platforms for consistent boss fight
  platforms.push(
    { x: xOffset + 150, y: ROOM_HEIGHT - 180, width: 120, height: 20, type: 'platform' },
    { x: xOffset + 530, y: ROOM_HEIGHT - 180, width: 120, height: 20, type: 'platform' },
    { x: xOffset + 340, y: ROOM_HEIGHT - 280, width: 120, height: 20, type: 'platform' }
  );
  
  return {
    platforms,
    enemies: [], // Boss spawned separately
    pickups: [],
    triggers: [
      {
        id: 'bossGate',
        type: 'bossGate',
        x: xOffset + 350,
        y: ROOM_HEIGHT - 100,
        width: 100,
        height: 50
      }
    ],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 100, y: ROOM_HEIGHT - 100 },
      bossSpawn: { x: xOffset + 600, y: ROOM_HEIGHT - 150 }
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
  
  // Generate randomized room order
  const roomOrder = generateRoomOrder();
  
  // Generate 10 rooms
  for (let i = 0; i < 10; i++) {
    const roomType = roomOrder[i];
    let roomData: RoomData;
    
    switch (roomType) {
      case 'verticalShaft':
        roomData = generateVerticalShaft(i, totalWidth);
        break;
      case 'guardedCorridor':
        roomData = generateGuardedCorridor(i, totalWidth);
        break;
      case 'restingStation':
        roomData = generateRestingStation(i, totalWidth);
        break;
      case 'infectedCuldesac':
        roomData = generateInfectedCuldesac(i, totalWidth);
        break;
      default:
        roomData = generateGuardedCorridor(i, totalWidth);
    }
    
    rooms.push(roomData);
    totalWidth += ROOM_WIDTH;
  }
  
  // Add fixed boss room at the end
  const bossRoom = generateBossRoom(10, totalWidth);
  rooms.push(bossRoom);
  totalWidth += ROOM_WIDTH;
  
  // Combine all room data
  const allPlatforms: PlatformConfig[] = [];
  const allEnemies: EnemySpawnConfig[] = [];
  const allPickups: PickupConfig[] = [];
  const allTriggers: TriggerConfig[] = [];
  const allSpawns: Record<string, { x: number; y: number }> = {};
  
  rooms.forEach((room) => {
    allPlatforms.push(...room.platforms);
    allEnemies.push(...room.enemies);
    allPickups.push(...room.pickups);
    allTriggers.push(...room.triggers);
    Object.assign(allSpawns, room.spawns);
  });
  
  // Add transitions between rooms
  for (let i = 0; i < 10; i++) {
    const roomType = roomOrder[i];
    const xPos = (i + 1) * ROOM_WIDTH - 30;
    
    // Skip transition for cul-de-sac (dead end)
    if (roomType !== 'infectedCuldesac') {
      allTriggers.push({
        id: `transition_room${i}_to_room${i + 1}`,
        type: 'transition',
        x: xPos,
        y: ROOM_HEIGHT - 150,
        width: 30,
        height: 100,
        target: 'forgottenCrossroads',
        targetSpawn: `room${i + 1}_entry`
      });
    }
  }
  
  return {
    id: 'forgottenCrossroads',
    name: 'Forgotten Crossroads',
    width: totalWidth,
    height: ROOM_HEIGHT,
    backgroundColor: '#0a0e18',
    spawnPoint: { x: 100, y: ROOM_HEIGHT - 100 },
    platforms: allPlatforms,
    enemies: allEnemies,
    pickups: allPickups,
    triggers: allTriggers,
    spawns: {
      default: { x: 100, y: ROOM_HEIGHT - 100 },
      ...allSpawns
    },
    bossArena: {
      x: 10 * ROOM_WIDTH,
      y: 0,
      width: ROOM_WIDTH,
      height: ROOM_HEIGHT,
      bossSpawn: { x: 10 * ROOM_WIDTH + 600, y: ROOM_HEIGHT - 150 }
    }
  };
}

export { ROOM_WIDTH, ROOM_HEIGHT };
