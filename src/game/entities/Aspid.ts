import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Aspid AI States
 * - hover: Floating at spawn point, idle
 * - aggro: Maintaining distance and shooting at player
 * - returning: Flying back to spawn point
 * - hurt: Stunned from taking damage
 * - dead: Playing death animation
 */
type AspidAIState = 'hover' | 'aggro' | 'returning' | 'hurt' | 'dead';

export class Aspid extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: AspidAIState = 'hover';
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
  private shootTimer = 0;
  private shootCooldown = 3000; // 3 seconds between shots
  
  // Preferred distance from player
  private preferredDistance = 180;
  
  // Track if already dead to prevent double-death
  private isDead = false;
  
  // Hit tracking for one-hit-per-swing
  private lastHitBySwingId = -1;
  
  // Projectiles
  private projectiles: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'aspid');
    
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
    
    // Create projectile group
    this.projectiles = scene.add.group();
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
    
    // Handle shooting
    if (this.aiState === 'aggro') {
      this.shootTimer += delta;
      if (this.shootTimer >= this.shootCooldown) {
        this.shootAtPlayer(player);
        this.shootTimer = 0;
      }
    }
    
    // Update projectiles
    this.updateProjectiles(player);
    
    // Update visuals
    this.updateVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
  }

  private updateHoverAnimation(delta: number): void {
    // Smooth sine wave hover
    this.hoverTime += delta * 0.003;
    this.hoverOffset = Math.sin(this.hoverTime) * 10;
    
    // Wing flap animation (faster)
    this.flapTime += delta * 0.012;
    const flapScale = 0.85 + Math.sin(this.flapTime) * 0.15;
    this.setScale(1, flapScale);
  }

  private updateAIState(player: Player): void {
    // Can't change state while in hitstun
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (dist < this.cfg.aggroRangePx * 1.5) {
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
      if (distToPlayer < this.cfg.aggroRangePx) {
        this.aiState = 'aggro';
        this.shootTimer = this.shootCooldown * 0.5; // Start shooting soon
      }
    } else if (this.aiState === 'aggro') {
      if (distToPlayer > this.cfg.deaggroRangePx) {
        this.aiState = 'returning';
      }
    } else if (this.aiState === 'returning') {
      if (distToSpawn < 10) {
        this.aiState = 'hover';
      }
      if (distToPlayer < this.cfg.aggroRangePx) {
        this.aiState = 'aggro';
      }
    }
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
        body.setVelocity(body.velocity.x * 0.95, body.velocity.y * 0.95);
        break;
        
      case 'dead':
        body.setVelocity(0, 0);
        break;
    }
  }

  private applyHoverMovement(body: Phaser.Physics.Arcade.Body): void {
    const targetY = this.spawnY + this.hoverOffset;
    const diffY = targetY - this.y;
    const diffX = this.spawnX - this.x;
    
    body.setVelocity(
      diffX * 0.5,
      diffY * 2
    );
  }

  private applyAggroMovement(body: Phaser.Physics.Arcade.Body, player: Player): void {
    // Stay at preferred distance from player
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    
    let speed = this.cfg.moveSpeedAggro * 0.6;
    let moveAngle = angle;
    
    if (distToPlayer < this.preferredDistance - 30) {
      // Too close - back away
      moveAngle = angle + Math.PI;
      speed = this.cfg.moveSpeedAggro * 0.8;
    } else if (distToPlayer > this.preferredDistance + 30) {
      // Too far - approach
      moveAngle = angle;
      speed = this.cfg.moveSpeedAggro * 0.5;
    } else {
      // Good distance - strafe
      moveAngle = angle + Math.PI / 2;
      speed = this.cfg.moveSpeedAggro * 0.3;
    }
    
    // Add hover offset
    const targetY = this.y + this.hoverOffset * 0.5;
    
    body.setVelocity(
      Math.cos(moveAngle) * speed,
      Math.sin(moveAngle) * speed + (targetY - this.y) * 0.5
    );
    
    // Always face player
    this.setFlipX(player.x < this.x);
  }

  private applyReturnMovement(body: Phaser.Physics.Arcade.Body): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.spawnX, this.spawnY);
    const speed = this.cfg.moveSpeedPatrol;
    
    body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    
    this.setFlipX(this.spawnX < this.x);
  }

  private shootAtPlayer(player: Player): void {
    // Create infection glob projectile
    const projectile = this.scene.add.circle(this.x, this.y, 8, 0xff6600);
    this.scene.physics.add.existing(projectile);
    
    const projBody = projectile.body as Phaser.Physics.Arcade.Body;
    projBody.setAllowGravity(false);
    
    // Calculate direction to player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = 200;
    
    projBody.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    
    // Add glow effect
    const glow = this.scene.add.circle(this.x, this.y, 12, 0xff8800, 0.5);
    this.scene.physics.add.existing(glow);
    const glowBody = glow.body as Phaser.Physics.Arcade.Body;
    glowBody.setAllowGravity(false);
    glowBody.setVelocity(projBody.velocity.x, projBody.velocity.y);
    
    this.projectiles.add(projectile);
    this.projectiles.add(glow);
    
    // Store reference to glow on projectile
    (projectile as any).glow = glow;
    (projectile as any).lifetime = 0;
    
    // Visual feedback - flash
    this.setTint(0xff8844);
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) this.clearTint();
    });
  }

  private updateProjectiles(player: Player): void {
    const playerBounds = player.getBounds();
    
    this.projectiles.getChildren().forEach((proj) => {
      const projectile = proj as Phaser.GameObjects.Arc;
      if (!projectile.active) return;
      
      // Skip glow objects
      if ((projectile as any).glow === undefined && !(projectile as any).isGlow) {
        return;
      }
      
      // Only process main projectiles (not glows)
      if ((projectile as any).isGlow) return;
      
      (projectile as any).lifetime += 16;
      
      // Check player collision
      const projBounds = projectile.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(projBounds, playerBounds)) {
        player.takeDamage(1, projectile.x);
        this.destroyProjectile(projectile);
        return;
      }
      
      // Remove if too old or off screen
      if ((projectile as any).lifetime > 5000 || projectile.y > 700 || projectile.y < -100) {
        this.destroyProjectile(projectile);
      }
    });
  }

  private destroyProjectile(projectile: Phaser.GameObjects.Arc): void {
    const glow = (projectile as any).glow;
    if (glow) {
      glow.destroy();
    }
    projectile.destroy();
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      this.clearTint();
      this.setAlpha(1);
    }
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;
    
    this.currentHp -= amount;
    
    this.aiState = 'hurt';
    this.hitstunTimer = this.cfg.hitstunMs;
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;
    
    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x * 0.7,
      -this.cfg.knockbackOnHit.y * 0.5
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
    
    // Destroy all projectiles
    this.projectiles.getChildren().forEach((proj) => {
      proj.destroy();
    });
    
    this.createDeathParticles();
    
    // Drop more shells than vengefly (rarer enemy)
    const dropCount = Phaser.Math.Between(
      this.cfg.dropShells.min,
      this.cfg.dropShells.max
    );
    
    for (let i = 0; i < dropCount; i++) {
      const offsetX = Phaser.Math.Between(-25, 25);
      const offsetY = Phaser.Math.Between(-15, 15);
      
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
          Phaser.Math.Between(-70, 70),
          Phaser.Math.Between(-130, -70)
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
    const particleCount = Phaser.Math.Between(10, 14);
    
    for (let i = 0; i < particleCount; i++) {
      const color = i % 2 === 0 ? 0xff6600 : 0xff8844;
      
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-10, 10),
        this.y + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(3, 6),
        color,
        1
      );
      
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = Phaser.Math.Between(35, 70);
      
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
    
    // Orange flash
    const flash = this.scene.add.circle(this.x, this.y, 25, 0xff6600, 0.8);
    this.scene.tweens.add({
      targets: flash,
      radius: 45,
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
  
  getAIState(): AspidAIState {
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
