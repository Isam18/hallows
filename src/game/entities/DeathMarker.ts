import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';

export class DeathMarker extends Phaser.Physics.Arcade.Sprite {
  private shellAmount: number;
  private collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, amount: number) {
    super(scene, x, y, 'deathMarker');
    this.shellAmount = amount;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setTint(COLORS.shellGlow);
    scene.tweens.add({ targets: this, scale: 1.2, alpha: 0.6, duration: 800, yoyo: true, repeat: -1 });
  }

  update(): void {}
  collect(): void { this.collected = true; }
  getAmount(): number { return this.shellAmount; }
  isCollected(): boolean { return this.collected; }
}
