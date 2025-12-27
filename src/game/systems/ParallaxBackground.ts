import Phaser from 'phaser';

/**
 * Parallax Background System
 * Creates layered backgrounds with ruined pillar silhouettes
 * Uses deep blues, cool grays, and muted purples
 */
export class ParallaxBackground {
  private scene: Phaser.Scene;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private camera: Phaser.Cameras.Scene2D.Camera;
  
  // Color palette
  private static readonly COLORS = {
    deepBlue: 0x0a0e18,
    midBlue: 0x141a28,
    coolGray: 0x1a2030,
    mutedPurple: 0x1e1828,
    pillarDark: 0x0c1018,
    pillarMid: 0x141820,
    pillarLight: 0x1c2230,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.createTextures();
    this.createLayers();
  }

  private createTextures(): void {
    // Far background - deep blue gradient with distant pillars
    if (!this.scene.textures.exists('bg_far')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      // Gradient background
      for (let y = 0; y < 600; y++) {
        const ratio = y / 600;
        const r = Math.floor(10 + ratio * 8);
        const gVal = Math.floor(14 + ratio * 6);
        const b = Math.floor(24 + ratio * 10);
        g.fillStyle(Phaser.Display.Color.GetColor(r, gVal, b));
        g.fillRect(0, y, 400, 1);
      }
      
      // Distant pillar silhouettes
      g.fillStyle(ParallaxBackground.COLORS.pillarDark, 0.3);
      this.drawPillarSilhouette(g, 50, 200, 30, 400);
      this.drawPillarSilhouette(g, 150, 280, 25, 320);
      this.drawPillarSilhouette(g, 280, 220, 35, 380);
      this.drawPillarSilhouette(g, 350, 300, 20, 300);
      
      g.generateTexture('bg_far', 400, 600);
      g.destroy();
    }
    
    // Mid background - cool gray with broken pillars
    if (!this.scene.textures.exists('bg_mid')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      // Transparent layer
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, 600, 600);
      
      // Mid-distance pillars with more detail
      g.fillStyle(ParallaxBackground.COLORS.pillarMid, 0.5);
      this.drawRuinedPillar(g, 80, 180, 40, 420);
      this.drawRuinedPillar(g, 220, 250, 35, 350);
      this.drawRuinedPillar(g, 400, 200, 45, 400);
      this.drawRuinedPillar(g, 520, 280, 30, 320);
      
      // Add some broken arches
      g.fillStyle(ParallaxBackground.COLORS.pillarMid, 0.4);
      this.drawBrokenArch(g, 150, 180, 100, 60);
      this.drawBrokenArch(g, 450, 200, 120, 70);
      
      g.generateTexture('bg_mid', 600, 600);
      g.destroy();
    }
    
    // Near background - muted purple with detailed ruins
    if (!this.scene.textures.exists('bg_near')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      // Transparent layer
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, 800, 600);
      
      // Near pillars with detail
      g.fillStyle(ParallaxBackground.COLORS.pillarLight, 0.6);
      this.drawDetailedPillar(g, 100, 150, 50, 450);
      this.drawDetailedPillar(g, 350, 200, 55, 400);
      this.drawDetailedPillar(g, 600, 180, 45, 420);
      this.drawDetailedPillar(g, 750, 250, 40, 350);
      
      // Hanging chains/vines silhouettes
      g.lineStyle(2, ParallaxBackground.COLORS.pillarLight, 0.4);
      this.drawHangingElement(g, 180, 50, 150);
      this.drawHangingElement(g, 450, 80, 120);
      this.drawHangingElement(g, 680, 60, 140);
      
