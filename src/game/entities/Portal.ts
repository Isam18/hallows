import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';

interface PortalData { target: string; targetSpawn: string; }

export class Portal extends Phaser.Physics.Arcade.Sprite {
  private pdata: PortalData;
  private useCooldown = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, data: PortalData) {
    super(scene, x + width / 2, y + height / 2, 'portal');
    this.pdata = data;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDisplaySize(width, height);
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(width, height);
    this.setTint(COLORS.portal);
    this.setAlpha(0.5);
    scene.tweens.add({ targets: this, alpha: 0.8, duration: 1000, yoyo: true, repeat: -1 });
  }

  getData(): PortalData { return this.pdata; }
  canUse(): boolean { return this.useCooldown <= 0; }
}
