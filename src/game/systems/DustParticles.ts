import Phaser from 'phaser';

/**
 * Dust Particle System
 * Creates atmospheric floating dust particles
 */
export class DustParticles {
  private scene: Phaser.Scene;
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.createTexture();
    this.createEmitter();
  }

  private createTexture(): void {
    if (!this.scene.textures.exists('dustParticle')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      // Soft circular particle
      g.fillStyle(0xc0c8d0, 0.6);
      g.fillCircle(4, 4, 2);
      g.fillStyle(0xd0d8e0, 0.4);
      g.fillCircle(4, 4, 3);
      
      g.generateTexture('dustParticle', 8, 8);
      g.destroy();
    }
    
    // Create variant particles
    if (!this.scene.textures.exists('dustParticle2')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      g.fillStyle(0xa0a8b0, 0.5);
      g.fillCircle(3, 3, 1.5);
      
      g.generateTexture('dustParticle2', 6, 6);
      g.destroy();
    }
    
    if (!this.scene.textures.exists('dustParticle3')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      // Slightly larger, more visible
      g.fillStyle(0xb8c0c8, 0.7);
      g.fillCircle(5, 5, 2.5);
      g.fillStyle(0xc8d0d8, 0.3);
      g.fillCircle(5, 5, 4);
      
      g.generateTexture('dustParticle3', 10, 10);
      g.destroy();
    }
  }

  private createEmitter(): void {
    // Main dust emitter - follows camera
    this.emitter = this.scene.add.particles(0, 0, 'dustParticle', {
      x: { min: 0, max: this.scene.scale.width },
      y: { min: 0, max: this.scene.scale.height },
      lifespan: { min: 8000, max: 15000 },
      speedX: { min: -8, max: 8 },
      speedY: { min: -15, max: 5 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 0.6, end: 0 },
      frequency: 200,
      quantity: 1,
      blendMode: 'ADD',
    });
    
    this.emitter.setScrollFactor(0);
    this.emitter.setDepth(10);
    
    // Secondary emitter with different particle
    const emitter2 = this.scene.add.particles(0, 0, 'dustParticle2', {
      x: { min: 0, max: this.scene.scale.width },
      y: { min: 0, max: this.scene.scale.height },
      lifespan: { min: 6000, max: 12000 },
      speedX: { min: -5, max: 10 },
      speedY: { min: -10, max: 8 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 0.5, end: 0 },
      frequency: 350,
      quantity: 1,
      blendMode: 'ADD',
    });
    
    emitter2.setScrollFactor(0);
    emitter2.setDepth(10);
    
    // Occasional larger motes
    const emitter3 = this.scene.add.particles(0, 0, 'dustParticle3', {
      x: { min: 0, max: this.scene.scale.width },
      y: { min: 0, max: this.scene.scale.height },
      lifespan: { min: 10000, max: 18000 },
      speedX: { min: -3, max: 6 },
      speedY: { min: -8, max: 3 },
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 0.4, end: 0 },
      frequency: 800,
      quantity: 1,
      blendMode: 'ADD',
    });
    
    emitter3.setScrollFactor(0);
    emitter3.setDepth(10);
  }

  update(): void {
    // Particles are screen-relative via scrollFactor, so no update needed
  }

  destroy(): void {
    if (this.emitter) {
      this.emitter.destroy();
      this.emitter = null;
    }
  }
}
