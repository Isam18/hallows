import Phaser from 'phaser';
import { PLAYER_CONFIG, COLORS } from '../core/GameConfig';
import { MOVEMENT_TUNING, MovementDebugState, createDebugState } from '../core/MovementConfig';
import { COMBAT_TUNING } from '../core/CombatConfig';
import gameState from '../core/GameState';
import inputManager from '../core/InputManager';
import type { GameScene } from '../scenes/GameScene';

/**
 * Movement State Machine
 * States are mutually exclusive and determine movement behavior
 */
type MovementState = 
  | 'grounded'    // On ground, can run/jump/dash
  | 'airborne'    // In air, can move/fall/dash/wall-attach
  | 'wallSlide'   // Sliding down wall, can wall-jump
  | 'dash'        // Dashing, overrides other movement
  | 'hitstun';    // Knocked back (stub)

type VisualState = 'idle' | 'running' | 'jumping' | 'falling' | 'dashing' | 'wallSliding' | 'attacking';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private gameScene: GameScene;
  
  // State machine
  private movementState: MovementState = 'grounded';
  private visualState: VisualState = 'idle';
  private facing: 1 | -1 = 1;
  
  // Ground/wall detection
  private isGrounded = false;
  private wasGrounded = false;
  private isTouchingWall = false;
  private wallDirection: 1 | -1 = 0 as any;
  private inputTowardWall = false;
  
  // Timers (in ms)
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private dashTimer = 0;
  private dashCooldownTimer = 0;
  private dashBufferTimer = 0;
  private wallStickTimer = 0;
  private wallJumpLockoutTimer = 0;
  
  // Dash tracking
  private airDashesUsed = 0;
  private dashDirection: 1 | -1 = 1;
  
  // Jump tracking
  private jumpHeld = false;
  private hasReleasedJumpSinceGround = true;
  
  // Attack system
  private isAttacking = false;
  private attackActiveTimer = 0;
  private attackRecoveryTimer = 0;
  private attackCooldown = 0;
  private attackHitbox: Phaser.Geom.Rectangle | null = null;
  private slashSprite: Phaser.GameObjects.Sprite | null = null;
  private currentSwingId = 0;
  
  // Focus healing system
  private isFocusing = false;
  private focusTimer = 0;
  private focusParticles: Phaser.GameObjects.Group | null = null;
  private readonly FOCUS_TIME = 1500; // 1.5 seconds to heal
  
  // Invulnerability
  private invulnerable = false;
  private invulnerabilityTime = 0;
  
  // Debug state
  private debugState: MovementDebugState = createDebugState();

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'player');
    this.gameScene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.setSize(PLAYER_CONFIG.width, PLAYER_CONFIG.height);
    this.setCollideWorldBounds(true);
    
    // Set gravity from tuning config
    body.setGravityY(MOVEMENT_TUNING.gravity - 1200); // Offset Phaser's default gravity
    body.setMaxVelocityY(MOVEMENT_TUNING.maxFallSpeed);
  }

  update(time: number, delta: number): void {
    // Update detection states first
    this.updateCollisionState();
    
    // Update all timers
    this.updateTimers(delta);
    
    // Handle focus healing (highest priority - locks movement)
    this.handleFocus(delta);
    
    // Skip other updates if focusing
    if (this.isFocusing) {
      this.updateDebugState();
      return;
    }
    
    // Process input buffers
    this.processInputBuffers();
    
    // Run state machine
    this.updateMovementState(delta);
    
    // Apply movement based on current state
    this.applyMovement(delta);
    
    // Handle attacks (preserved system)
    this.handleAttack(delta);
    
    // Update visual state for animations
    this.updateVisualState();
    
    // Update debug state
    this.updateDebugState();
  }

  private updateCollisionState(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Store previous ground state
    this.wasGrounded = this.isGrounded;
    
    // Ground detection
    this.isGrounded = body.blocked.down || body.touching.down;
    
    // Wall detection with inset for reliability
    const touchingLeft = body.blocked.left || body.touching.left;
    const touchingRight = body.blocked.right || body.touching.right;
    this.isTouchingWall = touchingLeft || touchingRight;
    
    if (touchingLeft) this.wallDirection = -1;
    else if (touchingRight) this.wallDirection = 1;
    
    // Check if input is toward wall
    const horizontal = inputManager.getHorizontal();
    this.inputTowardWall = this.isTouchingWall && (
      (this.wallDirection === -1 && horizontal < 0) ||
      (this.wallDirection === 1 && horizontal > 0)
    );
    
    // Landing events
    if (!this.wasGrounded && this.isGrounded) {
      this.onLanded();
    }
    
    // Left ground events
    if (this.wasGrounded && !this.isGrounded && this.movementState !== 'dash') {
      this.onLeftGround();
    }
  }

  private onLanded(): void {
    // Reset air dash count
    this.airDashesUsed = 0;
    
    // Process buffered jump immediately
    if (this.jumpBufferTimer > 0) {
      this.executeJump();
    }
    
    // Reset timers
    this.wallJumpLockoutTimer = 0;
    this.hasReleasedJumpSinceGround = !inputManager.isDown('jump');
  }

  private onLeftGround(): void {
    // Start coyote time
    this.coyoteTimer = MOVEMENT_TUNING.coyoteTimeMs;
  }

  private updateTimers(delta: number): void {
    // Decrease all timers
    if (this.coyoteTimer > 0) this.coyoteTimer -= delta;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= delta;
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= delta;
    if (this.dashBufferTimer > 0) this.dashBufferTimer -= delta;
    if (this.wallStickTimer > 0) this.wallStickTimer -= delta;
    if (this.wallJumpLockoutTimer > 0) this.wallJumpLockoutTimer -= delta;
    if (this.dashTimer > 0) this.dashTimer -= delta;
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    
    // Invulnerability timer
    if (this.invulnerable) {
      this.invulnerabilityTime -= delta;
      if (this.invulnerabilityTime <= 0) {
        this.invulnerable = false;
        this.setAlpha(1);
      }
    }
  }

  private processInputBuffers(): void {
    // Jump buffer
    if (inputManager.justPressed('jump')) {
      this.jumpBufferTimer = MOVEMENT_TUNING.jumpBufferMs;
    }
    
    // Dash buffer
    if (inputManager.justPressed('dash')) {
      this.dashBufferTimer = MOVEMENT_TUNING.dashInputBufferMs;
    }
    
    // Track jump hold state for variable jump height
    if (inputManager.justPressed('jump')) {
      this.jumpHeld = true;
    }
    if (inputManager.justReleased('jump')) {
      this.jumpHeld = false;
      this.hasReleasedJumpSinceGround = true;
    }
  }

  private updateMovementState(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    switch (this.movementState) {
      case 'grounded':
        // Transition to airborne if not on ground
        if (!this.isGrounded && this.coyoteTimer <= 0) {
          this.movementState = 'airborne';
        }
        // Check for dash
        if (this.canDash()) {
          this.executeDash();
        }
        // Check for jump
        else if (this.canJump()) {
          this.executeJump();
        }
        break;
        
      case 'airborne':
        // Transition to grounded if on ground
        if (this.isGrounded) {
          this.movementState = 'grounded';
        }
        // Transition to wall slide
        else if (this.canWallSlide()) {
          this.movementState = 'wallSlide';
          this.wallStickTimer = MOVEMENT_TUNING.wallStickTimeMs;
        }
        // Check for dash
        if (this.canDash()) {
          this.executeDash();
        }
        // Check for coyote jump
        else if (this.canJump() && this.coyoteTimer > 0) {
          this.executeJump();
        }
        // Variable jump height - cut velocity if released early
        if (!this.jumpHeld && body.velocity.y < 0) {
          body.velocity.y *= MOVEMENT_TUNING.jumpCutMultiplier;
        }
        break;
        
      case 'wallSlide':
        // Transition to grounded
        if (this.isGrounded) {
          this.movementState = 'grounded';
        }
        // Transition to airborne if no longer touching wall or input released
        else if (!this.isTouchingWall) {
          this.movementState = 'airborne';
        }
        else if (MOVEMENT_TUNING.requireInputTowardWall && !this.inputTowardWall) {
          // Wall stick grace period
          if (this.wallStickTimer <= 0) {
            this.movementState = 'airborne';
          }
        }
        // Check for wall jump
        if (this.jumpBufferTimer > 0 || inputManager.justPressed('jump')) {
          this.executeWallJump();
        }
        // Check for dash
        else if (this.canDash()) {
          this.executeDash();
        }
        break;
        
      case 'dash':
        // Dash duration check
        if (this.dashTimer <= 0) {
          this.endDash();
        }
        break;
        
      case 'hitstun':
        // Stub - transition back to appropriate state when knockback ends
        break;
    }
  }

  private canJump(): boolean {
    // Need to have released jump since landing to prevent bunny hopping with held jump
    if (!this.hasReleasedJumpSinceGround && this.isGrounded) {
      return false;
    }
    
    const wantsJump = this.jumpBufferTimer > 0 || inputManager.justPressed('jump');
    const canGroundJump = this.isGrounded || this.coyoteTimer > 0;
    
    return wantsJump && canGroundJump && this.movementState !== 'dash';
  }

  private canWallSlide(): boolean {
    if (this.wallJumpLockoutTimer > 0) return false;
    if (!this.isTouchingWall) return false;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y <= 0) return false; // Only slide when falling
    
    if (MOVEMENT_TUNING.requireInputTowardWall) {
      return this.inputTowardWall || this.wallStickTimer > 0;
    }
    
    return true;
  }

  private canDash(): boolean {
    const wantsDash = this.dashBufferTimer > 0 || inputManager.justPressed('dash');
    const offCooldown = this.dashCooldownTimer <= 0;
    const notDashing = this.movementState !== 'dash';
    
    // Check air dash limit
    const airDashOk = this.isGrounded || 
      MOVEMENT_TUNING.airDashLimit === 0 || 
      this.airDashesUsed < MOVEMENT_TUNING.airDashLimit;
    
    return wantsDash && offCooldown && notDashing && airDashOk;
  }

  private executeJump(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-MOVEMENT_TUNING.jumpVelocity);
    
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
    this.jumpHeld = true;
    this.hasReleasedJumpSinceGround = false;
    this.movementState = 'airborne';
  }

  private executeWallJump(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Jump away from wall
    const awayDir = -this.wallDirection;
    body.setVelocity(
      awayDir * MOVEMENT_TUNING.wallJumpXVelocity,
      -MOVEMENT_TUNING.wallJumpYVelocity
    );
    
    // Update facing
    this.facing = awayDir as 1 | -1;
    this.setFlipX(awayDir < 0);
    
    // Start lockout timer to prevent immediate re-attach
    this.wallJumpLockoutTimer = MOVEMENT_TUNING.wallJumpLockoutMs;
    
    this.jumpBufferTimer = 0;
    this.jumpHeld = true;
    this.movementState = 'airborne';
  }

  private executeDash(): void {
    const horizontal = inputManager.getHorizontal();
    
    // Use input direction if available, otherwise use facing
    this.dashDirection = horizontal !== 0 ? (horizontal as 1 | -1) : this.facing;
    
    this.dashTimer = MOVEMENT_TUNING.dashDurationMs;
    this.dashCooldownTimer = MOVEMENT_TUNING.dashCooldownMs * gameState.getCharmModifier('dashCooldownMod');
    this.dashBufferTimer = 0;
    
    if (!this.isGrounded) {
      this.airDashesUsed++;
    }
    
    // Visual feedback
    this.setAlpha(0.7);
    
    // Invulnerability during dash
    if (MOVEMENT_TUNING.dashInvulnerable) {
      this.setInvulnerable(MOVEMENT_TUNING.dashDurationMs);
    }
    
    this.movementState = 'dash';
  }

  private endDash(): void {
    this.setAlpha(1);
    
    // Determine next state
    if (this.isGrounded) {
      this.movementState = 'grounded';
    } else {
      this.movementState = 'airborne';
    }
  }

  private applyMovement(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const horizontal = inputManager.getHorizontal();
    const tuning = MOVEMENT_TUNING;
    
    switch (this.movementState) {
      case 'grounded':
        this.applyGroundMovement(body, horizontal, delta);
        break;
        
      case 'airborne':
        this.applyAirMovement(body, horizontal, delta);
        break;
        
      case 'wallSlide':
        this.applyWallSlideMovement(body, horizontal);
        break;
        
      case 'dash':
        this.applyDashMovement(body);
        break;
        
      case 'hitstun':
        // No player control during hitstun
        break;
    }
    
    // Update facing based on velocity (not during wall slide or dash)
    if (this.movementState !== 'wallSlide' && this.movementState !== 'dash') {
      if (horizontal !== 0) {
        this.facing = horizontal as 1 | -1;
        this.setFlipX(horizontal < 0);
      }
    }
  }

  private applyGroundMovement(body: Phaser.Physics.Arcade.Body, horizontal: number, delta: number): void {
    const tuning = MOVEMENT_TUNING;
    const targetVelX = horizontal * tuning.maxRunSpeed;
    const currentVelX = body.velocity.x;
    
    if (horizontal !== 0) {
      // Accelerating
      const accel = tuning.runAcceleration * (delta / 1000);
      if (Math.abs(targetVelX - currentVelX) < accel) {
        body.setVelocityX(targetVelX);
      } else {
        body.setVelocityX(currentVelX + Math.sign(targetVelX - currentVelX) * accel);
      }
    } else {
      // Decelerating
      const decel = tuning.runDeceleration * (delta / 1000);
      if (Math.abs(currentVelX) < decel) {
        body.setVelocityX(0);
      } else {
        body.setVelocityX(currentVelX - Math.sign(currentVelX) * decel);
      }
    }
  }

  private applyAirMovement(body: Phaser.Physics.Arcade.Body, horizontal: number, delta: number): void {
    const tuning = MOVEMENT_TUNING;
    const targetVelX = horizontal * tuning.maxRunSpeed;
    const currentVelX = body.velocity.x;
    
    if (horizontal !== 0) {
      // Air acceleration (reduced)
      const accel = tuning.runAcceleration * tuning.airAccelerationFactor * (delta / 1000);
      if (Math.abs(targetVelX - currentVelX) < accel) {
        body.setVelocityX(targetVelX);
      } else {
        body.setVelocityX(currentVelX + Math.sign(targetVelX - currentVelX) * accel);
      }
    } else {
      // Air deceleration (reduced)
      const decel = tuning.runDeceleration * tuning.airDecelerationFactor * (delta / 1000);
      if (Math.abs(currentVelX) < decel) {
        body.setVelocityX(0);
      } else {
        body.setVelocityX(currentVelX - Math.sign(currentVelX) * decel);
      }
    }
    
    // Ensure gravity is applied (Phaser handles this, but we enforce max fall)
    if (body.velocity.y > tuning.maxFallSpeed) {
      body.setVelocityY(tuning.maxFallSpeed);
    }
  }

  private applyWallSlideMovement(body: Phaser.Physics.Arcade.Body, horizontal: number): void {
    const tuning = MOVEMENT_TUNING;
    
    // Clamp fall speed
    if (body.velocity.y > tuning.wallSlideMaxFallSpeed) {
      body.setVelocityY(tuning.wallSlideMaxFallSpeed);
    }
    
    // Allow slight horizontal movement away from wall
    if (horizontal !== 0 && horizontal !== this.wallDirection) {
      body.setVelocityX(horizontal * tuning.maxRunSpeed * 0.3);
    } else {
      body.setVelocityX(0);
    }
  }

  private applyDashMovement(body: Phaser.Physics.Arcade.Body): void {
    const tuning = MOVEMENT_TUNING;
    
    // Fixed dash velocity
    body.setVelocityX(this.dashDirection * tuning.dashSpeed);
    
    // Cancel/reduce gravity during dash
    body.setVelocityY(body.velocity.y * tuning.dashGravityFactor);
  }

  // Attack system - improved with proper hitbox timing and one-hit-per-swing
  private handleAttack(delta: number): void {
    // Update cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
    
    // Handle active attack
    if (this.isAttacking) {
      // Update hitbox position to follow player
      if (this.attackHitbox) {
        const offsetX = this.facing * COMBAT_TUNING.hitboxOffsetX;
        this.attackHitbox.x = this.x + offsetX - COMBAT_TUNING.hitboxWidth / 2;
        this.attackHitbox.y = this.y - COMBAT_TUNING.hitboxHeight / 2;
      }
      
      // Update slash sprite position
      if (this.slashSprite) {
        this.slashSprite.x = this.x + this.facing * COMBAT_TUNING.hitboxOffsetX;
        this.slashSprite.y = this.y;
      }
      
      // Active frame - check for hits
      if (this.attackActiveTimer > 0) {
        this.attackActiveTimer -= delta;
        
        // Check for hits during active frames
        if (this.attackHitbox) {
          this.gameScene.checkAttackHit(this.attackHitbox, this.currentSwingId);
        }
        
        // Fade slash sprite
        if (this.slashSprite) {
          const progress = 1 - (this.attackActiveTimer / COMBAT_TUNING.attackActiveMs);
          this.slashSprite.setAlpha(0.9 - progress * 0.5);
        }
      } else if (this.attackRecoveryTimer > 0) {
        // Recovery frame - no hitbox
        this.attackRecoveryTimer -= delta;
        
        if (this.slashSprite) {
          this.slashSprite.setAlpha(Math.max(0, this.attackRecoveryTimer / COMBAT_TUNING.attackRecoveryMs * 0.4));
        }
      } else {
        // Attack complete
        this.isAttacking = false;
        this.attackHitbox = null;
        this.slashSprite?.destroy();
        this.slashSprite = null;
      }
    }
    
    // Start new attack
    if (inputManager.justPressed('attack') && this.attackCooldown <= 0 && !this.isAttacking) {
      this.startAttack();
    }
  }
  
  private startAttack(): void {
    this.isAttacking = true;
    this.attackActiveTimer = COMBAT_TUNING.attackActiveMs;
    this.attackRecoveryTimer = COMBAT_TUNING.attackRecoveryMs;
    this.attackCooldown = COMBAT_TUNING.attackCooldownMs;
    this.currentSwingId = this.gameScene.getNextSwingId();
    
    // Create hitbox
    const offsetX = this.facing * COMBAT_TUNING.hitboxOffsetX;
    this.attackHitbox = new Phaser.Geom.Rectangle(
      this.x + offsetX - COMBAT_TUNING.hitboxWidth / 2,
      this.y - COMBAT_TUNING.hitboxHeight / 2,
      COMBAT_TUNING.hitboxWidth,
      COMBAT_TUNING.hitboxHeight
    );
    
    // Create slash sprite
    this.slashSprite = this.scene.add.sprite(
      this.x + offsetX, 
      this.y, 
      'slash'
    );
    this.slashSprite.setFlipX(this.facing < 0);
    this.slashSprite.setTint(COLORS.playerOutline);
    this.slashSprite.setDepth(10);
  }
  
  // Get current attack hitbox for debug drawing
  getAttackHitbox(): Phaser.Geom.Rectangle | null {
    return this.isAttacking ? this.attackHitbox : null;
  }
  
  // Focus healing system
  private handleFocus(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Check if player can start or continue focusing
    const canFocus = gameState.canFocusHeal() && 
                     this.isGrounded && 
                     !this.isAttacking &&
                     this.movementState !== 'dash' &&
                     this.movementState !== 'hitstun';
    
    // Start focusing
    if (inputManager.isDown('focus') && canFocus && !this.isFocusing) {
      this.startFocus();
    }
    
    // Continue focusing
    if (this.isFocusing) {
      // Check if should cancel
      if (!inputManager.isDown('focus') || !canFocus) {
        this.cancelFocus();
        return;
      }
      
      // Lock movement during focus
      body.setVelocityX(0);
      
      // Update timer
      this.focusTimer -= delta;
      
      // Update particles
      this.updateFocusParticles();
      
      // Check for heal completion
      if (this.focusTimer <= 0) {
        this.completeFocus();
      }
    }
  }
  
  private startFocus(): void {
    this.isFocusing = true;
    this.focusTimer = this.FOCUS_TIME;
    
    // Emit event for UI
    gameState['emit']('focusStart', null);
    
    // Visual - curl inward
    this.setTint(0xaaccff);
    
    // Create particle group
    this.focusParticles = this.scene.add.group();
  }
  
  private updateFocusParticles(): void {
    if (!this.focusParticles) return;
    
    // Create gathering particles
    if (Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 30;
      const startX = this.x + Math.cos(angle) * dist;
      const startY = this.y + Math.sin(angle) * dist;
      
      const particle = this.scene.add.circle(startX, startY, 3, 0xffffff, 0.8);
      this.focusParticles.add(particle);
      
      // Animate toward player center
      this.scene.tweens.add({
        targets: particle,
        x: this.x,
        y: this.y - 10,
        scale: 0.5,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
    
    // Pulsing glow
    const progress = 1 - (this.focusTimer / this.FOCUS_TIME);
    const tintValue = Math.floor(0xaa + progress * 0x55);
    this.setTint(Phaser.Display.Color.GetColor(tintValue, 0xcc, 0xff));
  }
  
  private cancelFocus(): void {
    this.isFocusing = false;
    this.focusTimer = 0;
    this.clearTint();
    
    // Clear particles
    if (this.focusParticles) {
      this.focusParticles.clear(true, true);
      this.focusParticles = null;
    }
    
    gameState['emit']('focusEnd', null);
  }
  
  private completeFocus(): void {
    // Perform heal
    if (gameState.useSoulForHeal()) {
      // Success - burst effect
      this.createFocusBurst();
    }
    
    // Clean up focus state
    this.isFocusing = false;
    this.focusTimer = 0;
    this.clearTint();
    
    if (this.focusParticles) {
      this.focusParticles.clear(true, true);
      this.focusParticles = null;
    }
    
    gameState['emit']('focusEnd', null);
  }
  
  private createFocusBurst(): void {
    // White burst particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const particle = this.scene.add.circle(this.x, this.y - 10, 5, 0xffffff, 1);
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * 50,
        y: particle.y + Math.sin(angle) * 50,
        scale: 0.2,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
    
    // Central flash
    const flash = this.scene.add.circle(this.x, this.y - 10, 20, 0xffffff, 0.9);
    this.scene.tweens.add({
      targets: flash,
      radius: 50,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
    
    // Small screen shake
    this.scene.cameras.main.shake(100, 0.01);
  }

  private updateVisualState(): void {
    if (this.isAttacking) {
      this.visualState = 'attacking';
    } else if (this.movementState === 'dash') {
      this.visualState = 'dashing';
    } else if (this.movementState === 'wallSlide') {
      this.visualState = 'wallSliding';
    } else if (this.movementState === 'airborne') {
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.visualState = body.velocity.y < 0 ? 'jumping' : 'falling';
    } else if (this.movementState === 'grounded') {
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.visualState = Math.abs(body.velocity.x) > 10 ? 'running' : 'idle';
    } else {
      this.visualState = 'idle';
    }
  }

  private updateDebugState(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    this.debugState = {
      state: this.movementState,
      isGrounded: this.isGrounded,
      isTouchingWall: this.isTouchingWall,
      wallDirection: this.wallDirection,
      velocityX: Math.round(body.velocity.x),
      velocityY: Math.round(body.velocity.y),
      coyoteTimer: Math.round(this.coyoteTimer),
      jumpBufferTimer: Math.round(this.jumpBufferTimer),
      dashCooldown: Math.round(this.dashCooldownTimer),
      dashBufferTimer: Math.round(this.dashBufferTimer),
      wallStickTimer: Math.round(this.wallStickTimer),
      wallJumpLockout: Math.round(this.wallJumpLockoutTimer),
      airDashesUsed: this.airDashesUsed,
      facing: this.facing,
    };
  }

  // Damage handling
  takeDamage(amount: number, fromX: number): void {
    if (this.invulnerable) return;
    
    // Cancel focus if currently focusing
    if (this.isFocusing) {
      this.cancelFocus();
    }
    
    gameState.damage(amount);
    
    const knockbackDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(knockbackDir * PLAYER_CONFIG.knockbackForce, -PLAYER_CONFIG.knockbackForce * 0.5);
    
    this.setTint(0xff4444);
    this.scene.time.delayedCall(100, () => this.clearTint());
    this.setInvulnerable(PLAYER_CONFIG.invulnerabilityDuration);
    
    if (gameState.getPlayerData().hp <= 0) {
      this.gameScene.handlePlayerDeath();
    }
  }

  private setInvulnerable(duration: number): void {
    this.invulnerable = true;
    this.invulnerabilityTime = duration;
  }
  
  /**
   * Set respawn invulnerability with blink effect
   */
  setRespawnInvulnerability(duration: number): void {
    this.invulnerable = true;
    this.invulnerabilityTime = duration;
    
    // Create blink effect during respawn invuln
    const blinkDuration = 80;
    const numBlinks = Math.floor(duration / (blinkDuration * 2));
    
    for (let i = 0; i < numBlinks; i++) {
      this.scene.time.delayedCall(i * blinkDuration * 2, () => {
        if (this.active) this.setAlpha(0.3);
      });
      this.scene.time.delayedCall(i * blinkDuration * 2 + blinkDuration, () => {
        if (this.active) this.setAlpha(1);
      });
    }
    
    // Ensure full alpha at end
    this.scene.time.delayedCall(duration, () => {
      if (this.active) this.setAlpha(1);
    });
  }

  // Public getters
  isInvulnerable(): boolean { return this.invulnerable; }
  getPlayerState(): VisualState { return this.visualState; }
  getMovementState(): MovementState { return this.movementState; }
  getFacing(): 1 | -1 { return this.facing; }
  isOnGround(): boolean { return this.isGrounded; }
  getDebugState(): MovementDebugState { return this.debugState; }
  
  getVelocity(): { x: number; y: number } {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return { x: body.velocity.x, y: body.velocity.y };
  }

  // Wall collision handler (called by GameScene)
  handleWallCollision(wall: Phaser.GameObjects.Rectangle): void {
    this.wallDirection = wall.x < this.x ? -1 : 1;
  }
}
