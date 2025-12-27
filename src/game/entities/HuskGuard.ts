import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import gameState from '../core/GameState';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Husk Guard AI States
 * - idle: Standing still, waiting for player
 * - patrol: Slow patrol movement
 * - aggro: Chasing the player
 * - windup: Preparing overhead smash attack
 * - attack: Executing overhead smash
 * - recovery: Cooling down after attack
 * - hurt: Stunned from taking damage
 * - dead: Playing death animation
 */
type HuskGuardAIState = 'idle' | 'patrol' | 'aggro' | 'windup' | 'attack' | 'recovery' | 'hurt' | 'dead';

export class HuskGuard extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: HuskGuardAIState = 'patrol';
  private currentHp: number;
  
  // Movement
  private patrolDir: 1 | -1 = 1;
  private turnCooldownTimer = 0;
  
  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  
  // Attack state machine timers
  private windupTimer = 0;
  private attackTimer = 0;
  private recoveryTimer = 0;
  private attackCooldown = 0;
  
  // Attack configuration (mini-boss tier)
  private readonly WINDUP_TIME = 600;  // Slow, telegraphed windup
  private readonly ATTACK_TIME = 150;  // Fast smash
  private readonly RECOVERY_TIME = 800; // Long recovery window
  private readonly ATTACK_COOLDOWN = 1500;
  private readonly ATTACK_RANGE = 60;   // Close range attack
  private readonly ATTACK_DAMAGE = 2;   // Double damage
  
  // Track if already dead
  private isDead = false;
  
  // Hit tracking
  private lastHitBySwingId = -1;
  
  // Attack hitbox
  private attackHitbox: Phaser.Geom.Rectangle | null = null;
  private hasDealtDamageThisAttack = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'huskGuard');
    
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Larger collision body for 2x size enemy
    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);
    
    // Heavy enemy - slower
    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.setFlipX(this.patrolDir < 0);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;
    
    this.updateTimers(delta);
    this.updateAIState(player);
    this.applyMovement(player);
    this.updateVisuals();
    this.checkAttackHit(player);
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.turnCooldownTimer > 0) this.turnCooldownTimer -= delta;
    if (this.windupTimer > 0) this.windupTimer -= delta;
    if (this.attackTimer > 0) this.attackTimer -= delta;
    if (this.recoveryTimer > 0) this.recoveryTimer -= delta;
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
  }

  private updateAIState(player: Player): void {
    // Can't change state while in hurt
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        this.aiState = dist < this.cfg.aggroRangePx ? 'aggro' : 'patrol';
      }
      return;
    }
    
    if (this.aiState === 'dead') return;
    
    // Attack state machine
    if (this.aiState === 'windup') {
      if (this.windupTimer <= 0) {
        this.aiState = 'attack';
        this.attackTimer = this.ATTACK_TIME;
        this.hasDealtDamageThisAttack = false;
        this.createAttackHitbox();
        // Screen shake on attack
        this.scene.cameras.main.shake(150, 0.01);
      }
      return;
    }
    
    if (this.aiState === 'attack') {
      if (this.attackTimer <= 0) {
        this.aiState = 'recovery';
        this.recoveryTimer = this.RECOVERY_TIME;
        this.attackHitbox = null;
      }
      return;
    }
    
    if (this.aiState === 'recovery') {
      if (this.recoveryTimer <= 0) {
        this.aiState = 'aggro';
        this.attackCooldown = this.ATTACK_COOLDOWN;
      }
      return;
    }
    
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    
    // Check for attack range
    if (this.aiState === 'aggro' && dist < this.ATTACK_RANGE && this.attackCooldown <= 0) {
      this.startAttack();
      return;
    }
    
    // Aggro/deaggro
    if (this.aiState === 'patrol' && dist < this.cfg.aggroRangePx) {
      this.aiState = 'aggro';
    } else if (this.aiState === 'aggro' && dist > this.cfg.deaggroRangePx) {
      this.aiState = 'patrol';
    }
  }

  private startAttack(): void {
    this.aiState = 'windup';
    this.windupTimer = this.WINDUP_TIME;
    
    // Visual telegraph - raise up slightly
    this.scene.tweens.add({
      targets: this,
      y: this.y - 10,
      duration: this.WINDUP_TIME * 0.8,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  private createAttackHitbox(): void {
    const offsetX = this.flipX ? -40 : 40;
    this.attackHitbox = new Phaser.Geom.Rectangle(
      this.x + offsetX - 35,
      this.y - 20,
      70,
      60
    );
  }

  private checkAttackHit(player: Player): void {
    if (this.aiState !== 'attack' || !this.attackHitbox || this.hasDealtDamageThisAttack) return;
    
    const playerBounds = player.getBounds();
    if (Phaser.Geom.Rectangle.Overlaps(this.attackHitbox, playerBounds)) {
      if (!player.isInvulnerable()) {
        player.takeDamage(this.ATTACK_DAMAGE, this.x);
        this.hasDealtDamageThisAttack = true;
        
        // Stronger screen shake on hit
        this.scene.cameras.main.shake(200, 0.02);
      }
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
        
      case 'windup':
      case 'attack':
      case 'recovery':
      case 'hurt':
        body.setVelocityX(0);
        break;
        
      case 'dead':
        body.setVelocityX(0);
        break;
    }
  }

  private applyPatrolMovement(body: Phaser.Physics.Arcade.Body): void {
    // Slow, heavy patrol
    if (body.blocked.left) {
      this.patrolDir = 1;
      this.turnCooldownTimer = 500;
    } else if (body.blocked.right) {
      this.patrolDir = -1;
      this.turnCooldownTimer = 500;
    }
    
    // Edge detection
    if (body.blocked.down && this.turnCooldownTimer <= 0) {
      const checkX = this.x + this.patrolDir * (this.cfg.width / 2 + 20);
      const checkY = this.y + this.cfg.height / 2 + 10;
      
      const groundBelow = this.scene.physics.overlapRect(
        checkX - 2, checkY, 4, 20, true, false
      );
      
      if (groundBelow.length === 0) {
        this.patrolDir = -this.patrolDir as 1 | -1;
        this.turnCooldownTimer = 500;
      }
    }
    
    body.setVelocityX(this.patrolDir * this.cfg.moveSpeedPatrol);
    this.setFlipX(this.patrolDir < 0);
  }

  private applyAggroMovement(body: Phaser.Physics.Arcade.Body, player: Player): void {
    const dir = player.x > this.x ? 1 : -1;
    
    if ((dir === -1 && body.blocked.left) || (dir === 1 && body.blocked.right)) {
      body.setVelocityX(0);
    } else {
      body.setVelocityX(dir * this.cfg.moveSpeedAggro);
    }
    
    this.setFlipX(dir < 0);
  }

  private updateVisuals(): void {
    // Hurt flash
    if (this.hurtFlashTimer > 0) {
      this.setTexture('huskGuard_hurt');
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
      this.setTexture('huskGuard');
    } else {
      this.setTexture('huskGuard');
      this.setAlpha(1);
    }
    
    // Attack visual feedback
    if (this.aiState === 'windup') {
      this.setTint(0xffaaaa);
    } else if (this.aiState === 'attack') {
      this.setTint(0xff6666);
    } else {
      this.clearTint();
    }
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;
    
    this.currentHp -= amount;
    
    this.aiState = 'hurt';
    this.hitstunTimer = this.cfg.hitstunMs * 0.5; // Reduced hitstun - resistant
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;
    
    // Minimal knockback - highly resistant
    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x * 0.2, // 20% knockback
      -this.cfg.knockbackOnHit.y * 0.2
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
    
    // Large geo burst for mini-boss
    const dropCount = Phaser.Math.Between(
      this.cfg.dropShells.min,
      this.cfg.dropShells.max
    );
    
    for (let i = 0; i < dropCount; i++) {
      const offsetX = Phaser.Math.Between(-40, 40);
      const offsetY = Phaser.Math.Between(-20, 20);
      
      const pickup = new Pickup(
        this.scene, 
        this.x + offsetX, 
        this.y + offsetY, 
        'shells', 
        2 // Worth more geo per shell
      );
      
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) {
        gameScene.getPickupsGroup().add(pickup);
      }
      
      const pickupBody = pickup.body as Phaser.Physics.Arcade.Body;
      if (pickupBody) {
        pickupBody.setVelocity(
          Phaser.Math.Between(-100, 100),
          Phaser.Math.Between(-180, -80)
        );
        this.scene.time.delayedCall(300, () => {
          if (pickup.active && pickupBody) {
            pickupBody.setVelocity(0, 0);
            pickupBody.moves = false;
          }
        });
      }
    }
    
    // Screen shake on death
    this.scene.cameras.main.shake(300, 0.015);
    
    // Death animation - heavy thud
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 0.4,
      y: this.y + 20,
      duration: 400,
      ease: 'Bounce.easeOut',
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
  
  getAIState(): HuskGuardAIState {
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
