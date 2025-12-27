import { LevelConfig, PlatformConfig, EnemySpawnConfig, TriggerConfig, PickupConfig } from '../core/GameConfig';

export type RoomType = 
  | 'verticalShaft'
  | 'guardedCorridor'
  | 'restingStation'
  | 'infectedCuldesac'
  | 'bossRoom';

export interface RoomTemplate {
  type: RoomType;
  width: number;
  height: number;
  generate: (roomIndex: number, xOffset: number) => RoomData;
}

export interface RoomData {
  platforms: PlatformConfig[];
  enemies: EnemySpawnConfig[];
  pickups: PickupConfig[];
  triggers: TriggerConfig[];
  spawns: Record<string, { x: number; y: number }>;
  spikes?: { x: number; y: number; width: number }[];
  breakables?: { x: number; y: number; type: string }[];
  decorations?: { x: number; y: number; type: string }[];
}

// Room dimensions
const ROOM_WIDTH = 800;
const VERTICAL_SHAFT_HEIGHT = 900;
const CORRIDOR_HEIGHT = 400;
const RESTING_HEIGHT = 350;
const CULDESAC_HEIGHT = 450;
const BOSS_ROOM_HEIGHT = 500;

/**
 * Generate the Vertical Shaft room type
 * Tall room with platforms, Vengeflies, and spikes at bottom
 */
function generateVerticalShaft(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  const spikes: { x: number; y: number; width: number }[] = [];
  
  // Left and right walls
  platforms.push({
    x: xOffset, y: 0, width: 20, height: VERTICAL_SHAFT_HEIGHT, type: 'wall'
  });
  platforms.push({
    x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: VERTICAL_SHAFT_HEIGHT, type: 'wall'
  });
  
  // Ground with spikes
  platforms.push({
    x: xOffset + 20, y: VERTICAL_SHAFT_HEIGHT - 30, width: ROOM_WIDTH - 40, height: 30, type: 'ground'
  });
  spikes.push({ x: xOffset + 60, y: VERTICAL_SHAFT_HEIGHT - 50, width: ROOM_WIDTH - 120 });
  
  // Ascending platforms (zigzag pattern)
  const platformPositions = [
    { x: 80, y: 750 },
    { x: 550, y: 650 },
    { x: 150, y: 550 },
    { x: 500, y: 450 },
    { x: 100, y: 350 },
    { x: 480, y: 250 },
    { x: 200, y: 150 },
    { x: 550, y: 80 },
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
    { type: 'vengefly', x: xOffset + 350, y: 500 },
    { type: 'vengefly', x: xOffset + 300, y: 300 },
    { type: 'vengefly', x: xOffset + 450, y: 180 }
  );
  
  // Exit platform at top
  platforms.push({
    x: xOffset + 300, y: 40, width: 200, height: 20, type: 'platform'
  });
  
  return {
    platforms,
    enemies,
    pickups: [
      { type: 'shells', x: xOffset + 200, y: 130, amount: 8 },
      { type: 'shells', x: xOffset + 520, y: 230, amount: 5 }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 100, y: VERTICAL_SHAFT_HEIGHT - 80 },
      [`room${roomIndex}_exit`]: { x: xOffset + 400, y: 20 }
    },
    spikes
  };
}

/**
 * Generate the Guarded Corridor room type
 * Long horizontal room with Husk Guards and breakable objects
 */
function generateGuardedCorridor(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  const enemies: EnemySpawnConfig[] = [];
  const breakables: { x: number; y: number; type: string }[] = [];
  
  // Ground
  platforms.push({
    x: xOffset, y: CORRIDOR_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground'
  });
  
  // Ceiling
  platforms.push({
    x: xOffset, y: 0, width: ROOM_WIDTH, height: 30, type: 'wall'
  });
  
  // Side walls (with openings for transitions)
  platforms.push({
    x: xOffset, y: 30, width: 20, height: CORRIDOR_HEIGHT - 130, type: 'wall'
  });
  platforms.push({
    x: xOffset + ROOM_WIDTH - 20, y: 30, width: 20, height: CORRIDOR_HEIGHT - 130, type: 'wall'
  });
  
  // Some elevated platforms
  platforms.push(
    { x: xOffset + 150, y: CORRIDOR_HEIGHT - 130, width: 100, height: 20, type: 'platform' },
    { x: xOffset + 400, y: CORRIDOR_HEIGHT - 150, width: 120, height: 20, type: 'platform' },
    { x: xOffset + 600, y: CORRIDOR_HEIGHT - 120, width: 100, height: 20, type: 'platform' }
  );
  
  // Two Husk Guards
  enemies.push(
    { type: 'huskGuard', x: xOffset + 250, y: CORRIDOR_HEIGHT - 120 },
    { type: 'huskGuard', x: xOffset + 550, y: CORRIDOR_HEIGHT - 120 }
  );
  
  // Breakable objects (signposts, poles)
  breakables.push(
    { x: xOffset + 100, y: CORRIDOR_HEIGHT - 80, type: 'signpost' },
    { x: xOffset + 350, y: CORRIDOR_HEIGHT - 80, type: 'pole' },
    { x: xOffset + 680, y: CORRIDOR_HEIGHT - 80, type: 'signpost' }
  );
  
  return {
    platforms,
    enemies,
    pickups: [],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: CORRIDOR_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: CORRIDOR_HEIGHT - 100 }
    },
    breakables
  };
}

