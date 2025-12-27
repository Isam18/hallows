import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import gameState from '../core/GameState';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Vengefly AI States
 * - hover: Floating at spawn point, idle
 * - aggro: Chasing player through air
 * - returning: Flying back to spawn point
 * - hurt: Stunned from taking damage
 * - dead: Playing death animation
 */
type VengeflyAIState = 'hover' | 'aggro' | 'returning' | 'hurt' | 'dead';

export class Vengefly extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: VengeflyAIState = 'hover';
  private currentHp: number;
  
  // Spawn point for return behavior
  private spawnX: number;
  private spawnY: number;
  
  // Hover animation
  private hoverOffset = 0;
  private hoverTime = 0;
  
  // Wing flap animation
  private flapTime = 0;
  
  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  
  // Aggro shriek tracking
  private hasShrieked = false;
  private shriekCooldown = 0;
  
  // Track if already dead to prevent double-death
  private isDead = false;
  
  // Hit tracking for one-hit-per-swing
  private lastHitBySwingId = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'vengefly');
    
    // Store spawn position for return behavior
    this.spawnX = x;
    this.spawnY = y;
    
    // Apply config with fallback
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // FLYING ENEMY: Disable gravity
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    
    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);
    
    // Random hover phase offset
    this.hoverTime = Math.random() * Math.PI * 2;
    this.flapTime = Math.random() * Math.PI * 2;
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;
    
    // Update timers
    this.updateTimers(delta);
    
    // Update hover/flap animation
    this.updateHoverAnimation(delta);
    
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
    if (this.shriekCooldown > 0) this.shriekCooldown -= delta;
  }

  private updateHoverAnimation(delta: number): void {
    // Smooth sine wave hover
    this.hoverTime += delta * 0.003;
    this.hoverOffset = Math.sin(this.hoverTime) * 8;
    
    // Wing flap animation (faster)
    this.flapTime += delta * 0.015;
    const flapScale = 0.9 + Math.sin(this.flapTime) * 0.1;
    this.setScale(1, flapScale);
  }

  private updateAIState(player: Player): void {
    // Can't change state while in hitstun
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        // Exit hitstun - decide next state based on player distance
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (dist < this.cfg.aggroRangePx) {
          this.aiState = 'aggro';
        } else {
          this.aiState = 'returning';
        }
      }
      return;
    }
    
    if (this.aiState === 'dead') return;
    
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const distToSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    
    // State transitions
    if (this.aiState === 'hover') {
      // Check aggro - player enters range
      if (distToPlayer < this.cfg.aggroRangePx) {
        this.aiState = 'aggro';
        this.triggerShriek();
      }
    } else if (this.aiState === 'aggro') {
      // Check deaggro - player too far away
      if (distToPlayer > this.cfg.deaggroRangePx) {
        this.aiState = 'returning';
        this.hasShrieked = false; // Reset shriek for next aggro
      }
    } else if (this.aiState === 'returning') {
      // Check if back at spawn
      if (distToSpawn < 10) {
        this.aiState = 'hover';
      }
      // Re-aggro if player gets close while returning
      if (distToPlayer < this.cfg.aggroRangePx) {
        this.aiState = 'aggro';
        this.triggerShriek();
      }
    }
  }

  private triggerShriek(): void {
    if (this.hasShrieked || this.shriekCooldown > 0) return;
    
    this.hasShrieked = true;
    this.shriekCooldown = 2000; // 2 second cooldown
    
    // Visual shriek effect - camera shake
    this.scene.cameras.main.shake(150, 0.01);
    
    // Flash the vengefly briefly
    this.setTint(0xff6600);
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) {
        this.clearTint();
      }
    });
    
    // Create shriek visual effect - expanding ring
    const shriekRing = this.scene.add.circle(this.x, this.y, 10, 0xff6600, 0.5);
    this.scene.tweens.add({
      targets: shriekRing,
      radius: 60,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => shriekRing.destroy()
    });
  }

  private applyMovement(player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    switch (this.aiState) {
      case 'hover':
        this.applyHoverMovement(body);
        break;
        
      case 'aggro':
        this.applyAggroMovement(body, player);
        break;
        
      case 'returning':
        this.applyReturnMovement(body);
        break;
        
      case 'hurt':
        // Reduced movement during hitstun
        body.setVelocity(body.velocity.x * 0.95, body.velocity.y * 0.95);
        break;
        
      case 'dead':
        body.setVelocity(0, 0);
        break;
    }
  }

  private applyHoverMovement(body: Phaser.Physics.Arcade.Body): void {
    // Gentle hover at spawn point with vertical bob
    const targetY = this.spawnY + this.hoverOffset;
    const diffY = targetY - this.y;
    
    // Drift back to spawn X slowly
    const diffX = this.spawnX - this.x;
    
    body.setVelocity(
      diffX * 0.5,
      diffY * 2
    );
  }

  private applyAggroMovement(body: Phaser.Physics.Arcade.Body, player: Player): void {
    // Fly directly toward player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = this.cfg.moveSpeedAggro;
    
    body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    
    // Face player
    this.setFlipX(player.x < this.x);
  }

  private applyReturnMovement(body: Phaser.Physics.Arcade.Body): void {
    // Fly back to spawn point
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.spawnX, this.spawnY);
    const speed = this.cfg.moveSpeedPatrol;
    
    body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    
    // Face direction of travel
    this.setFlipX(this.spawnX < this.x);
  }

  private updateVisuals(): void {
    // Hurt flash - show white tint during hurt flash
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
    
    // Apply knockback (reduced for flying enemy)
    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x * 0.7,
      -this.cfg.knockbackOnHit.y * 0.5
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
    
    // Create death particles - orange infection puff
    this.createDeathParticles();
    
    // Spawn shell drops
    const dropCount = Phaser.Math.Between(
      this.cfg.dropShells.min,
      this.cfg.dropShells.max
    );
    
    // Spawn shells with slight spread
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

  private createDeathParticles(): void {
    // Create 8-12 small particles in orange/white colors
    const particleCount = Phaser.Math.Between(8, 12);
    
    for (let i = 0; i < particleCount; i++) {
      // Alternate colors for variety
      const color = i % 2 === 0 ? 0xffffff : 0xaaaaaa;
      
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-8, 8),
        this.y + Phaser.Math.Between(-8, 8),
        Phaser.Math.Between(2, 5),
        color,
        1
      );
      
      // Animate particle outward and fade
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = Phaser.Math.Between(30, 60);
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
    
    // Central flash
    const flash = this.scene.add.circle(this.x, this.y, 20, 0xffffff, 0.8);
    this.scene.tweens.add({
      targets: flash,
      radius: 40,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => flash.destroy()
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
  
  getAIState(): VengeflyAIState {
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
