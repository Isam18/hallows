import Phaser from 'phaser';

/**
 * The Medulla Parallax Background System
 * 
 * A volcanic, burnt hellscape inspired by Hollow Knight's Silksong
 * 
 * Key visual elements:
 * - Obsidian/basalt architecture with melted tunnels
 * - Jagged black "ribs" on the ceiling
 * - Pulsing orange-white lava veins in the walls
 * - Falling grey ash like snow
 * - Cauterized bodies fused into rock
 * - Warning messages scratched into walls
 * - Eerie silence - no creatures (for now)
 */
export class MedullaParallax {
  private scene: Phaser.Scene;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private camera: Phaser.Cameras.Scene2D.Camera;
  private lavaGlowGraphics: Phaser.GameObjects.Graphics | null = null;
  private lavaVeins: { x: number; y: number; width: number; height: number; phase: number }[] = [];
  private ashParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private bodyGraphics: Phaser.GameObjects.Graphics | null = null;
  private warningTexts: Phaser.GameObjects.Text[] = [];
  
  private static readonly COLORS = {
    pitchBlack: 0x0a0505,
    obsidian: 0x1a0808,
    basalt: 0x2a1010,
    darkRock: 0x3a1515,
    lavaCore: 0xffffee,
    lavaBright: 0xff6600,
    lavaOrange: 0xff4400,
    lavaDark: 0xcc3300,
    ash: 0x888888,
    ashDark: 0x555555,
    charred: 0x2a1a1a,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.createTextures();
    this.createLayers();
    this.createLavaVeins();
    this.createAshParticles();
    this.createCauterizedBodies();
    this.createWarningMessages();
  }

  private createTextures(): void {
    // Far background - deep volcanic gradient with massive basalt ribs
    if (!this.scene.textures.exists('medulla_bg_far')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      // Deep volcanic gradient - pitch black to dark red
      for (let y = 0; y < 600; y++) {
        const ratio = y / 600;
        const r = Math.floor(10 + ratio * 30);
        const gVal = Math.floor(5 + ratio * 8);
        const b = Math.floor(5 + ratio * 5);
        g.fillStyle(Phaser.Display.Color.GetColor(r, gVal, b));
        g.fillRect(0, y, 400, 1);
      }
      
      // Massive basalt rib silhouettes on ceiling
      g.fillStyle(MedullaParallax.COLORS.pitchBlack, 0.9);
      this.drawBasaltRibs(g, 400, 0);
      
      // Distant lava glow at bottom - gradient simulation
      for (let y = 520; y < 600; y++) {
        const ratio = (y - 520) / 80;
        const alpha = 0.1 + ratio * 0.3;
        g.fillStyle(MedullaParallax.COLORS.lavaDark, alpha);
        g.fillRect(0, y, 400, 1);
      }
      g.generateTexture('medulla_bg_far', 400, 600);
      g.destroy();
    }
    
    // Mid background - melted tunnel walls with obsidian glass
    if (!this.scene.textures.exists('medulla_bg_mid')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, 600, 600);
      
      // Jagged melted rock formations
      g.fillStyle(MedullaParallax.COLORS.basalt, 0.6);
      this.drawMeltedWall(g, 0, 100, 80, 500);
      this.drawMeltedWall(g, 520, 80, 80, 520);
      
      // Obsidian glass reflections
      g.fillStyle(0x221515, 0.4);
      for (let i = 0; i < 6; i++) {
        const x = 50 + i * 100;
        const y = 200 + Math.random() * 200;
        g.fillRect(x, y, 3, 80 + Math.random() * 40);
      }
      
      // Scorched marks
      g.fillStyle(0x110808, 0.5);
      for (let i = 0; i < 8; i++) {
        g.fillCircle(
          Math.random() * 600,
          Math.random() * 600,
          10 + Math.random() * 20
        );
      }
      
      g.generateTexture('medulla_bg_mid', 600, 600);
      g.destroy();
    }
    
    // Near background - detailed volcanic details
    if (!this.scene.textures.exists('medulla_bg_near')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, 800, 600);
      
      // More jagged ceiling ribs (closer, more detail)
      g.fillStyle(MedullaParallax.COLORS.obsidian, 0.7);
      this.drawDetailedRibs(g, 800, 0);
      
      // Cracks in the rock
      g.lineStyle(2, MedullaParallax.COLORS.darkRock, 0.4);
      for (let i = 0; i < 10; i++) {
        this.drawCrack(g, 
          Math.random() * 800, 
          100 + Math.random() * 400, 
          50 + Math.random() * 100
        );
      }
      
      // Heat distortion areas (darker spots)
      g.fillStyle(MedullaParallax.COLORS.charred, 0.3);
      for (let i = 0; i < 4; i++) {
        g.fillEllipse(
          100 + i * 200,
          400 + Math.random() * 100,
          60,
          30
        );
      }
      
