import Phaser from 'phaser';
import { Player } from './Player';

export class Lava extends Phaser.GameObjects.Rectangle {
  private active = true;
  private damageCooldown = 0;
  private readonly DAMAGE_COOLDOWN_MS = 500;
  private readonly DAMAGE = 2;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    super(scene, x, y, width, height, 0xff3300);
    
    // Set depth and physics
    this.setDepth(2);
    scene.physics.add.existing(this, true);
    
    // Create lava visual effect
    this.createLavaVisuals(scene, x, y, width, height);
  }
  
  private createLavaVisuals(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Main lava body with gradient
    const lavaBody = scene.add.rectangle(x + width / 2, y + height / 2, width, height, 0xff4400, 0.8);
    lavaBody.setDepth(1);
    
    // Add glow effect
    const glow = scene.add.rectangle(x + width / 2, y + height / 2, width + 20, height + 10, 0xff6600, 0.3);
    glow.setDepth(0);
    
    // Animate glow pulsing
    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.2, to: 0.4 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    
    // Add lava bubbles/particles
    for (let i = 0; i < Math.floor(width / 40); i++) {
      const bubbleX = x + 20 + i * 40 + Phaser.Math.Between(-15, 15);
      const bubbleY = y + height / 2 + Phaser.Math.Between(-height / 4, height / 4);
      
      const bubble = scene.add.circle(bubbleX, bubbleY, 8, 0xff6600, 0.6);
      bubble.setDepth(2);
      
      // Animate bubble rising and popping
      scene.tweens.add({
        targets: bubble,
        y: bubbleY - 40,
        scale: { from: 1, to: 0.5 },
        alpha: 0,
        duration: 2000 + Phaser.Math.Between(0, 1000),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
        onStart: () => {
          bubble.setY(y + height / 2 + Phaser.Math.Between(-height / 4, height / 4));
          bubble.setScale(1);
          bubble.setAlpha(0.6);
        }
      });
    }
    
    // Add heat distortion effect (wavy lines)
    for (let i = 0; i < Math.floor(width / 60); i++) {
      const waveX = x + 30 + i * 60;
      const wave = scene.add.rectangle(waveX, y + height / 2, 3, height - 10, 0xffaa00, 0.2);
      wave.setDepth(3);
      
      scene.tweens.add({
        targets: wave,
        x: waveX + Phaser.Math.Between(-10, 10),
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }
  
  onPlayerContact(player: Player): void {
    if (!this.active) return;
    
    const currentTime = this.scene.time.now;
    
    // Check cooldown
    if (currentTime < this.damageCooldown) return;
    
    // Apply damage
    player.takeDamage(this.DAMAGE, this.x);
    
    // Set cooldown
    this.damageCooldown = currentTime + this.DAMAGE_COOLDOWN_MS;
    
    // Visual feedback - create damage splash
    this.createDamageSplash();
    
    // Knock player up slightly
    player.setVelocityY(-200);
  }
  
  private createDamageSplash(): void {
    const scene = this.scene;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    
    // Create splash particles
    for (let i = 0; i < 8; i++) {
      const particle = scene.add.circle(
        centerX + Phaser.Math.Between(-30, 30),
        centerY,
        8,
        0xff6600,
        0.8
      );
      particle.setDepth(5);
      
      // Animate splash
      const angle = (i / 8) * Math.PI * 2;
      const distance = 40 + Phaser.Math.Between(0, 20);
      const endX = centerX + Math.cos(angle) * distance;
      const endY = centerY + Math.sin(angle) * distance;
      
      scene.tweens.add({
        targets: particle,
        x: endX,
        y: endY,
        scale: 0,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }
}
