/**
 * COMBAT TUNING CONFIGURATION
 * ===========================
 * All combat parameters are centralized here for easy iteration.
 * 
 * PLAYER MELEE:
 * - attackWindupMs: Delay before hitbox becomes active
 * - attackActiveMs: Duration hitbox is active (damage window)
 * - attackRecoveryMs: Delay after attack before can act again
 * - attackCooldownMs: Time before another attack can start
 * - hitboxWidth/Height: Size of melee hitbox
 * - hitboxOffsetX: Distance from player center to hitbox center
 * - hitstopMs: Game pause on hit for impact feel
 * 
 * PLAYER DEFENSE:
 * - invulnerabilityMs: I-frames after taking damage
 * - knockbackForce: Horizontal knockback when hit
 * - knockbackYForce: Vertical knockback (slight pop up)
 * 
 * ENEMY AI:
 * - edgeCheckDistance: How far ahead to check for platform edges
 * - turnCooldownMs: Minimum time before enemy can turn again
 * - deaggroMultiplier: Multiplier on aggro range for deaggro distance
 */

export interface CombatTuning {
  // Player Melee
  attackWindupMs: number;
  attackActiveMs: number;
  attackRecoveryMs: number;
  attackCooldownMs: number;
  hitboxWidth: number;
  hitboxHeight: number;
  hitboxOffsetX: number;
  hitstopMs: number;
  
  // Player Defense
  playerInvulnMs: number;
  playerKnockbackX: number;
  playerKnockbackY: number;
  damageFlashMs: number;
  
  // Enemy AI
  edgeCheckDistance: number;
  turnCooldownMs: number;
  deaggroMultiplier: number;
}

export const COMBAT_TUNING: CombatTuning = {
  // Player Melee - snappy attacks with brief active window
  attackWindupMs: 0,           // No windup for responsive feel
  attackActiveMs: 120,         // Hitbox active for ~7 frames at 60fps
  attackRecoveryMs: 80,        // Brief recovery
  attackCooldownMs: 280,       // Can attack ~3.5 times per second
  hitboxWidth: 50,             // Wide slash
  hitboxHeight: 44,            // Tall enough to hit grounded enemies
  hitboxOffsetX: 35,           // Distance from player center
  hitstopMs: 45,               // Brief freeze on hit
  
  // Player Defense
  playerInvulnMs: 800,         // ~0.8 seconds of i-frames
  playerKnockbackX: 180,       // Horizontal pushback
  playerKnockbackY: 100,       // Slight upward pop
  damageFlashMs: 100,          // Red flash duration
  
  // Enemy AI
  edgeCheckDistance: 20,       // Pixels ahead to raycast for edges
  turnCooldownMs: 300,         // Prevent rapid turn flipping
  deaggroMultiplier: 1.5,      // Deaggro at 150% of aggro range
};

/**
 * Extended enemy configuration for combat
 * These are loaded from enemies.json but typed here
 */
export interface EnemyCombatConfig {
  id: string;
  displayName: string;
  hp: number;
  contactDamage: number;
  moveSpeedPatrol: number;
  moveSpeedAggro: number;
  aggroRangePx: number;
  deaggroRangePx: number;
  knockbackOnHit: { x: number; y: number };
  hitstunMs: number;
  invulnOnHitMs: number;
  dropShells: { min: number; max: number };
  hurtFlashMs: number;
  spriteKey: string;
  width: number;
  height: number;
}

// Default enemy config as fallback
export const DEFAULT_ENEMY_CONFIG: EnemyCombatConfig = {
  id: 'unknown',
  displayName: 'Unknown Enemy',
  hp: 2,
  contactDamage: 1,
  moveSpeedPatrol: 40,
  moveSpeedAggro: 80,
  aggroRangePx: 120,
  deaggroRangePx: 180,
  knockbackOnHit: { x: 120, y: 60 },
  hitstunMs: 200,
  invulnOnHitMs: 150,
  dropShells: { min: 2, max: 4 },
  hurtFlashMs: 150,
  spriteKey: 'spikyGrub',
  width: 32,
  height: 24,
};
