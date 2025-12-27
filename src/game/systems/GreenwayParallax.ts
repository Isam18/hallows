import Phaser from 'phaser';

/**
 * Greenway Parallax Background System
 * Multi-layered backgrounds with giant leaves, vines, and massive trees
 * Color palette: vibrant greens, deep browns, pops of orange
 */
export class GreenwayParallax {
  private scene: Phaser.Scene;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private camera: Phaser.Cameras.Scene2D.Camera;
  
  private static readonly COLORS = {
    deepGreen: 0x0a1810,
    forestGreen: 0x1a2818,
    mossGreen: 0x2a3a28,
    leafGreen: 0x4a6a48,
    brightGreen: 0x6a9a68,
    brown: 0x3a2a1a,
    darkBrown: 0x2a1a10,
    orange: 0xcc6633,
    orangeGlow: 0xff8844,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.createTextures();
    this.createLayers();
  }

  private createTextures(): void {
    // Far background - massive tree silhouettes
    if (!this.scene.textures.exists('greenway_bg_far')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      // Deep forest gradient
      for (let y = 0; y < 600; y++) {
        const ratio = y / 600;
        const r = Math.floor(10 + ratio * 15);
        const gVal = Math.floor(24 + ratio * 20);
        const b = Math.floor(16 + ratio * 10);
        g.fillStyle(Phaser.Display.Color.GetColor(r, gVal, b));
        g.fillRect(0, y, 400, 1);
      }
      
      // Massive tree silhouettes
      g.fillStyle(GreenwayParallax.COLORS.darkBrown, 0.4);
      this.drawGiantTree(g, 50, 100, 80);
      this.drawGiantTree(g, 200, 120, 60);
      this.drawGiantTree(g, 320, 80, 90);
      
      g.generateTexture('greenway_bg_far', 400, 600);
      g.destroy();
    }
    
    // Mid background - hanging vines and large leaves
    if (!this.scene.textures.exists('greenway_bg_mid')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, 600, 600);
      
      // Hanging vines
      g.fillStyle(GreenwayParallax.COLORS.forestGreen, 0.6);
      for (let i = 0; i < 8; i++) {
        this.drawHangingVine(g, 50 + i * 75, 0, 150 + Math.random() * 200);
      }
      
      // Large leaf silhouettes
      g.fillStyle(GreenwayParallax.COLORS.mossGreen, 0.5);
      this.drawGiantLeaf(g, 100, 200, 60, 40);
      this.drawGiantLeaf(g, 300, 150, 80, 50);
      this.drawGiantLeaf(g, 500, 250, 70, 45);
      
      // Orange infection spots
      g.fillStyle(GreenwayParallax.COLORS.orange, 0.3);
      g.fillCircle(150, 400, 20);
      g.fillCircle(450, 350, 25);
      
      g.generateTexture('greenway_bg_mid', 600, 600);
      g.destroy();
    }
    
    // Near background - detailed vines and branches
    if (!this.scene.textures.exists('greenway_bg_near')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, 800, 600);
      
      // Dense vine curtains
      g.fillStyle(GreenwayParallax.COLORS.leafGreen, 0.4);
      for (let i = 0; i < 10; i++) {
        this.drawHangingVine(g, 30 + i * 80, 0, 100 + Math.random() * 150);
      }
      
      // Detailed branch silhouettes
      g.lineStyle(4, GreenwayParallax.COLORS.brown, 0.5);
      this.drawBranch(g, 100, 50, 200);
      this.drawBranch(g, 500, 80, 180);
      this.drawBranch(g, 700, 40, 160);
      
      // Flower/fungus accents
      g.fillStyle(GreenwayParallax.COLORS.orangeGlow, 0.4);
      for (let i = 0; i < 5; i++) {
        g.fillCircle(100 + i * 150 + Math.random() * 50, 400 + Math.random() * 100, 8);
      }
      
      g.generateTexture('greenway_bg_near', 800, 600);
      g.destroy();
    }
  }

  private drawGiantTree(g: Phaser.GameObjects.Graphics, x: number, startY: number, width: number): void {
    // Trunk
    g.fillRect(x, startY, width, 600 - startY);
    
    // Roots spreading at bottom
    g.beginPath();
    g.moveTo(x - 20, 600);
    g.lineTo(x, 500);
    g.lineTo(x + width, 500);
    g.lineTo(x + width + 20, 600);
    g.closePath();
    g.fillPath();
    
    // Canopy at top
    g.fillCircle(x + width / 2, startY - 30, width * 0.8);
    g.fillCircle(x + width / 2 - 30, startY, width * 0.5);
    g.fillCircle(x + width / 2 + 30, startY, width * 0.5);
  }

  private drawHangingVine(g: Phaser.GameObjects.Graphics, x: number, startY: number, length: number): void {
    g.lineStyle(3, GreenwayParallax.COLORS.forestGreen, 0.6);
    g.beginPath();
    g.moveTo(x, startY);
    
    // Wavy vine
    for (let i = 0; i < length; i += 10) {
      const wave = Math.sin(i * 0.08) * 15;
      g.lineTo(x + wave, startY + i);
    }
    g.strokePath();
    
    // Leaves on vine
    for (let i = 30; i < length; i += 40) {
      const leafX = x + Math.sin(i * 0.08) * 15;
      g.fillStyle(GreenwayParallax.COLORS.leafGreen, 0.5);
      g.fillEllipse(leafX + 8, startY + i, 12, 6);
    }
  }

  private drawGiantLeaf(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
    g.beginPath();
    g.moveTo(x, y + height / 2);
    g.lineTo(x + width * 0.3, y);
    g.lineTo(x + width, y + height / 2);
    g.lineTo(x + width * 0.3, y + height);
    g.closePath();
    g.fillPath();
    
    // Leaf vein
    g.lineStyle(2, GreenwayParallax.COLORS.darkBrown, 0.3);
    g.lineBetween(x, y + height / 2, x + width, y + height / 2);
  }

  private drawBranch(g: Phaser.GameObjects.Graphics, x: number, y: number, length: number): void {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + length * 0.4, y + 30);
    g.lineTo(x + length * 0.7, y + 20);
    g.lineTo(x + length, y + 50);
    g.strokePath();
    
    // Sub-branches
    g.lineBetween(x + length * 0.4, y + 30, x + length * 0.3, y + 80);
    g.lineBetween(x + length * 0.7, y + 20, x + length * 0.8, y + 70);
  }

  private createLayers(): void {
    const width = this.scene.scale.width * 3;
    const height = this.scene.scale.height;
    
    // Far layer
    const farLayer = this.scene.add.tileSprite(0, 0, width, height, 'greenway_bg_far');
    farLayer.setOrigin(0, 0);
    farLayer.setScrollFactor(0);
    farLayer.setDepth(-100);
    this.layers.push(farLayer);
    
    // Mid layer
    const midLayer = this.scene.add.tileSprite(0, 0, width, height, 'greenway_bg_mid');
    midLayer.setOrigin(0, 0);
    midLayer.setScrollFactor(0);
    midLayer.setDepth(-50);
    midLayer.setAlpha(0.7);
    this.layers.push(midLayer);
    
    // Near layer
    const nearLayer = this.scene.add.tileSprite(0, 0, width, height, 'greenway_bg_near');
    nearLayer.setOrigin(0, 0);
    nearLayer.setScrollFactor(0);
    nearLayer.setDepth(-25);
    nearLayer.setAlpha(0.5);
    this.layers.push(nearLayer);
  }

  update(): void {
    const camX = this.camera.scrollX;
    const camY = this.camera.scrollY;
    
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
