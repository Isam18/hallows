import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';

/**
 * Infected Husk - Passive Environmental Enemy
 * 
 * This is a non-hostile, story-telling enemy that sits curled up
 * covered in glowing orange infection pustules. It doesn't attack
 * and only releases particles when hit.
 */
type InfectedHuskState = 'idle' | 'reacting' | 'dead';

export class InfectedHusk extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private huskState: InfectedHuskState = 'idle';
  private currentHp: number;
  
  // Ambient animation
  private pulseTimer = 0;
  private pustuleGlow = 0;
  
  // Reaction state
  private reactionTimer = 0;
  private readonly REACTION_TIME = 500;
  
  // Track if dead
  private isDead = false;
  
  // Hit tracking
  private lastHitBySwingId = -1;
  
  // Visual effects
  private glowTween: Phaser.Tweens.Tween | null = null;
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'infectedHusk');
    
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setSize(this.cfg.width, this.cfg.height);
    this.setImmovable(true); // Doesn't move at all
    
    // Disable gravity for this static entity
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    
    // Start ambient pulsing glow
    this.startAmbientPulse();
    
    // Create particle emitter for when hit
    this.createParticleEmitter();
  }

  private startAmbientPulse(): void {
    // Subtle pulsing glow on pustules
    this.glowTween = this.scene.tweens.add({
      targets: this,
      pustuleGlow: 1,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Apply subtle tint variation
        const glowIntensity = 0.8 + this.pustuleGlow * 0.2;
        this.setAlpha(glowIntensity);
      }
    });
  }

  private createParticleEmitter(): void {
    // Create infection particle texture if not exists
    if (!this.scene.textures.exists('infectionParticle')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xff6633);
      g.fillCircle(4, 4, 4);
      g.fillStyle(0xffaa66, 0.6);
      g.fillCircle(4, 4, 2);
      g.generateTexture('infectionParticle', 8, 8);
      g.destroy();
    }
    
    // Create emitter but don't start it
    this.particles = this.scene.add.particles(this.x, this.y, 'infectionParticle', {
      speed: { min: 30, max: 80 },
      angle: { min: 200, max: 340 },
      scale: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: 50,
      emitting: false,
      quantity: 8
    });
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;
    
    // Update timers
    this.pulseTimer += delta;
    if (this.reactionTimer > 0) this.reactionTimer -= delta;
    
    // Update state
    if (this.huskState === 'reacting' && this.reactionTimer <= 0) {
      this.huskState = 'idle';
    }
    
    // Update visuals
    this.updateVisuals();
  }

  private updateVisuals(): void {
    if (this.huskState === 'reacting') {
      // Flash when reacting to being hit
      const flash = Math.sin(Date.now() * 0.02) > 0;
      this.setTint(flash ? 0xffcc88 : 0xff8844);
    } else {
      // Normal ambient state
      this.clearTint();
    }
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;
    
    // Take damage but don't fight back
    this.currentHp -= amount;
    
    // Enter reaction state
    this.huskState = 'reacting';
    this.reactionTimer = this.REACTION_TIME;
    
    // Release infection particles
    if (this.particles) {
      this.particles.setPosition(this.x, this.y);
      this.particles.explode(12);
    }
    
    // Subtle flinch animation
    this.scene.tweens.add({
      targets: this,
      x: this.x + (this.x > fromX ? 3 : -3),
      duration: 50,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    
    if (this.currentHp <= 0) {
      this.die();
    }
    
    return true;
  }

  private die(): void {
    if (this.isDead) return;
    
    this.isDead = true;
    this.huskState = 'dead';
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    
    // Large particle burst on death
    if (this.particles) {
      this.particles.setPosition(this.x, this.y);
      this.particles.explode(25);
    }
    
    // Stop ambient glow
    if (this.glowTween) {
      this.glowTween.stop();
    }
    
    // Sad, quiet death - just fade away
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleY: 0.8,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.particles) {
          this.particles.destroy();
        }
        this.destroy();
      }
    });
  }

  // Public getters - passive enemy has no contact damage
  getContactDamage(): number { 
    return 0; // Non-hostile
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
  
  getAIState(): InfectedHuskState {
    return this.huskState;
  }
  
  getCurrentHp(): number {
    return this.currentHp;
  }
  
  getMaxHp(): number {
    return this.cfg.hp;
  }
  
  isInvulnerable(): boolean {
    return false; // Never invulnerable
  }
  
  getDisplayName(): string {
    return this.cfg.displayName;
  }
}
