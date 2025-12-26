import Phaser from 'phaser';
import { COMBAT_TUNING, EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import gameState from '../core/GameState';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Enemy AI States
 * - patrol: Moving back and forth on platforms
 * - aggro: Chasing the player
 * - hurt: Stunned from taking damage
 * - dead: Playing death animation
 */
type EnemyAIState = 'patrol' | 'aggro' | 'hurt' | 'dead';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: EnemyAIState = 'patrol';
  private currentHp: number;
  
  // Movement
  private patrolDir: 1 | -1 = 1;
  private turnCooldownTimer = 0;
  
  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  
  // Track if already dead to prevent double-death
  private isDead = false;
  
  // Hit tracking for one-hit-per-swing
  private lastHitBySwingId = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'spikyGrub');
    
    // Apply config with fallback
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);
    
    // Randomize initial patrol direction
    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.setFlipX(this.patrolDir < 0);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;
    
    // Update timers
    this.updateTimers(delta);
    
    // Run AI state machine
    this.updateAIState(player);
    
    // Apply movement based on state
    this.applyMovement(player);
    
    // Update visuals
    this.updateVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.turnCooldownTimer > 0) this.turnCooldownTimer -= delta;
  }

  private updateAIState(player: Player): void {
    // Can't change state while in hitstun
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        // Exit hitstun - decide next state based on player distance
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        this.aiState = dist < this.cfg.aggroRangePx ? 'aggro' : 'patrol';
      }
      return;
    }
    
    if (this.aiState === 'dead') return;
    
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    
    // Check aggro/deaggro
    if (this.aiState === 'patrol' && dist < this.cfg.aggroRangePx) {
      this.aiState = 'aggro';
    } else if (this.aiState === 'aggro' && dist > this.cfg.deaggroRangePx) {
      this.aiState = 'patrol';
    }
  }

  private applyMovement(player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    switch (this.aiState) {
      case 'patrol':
        this.applyPatrolMovement(body);
        break;
        
      case 'aggro':
        this.applyAggroMovement(body, player);
        break;
        
      case 'hurt':
        // No movement during hitstun - knockback already applied
        break;
        
      case 'dead':
        body.setVelocityX(0);
        break;
    }
  }

  private applyPatrolMovement(body: Phaser.Physics.Arcade.Body): void {
    // Check for walls
    if (body.blocked.left) {
      this.patrolDir = 1;
      this.turnCooldownTimer = COMBAT_TUNING.turnCooldownMs;
    } else if (body.blocked.right) {
      this.patrolDir = -1;
      this.turnCooldownTimer = COMBAT_TUNING.turnCooldownMs;
    }
    
    // Edge detection - raycast ahead to check for platform edges
    if (body.blocked.down && this.turnCooldownTimer <= 0) {
      const checkX = this.x + this.patrolDir * (this.cfg.width / 2 + COMBAT_TUNING.edgeCheckDistance);
      const checkY = this.y + this.cfg.height / 2 + 10;
      
      // Simple ground check - look for any platform below the check point
      const groundBelow = this.scene.physics.overlapRect(
        checkX - 2, checkY, 4, 20, true, false
      );
      
      if (groundBelow.length === 0) {
        // No ground ahead - turn around
        this.patrolDir = -this.patrolDir as 1 | -1;
        this.turnCooldownTimer = COMBAT_TUNING.turnCooldownMs;
      }
    }
    
    body.setVelocityX(this.patrolDir * this.cfg.moveSpeedPatrol);
    this.setFlipX(this.patrolDir < 0);
  }

  private applyAggroMovement(body: Phaser.Physics.Arcade.Body, player: Player): void {
    const dir = player.x > this.x ? 1 : -1;
    
    // Still check for walls
    if ((dir === -1 && body.blocked.left) || (dir === 1 && body.blocked.right)) {
      body.setVelocityX(0);
    } else {
      body.setVelocityX(dir * this.cfg.moveSpeedAggro);
    }
    
    this.setFlipX(dir < 0);
  }

  private updateVisuals(): void {
    // Hurt flash - show white/red tint during hurt flash
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      // Flicker during invuln
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      this.clearTint();
      this.setAlpha(1);
    }
  }

  /**
   * Take damage from player attack
   * @param amount Damage amount
   * @param fromX X position of attacker (for knockback direction)
   * @param swingId Unique ID for this swing to prevent multi-hit
   * @returns true if damage was dealt, false if blocked
   */
  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    
    // Check invulnerability
    if (this.invulnTimer > 0) return false;
    
    // Check if already hit by this swing
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;
    
    // Apply damage
    this.currentHp -= amount;
    
    // Enter hurt state
    this.aiState = 'hurt';
    this.hitstunTimer = this.cfg.hitstunMs;
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;
    
    // Apply knockback
    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x,
      -this.cfg.knockbackOnHit.y
    );
    
    // Check for death
    if (this.currentHp <= 0) {
      this.die();
    }
    
    return true;
  }

  private die(): void {
    if (this.isDead) return;
    
    this.isDead = true;
    this.aiState = 'dead';
    
    // Disable physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    
    // Spawn shell drops
    const dropCount = Phaser.Math.Between(
      this.cfg.dropShells.min,
      this.cfg.dropShells.max
    );
    
    // Spawn shells with slight spread
    for (let i = 0; i < dropCount; i++) {
      const offsetX = Phaser.Math.Between(-20, 20);
      const offsetY = Phaser.Math.Between(-10, 10);
      
      // Create pickup and add to scene's pickup group
      const pickup = new Pickup(
        this.scene, 
        this.x + offsetX, 
        this.y + offsetY, 
        'shells', 
        1
      );
      
      // Add to pickups group if accessible
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) {
        gameScene.getPickupsGroup().add(pickup);
      }
      
      // Give a small pop effect
      const pickupBody = pickup.body as Phaser.Physics.Arcade.Body;
      if (pickupBody) {
        pickupBody.setVelocity(
          Phaser.Math.Between(-60, 60),
          Phaser.Math.Between(-120, -60)
        );
        // Disable gravity and velocity after a short time
        this.scene.time.delayedCall(200, () => {
          if (pickup.active && pickupBody) {
            pickupBody.setVelocity(0, 0);
            pickupBody.moves = false;
          }
        });
      }
    }
    
    // Death animation - pop and fade
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 0.5,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  // Public getters
  getContactDamage(): number { 
    return this.cfg.contactDamage; 
  }
  
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.cfg.width / 2, 
      this.y - this.cfg.height / 2, 
      this.cfg.width, 
      this.cfg.height
    );
  }
  
  isDying(): boolean { 
    return this.isDead; 
  }
  
  getAIState(): EnemyAIState {
    return this.aiState;
  }
  
  getCurrentHp(): number {
    return this.currentHp;
  }
  
  getMaxHp(): number {
    return this.cfg.hp;
  }
  
  isInvulnerable(): boolean {
    return this.invulnTimer > 0;
  }
  
  getDisplayName(): string {
    return this.cfg.displayName;
  }
}
