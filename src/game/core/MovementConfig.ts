/**
 * MOVEMENT TUNING CONFIGURATION
 * =============================
 * All movement parameters are centralized here for easy iteration.
 * Adjust these values to tune the game feel without searching through code.
 * 
 * PARAMETER GUIDE:
 * 
 * RUN:
 * - maxRunSpeed: Maximum horizontal velocity when running (pixels/sec)
 * - runAcceleration: How fast the player reaches max speed (pixels/sec²)
 * - runDeceleration: How fast the player stops when no input (pixels/sec²)
 * - airAccelerationFactor: Multiplier for acceleration while airborne (0-1)
 * - airDecelerationFactor: Multiplier for deceleration while airborne (0-1)
 * 
 * JUMP:
 * - jumpVelocity: Initial upward velocity when jumping (pixels/sec)
 * - gravity: Downward acceleration (pixels/sec²)
 * - maxFallSpeed: Terminal velocity cap (pixels/sec)
 * - coyoteTimeMs: Grace period to jump after leaving ground (ms)
 * - jumpBufferMs: Input buffer window before landing (ms)
 * - jumpCutMultiplier: Velocity multiplier when releasing jump early (0-1)
 * 
 * DASH:
 * - dashSpeed: Horizontal velocity during dash (pixels/sec)
 * - dashDurationMs: How long the dash lasts (ms)
 * - dashCooldownMs: Time before dash can be used again (ms)
 * - dashGravityFactor: Gravity multiplier during dash (0 = no gravity)
 * - dashInputBufferMs: Buffer window for queuing dash input (ms)
 * - dashInvulnerable: Whether dash grants i-frames
 * - airDashLimit: Number of dashes allowed per airtime (0 = unlimited)
 * 
 * WALL:
 * - wallSlideMaxFallSpeed: Capped fall speed while sliding (pixels/sec)
 * - wallStickTimeMs: Brief delay before detaching from wall (ms)
 * - wallJumpXVelocity: Horizontal velocity when wall jumping (pixels/sec)
 * - wallJumpYVelocity: Vertical velocity when wall jumping (pixels/sec)
 * - wallJumpLockoutMs: Time before can re-attach to wall after wall jump (ms)
 * - wallDetectInsetPx: Inward offset for wall detection (pixels)
 * - requireInputTowardWall: Must hold toward wall to slide
 * 
 * CAMERA:
 * - followLerp: Smoothing factor for camera follow (0-1, higher = snappier)
 * - lookAheadDistance: Pixels to offset camera in facing direction
 * - lookAheadSmooth: Smoothing for look-ahead transition
 */

export interface MovementTuning {
  // Run
  maxRunSpeed: number;
  runAcceleration: number;
  runDeceleration: number;
  airAccelerationFactor: number;
  airDecelerationFactor: number;
  
  // Jump
  jumpVelocity: number;
  gravity: number;
  maxFallSpeed: number;
  coyoteTimeMs: number;
  jumpBufferMs: number;
  jumpCutMultiplier: number;
  
  // Dash
  dashSpeed: number;
  dashDurationMs: number;
  dashCooldownMs: number;
  dashGravityFactor: number;
  dashInputBufferMs: number;
  dashInvulnerable: boolean;
  airDashLimit: number;
  
  // Wall
  wallSlideMaxFallSpeed: number;
  wallStickTimeMs: number;
  wallJumpXVelocity: number;
  wallJumpYVelocity: number;
  wallJumpLockoutMs: number;
  wallDetectInsetPx: number;
  requireInputTowardWall: boolean;
  
  // Camera
  followLerpX: number;
  followLerpY: number;
  lookAheadDistance: number;
  lookAheadSmooth: number;
}

/**
 * Default tuning values - optimized for tight, responsive Hollow Knight-like feel
 */
export const MOVEMENT_TUNING: MovementTuning = {
  // Run - snappy acceleration, quick stops
  maxRunSpeed: 200,
  runAcceleration: 1800,
  runDeceleration: 2400,
  airAccelerationFactor: 0.85,
  airDecelerationFactor: 0.5,
  
  // Jump - responsive with good air control
  jumpVelocity: 420,
  gravity: 1400,
  maxFallSpeed: 550,
  coyoteTimeMs: 100,    // ~6 frames at 60fps
  jumpBufferMs: 120,    // ~7 frames at 60fps
  jumpCutMultiplier: 0.4, // Short hop is 40% of full jump
  
  // Dash - quick burst with brief cooldown
  dashSpeed: 380,
  dashDurationMs: 140,
  dashCooldownMs: 450,
  dashGravityFactor: 0,  // No gravity during dash
  dashInputBufferMs: 100,
  dashInvulnerable: true,
  airDashLimit: 1,       // One dash per airtime
  
  // Wall - sticky with reliable wall jumps
  wallSlideMaxFallSpeed: 80,
  wallStickTimeMs: 80,
  wallJumpXVelocity: 280,
  wallJumpYVelocity: 380,
  wallJumpLockoutMs: 150,
  wallDetectInsetPx: 2,
  requireInputTowardWall: true,
  
  // Camera - smooth but responsive
  followLerpX: 0.12,
  followLerpY: 0.10,
  lookAheadDistance: 40,
  lookAheadSmooth: 0.08,
};

// Debug state for dev overlay
export interface MovementDebugState {
  state: string;
  isGrounded: boolean;
  isTouchingWall: boolean;
  wallDirection: number;
  velocityX: number;
  velocityY: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  dashCooldown: number;
  dashBufferTimer: number;
  wallStickTimer: number;
  wallJumpLockout: number;
  airDashesUsed: number;
  facing: number;
}

export const createDebugState = (): MovementDebugState => ({
  state: 'idle',
  isGrounded: false,
  isTouchingWall: false,
  wallDirection: 0,
  velocityX: 0,
  velocityY: 0,
  coyoteTimer: 0,
  jumpBufferTimer: 0,
  dashCooldown: 0,
  dashBufferTimer: 0,
  wallStickTimer: 0,
  wallJumpLockout: 0,
  airDashesUsed: 0,
  facing: 1,
});
