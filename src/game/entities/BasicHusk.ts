import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * BasicHusk AI States
 * - patrol: Wandering slowly back and forth
 * - windup: Tensing before charge (0.5s)
 * - charge: Rushing at 1.8x player speed
 * - pause: Brief pause after missing charge
 * - hurt: Stunned from damage
 * - dead: Playing death animation
 */
type HuskAIState = 'patrol' | 'windup' | 'charge' | 'pause' | 'hurt' | 'dead';

export class BasicHusk extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: HuskAIState = 'patrol';
  private currentHp: number;
  
  // Movement
  private patrolDir: 1 | -1 = 1;
  private chargeDir: 1 | -1 = 1;
  private turnCooldownTimer = 0;
  
  // AI timers
  private windupTimer = 0;
  private pauseTimer = 0;
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  
  // Charge settings (1.8x player speed = ~270)
  private readonly CHARGE_SPEED = 270;
  private readonly WINDUP_DURATION = 500; // 0.5 seconds
  private readonly PAUSE_DURATION = 400; // Brief pause after miss
  
  // Visual variant (skin A or B)
  private skinVariant: 'A' | 'B';
  
  // Track death
  private isDead = false;
  private lastHitBySwingId = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    // Randomly choose skin variant
    const variant = Math.random() > 0.5 ? 'A' : 'B';
    super(scene, x, y, `basicHusk${variant}`);
    
    this.skinVariant = variant;
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);
    
    // Husks have more weight - set mass higher
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMass(2.5); // Heavier than normal enemies
    
    // Randomize patrol direction
    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.setFlipX(this.patrolDir < 0);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;
    
    this.updateTimers(delta);
    this.updateAIState(player);
    this.applyMovement(player);
    this.updateVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.turnCooldownTimer > 0) this.turnCooldownTimer -= delta;
    if (this.windupTimer > 0) this.windupTimer -= delta;
    if (this.pauseTimer > 0) this.pauseTimer -= delta;
  }

  private updateAIState(player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Can't change state during hitstun
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        // Exit hitstun - go back to patrol
        this.aiState = 'patrol';
      }
      return;
    }
    
    if (this.aiState === 'dead') return;
    
    // Handle pause state after charge miss
    if (this.aiState === 'pause') {
      if (this.pauseTimer <= 0) {
        this.aiState = 'patrol';
      }
      return;
    }
    
    // Handle windup state
    if (this.aiState === 'windup') {
      if (this.windupTimer <= 0) {
        // Start charging in the direction of the player
        this.chargeDir = player.x > this.x ? 1 : -1;
        this.aiState = 'charge';
        this.setFlipX(this.chargeDir < 0);
      }
      return;
    }
    
    // Handle charge state - stop on wall collision
    if (this.aiState === 'charge') {
      if ((this.chargeDir === -1 && body.blocked.left) || 
          (this.chargeDir === 1 && body.blocked.right)) {
        // Hit a wall - enter pause state
        this.aiState = 'pause';
        this.pauseTimer = this.PAUSE_DURATION;
      }
      return;
    }
    
    // Patrol state - check for player detection
    if (this.aiState === 'patrol') {
      if (this.canSeePlayer(player)) {
        // Start windup - the shriek/tensing animation
        this.aiState = 'windup';
        this.windupTimer = this.WINDUP_DURATION;
        // Face the player during windup
        this.setFlipX(player.x < this.x);
      }
    }
  }

  /**
   * Detection raycast - only aggro if player is on same horizontal plane
   */
  private canSeePlayer(player: Player): boolean {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    
    // Check if within aggro range
    if (dist > this.cfg.aggroRangePx) return false;
    
    // Check if on same horizontal plane (vertical difference < 40 pixels)
    const verticalDiff = Math.abs(this.y - player.y);
    if (verticalDiff > 40) return false;
    
    // Player is in range and on same level
    return true;
  }

  private applyMovement(player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    switch (this.aiState) {
      case 'patrol':
        this.applyPatrolMovement(body);
        break;
        
      case 'windup':
        // Stop during windup (tensing animation)
        body.setVelocityX(0);
        break;
        
      case 'charge':
        // Rush at 1.8x player speed
        body.setVelocityX(this.chargeDir * this.CHARGE_SPEED);
        break;
        
      case 'pause':
        body.setVelocityX(0);
        break;
        
      case 'hurt':
        // Knockback already applied, reduced due to weight
        break;
        
      case 'dead':
        body.setVelocityX(0);
        break;
    }
  }

  private applyPatrolMovement(body: Phaser.Physics.Arcade.Body): void {
    // Wall detection
    if (body.blocked.left) {
      this.patrolDir = 1;
      this.turnCooldownTimer = 300;
    } else if (body.blocked.right) {
      this.patrolDir = -1;
      this.turnCooldownTimer = 300;
    }
    
    // Edge detection
    if (body.blocked.down && this.turnCooldownTimer <= 0) {
      const checkX = this.x + this.patrolDir * (this.cfg.width / 2 + 12);
      const checkY = this.y + this.cfg.height / 2 + 10;
      
      const groundBelow = this.scene.physics.overlapRect(
        checkX - 2, checkY, 4, 20, true, false
      );
      
      if (groundBelow.length === 0) {
        this.patrolDir = -this.patrolDir as 1 | -1;
        this.turnCooldownTimer = 300;
      }
    }
    
    body.setVelocityX(this.patrolDir * this.cfg.moveSpeedPatrol);
    this.setFlipX(this.patrolDir < 0);
  }

  private updateVisuals(): void {
    // Hurt flash
    if (this.hurtFlashTimer > 0) {
      this.setTexture(`basicHusk${this.skinVariant}_hurt`);
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setTexture(`basicHusk${this.skinVariant}`);
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      this.setTexture(`basicHusk${this.skinVariant}`);
      this.clearTint();
      this.setAlpha(1);
    }
    
    // Visual feedback during windup - shake slightly
    if (this.aiState === 'windup') {
      const shake = Math.sin(Date.now() * 0.05) * 2;
      this.setX(this.x + shake * 0.1);
      this.setTint(0xffdddd); // Slight red tint during windup
    }
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    
    this.lastHitBySwingId = swingId;
    
    // Check if charging before changing state (for knockback reduction)
    const wasCharging = this.aiState === 'charge';
    
    this.currentHp -= amount;
    this.aiState = 'hurt';
    this.hitstunTimer = this.cfg.hitstunMs;
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;
    
    // Reduced knockback during charge (more weight)
    const knockMultiplier = wasCharging ? 0.3 : 0.6;
    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x * knockMultiplier,
      -this.cfg.knockbackOnHit.y * knockMultiplier
    );
    
    if (this.currentHp <= 0) {
      this.die();
    }
    
    return true;
  }

  private die(): void {
    if (this.isDead) return;
    
    this.isDead = true;
    this.aiState = 'dead';
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    
    // Drop shells
    const dropCount = Phaser.Math.Between(
      this.cfg.dropShells.min,
      this.cfg.dropShells.max
    );
    
    for (let i = 0; i < dropCount; i++) {
      const offsetX = Phaser.Math.Between(-20, 20);
      const offsetY = Phaser.Math.Between(-10, 10);
      
      const pickup = new Pickup(
        this.scene, 
        this.x + offsetX, 
        this.y + offsetY, 
        'shells', 
        1
      );
      
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) {
        gameScene.getPickupsGroup().add(pickup);
      }
      
      const pickupBody = pickup.body as Phaser.Physics.Arcade.Body;
      if (pickupBody) {
        pickupBody.setVelocity(
          Phaser.Math.Between(-60, 60),
          Phaser.Math.Between(-120, -60)
        );
        this.scene.time.delayedCall(200, () => {
          if (pickup.active && pickupBody) {
            pickupBody.setVelocity(0, 0);
            pickupBody.moves = false;
          }
        });
      }
    }
    
    // Death animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 0.6,
      duration: 250,
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
  
  getAIState(): HuskAIState {
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
