import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * MossCreep AI States
 * - camouflaged: Sitting still, looks like a bush
 * - crawling: Moving along surfaces (floor, wall, ceiling)
 * - hurt: Brief reaction to damage
 * - dead: Death animation
 */
type MossCreepAIState = 'camouflaged' | 'crawling' | 'hurt' | 'dead';

// Surface the creep is crawling on
type CrawlSurface = 'floor' | 'wall_left' | 'ceiling' | 'wall_right';

export class MossCreep extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: MossCreepAIState = 'camouflaged';
  private currentHp: number;
  
  // Movement
  private crawlDir: 1 | -1 = 1;
  private currentSurface: CrawlSurface = 'floor';
  private crawlSpeed = 30;
  
  // Camouflage
  private readonly REVEAL_RANGE = 120;
  
  // Timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  
  // Track death
  private isDead = false;
  private lastHitBySwingId = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig, startSurface: CrawlSurface = 'floor') {
    super(scene, x, y, 'mossCreep');
    
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    this.currentSurface = startSurface;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setSize(this.cfg.width, this.cfg.height);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMass(0.5);
    body.setAllowGravity(false); // Can crawl on walls/ceilings
    
    // Set initial rotation based on surface
    this.updateSurfaceOrientation();
    
    // Randomize crawl direction
    this.crawlDir = Math.random() > 0.5 ? 1 : -1;
    
    // Create visual representation
    this.createVisual();
  }
  
  private createVisual(): void {
    // Moss Creep is a round bushy mound of green leaves with orange eyes
    this.setTint(0x4a8f3c); // Vibrant green
  }
  
  private updateSurfaceOrientation(): void {
    switch (this.currentSurface) {
      case 'floor':
        this.setAngle(0);
        break;
      case 'wall_right':
        this.setAngle(90);
        break;
      case 'ceiling':
        this.setAngle(180);
        break;
      case 'wall_left':
        this.setAngle(-90);
        break;
    }
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;
    
    this.updateTimers(delta);
    this.updateAIState(player);
    this.applyMovement();
    this.updateVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
  }

  private updateAIState(player: Player): void {
    if (this.aiState === 'dead') return;
    
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        this.aiState = 'crawling';
      }
      return;
    }
    
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    
    if (this.aiState === 'camouflaged') {
      // Reveal when player gets close
      if (dist < this.REVEAL_RANGE) {
        this.aiState = 'crawling';
      }
    }
  }

  private applyMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (this.aiState !== 'crawling') {
      body.setVelocity(0, 0);
      return;
    }
    
    // Check for surface transitions
    this.checkSurfaceTransition(body);
    
    // Apply velocity based on current surface
    switch (this.currentSurface) {
      case 'floor':
        body.setVelocity(this.crawlDir * this.crawlSpeed, 0);
        break;
      case 'ceiling':
        body.setVelocity(-this.crawlDir * this.crawlSpeed, 0);
        break;
      case 'wall_left':
        body.setVelocity(0, this.crawlDir * this.crawlSpeed);
        break;
      case 'wall_right':
        body.setVelocity(0, -this.crawlDir * this.crawlSpeed);
        break;
    }
  }
  
  private checkSurfaceTransition(body: Phaser.Physics.Arcade.Body): void {
    // Simple surface crawling - turn around at edges/corners
    // For a more complex perimeter crawling, we'd need raycasting
    
    switch (this.currentSurface) {
      case 'floor':
        if (body.blocked.left && this.crawlDir === -1) {
          // Hit left wall, start climbing up
          this.currentSurface = 'wall_left';
          this.crawlDir = -1; // Go up
          this.updateSurfaceOrientation();
        } else if (body.blocked.right && this.crawlDir === 1) {
          // Hit right wall, start climbing up
          this.currentSurface = 'wall_right';
          this.crawlDir = -1; // Go up
          this.updateSurfaceOrientation();
        }
        break;
        
      case 'wall_left':
        if (body.blocked.up && this.crawlDir === -1) {
          // Hit ceiling, start going right
          this.currentSurface = 'ceiling';
          this.crawlDir = -1;
          this.updateSurfaceOrientation();
        } else if (body.blocked.down && this.crawlDir === 1) {
          // Hit floor, start going right
          this.currentSurface = 'floor';
          this.crawlDir = 1;
          this.updateSurfaceOrientation();
        }
        break;
        
      case 'ceiling':
        if (body.blocked.right && this.crawlDir === 1) {
          // Hit right wall going left on ceiling
          this.currentSurface = 'wall_right';
          this.crawlDir = 1; // Go down
          this.updateSurfaceOrientation();
        } else if (body.blocked.left && this.crawlDir === -1) {
          // Hit left wall
          this.currentSurface = 'wall_left';
          this.crawlDir = 1; // Go down
          this.updateSurfaceOrientation();
        }
        break;
        
      case 'wall_right':
        if (body.blocked.up && this.crawlDir === -1) {
          // Hit ceiling
          this.currentSurface = 'ceiling';
          this.crawlDir = 1;
          this.updateSurfaceOrientation();
        } else if (body.blocked.down && this.crawlDir === 1) {
          // Hit floor
          this.currentSurface = 'floor';
          this.crawlDir = -1;
          this.updateSurfaceOrientation();
        }
        break;
    }
  }

  private updateVisuals(): void {
    // Camouflaged - darker, blends in
    if (this.aiState === 'camouflaged') {
      this.setTint(0x2a5f2c); // Darker green
      this.setAlpha(0.85);
      return;
    }
    
    // Hurt flash
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setTint(0x4a8f3c);
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      // Active - brighter with visible orange eyes effect
      this.setTint(0x5aaf4c);
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
    
    // Light knockback
    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x * 0.5,
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
    
    // Drop shells (small amount)
    const dropCount = Phaser.Math.Between(
      this.cfg.dropShells.min,
      this.cfg.dropShells.max
    );
    
    for (let i = 0; i < dropCount; i++) {
      const offsetX = Phaser.Math.Between(-15, 15);
      const offsetY = Phaser.Math.Between(-8, 8);
      
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
          Phaser.Math.Between(-40, 40),
          Phaser.Math.Between(-80, -40)
        );
        this.scene.time.delayedCall(200, () => {
          if (pickup.active && pickupBody) {
            pickupBody.setVelocity(0, 0);
            pickupBody.moves = false;
          }
        });
      }
    }
    
    // Death animation - poof of leaves
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      angle: this.angle + 180,
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
  
  getAIState(): MossCreepAIState {
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
    // Nothing special on hit
  }
}