/**
 * Generate the Resting Station room type
 * Small safe room with a bench
 */
function generateRestingStation(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  
  // Cozy enclosed space
  platforms.push({
    x: xOffset, y: RESTING_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground'
  });
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: RESTING_HEIGHT - 50, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: RESTING_HEIGHT - 50, type: 'wall' }
  );
  
  // Ceiling with a gap for light
  platforms.push(
    { x: xOffset, y: 0, width: 300, height: 25, type: 'wall' },
    { x: xOffset + 500, y: 0, width: 300, height: 25, type: 'wall' }
  );
  
  // Small decorative platforms
  platforms.push(
    { x: xOffset + 100, y: RESTING_HEIGHT - 120, width: 80, height: 15, type: 'platform' },
    { x: xOffset + 620, y: RESTING_HEIGHT - 100, width: 80, height: 15, type: 'platform' }
  );
  
  return {
    platforms,
    enemies: [], // Safe room - no enemies
    pickups: [
      { type: 'shells', x: xOffset + 130, y: RESTING_HEIGHT - 140, amount: 3 }
    ],
    triggers: [
      {
        id: `bench_room${roomIndex}`,
        type: 'bench',
        x: xOffset + 380,
        y: RESTING_HEIGHT - 95,
        width: 60,
        height: 45
      }
    ],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: RESTING_HEIGHT - 100 },
      [`room${roomIndex}_exit`]: { x: xOffset + ROOM_WIDTH - 60, y: RESTING_HEIGHT - 100 },
      [`bench_room${roomIndex}`]: { x: xOffset + 410, y: RESTING_HEIGHT - 100 }
    }
  };
}

/**
 * Generate the Infected Cul-de-sac room type
 * Dead-end room with infection growths and a hidden charm/powerup
 */
function generateInfectedCuldesac(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  const decorations: { x: number; y: number; type: string }[] = [];
  
  // Ground
  platforms.push({
    x: xOffset, y: CULDESAC_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground'
  });
  
  // Walls - dead end on right side
  platforms.push(
    { x: xOffset, y: 0, width: 20, height: CULDESAC_HEIGHT - 50, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 20, y: 0, width: 20, height: CULDESAC_HEIGHT, type: 'wall' }
  );
  
  // Ceiling
  platforms.push({
    x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall'
  });
  
  // Platforms requiring double-jump/dash to reach
  platforms.push(
    { x: xOffset + 150, y: CULDESAC_HEIGHT - 130, width: 100, height: 20, type: 'platform' },
    { x: xOffset + 350, y: CULDESAC_HEIGHT - 200, width: 80, height: 20, type: 'platform' },
    { x: xOffset + 550, y: CULDESAC_HEIGHT - 280, width: 100, height: 20, type: 'platform' },
    // Final platform with charm - requires skilled platforming
    { x: xOffset + 680, y: CULDESAC_HEIGHT - 350, width: 80, height: 20, type: 'platform' }
  );
  
  // Infection growths (decorative, blocking visual)
  decorations.push(
    { x: xOffset + 200, y: CULDESAC_HEIGHT - 80, type: 'infectionGrowth' },
    { x: xOffset + 450, y: CULDESAC_HEIGHT - 60, type: 'infectionGrowth' },
    { x: xOffset + 600, y: CULDESAC_HEIGHT - 100, type: 'infectionVines' },
    { x: xOffset + 720, y: CULDESAC_HEIGHT - 200, type: 'infectionCluster' }
  );
  
  // Passive infected husks for atmosphere
  const enemies: EnemySpawnConfig[] = [
    { type: 'infectedHusk', x: xOffset + 300, y: CULDESAC_HEIGHT - 80 },
    { type: 'infectedHusk', x: xOffset + 500, y: CULDESAC_HEIGHT - 80 }
  ];
  
  return {
    platforms,
    enemies,
    pickups: [
      // Charm/powerup at the end (represented as special shells for now)
      { type: 'shells', x: xOffset + 710, y: CULDESAC_HEIGHT - 380, amount: 50 }
    ],
    triggers: [],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 60, y: CULDESAC_HEIGHT - 100 }
    },
    decorations
  };
}

/**
 * Generate the Boss Room
 */
