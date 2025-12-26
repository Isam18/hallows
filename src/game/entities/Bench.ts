import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';

export class Bench extends Phaser.Physics.Arcade.Sprite {
  private benchId: string;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string) {
    super(scene, x + 30, y + 22, 'bench');
    this.benchId = id;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setTint(COLORS.bench);
  }

  getSpawnId(): string { return this.benchId; }
}
