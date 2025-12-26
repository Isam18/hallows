import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';
import { DEATH_CONFIG } from '../core/DeathConfig';

/**
 * DeathMarker - Visual marker for dropped shells at death location
 * Uses pure tweening for smooth animation without physics jitter
 */
export class DeathMarker extends Phaser.Physics.Arcade.Sprite {
  private shellAmount: number;
  private collected = false;
  private baseY: number;
  private bobTime = 0;
  private glowGraphics: Phaser.GameObjects.Graphics | null = null;
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, amount: number) {
    super(scene, x, y, 'deathMarker');
    this.shellAmount = amount;
    this.baseY = y;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // CRITICAL: Disable all physics movement to prevent jitter
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.moves = false;
    body.immovable = true;
    body.setSize(DEATH_CONFIG.reclaimRadiusPx * 2, DEATH_CONFIG.reclaimRadiusPx * 2);
    
    // Create glow effect
    this.createGlowEffect();
    
    // Pulse animation
    this.createPulseAnimation();
    
    // Set depth to render above platforms
    this.setDepth(50);
  }

  private createGlowEffect(): void {
    this.glowGraphics = this.scene.add.graphics();
    this.glowGraphics.setDepth(49);
    this.updateGlow();
  }

  private updateGlow(): void {
    if (!this.glowGraphics || !this.active) return;
    
    this.glowGraphics.clear();
    
    // Outer glow
    this.glowGraphics.fillStyle(COLORS.shellGlow, 0.15);
    this.glowGraphics.fillCircle(this.x, this.y, 50);
    
    // Inner glow
    this.glowGraphics.fillStyle(COLORS.shellGlow, 0.3);
    this.glowGraphics.fillCircle(this.x, this.y, 30);
    
    // Core glow
    this.glowGraphics.fillStyle(COLORS.shell, 0.5);
    this.glowGraphics.fillCircle(this.x, this.y, 15);
  }

  private createPulseAnimation(): void {
    const { pulseScale, pulsePeriodMs } = DEATH_CONFIG.markerVisual;
    
    this.scene.tweens.add({
      targets: this,
      scaleX: pulseScale,
      scaleY: pulseScale,
      alpha: 0.7,
      duration: pulsePeriodMs / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    
    if (this.collected) return;
    
    // Smooth sinusoidal bob animation (manual, not physics)
    const { bobAmplitude, bobPeriodMs } = DEATH_CONFIG.markerVisual;
    this.bobTime += delta;
    const bobOffset = Math.sin((this.bobTime / bobPeriodMs) * Math.PI * 2) * bobAmplitude;
    this.y = this.baseY + bobOffset;
    
    // Update glow position
    this.updateGlow();
  }

  /**
   * Collect the death marker and return shells
   */
  collect(): void {
    if (this.collected) return;
    this.collected = true;
    
    // Disable physics immediately
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    
    // Play collection effect
    this.scene.tweens.killTweensOf(this);
    
    // Burst effect
    this.scene.tweens.add({
      targets: this,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      }
    });
    
    // Flash the glow
    if (this.glowGraphics) {
      this.scene.tweens.add({
        targets: this.glowGraphics,
        alpha: 0,
        duration: 200,
      });
    }
  }

  getAmount(): number { 
    return this.shellAmount; 
  }
  
  isCollected(): boolean { 
    return this.collected; 
  }

  destroy(fromScene?: boolean): void {
    this.glowGraphics?.destroy();
    super.destroy(fromScene);
  }
}
