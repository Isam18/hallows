import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Mosskin AI States
 * - patrol: Wandering slowly back and forth
 * - windup: Tensing/shaking before charge (1.2s)
 * - charge: Rushing at 1.8x player speed
 * - pause: Brief pause after missing charge
 * - hurt: Stunned from damage
 * - dead: Playing death animation
 */
type MosskinAIState = 'patrol' | 'windup' | 'charge' | 'pause' | 'hurt' | 'dead';

export class Mosskin extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: MosskinAIState = 'patrol';
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
  private readonly WINDUP_DURATION = 1200; // 1.2 seconds windup (as specified)
  private readonly PAUSE_DURATION = 500;
  
  // Track if we hit the player during charge
  private hitPlayerDuringCharge = false;
  
  // Track death
  private isDead = false;
  private lastHitBySwingId = -1;
  
  // Original position for shake effect
  private originalX = 0;
  
  // Animation
  private bobOffset = 0;
  private bobSpeed = 0.003;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'mosskin');
    
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    this.originalX = x;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Set size based on sprite - fluffy mosskin is roughly 48x56
    this.setSize(36, 40);
    this.setDisplaySize(48, 56);
    this.setCollideWorldBounds(true);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMass(2.0);
    body.setOffset(6, 8);
    
    // Randomize patrol direction
    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.setFlipX(this.patrolDir < 0);
    
    // Random bob phase
    this.bobOffset = Math.random() * Math.PI * 2;
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
        this.hitPlayerDuringCharge = false;
        this.setFlipX(this.chargeDir < 0);
      }
      return;
    }
    
    // Handle charge state - stop on wall collision OR hitting player
    if (this.aiState === 'charge') {
      if ((this.chargeDir === -1 && body.blocked.left) || 
          (this.chargeDir === 1 && body.blocked.right) ||
          this.hitPlayerDuringCharge) {
        this.aiState = 'pause';
        this.pauseTimer = this.PAUSE_DURATION;
        this.hitPlayerDuringCharge = false;
      }
      return;
    }
    
    // Patrol state - check for player detection
    if (this.aiState === 'patrol') {
      if (this.canSeePlayer(player)) {
        this.aiState = 'windup';
        this.windupTimer = this.WINDUP_DURATION;
        this.originalX = this.x;
        // Face the player during windup
        this.setFlipX(player.x < this.x);
      }
    }
  }

  private canSeePlayer(player: Player): boolean {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    
    if (dist > this.cfg.aggroRangePx) return false;
    
    // Check if on same horizontal plane
    const verticalDiff = Math.abs(this.y - player.y);
    if (verticalDiff > 50) return false;
    
    return true;
  }

  private applyMovement(player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    switch (this.aiState) {
      case 'patrol':
        this.applyPatrolMovement(body);
        break;
        
      case 'windup':
        // Stop and shake during windup
        body.setVelocityX(0);
        break;
        
      case 'charge':
        body.setVelocityX(this.chargeDir * this.CHARGE_SPEED);
        break;
        
      case 'pause':
        body.setVelocityX(0);
        break;
        
      case 'hurt':
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
    // Idle bobbing animation
    this.bobOffset += this.bobSpeed * 16;
    const bobY = Math.sin(this.bobOffset) * 2;
    
    // Hurt flash
    if (this.hurtFlashTimer > 0) {
      this.setTexture('mosskin_hurt');
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setTexture('mosskin');
      this.clearTint();
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      this.setTexture('mosskin');
      this.clearTint();
      this.setAlpha(1);
    }
    
    // Shake during windup - more intense
    if (this.aiState === 'windup') {
      const shake = Math.sin(Date.now() * 0.1) * 4;
      this.setX(this.originalX + shake);
      // Slight red tint during windup to show anger
      this.setTint(0xffcccc);
      // Scale up slightly during windup
      this.setScale(1.05 + Math.sin(Date.now() * 0.02) * 0.05);
    } else if (this.aiState === 'charge') {
      // Squash effect during charge
      this.setScale(1.1, 0.9);
      this.originalX = this.x;
    } else {
      // Normal bob + scale
      this.setScale(1);
      this.y += bobY * 0.1;
      this.originalX = this.x;
    }
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    
    this.lastHitBySwingId = swingId;
    
    const wasCharging = this.aiState === 'charge';
    
    this.currentHp -= amount;
    this.aiState = 'hurt';
    this.hitstunTimer = this.cfg.hitstunMs;
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;
    
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
    
    // Death animation - leaves falling
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 0.7,
      duration: 300,
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
  
  getAIState(): MosskinAIState {
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
  
  onHitPlayer(): void {
    if (this.aiState === 'charge') {
      this.hitPlayerDuringCharge = true;
    }
  }
}
