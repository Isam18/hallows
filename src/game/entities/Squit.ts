import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Squit AI States - Mosquito-like flying enemy with lunge attack
 * - hover: Floating at spawn point, idle
 * - windUp: Pulling back before lunge, emitting buzz
 * - lunge: High-speed dash toward player's last position
 * - recovery: Vulnerable pause after lunge
 * - returning: Flying back to safe distance
 * - hurt: Stunned from taking damage
 * - dead: Playing death animation
 */
type SquitAIState = 'hover' | 'windUp' | 'lunge' | 'recovery' | 'returning' | 'hurt' | 'dead';

export class Squit extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: SquitAIState = 'hover';
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
  
  // Lunge attack
  private windUpTimer = 0;
  private recoveryTimer = 0;
  private lungeCooldown = 0;
  private lungeTargetX = 0;
  private lungeTargetY = 0;
  private readonly WIND_UP_TIME = 400;
  private readonly RECOVERY_TIME = 600;
  private readonly LUNGE_SPEED = 350;
  private readonly LUNGE_COOLDOWN = 1500;
  private readonly SAFE_DISTANCE = 150;
  
  // Track if already dead to prevent double-death
  private isDead = false;
  
  // Hit tracking for one-hit-per-swing
  private lastHitBySwingId = -1;
  
  // Stinger visual
  private stingerLine: Phaser.GameObjects.Line | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'squit');
    
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
    
    // Create placeholder visual (slender insect)
    this.createSquitVisual();
  }
  
  private createSquitVisual(): void {
    // Main body - slender oval
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x44aa88, 1); // Greenish-blue
    graphics.fillEllipse(0, 0, 20, 12);
    
    // Head
    graphics.fillStyle(0x338866, 1);
    graphics.fillCircle(10, 0, 6);
    
    // Generate texture
    graphics.generateTexture('squit_body', 32, 24);
    graphics.destroy();
    
    this.setTexture('squit_body');
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;
    
    // Update timers
    this.updateTimers(delta);
    
    // Update hover/flap animation
    this.updateHoverAnimation(delta);
    
    // Update stinger rotation to face player
    this.updateStingerRotation(player);
    
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
    if (this.windUpTimer > 0) this.windUpTimer -= delta;
    if (this.recoveryTimer > 0) this.recoveryTimer -= delta;
    if (this.lungeCooldown > 0) this.lungeCooldown -= delta;
  }

  private updateHoverAnimation(delta: number): void {
    // Smooth sine wave hover
    this.hoverTime += delta * 0.004;
    this.hoverOffset = Math.sin(this.hoverTime) * 6;
    
    // Fast wing flap animation
    this.flapTime += delta * 0.025;
    const flapScale = 0.85 + Math.sin(this.flapTime) * 0.15;
    this.setScale(1, flapScale);
  }
  
  private updateStingerRotation(player: Player): void {
    // Rotate to face player (stinger points toward player)
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.setRotation(angle);
  }

  private updateAIState(player: Player): void {
    // Can't change state while in hitstun
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        this.aiState = 'returning';
      }
      return;
    }
    
    if (this.aiState === 'dead') return;
    
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const distToSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    
    // State transitions
    switch (this.aiState) {
      case 'hover':
        // Check aggro - player enters range
        if (distToPlayer < this.cfg.aggroRangePx && this.lungeCooldown <= 0) {
          this.startWindUp(player);
        }
        break;
        
      case 'windUp':
        if (this.windUpTimer <= 0) {
          this.startLunge();
        }
        break;
        
      case 'lunge':
        // Check if reached target or hit wall
        const body = this.body as Phaser.Physics.Arcade.Body;
        const reachedTarget = Phaser.Math.Distance.Between(
          this.x, this.y, this.lungeTargetX, this.lungeTargetY
        ) < 30;
        const hitWall = body.blocked.left || body.blocked.right || 
                        body.blocked.up || body.blocked.down;
        
        if (reachedTarget || hitWall) {
          this.startRecovery(hitWall);
        }
        break;
        
      case 'recovery':
        if (this.recoveryTimer <= 0) {
          this.aiState = 'returning';
        }
        break;
        
      case 'returning':
        // Check if back at safe distance from player
        if (distToPlayer >= this.SAFE_DISTANCE && distToSpawn < 50) {
          this.aiState = 'hover';
        }
        // Re-aggro if player too close during return
        if (distToPlayer < this.cfg.aggroRangePx * 0.7 && this.lungeCooldown <= 0) {
          this.startWindUp(player);
        }
        break;
    }
  }
  
  private startWindUp(player: Player): void {
    this.aiState = 'windUp';
    this.windUpTimer = this.WIND_UP_TIME;
    
    // Store target position
    this.lungeTargetX = player.x;
    this.lungeTargetY = player.y;
    
    // Visual/audio cue - pull back and buzz
    this.setTint(0xffff66);
    this.scene.cameras.main.shake(100, 0.005);
    
    // Pull back slightly
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const pullBackDist = 15;
    this.x -= Math.cos(angle) * pullBackDist;
    this.y -= Math.sin(angle) * pullBackDist;
    
    // Wind-up visual ring
    const windUpRing = this.scene.add.circle(this.x, this.y, 8, 0xffff66, 0.6);
    this.scene.tweens.add({
      targets: windUpRing,
      radius: 25,
      alpha: 0,
      duration: this.WIND_UP_TIME,
      ease: 'Power2',
      onComplete: () => windUpRing.destroy()
    });
  }
  
  private startLunge(): void {
    this.aiState = 'lunge';
    this.clearTint();
    
    // Dash toward stored target position
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.lungeTargetX, this.lungeTargetY);
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    body.setVelocity(
      Math.cos(angle) * this.LUNGE_SPEED,
      Math.sin(angle) * this.LUNGE_SPEED
    );
    
    // Trail effect during lunge
    this.createLungeTrail();
  }
  
  private createLungeTrail(): void {
    const trail = this.scene.add.circle(this.x, this.y, 6, 0x44aa88, 0.5);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.3,
      duration: 200,
      onComplete: () => trail.destroy()
    });
  }
  
  private startRecovery(hitWall: boolean): void {
    this.aiState = 'recovery';
    this.recoveryTimer = this.RECOVERY_TIME;
    this.lungeCooldown = this.LUNGE_COOLDOWN;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    
    // Bounce effect if hit wall
    if (hitWall) {
      this.scene.tweens.add({
        targets: this,
        x: this.x + Phaser.Math.Between(-20, 20),
        y: this.y + Phaser.Math.Between(-10, 10),
        duration: 100,
        yoyo: true,
        ease: 'Bounce'
      });
      
      // Stun flash
      this.setTint(0xff8888);
      this.scene.time.delayedCall(200, () => {
        if (!this.isDead) this.clearTint();
      });
    }
  }

  private applyMovement(player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    switch (this.aiState) {
      case 'hover':
        this.applyHoverMovement(body);
        break;
        
      case 'windUp':
        // Stay still during wind-up
        body.setVelocity(0, 0);
        break;
        
      case 'lunge':
        // Velocity already set, add trail
        if (Math.random() < 0.3) {
          this.createLungeTrail();
        }
        break;
        
      case 'recovery':
        body.setVelocity(0, 0);
        break;
        
      case 'returning':
        this.applyReturnMovement(body, player);
        break;
        
      case 'hurt':
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
    
    body.setVelocity(diffX * 0.8, diffY * 2.5);
  }

  private applyReturnMovement(body: Phaser.Physics.Arcade.Body, player: Player): void {
    // Fly to safe distance from player
    const angleFromPlayer = Phaser.Math.Angle.Between(player.x, player.y, this.spawnX, this.spawnY);
    
    // Move toward spawn point
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.spawnX, this.spawnY);
    const speed = 80;
    
    body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
  }

  private updateVisuals(): void {
    // Hurt flash
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      // Flicker during invuln
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else if (this.aiState !== 'windUp' && this.aiState !== 'recovery') {
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
    
    // Apply knockback
    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x * 0.8,
      -this.cfg.knockbackOnHit.y * 0.6
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
    
    // Create death particles - green/blue puff
    this.createDeathParticles();
    
    // Spawn shell drops
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
    
    // Death animation - spin and fade
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      rotation: this.rotation + Math.PI * 2,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  private createDeathParticles(): void {
    const particleCount = Phaser.Math.Between(8, 12);
    
    for (let i = 0; i < particleCount; i++) {
      // Green-blue color scheme
      const color = i % 2 === 0 ? 0x44aa88 : 0x338866;
      
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-8, 8),
        this.y + Phaser.Math.Between(-8, 8),
        Phaser.Math.Between(2, 4),
        color,
        1
      );
      
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = Phaser.Math.Between(25, 50);
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(250, 400),
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
    
    // Central flash
    const flash = this.scene.add.circle(this.x, this.y, 15, 0x88ffcc, 0.8);
    this.scene.tweens.add({
      targets: flash,
      radius: 30,
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
  
  getAIState(): SquitAIState {
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