      g.generateTexture('medulla_bg_near', 800, 600);
      g.destroy();
    }
  }

  private drawBasaltRibs(g: Phaser.GameObjects.Graphics, width: number, startY: number): void {
    // Draw massive jagged ribs hanging from ceiling
    for (let x = 0; x < width; x += 40) {
      const ribHeight = 60 + Math.random() * 100;
      const ribWidth = 20 + Math.random() * 30;
      
      g.beginPath();
      g.moveTo(x, startY);
      g.lineTo(x + ribWidth * 0.3, startY + ribHeight * 0.4);
      g.lineTo(x + ribWidth * 0.5, startY + ribHeight);
      g.lineTo(x + ribWidth * 0.7, startY + ribHeight * 0.4);
      g.lineTo(x + ribWidth, startY);
      g.closePath();
      g.fillPath();
    }
  }

  private drawDetailedRibs(g: Phaser.GameObjects.Graphics, width: number, startY: number): void {
    // More detailed ceiling ribs with crevices
    for (let x = 0; x < width; x += 60) {
      const ribHeight = 40 + Math.random() * 80;
      const ribWidth = 30 + Math.random() * 40;
      
      // Main rib
      g.beginPath();
      g.moveTo(x, startY);
      g.lineTo(x + ribWidth * 0.2, startY + ribHeight * 0.3);
      g.lineTo(x + ribWidth * 0.35, startY + ribHeight * 0.6);
      g.lineTo(x + ribWidth * 0.5, startY + ribHeight);
      g.lineTo(x + ribWidth * 0.65, startY + ribHeight * 0.6);
      g.lineTo(x + ribWidth * 0.8, startY + ribHeight * 0.3);
      g.lineTo(x + ribWidth, startY);
      g.closePath();
      g.fillPath();
    }
  }

  private drawMeltedWall(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
    // Melted, flowing rock texture
    g.beginPath();
    g.moveTo(x, y);
    
    for (let py = y; py < y + height; py += 20) {
      const wave = Math.sin(py * 0.05) * 15 + Math.sin(py * 0.02) * 10;
      g.lineTo(x + wave + width / 2, py);
    }
    
    g.lineTo(x + width, y + height);
    g.lineTo(x + width, y);
    g.closePath();
    g.fillPath();
  }

  private drawCrack(g: Phaser.GameObjects.Graphics, x: number, y: number, length: number): void {
    g.beginPath();
    g.moveTo(x, y);
    
    let cx = x;
    let cy = y;
    
    for (let i = 0; i < length; i += 10) {
      cx += (Math.random() - 0.5) * 15;
      cy += 10;
      g.lineTo(cx, cy);
      
      // Branch cracks
      if (Math.random() < 0.3) {
        const branchLength = 10 + Math.random() * 20;
        const branchDir = Math.random() < 0.5 ? -1 : 1;
        g.lineTo(cx + branchDir * branchLength, cy + 5);
        g.moveTo(cx, cy);
      }
    }
    
    g.strokePath();
  }

  private createLayers(): void {
    const width = this.scene.scale.width * 3;
    const height = this.scene.scale.height;
    
    // Far layer
    const farLayer = this.scene.add.tileSprite(0, 0, width, height, 'medulla_bg_far');
    farLayer.setOrigin(0, 0);
    farLayer.setScrollFactor(0);
    farLayer.setDepth(-100);
    this.layers.push(farLayer);
    
    // Mid layer
    const midLayer = this.scene.add.tileSprite(0, 0, width, height, 'medulla_bg_mid');
    midLayer.setOrigin(0, 0);
    midLayer.setScrollFactor(0);
    midLayer.setDepth(-50);
    midLayer.setAlpha(0.7);
    this.layers.push(midLayer);
    
    // Near layer
    const nearLayer = this.scene.add.tileSprite(0, 0, width, height, 'medulla_bg_near');
    nearLayer.setOrigin(0, 0);
    nearLayer.setScrollFactor(0);
    nearLayer.setDepth(-25);
    nearLayer.setAlpha(0.5);
    this.layers.push(nearLayer);
  }

  private createLavaVeins(): void {
    // Create pulsing lava veins in the walls
    this.lavaGlowGraphics = this.scene.add.graphics();
    this.lavaGlowGraphics.setDepth(-30);
    
    // Generate vein positions
    for (let i = 0; i < 12; i++) {
      this.lavaVeins.push({
        x: Math.random() * 800,
        y: 100 + Math.random() * 600,
        width: 3 + Math.random() * 4,
        height: 80 + Math.random() * 200,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private createAshParticles(): void {
    // Falling ash like grey snow
    if (!this.scene.textures.exists('ash_particle')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x888888);
      g.fillCircle(2, 2, 2);
      g.generateTexture('ash_particle', 4, 4);
      g.destroy();
    }
    
    this.ashParticles = this.scene.add.particles(0, 0, 'ash_particle', {
      x: { min: 0, max: 800 },
      y: -20,
      lifespan: 8000,
      speedY: { min: 15, max: 40 },
      speedX: { min: -10, max: 10 },
      scale: { min: 0.3, max: 1 },
      alpha: { start: 0.6, end: 0 },
      quantity: 1,
      frequency: 100,
      blendMode: 'NORMAL',
    });
    this.ashParticles.setDepth(-20);
  }

  private createCauterizedBodies(): void {
    // Create bodies fused into the walls - reaching hands
    this.bodyGraphics = this.scene.add.graphics();
    this.bodyGraphics.setDepth(-15);
    
    // Draw cauterized explorers in walls
    const bodyPositions = [
      { x: 60, y: 400, flipX: false },
      { x: 740, y: 350, flipX: true },
      { x: 750, y: 600, flipX: true },
    ];
    
    bodyPositions.forEach(pos => {
      this.drawCauterizedBody(pos.x, pos.y, pos.flipX);
    });
  }

  private drawCauterizedBody(x: number, y: number, flipX: boolean): void {
    if (!this.bodyGraphics) return;
    
    const dir = flipX ? -1 : 1;
    const g = this.bodyGraphics;
    
    // Body merged with rock
    g.fillStyle(MedullaParallax.COLORS.charred, 0.8);
    g.fillEllipse(x, y, 30, 50);
    
    // Reaching arm
    g.fillStyle(MedullaParallax.COLORS.darkRock, 0.9);
    g.lineStyle(8, MedullaParallax.COLORS.charred, 0.9);
    g.beginPath();
    g.moveTo(x, y - 20);
    g.lineTo(x + dir * 30, y - 40);
    g.lineTo(x + dir * 50, y - 55);
    g.strokePath();
    
    // Hand with spread fingers
    g.fillStyle(MedullaParallax.COLORS.obsidian, 0.9);
    g.fillCircle(x + dir * 50, y - 55, 8);
    
    // Fingers reaching out
    for (let i = 0; i < 4; i++) {
      const angle = (i - 1.5) * 0.3 + (flipX ? Math.PI : 0);
      const fingerLen = 8 + Math.random() * 4;
      g.lineStyle(2, MedullaParallax.COLORS.obsidian, 0.9);
      g.beginPath();
      g.moveTo(x + dir * 50, y - 55);
      g.lineTo(
        x + dir * 50 + Math.cos(angle) * fingerLen * dir,
        y - 55 - Math.sin(angle) * fingerLen
      );
      g.strokePath();
    }
  }

  private createWarningMessages(): void {
    // Scratched warnings on walls
    const warnings = [
      { x: 200, y: 300, text: '"TURN BACK"', rotation: -0.1 },
      { x: 600, y: 250, text: '"IT IS AWAKE"', rotation: 0.05 },
      { x: 400, y: 550, text: '"GO BACK"', rotation: -0.05 },
    ];
    
    warnings.forEach(w => {
      const text = this.scene.add.text(w.x, w.y, w.text, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#4a3030',
        fontStyle: 'italic',
      });
      text.setRotation(w.rotation);
      text.setAlpha(0.6);
      text.setDepth(-10);
      this.warningTexts.push(text);
    });
  }

  update(time: number): void {
    const camX = this.camera.scrollX;
    const camY = this.camera.scrollY;
    
    const speeds = [0.1, 0.3, 0.5];
    
    // Update parallax layers
    this.layers.forEach((layer, index) => {
      layer.tilePositionX = camX * speeds[index];
      layer.tilePositionY = camY * speeds[index] * 0.5;
    });
    
    // Update ash particles position
    if (this.ashParticles) {
      this.ashParticles.setPosition(camX, camY);
    }
    
    // Update pulsing lava veins
    if (this.lavaGlowGraphics) {
      this.lavaGlowGraphics.clear();
      
      this.lavaVeins.forEach(vein => {
        const pulse = Math.sin(time * 0.002 + vein.phase) * 0.5 + 0.5;
        const adjustedX = vein.x - camX * 0.3;
        
        // Lava glow
        const glowAlpha = 0.3 + pulse * 0.4;
        this.lavaGlowGraphics!.fillStyle(MedullaParallax.COLORS.lavaOrange, glowAlpha * 0.3);
        this.lavaGlowGraphics!.fillEllipse(adjustedX, vein.y, vein.width * 4, vein.height);
        
        // Core vein
        this.lavaGlowGraphics!.fillStyle(MedullaParallax.COLORS.lavaBright, glowAlpha);
        this.lavaGlowGraphics!.fillRect(adjustedX - vein.width / 2, vein.y - vein.height / 2, vein.width, vein.height);
        
        // Bright core
        this.lavaGlowGraphics!.fillStyle(MedullaParallax.COLORS.lavaCore, glowAlpha * 0.5);
        this.lavaGlowGraphics!.fillRect(adjustedX - 1, vein.y - vein.height / 2, 2, vein.height);
      });
    }
  }

  destroy(): void {
    this.layers.forEach(layer => layer.destroy());
    this.layers = [];
    
    if (this.lavaGlowGraphics) {
      this.lavaGlowGraphics.destroy();
      this.lavaGlowGraphics = null;
    }
    
    if (this.ashParticles) {
      this.ashParticles.destroy();
      this.ashParticles = null;
    }
    
    if (this.bodyGraphics) {
      this.bodyGraphics.destroy();
      this.bodyGraphics = null;
    }
    
    this.warningTexts.forEach(t => t.destroy());
    this.warningTexts = [];
  }
}
