import Phaser from 'phaser';

/**
 * Leaf Fall Particle System for Greenway
 * Creates falling leaves and green atmospheric particles
 */
export class LeafParticles {
  private scene: Phaser.Scene;
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private fogGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, levelHeight: number) {
    this.scene = scene;
    this.createTextures();
    this.createEmitters();
    this.createAcidFog(levelHeight);
  }

  private createTextures(): void {
    // Leaf particle - small oval
    if (!this.scene.textures.exists('leafParticle')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x6ec472, 0.8);
      g.fillEllipse(6, 4, 12, 8);
      g.fillStyle(0x5a9a5a, 0.6);
      g.fillEllipse(6, 4, 10, 6);
      g.generateTexture('leafParticle', 12, 8);
      g.destroy();
    }
    
    // Yellow/orange leaf variant
    if (!this.scene.textures.exists('leafParticle2')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xcc9944, 0.7);
      g.fillEllipse(5, 3, 10, 6);
      g.generateTexture('leafParticle2', 10, 6);
      g.destroy();
    }
    
    // Small green mote
    if (!this.scene.textures.exists('greenMote')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x88cc88, 0.6);
      g.fillCircle(3, 3, 3);
      g.fillStyle(0xaaddaa, 0.4);
      g.fillCircle(3, 3, 4);
      g.generateTexture('greenMote', 8, 8);
      g.destroy();
    }
    
    // Pollen/spore particle
    if (!this.scene.textures.exists('pollenParticle')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xeedd88, 0.5);
      g.fillCircle(2, 2, 2);
      g.generateTexture('pollenParticle', 4, 4);
      g.destroy();
    }
  }

  private createEmitters(): void {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    // Main leaf fall emitter
    const leafEmitter = this.scene.add.particles(0, 0, 'leafParticle', {
      x: { min: 0, max: screenWidth },
      y: -20,
      lifespan: { min: 6000, max: 10000 },
      speedX: { min: -30, max: 30 },
      speedY: { min: 20, max: 60 },
      rotate: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0.4 },
      alpha: { start: 0.7, end: 0.2 },
      frequency: 400,
      quantity: 1,
      blendMode: 'NORMAL',
    });
    leafEmitter.setScrollFactor(0);
    leafEmitter.setDepth(5);
    this.emitters.push(leafEmitter);
    
    // Orange/yellow leaf variant
    const autumnEmitter = this.scene.add.particles(0, 0, 'leafParticle2', {
      x: { min: 0, max: screenWidth },
      y: -10,
      lifespan: { min: 5000, max: 8000 },
      speedX: { min: -40, max: 20 },
      speedY: { min: 25, max: 50 },
      rotate: { min: 0, max: 360 },
      scale: { start: 1, end: 0.5 },
      alpha: { start: 0.6, end: 0.1 },
      frequency: 800,
      quantity: 1,
      blendMode: 'NORMAL',
    });
    autumnEmitter.setScrollFactor(0);
    autumnEmitter.setDepth(5);
    this.emitters.push(autumnEmitter);
    
    // Floating green motes (ambient particles)
    const moteEmitter = this.scene.add.particles(0, 0, 'greenMote', {
      x: { min: 0, max: screenWidth },
      y: { min: 0, max: screenHeight },
      lifespan: { min: 8000, max: 14000 },
      speedX: { min: -10, max: 10 },
      speedY: { min: -15, max: 10 },
      scale: { start: 0.6, end: 0.2 },
      alpha: { start: 0.5, end: 0 },
      frequency: 300,
      quantity: 1,
      blendMode: 'ADD',
    });
    moteEmitter.setScrollFactor(0);
    moteEmitter.setDepth(8);
    this.emitters.push(moteEmitter);
    
    // Pollen/spores drifting upward
    const pollenEmitter = this.scene.add.particles(0, 0, 'pollenParticle', {
      x: { min: 0, max: screenWidth },
      y: screenHeight + 10,
      lifespan: { min: 10000, max: 16000 },
      speedX: { min: -8, max: 12 },
      speedY: { min: -20, max: -5 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 0.4, end: 0 },
      frequency: 600,
      quantity: 1,
      blendMode: 'ADD',
    });
    pollenEmitter.setScrollFactor(0);
    pollenEmitter.setDepth(6);
    this.emitters.push(pollenEmitter);
  }

  private createAcidFog(levelHeight: number): void {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    // Green fog at bottom of screen (fixed position overlay)
    this.fogGraphics = this.scene.add.graphics();
    this.fogGraphics.setScrollFactor(0);
    this.fogGraphics.setDepth(2);
    
    // Gradient fog from bottom
    for (let y = 0; y < 100; y++) {
      const alpha = (1 - y / 100) * 0.25;
      this.fogGraphics.fillStyle(0x44aa44, alpha);
      this.fogGraphics.fillRect(0, screenHeight - 100 + y, screenWidth, 1);
    }
    
    // Animate fog pulse
    this.scene.tweens.add({
      targets: this.fogGraphics,
      alpha: { from: 0.8, to: 1 },
      duration: 3000,
      yoyo: true,
      repeat: -1
    });
  }

  update(): void {
    // Particles are screen-relative, no update needed
  }

  destroy(): void {
    this.emitters.forEach(e => e.destroy());
    this.emitters = [];
    if (this.fogGraphics) {
      this.fogGraphics.destroy();
      this.fogGraphics = null;
    }
  }
}
