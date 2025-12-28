import Phaser from 'phaser';

/**
 * Decorative infection globule/sac that glows orange
 * Adds atmosphere to infected areas
 */
export class InfectionGlobule extends Phaser.GameObjects.Container {
  private globule: Phaser.GameObjects.Ellipse;
  private glow: Phaser.GameObjects.Ellipse;
  private particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size: 'small' | 'medium' | 'large' = 'medium'
  ) {
    super(scene, x, y);
    
    const sizeMap = {
      small: { w: 12, h: 18 },
      medium: { w: 20, h: 30 },
      large: { w: 35, h: 50 }
    };
    
    const dims = sizeMap[size];
    
    // Outer glow
    this.glow = scene.add.ellipse(0, 0, dims.w * 2.5, dims.h * 2.5, 0xff6600, 0.15);
    this.add(this.glow);
    
    // Main globule
    this.globule = scene.add.ellipse(0, 0, dims.w, dims.h, 0xff8800);
    this.add(this.globule);
    
    // Inner highlight
    const highlight = scene.add.ellipse(-dims.w * 0.2, -dims.h * 0.2, dims.w * 0.4, dims.h * 0.4, 0xffaa44, 0.8);
    this.add(highlight);
    
    scene.add.existing(this);
    
    // Pulsing animation
    this.startPulse();
    
    // Particle drip for larger globules
    if (size === 'large' || size === 'medium') {
      this.createDripParticles(dims.h);
    }
  }

  private startPulse(): void {
    // Globule pulse
    this.scene.tweens.add({
      targets: [this.globule, this.glow],
      scaleX: 1.1,
      scaleY: 0.95,
      duration: 1500 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Glow intensity pulse
    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.25,
      duration: 2000 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createDripParticles(height: number): void {
    // Create drip texture if not exists
    if (!this.scene.textures.exists('infectionDrip')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xff8800);
      g.fillCircle(3, 3, 3);
      g.generateTexture('infectionDrip', 6, 6);
      g.destroy();
    }
    
    // Slow dripping particles
    const particles = this.scene.add.particles(this.x, this.y + height / 2, 'infectionDrip', {
      speed: { min: 10, max: 30 },
      angle: { min: 85, max: 95 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 1500,
      gravityY: 50,
      frequency: 2000 + Math.random() * 1000,
      quantity: 1
    });
    
    this.particleEmitter = particles;
  }

  destroy(fromScene?: boolean): void {
    // Particles are auto-cleaned by scene
    super.destroy(fromScene);
  }
}

/**
 * Infection blockade - blocks path until boss defeated
 */
export class InfectionBlockade extends Phaser.Physics.Arcade.Sprite {
  private blockadeId: string;
  private isCleared: boolean = false;
  private pulseGlow: Phaser.GameObjects.Rectangle | null = null;
  private smokeParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number = 60,
    height: number = 120,
    blockadeId: string = 'default'
  ) {
    super(scene, x + width / 2, y + height / 2, 'infectionBlockade');
    
    this.blockadeId = blockadeId;
    
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    
    // Create visual
    this.createVisual(width, height);
    
    // Set physics body
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(width, height);
    body.updateFromGameObject();
  }

  private createVisual(width: number, height: number): void {
    // Create blockade texture if not exists
    if (!this.scene.textures.exists('infectionBlockade')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      // Organic pulsating mass
      g.fillStyle(0xcc4400);
      g.fillRoundedRect(0, 0, 60, 120, 15);
      
      // Orange veins
      g.lineStyle(3, 0xff6600, 0.8);
      g.beginPath();
      g.moveTo(10, 20);
      g.lineTo(25, 60);
      g.lineTo(15, 100);
      g.stroke();
      
      g.beginPath();
      g.moveTo(50, 15);
      g.lineTo(35, 55);
      g.lineTo(45, 95);
      g.stroke();
      
      // Glowing spots
      g.fillStyle(0xff8800);
      g.fillCircle(20, 35, 8);
      g.fillCircle(40, 70, 10);
      g.fillCircle(25, 95, 6);
      
      g.generateTexture('infectionBlockade', 60, 120);
      g.destroy();
    }
    
    this.setTexture('infectionBlockade');
    this.setDisplaySize(width, height);
    
    // Add outer glow
    this.pulseGlow = this.scene.add.rectangle(
      this.x, this.y,
      width * 1.5, height * 1.3,
      0xff6600, 0.2
    );
    this.pulseGlow.setDepth(this.depth - 1);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.pulseGlow,
      alpha: 0.35,
      scaleX: 1.1,
      scaleY: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add smoke particles
    this.createSmokeParticles();
  }

  private createSmokeParticles(): void {
    if (!this.scene.textures.exists('infectionSmoke')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xff6600, 0.5);
      g.fillCircle(8, 8, 8);
      g.generateTexture('infectionSmoke', 16, 16);
      g.destroy();
    }
    
    const particles = this.scene.add.particles(this.x, this.y - 30, 'infectionSmoke', {
      speed: { min: 5, max: 20 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 1.5 },
      alpha: { start: 0.4, end: 0 },
      lifespan: 2000,
      gravityY: -15,
      frequency: 300,
      quantity: 1
    });
    
    this.smokeParticles = particles;
  }

  clear(): void {
    if (this.isCleared) return;
    this.isCleared = true;
    
    // Stop smoke
    if (this.smokeParticles) {
      this.smokeParticles.stop();
    }
    
    // Dissolve animation
    this.scene.tweens.add({
      targets: [this, this.pulseGlow],
      alpha: 0,
      scaleY: 0.5,
      duration: 1000,
      ease: 'Quad.easeIn',
      onComplete: () => {
        const body = this.body as Phaser.Physics.Arcade.StaticBody;
        body.enable = false;
        this.pulseGlow?.destroy();
        this.destroy();
      }
    });
    
    // Burst particles
    this.createClearBurst();
  }

  private createClearBurst(): void {
    const particles = this.scene.add.particles(this.x, this.y, 'infectionSmoke', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 800,
      quantity: 20,
      emitting: false
    });
    
    particles.explode(20);
    this.scene.time.delayedCall(1000, () => particles.destroy());
  }

  isClearedState(): boolean {
    return this.isCleared;
  }
}

/**
 * Ambient infection particles - orange smoke drifting through the air
 */
export class InfectionParticles {
  private particles: Phaser.GameObjects.Particles.ParticleEmitter;
  
  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    // Create particle texture if not exists
    if (!scene.textures.exists('infectionMote')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xff7700, 0.6);
      g.fillCircle(4, 4, 4);
      g.generateTexture('infectionMote', 8, 8);
      g.destroy();
    }
    
    // Drifting orange motes
    this.particles = scene.add.particles(x + width / 2, y + height / 2, 'infectionMote', {
      x: { min: -width / 2, max: width / 2 },
      y: { min: -height / 2, max: height / 2 },
      speed: { min: 5, max: 15 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.3, end: 0.8 },
      alpha: { start: 0, end: 0.5, ease: 'Sine.easeInOut' },
      lifespan: 4000,
      gravityY: -10,
      frequency: 200,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD
    });
  }

  stop(): void {
    this.particles.stop();
  }
}
