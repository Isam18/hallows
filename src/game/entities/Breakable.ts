import Phaser from 'phaser';
import { Pickup } from './Pickup';

/**
 * Breakable environmental object
 * Drops small amounts of currency when destroyed
 */
export class Breakable extends Phaser.Physics.Arcade.Sprite {
  private breakableType: string;
  private hp: number = 1;
  private isBroken: boolean = false;
  private dropAmount: number;
  
  constructor(
    scene: Phaser.Scene, 
    x: number, 
    y: number, 
    type: string = 'signpost'
  ) {
    super(scene, x, y, `breakable_${type}`);
    
    this.breakableType = type;
    this.dropAmount = type === 'pole' ? 3 : 5;
    
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body
    
    // Set up based on type
    this.setupByType();
  }

  private setupByType(): void {
    switch (this.breakableType) {
      case 'signpost':
        this.setSize(20, 40);
        break;
      case 'pole':
        this.setSize(12, 50);
        break;
      default:
        this.setSize(20, 30);
    }
  }

  takeDamage(amount: number): boolean {
    if (this.isBroken) return false;
    
    this.hp -= amount;
    
    // Visual feedback
    this.scene.tweens.add({
      targets: this,
      x: this.x + Phaser.Math.Between(-3, 3),
      duration: 50,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    
    if (this.hp <= 0) {
      this.break();
      return true;
    }
    
    return false;
  }

  private break(): void {
    if (this.isBroken) return;
    this.isBroken = true;
    
    // Spawn currency
    const pickupsGroup = (this.scene as any).getPickupsGroup?.();
    if (pickupsGroup) {
      // Scatter a few shells
      for (let i = 0; i < 3; i++) {
        const offsetX = Phaser.Math.Between(-20, 20);
        const offsetY = Phaser.Math.Between(-10, 10);
        const pickup = new Pickup(
          this.scene, 
          this.x + offsetX, 
          this.y + offsetY, 
          'shells', 
          Math.ceil(this.dropAmount / 3)
        );
        pickupsGroup.add(pickup);
        
        // Give them a little pop
        const body = pickup.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.setVelocity(offsetX * 3, -100 - Math.random() * 50);
        }
      }
    }
    
    // Break particles
    this.createBreakParticles();
    
    // Fade and destroy
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleY: 0.5,
      duration: 200,
      onComplete: () => this.destroy()
    });
  }

  private createBreakParticles(): void {
    // Create wood/debris particle texture if not exists
    if (!this.scene.textures.exists('debrisParticle')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x4a4030);
      g.fillRect(0, 0, 6, 6);
      g.fillStyle(0x3a3020);
      g.fillRect(1, 1, 4, 4);
      g.generateTexture('debrisParticle', 6, 6);
      g.destroy();
    }
    
    // Emit debris particles
    const particles = this.scene.add.particles(this.x, this.y, 'debrisParticle', {
      speed: { min: 50, max: 150 },
      angle: { min: 220, max: 320 },
      scale: { start: 1, end: 0.3 },
      lifespan: 600,
      gravityY: 300,
      quantity: 8,
      emitting: false
    });
    
    particles.explode(8);
    
    // Clean up after animation
    this.scene.time.delayedCall(800, () => particles.destroy());
  }

  isBrokenState(): boolean {
    return this.isBroken;
  }
}
