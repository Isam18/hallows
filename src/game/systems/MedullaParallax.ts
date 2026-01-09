import Phaser from 'phaser';

export class MedullaParallax {
  private scene: Phaser.Scene;
  private farLayers: Phaser.GameObjects.TileSprite[] = [];
  private midLayers: Phaser.GameObjects.TileSprite[] = [];
  private nearLayers: Phaser.GameObjects.TileSprite[] = [];
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createParallaxLayers();
  }
  
  private createParallaxLayers(): void {
    const width = 800;
    const height = 900;
    
    // Far layer - distant volcanic mountains
    const farLayer = this.scene.add.tileSprite(0, height / 2, width, height * 0.7, 'medulla-far-bg');
    farLayer.setScrollFactor(0.1);
    farLayer.setDepth(-14);
    farLayer.setOrigin(0, 0.5);
    this.farLayers.push(farLayer);
    
    // Mid layer - closer rock formations and pillars
    const midLayer = this.scene.add.tileSprite(0, height / 2, width, height * 0.8, 'medulla-mid-bg');
    midLayer.setScrollFactor(0.3);
    midLayer.setDepth(-13);
    midLayer.setOrigin(0, 0.5);
    this.midLayers.push(midLayer);
    
    // Near layer - foreground rocks and obsidian shards
    const nearLayer = this.scene.add.tileSprite(0, height / 2, width, height * 0.9, 'medulla-near-bg');
    nearLayer.setScrollFactor(0.5);
    nearLayer.setDepth(-12);
    nearLayer.setOrigin(0, 0.5);
    this.nearLayers.push(nearLayer);
    
    // Create procedural backgrounds since we don't have images
    this.createProceduralLayers();
  }
  
  private createProceduralLayers(): void {
    const width = 800;
    const height = 900;
    
    // Far layer - distant volcano silhouettes
    const farGraphics = this.scene.add.graphics();
    farGraphics.setDepth(-14);
    
    // Distant volcanic mountains
    farGraphics.fillStyle(0x1a0404);
    farGraphics.beginPath();
    farGraphics.moveTo(0, height);
    for (let x = 0; x <= width; x += 20) {
      const y = height * 0.3 + Math.sin(x * 0.01) * 100 + Math.random() * 20;
      farGraphics.lineTo(x, y);
    }
    farGraphics.lineTo(width, height);
    farGraphics.closePath();
    farGraphics.fill();
    
    // Glowing volcanic vents
    for (let i = 0; i < 5; i++) {
      const ventX = 100 + i * 150;
      const ventY = height * 0.25 + Math.sin(i * 1.5) * 50;
      const vent = this.scene.add.circle(ventX, ventY, 15, 0xff3300, 0.4);
      vent.setDepth(-13);
      vent.setScrollFactor(0.1);
      
      this.scene.tweens.add({
        targets: vent,
        alpha: { from: 0.2, to: 0.6 },
        duration: 1500 + i * 200,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Mid layer - rock formations
    const midGraphics = this.scene.add.graphics();
    midGraphics.setDepth(-13);
    
    midGraphics.fillStyle(0x2a0808);
    for (let i = 0; i < 8; i++) {
      const formX = i * 100 + 50;
      const formHeight = 150 + Math.random() * 100;
      midGraphics.fillRect(formX, height - formHeight, 40, formHeight);
      
      // Add glowing cracks
      const crack = this.scene.add.rectangle(formX + 20, height - formHeight + 40, 2, 60, 0xff4400, 0.5);
      crack.setDepth(-12);
      crack.setScrollFactor(0.3);
      
      this.scene.tweens.add({
        targets: crack,
        alpha: 0.2,
        duration: 1000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Near layer - obsidian shards
    const nearGraphics = this.scene.add.graphics();
    nearGraphics.setDepth(-12);
    
    for (let i = 0; i < 12; i++) {
      const shardX = Math.random() * width;
      const shardY = height - Math.random() * 200;
      const shardWidth = 20 + Math.random() * 30;
      const shardHeight = 80 + Math.random() * 120;
      
      nearGraphics.fillStyle(0x3a1010);
      nearGraphics.beginPath();
      nearGraphics.moveTo(shardX, shardY);
      nearGraphics.lineTo(shardX + shardWidth, shardY + shardHeight * 0.3);
      nearGraphics.lineTo(shardX + shardWidth * 0.7, shardY + shardHeight);
      nearGraphics.lineTo(shardX - shardWidth * 0.3, shardY + shardHeight * 0.6);
      nearGraphics.closePath();
      nearGraphics.fill();
      
      // Add subtle glow
      const shardGlow = this.scene.add.ellipse(
        shardX + shardWidth * 0.5,
        shardY + shardHeight * 0.5,
        30, 50,
        0xff2200, 0.1
      );
      shardGlow.setDepth(-11);
      shardGlow.setScrollFactor(0.5);
      
      this.scene.tweens.add({
        targets: shardGlow,
        alpha: 0.05,
        duration: 2000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1
      });
    }
  }
  
  update(time: number): void {
    // Slowly scroll parallax layers for subtle movement
    const timeSeconds = time / 1000;
    
    this.farLayers.forEach((layer, index) => {
      layer.tilePositionX = Math.sin(timeSeconds * 0.1 + index) * 5;
    });
    
    this.midLayers.forEach((layer, index) => {
      layer.tilePositionX = Math.sin(timeSeconds * 0.2 + index) * 10;
    });
    
    this.nearLayers.forEach((layer, index) => {
      layer.tilePositionX = Math.sin(timeSeconds * 0.3 + index) * 15;
    });
  }
}
