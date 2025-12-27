// Game constants and configuration
export const GAME_CONFIG = {
  width: 800,
  height: 600,
  gravity: 1200,
  debug: false,
};

export const PLAYER_CONFIG = {
  width: 24,
  height: 40,
  moveSpeed: 180,
  jumpForce: 380,
  dashSpeed: 350,
  dashDuration: 150,
  dashCooldown: 600,
  wallSlideSpeed: 50,
  wallJumpForce: { x: 250, y: 350 },
  maxHp: 5,
  invulnerabilityDuration: 1500,
  attackDuration: 250,
  attackCooldown: 350,
  attackRange: 45,
  attackDamage: 1,
  hitstopDuration: 50,
  knockbackForce: 150,
};

export const COLORS = {
  player: 0xe8e8e8,
  playerOutline: 0x5599dd,
  platform: 0x1a1e2a,
  platformLight: 0x2a3040,
  wall: 0x151822,
  bench: 0xb8975a,
  benchGlow: 0xd4a84b,
  enemy: 0xe0e0e0,
  enemyAccent: 0x5599dd,
  boss: 0xf0f0f0,
  bossAccent: 0xff6666,
  shell: 0xd4a84b,
  shellGlow: 0xffd700,
  damage: 0xff4444,
  heal: 0x66bbff,
  portal: 0x5599dd,
};

export type GameState = 
  | 'menu'
  | 'playing'
  | 'paused'
  | 'bench'
  | 'death'
  | 'boss'
  | 'victory';

export interface PlayerData {
  hp: number;
  maxHp: number;
  shells: number;
  equippedCharms: string[];
  lastBench: {
    levelId: string;
    spawnId: string;
  } | null;
  droppedShells: {
    levelId: string;
    x: number;
    y: number;
    amount: number;
  } | null;
}

export interface CharmData {
  id: string;
  name: string;
  description: string;
  effect: {
    type: string;
    value: number;
  };
  slots: number;
}

// Re-export EnemyCombatConfig as EnemyConfig for compatibility
export type { EnemyCombatConfig as EnemyConfig } from './CombatConfig';

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

export interface LevelConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  spawnPoint: { x: number; y: number };
  platforms: PlatformConfig[];
  enemies: EnemySpawnConfig[];
  pickups: PickupConfig[];
  triggers: TriggerConfig[];
  spawns: Record<string, { x: number; y: number }>;
  spikes?: SpikeConfig[];
  breakables?: BreakableConfig[];
  bossArena?: {
    x: number;
    y: number;
    width: number;
    height: number;
    bossSpawn: { x: number; y: number };
  };
}

export interface PlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'platform' | 'wall';
}

export interface EnemySpawnConfig {
  type: string;
  x: number;
  y: number;
}

export interface PickupConfig {
  type: string;
  x: number;
  y: number;
  amount: number;
}

export interface TriggerConfig {
  id: string;
  type: 'bench' | 'transition' | 'bossGate' | 'gate' | 'decoration' | 'chain' | 'shop' | 'endDoor' | 'greenwayDoor';
  x: number;
  y: number;
  width: number;
  height: number;
  target?: string;
  targetSpawn?: string;
}
