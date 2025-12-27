import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';

interface PortalData { target: string; targetSpawn: string; }

export class Portal extends Phaser.Physics.Arcade.Sprite {
  private pdata: PortalData;
  private useCooldown = 0;
  private static globalCooldown = 0; // Global cooldown to prevent instant re-teleport after scene restart

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
    
    // Set initial cooldown if global cooldown is active (player just teleported)
    if (Portal.globalCooldown > Date.now()) {
      this.useCooldown = 1000; // 1 second cooldown after spawn
    }
  }

  update(delta: number): void {
    if (this.useCooldown > 0) {
      this.useCooldown -= delta;
    }
  }

  getData(): PortalData { return this.pdata; }
  
  canUse(): boolean { 
    // Check both local and global cooldown
    return this.useCooldown <= 0 && Portal.globalCooldown < Date.now(); 
  }
  
  // Set global cooldown when teleporting
  static setGlobalCooldown(): void {
    Portal.globalCooldown = Date.now() + 1000; // 1 second global cooldown
  }
  
  // Trigger use - set local cooldown
  triggerUse(): void {
    this.useCooldown = 1000;
    Portal.setGlobalCooldown();
  }
}
