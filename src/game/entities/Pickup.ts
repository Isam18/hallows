import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  private amount: number;
  private collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, _type: string, amount: number) {
    super(scene, x, y, 'shell');
    this.amount = amount;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.setTint(COLORS.shell);
    scene.tweens.add({ targets: this, y: y - 5, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    this.scene.tweens.add({ targets: this, y: this.y - 20, alpha: 0, scale: 1.5, duration: 200, onComplete: () => this.destroy() });
  }

  isCollected(): boolean { return this.collected; }
  getAmount(): number { return this.amount; }
}
