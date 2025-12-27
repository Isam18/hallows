import Phaser from 'phaser';
import type { Player } from './Player';

/**
 * Spike hazard - deals damage on contact
 */
export class Spike extends Phaser.Physics.Arcade.Sprite {
  private damage: number = 1;
  private spikeWidth: number;
  
  constructor(scene: Phaser.Scene, x: number, y: number, width: number) {
    super(scene, x + width / 2, y, 'spike');
    
    this.spikeWidth = width;
    
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static
    
    this.setSize(width, 16);
    this.setDisplaySize(width, 20);
  }

  onPlayerContact(player: Player): void {
    if (!player.isInvulnerable()) {
      player.takeDamage(this.damage, this.x);
    }
  }
}

/**
 * Create spike sprite texture
 */
export function createSpikeTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('spike')) return;
  
  const g = scene.make.graphics({ x: 0, y: 0 });
  const spikeCount = 8;
  const spikeWidth = 10;
  const totalWidth = spikeCount * spikeWidth;
  
  // Draw row of spikes
  for (let i = 0; i < spikeCount; i++) {
    const x = i * spikeWidth;
    
    // Spike body
    g.fillStyle(0x3a4050);
    g.beginPath();
    g.moveTo(x, 20);
    g.lineTo(x + spikeWidth / 2, 0);
    g.lineTo(x + spikeWidth, 20);
    g.closePath();
    g.fillPath();
    
    // Spike highlight
    g.fillStyle(0x4a5060, 0.7);
    g.beginPath();
    g.moveTo(x + 2, 18);
    g.lineTo(x + spikeWidth / 2, 3);
    g.lineTo(x + spikeWidth / 2 + 2, 8);
    g.lineTo(x + 4, 18);
    g.closePath();
    g.fillPath();
  }
  
  g.generateTexture('spike', totalWidth, 20);
  g.destroy();
}