      g.generateTexture('bg_near', 800, 600);
      g.destroy();
    }
  }

  private drawPillarSilhouette(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
    // Simple pillar shape
    g.fillRect(x, y, width, height);
    // Decorative top
    g.fillRect(x - 5, y, width + 10, 15);
  }

  private drawRuinedPillar(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
    // Main pillar body
    g.fillRect(x, y, width, height);
    
    // Decorative capital (top)
    g.fillRect(x - 8, y, width + 16, 20);
    g.fillRect(x - 4, y + 20, width + 8, 10);
    
    // Broken/cracked top
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + width * 0.3, y - 15);
    g.lineTo(x + width * 0.5, y - 5);
    g.lineTo(x + width * 0.7, y - 20);
    g.lineTo(x + width, y);
    g.closePath();
    g.fillPath();
  }

  private drawDetailedPillar(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
    // Base
    g.fillRect(x - 5, y + height - 30, width + 10, 30);
    
    // Main shaft with segments
    const segmentHeight = height / 5;
    for (let i = 0; i < 5; i++) {
      const segY = y + i * segmentHeight;
      g.fillRect(x, segY, width, segmentHeight - 3);
    }
    
    // Ornate capital
    g.fillRect(x - 10, y, width + 20, 25);
    g.fillRect(x - 6, y + 25, width + 12, 15);
    
    // Cracks
    g.lineStyle(1, 0x0a0e18, 0.5);
    g.lineBetween(x + 10, y + 50, x + 5, y + 120);
    g.lineBetween(x + width - 10, y + 80, x + width - 15, y + 150);
  }

  private drawBrokenArch(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
    // Left pillar stub
    g.fillRect(x, y, 20, height + 50);
    
    // Right pillar stub  
    g.fillRect(x + width - 20, y, 20, height + 30);
    
    // Broken arch - approximated with line segments
    g.beginPath();
    g.moveTo(x + 20, y);
    g.lineTo(x + width / 4, y - height * 0.6);
    g.lineTo(x + width / 2 - 10, y + 20);
    g.lineTo(x + 20, y + 10);
    g.closePath();
    g.fillPath();
  }

  private drawHangingElement(g: Phaser.GameObjects.Graphics, x: number, startY: number, length: number): void {
    // Wavy hanging line (chain or vine)
    g.beginPath();
    g.moveTo(x, startY);
    
    for (let i = 0; i < length; i += 10) {
      const wave = Math.sin(i * 0.1) * 5;
      g.lineTo(x + wave, startY + i);
    }
    
    g.strokePath();
  }

  private createLayers(): void {
    const width = this.scene.scale.width * 3;
    const height = this.scene.scale.height;
    
    // Far layer (slowest parallax)
    const farLayer = this.scene.add.tileSprite(0, 0, width, height, 'bg_far');
    farLayer.setOrigin(0, 0);
    farLayer.setScrollFactor(0);
    farLayer.setDepth(-100);
    this.layers.push(farLayer);
    
    // Mid layer
    const midLayer = this.scene.add.tileSprite(0, 0, width, height, 'bg_mid');
    midLayer.setOrigin(0, 0);
    midLayer.setScrollFactor(0);
    midLayer.setDepth(-50);
    midLayer.setAlpha(0.7);
    this.layers.push(midLayer);
    
    // Near layer (fastest parallax)
    const nearLayer = this.scene.add.tileSprite(0, 0, width, height, 'bg_near');
    nearLayer.setOrigin(0, 0);
    nearLayer.setScrollFactor(0);
    nearLayer.setDepth(-25);
    nearLayer.setAlpha(0.5);
    this.layers.push(nearLayer);
  }

  update(): void {
    const camX = this.camera.scrollX;
    const camY = this.camera.scrollY;
    
    // Parallax speeds (0 = static, 1 = moves with camera)
    const speeds = [0.1, 0.3, 0.5];
    
    this.layers.forEach((layer, index) => {
      layer.tilePositionX = camX * speeds[index];
      layer.tilePositionY = camY * speeds[index] * 0.5;
    });
  }

  destroy(): void {
    this.layers.forEach(layer => layer.destroy());
    this.layers = [];
  }
}