function generateBossRoom(roomIndex: number, xOffset: number): RoomData {
  const platforms: PlatformConfig[] = [];
  
  // Large arena floor
  platforms.push({
    x: xOffset, y: BOSS_ROOM_HEIGHT - 50, width: ROOM_WIDTH, height: 50, type: 'ground'
  });
  
  // Walls
  platforms.push(
    { x: xOffset, y: 0, width: 25, height: BOSS_ROOM_HEIGHT - 50, type: 'wall' },
    { x: xOffset + ROOM_WIDTH - 25, y: 0, width: 25, height: BOSS_ROOM_HEIGHT - 50, type: 'wall' }
  );
  
  // High ceiling
  platforms.push({
    x: xOffset, y: 0, width: ROOM_WIDTH, height: 25, type: 'wall'
  });
  
  // Combat platforms
  platforms.push(
    { x: xOffset + 150, y: BOSS_ROOM_HEIGHT - 150, width: 120, height: 20, type: 'platform' },
    { x: xOffset + 530, y: BOSS_ROOM_HEIGHT - 150, width: 120, height: 20, type: 'platform' },
    { x: xOffset + 340, y: BOSS_ROOM_HEIGHT - 250, width: 120, height: 20, type: 'platform' }
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
        y: BOSS_ROOM_HEIGHT - 100,
        width: 100,
        height: 50
      }
    ],
    spawns: {
      [`room${roomIndex}_entry`]: { x: xOffset + 100, y: BOSS_ROOM_HEIGHT - 100 },
      bossSpawn: { x: xOffset + 600, y: BOSS_ROOM_HEIGHT - 150 }
    }
  };
}

// Room templates for variety
const ROOM_TEMPLATES: RoomType[] = [
  'guardedCorridor',
  'verticalShaft', 
  'restingStation',
  'guardedCorridor',
  'infectedCuldesac',
  'verticalShaft',
  'guardedCorridor',
  'restingStation',
  'infectedCuldesac',
  'guardedCorridor'
];

/**
 * Generate a complete level with connected rooms
 */
export function generateForgottenCrossroads(): LevelConfig {
  const rooms: RoomData[] = [];
  let totalWidth = 0;
  let maxHeight = 0;
  
  // Generate 10 rooms
  for (let i = 0; i < 10; i++) {
    const roomType = ROOM_TEMPLATES[i];
    let roomData: RoomData;
    let roomHeight: number;
    
    switch (roomType) {
      case 'verticalShaft':
        roomData = generateVerticalShaft(i, totalWidth);
        roomHeight = VERTICAL_SHAFT_HEIGHT;
        break;
      case 'guardedCorridor':
        roomData = generateGuardedCorridor(i, totalWidth);
        roomHeight = CORRIDOR_HEIGHT;
        break;
      case 'restingStation':
        roomData = generateRestingStation(i, totalWidth);
        roomHeight = RESTING_HEIGHT;
        break;
      case 'infectedCuldesac':
        roomData = generateInfectedCuldesac(i, totalWidth);
        roomHeight = CULDESAC_HEIGHT;
        break;
      default:
        roomData = generateGuardedCorridor(i, totalWidth);
        roomHeight = CORRIDOR_HEIGHT;
    }
    
    rooms.push(roomData);
    totalWidth += ROOM_WIDTH;
    maxHeight = Math.max(maxHeight, roomHeight);
  }
  
  // Add boss room at the end
  const bossRoom = generateBossRoom(10, totalWidth);
  rooms.push(bossRoom);
  totalWidth += ROOM_WIDTH;
  maxHeight = Math.max(maxHeight, BOSS_ROOM_HEIGHT);
  
  // Combine all room data
  const allPlatforms: PlatformConfig[] = [];
  const allEnemies: EnemySpawnConfig[] = [];
  const allPickups: PickupConfig[] = [];
  const allTriggers: TriggerConfig[] = [];
  const allSpawns: Record<string, { x: number; y: number }> = {};
  
  rooms.forEach((room, index) => {
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
    
    // Get room height for proper portal positioning
    let roomHeight: number;
    switch (roomType) {
      case 'verticalShaft': roomHeight = VERTICAL_SHAFT_HEIGHT; break;
      case 'guardedCorridor': roomHeight = CORRIDOR_HEIGHT; break;
      case 'restingStation': roomHeight = RESTING_HEIGHT; break;
      case 'infectedCuldesac': roomHeight = CULDESAC_HEIGHT; break;
      default: roomHeight = CORRIDOR_HEIGHT;
    }
    
    // Skip transition for cul-de-sac (dead end)
    if (roomType !== 'infectedCuldesac') {
      allTriggers.push({
        id: `transition_room${i}_to_room${i + 1}`,
        type: 'transition',
        x: xPos,
        y: roomHeight - 150,
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
    height: maxHeight,
    backgroundColor: '#0a0e18',
    spawnPoint: { x: 100, y: CORRIDOR_HEIGHT - 100 },
    platforms: allPlatforms,
    enemies: allEnemies,
    pickups: allPickups,
    triggers: allTriggers,
    spawns: {
      default: { x: 100, y: CORRIDOR_HEIGHT - 100 },
      ...allSpawns
    },
    bossArena: {
      x: 10 * ROOM_WIDTH,
      y: 0,
      width: ROOM_WIDTH,
      height: BOSS_ROOM_HEIGHT,
      bossSpawn: { x: 10 * ROOM_WIDTH + 600, y: BOSS_ROOM_HEIGHT - 150 }
    }
  };
}

export { ROOM_WIDTH, VERTICAL_SHAFT_HEIGHT, CORRIDOR_HEIGHT, RESTING_HEIGHT, CULDESAC_HEIGHT, BOSS_ROOM_HEIGHT };
