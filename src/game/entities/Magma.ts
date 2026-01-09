import Phaser from 'phaser';
import { Player } from './Player';

export class Magma extends Phaser.GameObjects.Sprite {
  private playerContactTime = 0;
  private damageThreshold = 2000; // 2 seconds initially
  private playerWasInContact = false;
  private jumpCount = 0;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    super(scene, x + width / 2, y + height / 2, 'pixel'); // Use default key, will be replaced by graphics
    
    // Set size
    this.setDisplaySize(width, height);
    this.setSize(width, height);
    
    // Enable static physics
    this.setOrigin(0.5);
    scene.physics.add.existing(this, true);
    
    // Set depth
    this.setDepth(3);
    
    // Create magma visual effect
    this.createMagmaVisuals(scene, x, y, width, height);
  }
  
  private createMagmaVisuals(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Main magma body - solid dark rock color
    const magmaBody = scene.add.rectangle(x + width / 2, y + height / 2, width, height, 0x2a2020, 0.95);
    magmaBody.setDepth(1);
    
    // Add subtle red-orange glow from within
    const innerGlow = scene.add.rectangle(x + width / 2, y + height / 2, width - 10, height - 5, 0x4a3030, 0.5);
    innerGlow.setDepth(2);
    
    // Add solid rock texture patches
    for (let i = 0; i < Math.floor(width / 30); i++) {
      const rockX = x + 15 + i * 30 + Phaser.Math.Between(-10, 10);
      const rockSize = 15 + Phaser.Math.Between(-5, 8);
      const rock = scene.add.circle(rockX, y + height / 2 + Phaser.Math.Between(-5, 5), rockSize, 0x3a3030, 0.7);
      rock.setDepth(2);
    }
    
    // Glowing magma cracks running through the platform
    const crackCount = Math.floor(width / 60);
    for (let i = 0; i < crackCount; i++) {
      const crackX = x + 40 + i * 60;
      const crackPoints = [
        { x: crackX, y: y + 5 },
        { x: crackX + Phaser.Math.Between(-10, 10), y: y + height / 2 },
        { x: crackX + Phaser.Math.Between(-5, 5), y: y + height - 5 }
      ];
      
      const crack = scene.add.line(0, 0, crackPoints[0].x, crackPoints[0].y, crackPoints[1].x, crackPoints[1].y, 0xff4422, 0.8);
      crack.setStrokeStyle(3, 0xff6633);
      crack.setDepth(3);
      
      const crack2 = scene.add.line(0, 0, crackPoints[1].x, crackPoints[1].y, crackPoints[2].x, crackPoints[2].y, 0xff4422, 0.8);
      crack2.setStrokeStyle(3, 0xff6633);
      crack2.setDepth(3);
      
      // Pulsing glow on cracks
      const crackGlow = scene.add.ellipse(crackX, y + height / 2, 20, height - 15, 0xff6633, 0.3);
      crackGlow.setDepth(2);
      
      scene.tweens.add({
        targets: crackGlow,
        alpha: { from: 0.2, to: 0.5 },
        duration: 1500 + i * 200,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Small glowing embers trapped in the rock
    for (let i = 0; i < Math.floor(width / 40); i++) {
      const emberX = x + 20 + i * 40 + Phaser.Math.Between(-15, 15);
      const emberY = y + height / 2 + Phaser.Math.Between(-height / 4, height / 4);
      const emberSize = 3 + Phaser.Math.Between(0, 3);
      
      const ember = scene.add.circle(emberX, emberY, emberSize, 0xff5533, 0.9);
      ember.setDepth(4);
      
      // Subtle flickering
      scene.tweens.add({
        targets: ember,
        alpha: { from: 0.6, to: 1 },
        scale: { from: 0.8, to: 1.2 },
        duration: 500 + Phaser.Math.Between(0, 300),
        yoyo: true,
        repeat: -1
      });
    }
    
    // Heat shimmer at edges (solid rock effect)
    for (let i = 0; i < Math.floor(width / 50); i++) {
      const shimmerX = x + 25 + i * 50;
      const shimmer = scene.add.rectangle(shimmerX, y + height / 2, 2, height - 10, 0xffaa66, 0.1);
      shimmer.setDepth(5);
      
      scene.tweens.add({
        targets: shimmer,
        alpha: 0.05,
        duration: 2000 + Phaser.Math.Between(0, 1000),
        yoyo: true,
        repeat: -1
      });
    }
    
    // Platform edge highlight (solid rock rim)
    const topEdge = scene.add.rectangle(x + width / 2, y + 2, width, 3, 0x4a3a3a, 0.8);
    topEdge.setDepth(6);
    
    const bottomEdge = scene.add.rectangle(x + width / 2, y + height - 2, width, 3, 0x3a2a2a, 0.8);
    bottomEdge.setDepth(6);
  }
  
  onPlayerContact(player: Player): void {
    const currentTime = this.scene.time.now;
    const isJumping = !player.isOnGround();
    
    // Check if player just landed (wasn't in contact before)
    if (!this.playerWasInContact && !isJumping) {
      // Player just landed on magma - reset contact time
      this.playerContactTime = currentTime;
      this.playerWasInContact = true;
      
      // Apply jump reduction if they've been jumping
      if (this.jumpCount > 0) {
        // Reduce damage threshold by 0.5 seconds for each jump, minimum 1.0s
        const reduction = Math.min(this.jumpCount * 500, 1000);
        this.damageThreshold = 2000 - reduction;
      } else {
        this.damageThreshold = 2000;
      }
      
      return;
    }
    
    // If player jumped, reset contact time and increment jump counter
    if (this.playerWasInContact && isJumping) {
      this.playerContactTime = currentTime;
      this.jumpCount++;
      this.playerWasInContact = false;
      return;
    }
    
    // If player is on magma and was already in contact, check for damage
    if (this.playerWasInContact && !isJumping) {
      const timeOnMagma = currentTime - this.playerContactTime;
      
      if (timeOnMagma >= this.damageThreshold) {
        // Deal damage
        player.takeDamage(1, this.x);
        
        // Reset timer but keep jump count
        this.playerContactTime = currentTime;
        
        // Visual feedback
        this.createDamageSplash();
        
        // Reduce threshold further after taking damage
        if (this.damageThreshold > 1000) {
          this.damageThreshold -= 250;
        }
      }
    }
  }
  
  onPlayerExit(): void {
    this.playerWasInContact = false;
    // Reset jump count when player leaves the platform
    this.jumpCount = 0;
  }
  
  private createDamageSplash(): void {
    const scene = this.scene;
    const centerX = this.x;
    const centerY = this.y;
    
    // Create splash particles
    for (let i = 0; i < 10; i++) {
      const particle = scene.add.circle(
        centerX + Phaser.Math.Between(-40, 40),
        centerY,
        10,
        0xff8844,
        0.9
      );
      particle.setDepth(6);
      
      // Animate splash
      const angle = (i / 10) * Math.PI * 2;
      const distance = 50 + Phaser.Math.Between(0, 30);
      const endX = centerX + Math.cos(angle) * distance;
      const endY = centerY + Math.sin(angle) * distance;
      
      scene.tweens.add({
        targets: particle,
        x: endX,
        y: endY,
        scale: 0,
        alpha: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }
}
