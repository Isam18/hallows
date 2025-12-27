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

/**
 * Generate the Vertical Shaft room type
 * Tall room with platforms and Vengeflies
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
  
  // Ascending platforms (zigzag pattern)
  const platformPositions = [
    { x: 80, y: 500 },
    { x: 550, y: 420 },
    { x: 150, y: 340 },
    { x: 500, y: 260 },
    { x: 100, y: 180 },
    { x: 480, y: 100 },
  ];
  
  platformPositions.forEach(pos => {
    platforms.push({
      x: xOffset + pos.x, 
      y: pos.y, 
      width: 120, 
      height: 20, 
      type: 'platform'
    });
  });
  
  // Vengeflies patrolling mid-air sections
  enemies.push(
    { type: 'vengefly', x: xOffset + 350, y: 380 },
    { type: 'vengefly', x: xOffset + 300, y: 220 },
    { type: 'vengefly', x: xOffset + 450, y: 140 }
  );
  
  return {
    platforms,
    enemies,
    pickups: [
      { type: 'shells', x: xOffset + 130, y: 160, amount: 8 },
      { type: 'shells', x: xOffset + 520, y: 80, amount: 5 }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 100, y: ROOM_HEIGHT - 80 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 80 }
    }
  };
}

/**
 * Generate the Guarded Corridor room type
 * Long horizontal room with Husk Guards
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
  
  // Side walls (with openings for transitions)
  platforms.push({
    x: xOffset, y: 30, width: 20, height: ROOM_HEIGHT - 130, type: 'wall'
  });
  platforms.push({
    x: xOffset + ROOM_WIDTH - 20, y: 30, width: 20, height: ROOM_HEIGHT - 130, type: 'wall'
  });
  
  // Some elevated platforms
  platforms.push(
    { x: xOffset + 150, y: ROOM_HEIGHT - 150, width: 100, height: 20, type: 'platform' },
    { x: xOffset + 400, y: ROOM_HEIGHT - 180, width: 120, height: 20, type: 'platform' },
    { x: xOffset + 600, y: ROOM_HEIGHT - 140, width: 100, height: 20, type: 'platform' }
  );
  
  // Two Husk Guards
  enemies.push(
    { type: 'huskGuard', x: xOffset + 250, y: ROOM_HEIGHT - 120 },
    { type: 'huskGuard', x: xOffset + 550, y: ROOM_HEIGHT - 120 }
  );
  
  // Some ground enemies
  enemies.push(
    { type: 'spikyGrub', x: xOffset + 150, y: ROOM_HEIGHT - 80 }
  );
  
  return {
    platforms,
    enemies,
    pickups: [
      { type: 'shells', x: xOffset + 420, y: ROOM_HEIGHT - 200, amount: 10 }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * Generate the Resting Station room type
 * Small safe room with a bench
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
  
  // Ceiling with a gap for light
  platforms.push(
    { x: xOffset, y: 0, width: 300, height: 25, type: 'wall' },
    { x: xOffset + 500, y: 0, width: 300, height: 25, type: 'wall' }
  );
  
  // Small decorative platforms
  platforms.push(
    { x: xOffset + 100, y: ROOM_HEIGHT - 150, width: 80, height: 15, type: 'platform' },
    { x: xOffset + 620, y: ROOM_HEIGHT - 130, width: 80, height: 15, type: 'platform' }
  );
  
  return {
    platforms,
    enemies: [], // Safe room - no enemies
    pickups: [
      { type: 'shells', x: xOffset + 130, y: ROOM_HEIGHT - 170, amount: 3 }
    ],
    triggers: [
      {
        id: `bench_room${roomIndex}`,
        type: 'bench',
        x: xOffset + 380,
        y: ROOM_HEIGHT - 95,
        width: 60,
        height: 45
      }
    ],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: ROOM_HEIGHT - 100 },
      [`bench_room${roomIndex}`]: { x: xOffset + 410, y: ROOM_HEIGHT - 100 }
    }
  };
}

/**
 * Generate the Infected Cul-de-sac room type
 * Dead-end room with infected husks and a hidden reward
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
  
  // Platforms requiring skilled platforming to reach reward
  platforms.push(
    { x: xOffset + 150, y: ROOM_HEIGHT - 150, width: 100, height: 20, type: 'platform' },
    { x: xOffset + 350, y: ROOM_HEIGHT - 230, width: 80, height: 20, type: 'platform' },
    { x: xOffset + 550, y: ROOM_HEIGHT - 310, width: 100, height: 20, type: 'platform' },
    // Final platform with reward
    { x: xOffset + 680, y: ROOM_HEIGHT - 400, width: 80, height: 20, type: 'platform' }
  );
  
  // Passive infected husks for atmosphere
  const enemies: EnemySpawnConfig[] = [
    { type: 'infectedHusk', x: xOffset + 300, y: ROOM_HEIGHT - 80 },
    { type: 'infectedHusk', x: xOffset + 500, y: ROOM_HEIGHT - 80 }
  ];
  
  return {
    platforms,
    enemies,
    pickups: [
      // Reward at the end (big shell pile)
      { type: 'shells', x: xOffset + 710, y: ROOM_HEIGHT - 430, amount: 50 }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: ROOM_HEIGHT - 100 }
      // No exit - it's a cul-de-sac
    }
  };
}

/**
 * Generate the Boss Room
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
  
  // Combat platforms
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

// Room templates for variety - 10 rooms before boss
const ROOM_TEMPLATES: RoomType[] = [
  'guardedCorridor',   // 0
  'verticalShaft',     // 1
  'restingStation',    // 2
  'guardedCorridor',   // 3
  'infectedCuldesac',  // 4
  'verticalShaft',     // 5
  'guardedCorridor',   // 6
  'restingStation',    // 7
  'infectedCuldesac',  // 8
  'guardedCorridor'    // 9
];

/**
 * Generate a complete level with connected rooms
 */
export function generateForgottenCrossroads(): LevelConfig {
  const rooms: RoomData[] = [];
  let totalWidth = 0;
  
  // Generate 10 rooms
  for (let i = 0; i < 10; i++) {
    const roomType = ROOM_TEMPLATES[i];
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
  
  // Add boss room at the end
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
    const roomType = ROOM_TEMPLATES[i];
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
