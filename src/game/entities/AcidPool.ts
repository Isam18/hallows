import Phaser from 'phaser';
import type { Player } from './Player';

/**
 * Acid Pool - Environmental hazard for Greenway
 * Damages player and teleports them back to last safe position
 */
export class AcidPool extends Phaser.GameObjects.Rectangle {
  private damageAmount = 1;
  private bubbleTimer = 0;
  private bubbleInterval = 500;
  private poolWidth: number;
  private poolHeight: number;
  private fogOverlay: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number = 30) {
    // Acid pool visual - bright green
    super(scene, x + width / 2, y + height / 2, width, height, 0x66cc44, 0.8);
    this.poolWidth = width;
    this.poolHeight = height;
    
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    
    this.setDepth(2);
    
    // Add surface highlight
    const highlight = scene.add.rectangle(x + width / 2, y + 3, width, 6, 0x88ee66, 0.9);
    highlight.setDepth(3);
    
    // Glow effect
    const glow = scene.add.rectangle(x + width / 2, y + height / 2, width + 20, height + 10, 0x55aa33, 0.3);
    glow.setDepth(1);
    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.2, to: 0.4 },
      duration: 1500,
      yoyo: true,
      repeat: -1
    });
    
    // Green fog at bottom (near acid)
    this.fogOverlay = scene.add.rectangle(x + width / 2, y - 30, width + 100, 60, 0x44aa44, 0.15);
    this.fogOverlay.setDepth(0);
    scene.tweens.add({
      targets: this.fogOverlay,
      alpha: { from: 0.1, to: 0.25 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });
    
    // Create initial bubbles
    this.createBubbles();
  }

  private createBubbles(): void {
    // Random bubbles
    for (let i = 0; i < 3; i++) {
      this.spawnBubble();
    }
  }

  private spawnBubble(): void {
    const bubbleX = this.x - this.poolWidth / 2 + Math.random() * this.poolWidth;
    const bubble = this.scene.add.circle(bubbleX, this.y - this.poolHeight / 2, 3 + Math.random() * 4, 0xaaffaa, 0.6);
    bubble.setDepth(4);
    
    // Bubble rise animation
    this.scene.tweens.add({
      targets: bubble,
      y: bubble.y - 20 - Math.random() * 30,
      alpha: 0,
      scale: 0.3,
      duration: 800 + Math.random() * 600,
      onComplete: () => bubble.destroy()
    });
  }

  update(time: number, delta: number): void {
    // Spawn bubbles periodically
    this.bubbleTimer += delta;
    if (this.bubbleTimer >= this.bubbleInterval) {
      this.bubbleTimer = 0;
      if (Math.random() < 0.4) {
        this.spawnBubble();
      }
    }
  }

  /**
   * Called when player contacts the acid
   * Returns true if damage was dealt
   */
  onPlayerContact(player: Player, lastSafeX: number, lastSafeY: number): boolean {
    if (player.isInvulnerable()) {
      return false;
    }
    
    // Deal damage (using center of pool as damage source)
    player.takeDamage(this.damageAmount, this.x);
    
    // Check if player died
    const playerData = (player as any).gameScene?.registry?.get?.('playerData');
    const isDead = playerData?.hp <= 0;
    
    if (!isDead) {
      // Teleport to last safe position
      player.setPosition(lastSafeX, lastSafeY);
      (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      
      // Visual feedback - green flash (clearTint is called after 100ms in takeDamage, so we override)
      this.scene.time.delayedCall(120, () => {
        player.setTint(0x66cc44);
        this.scene.time.delayedCall(200, () => {
          player.clearTint();
        });
      });
    }
    
    return true;
  }
}
