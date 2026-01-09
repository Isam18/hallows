import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyCombatConfig } from '../core/CombatConfig';

/**
 * AdaptedSkuller - Medium skull creature with horns and cracks
 * Hollow Knight Silksong inspired - shows battle damage/adaptation
 * More aggressive than SkullScuttler, will charge at player
 */
export class AdaptedSkuller extends Enemy {
  private visualElements: Phaser.GameObjects.GameObject[] = [];
  private chargeWindupTimer = 0;
  private isCharging = false;
  private chargeCooldownTimer = 0;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
    this.createVisuals();
  }
  
  private createVisuals(): void {
    // Larger skull body - adapted, battle-worn
    const skullBody = this.scene.add.ellipse(0, 0, 38, 44, 0xf0e8e0);
    skullBody.setDepth(this.depth + 1);
    this.visualElements.push(skullBody);
    
    // Large split horns/crest - distinctive silhouette
    const leftHorn = this.scene.add.polygon(0, 0, [
      -18, -15,  // Base left
      -22, -35,  // Tip
      -8, -20    // Base right
    ], 0xe0d8d0);
    leftHorn.setDepth(this.depth + 1);
    this.visualElements.push(leftHorn);
    
    const rightHorn = this.scene.add.polygon(0, 0, [
      18, -15,   // Base right
      22, -35,   // Tip
      8, -20     // Base left
    ], 0xe0d8d0);
    rightHorn.setDepth(this.depth + 1);
    this.visualElements.push(rightHorn);
    
    // Center crest spike
    const centerCrest = this.scene.add.polygon(0, 0, [
      0, -38,    // Top point
      -6, -18,   // Left base
      6, -18     // Right base
    ], 0xd8d0c8);
    centerCrest.setDepth(this.depth + 1);
    this.visualElements.push(centerCrest);
    
    // Battle crack lines on skull
    const crack1 = this.scene.add.line(0, 0, -10, -5, -6, 8, 0x3a3028);
    crack1.setStrokeStyle(2, 0x3a3028);
    crack1.setDepth(this.depth + 2);
    this.visualElements.push(crack1);
    
    const crack2 = this.scene.add.line(0, 0, 12, -8, 15, 5, 0x3a3028);
    crack2.setStrokeStyle(2, 0x3a3028);
    crack2.setDepth(this.depth + 2);
    this.visualElements.push(crack2);
    
    // Large hollow eye sockets
    const leftEye = this.scene.add.ellipse(-10, -5, 14, 18, 0x0a0a0e);
    leftEye.setDepth(this.depth + 2);
    this.visualElements.push(leftEye);
    
    const rightEye = this.scene.add.ellipse(10, -5, 14, 18, 0x0a0a0e);
    rightEye.setDepth(this.depth + 2);
    this.visualElements.push(rightEye);
    
    // Bright orange-red pupils - more aggressive
    const leftPupil = this.scene.add.circle(-10, -5, 4, 0xff5500);
    leftPupil.setDepth(this.depth + 3);
    leftPupil.setAlpha(0.9);
    this.visualElements.push(leftPupil);
    
    const rightPupil = this.scene.add.circle(10, -5, 4, 0xff5500);
    rightPupil.setDepth(this.depth + 3);
    rightPupil.setAlpha(0.9);
    this.visualElements.push(rightPupil);
    
    // Pupil glow effect
    const leftGlow = this.scene.add.circle(-10, -5, 7, 0xff4400);
    leftGlow.setDepth(this.depth + 2);
    leftGlow.setAlpha(0.3);
    this.visualElements.push(leftGlow);
    
    const rightGlow = this.scene.add.circle(10, -5, 7, 0xff4400);
    rightGlow.setDepth(this.depth + 2);
    rightGlow.setAlpha(0.3);
    this.visualElements.push(rightGlow);
    
    // Strong jaw
    const jaw = this.scene.add.ellipse(0, 12, 24, 14, 0xe8e0d8);
    jaw.setDepth(this.depth + 1);
    this.visualElements.push(jaw);
    
    // Multiple sharp teeth
    for (let i = 0; i < 6; i++) {
      const toothX = -10 + i * 4;
      const tooth = this.scene.add.triangle(
        toothX, 14,
        -2, 0,
        2, 0,
        0, 6,
        0xf8f0e8
      );
      tooth.setDepth(this.depth + 2);
      this.visualElements.push(tooth);
    }
    
    // Sturdy spider legs - 6 legs
    const legConfigs = [
      { x: -14, y: 18, length: 14, angle: -30 },
      { x: 14, y: 18, length: 14, angle: 30 },
      { x: -10, y: 22, length: 12, angle: -15 },
      { x: 10, y: 22, length: 12, angle: 15 },
      { x: -6, y: 24, length: 10, angle: -5 },
      { x: 6, y: 24, length: 10, angle: 5 }
    ];
    
    legConfigs.forEach(cfg => {
      const leg = this.scene.add.rectangle(cfg.x, cfg.y, 3, cfg.length, 0x2a2a2a);
      leg.setAngle(cfg.angle);
      leg.setDepth(this.depth);
      this.visualElements.push(leg);
    });
    
    this.setAlpha(0);
  }
  
  update(time: number, delta: number, player: any): void {
    super.update(time, delta, player);
    
    // Update charge behavior
    this.updateChargeBehavior(delta, player);
    
    // Position visual elements
    this.updateVisualPositions();
  }
  
  private updateChargeBehavior(delta: number, player: any): void {
    if (this.isDying() || this.isInvulnerable()) return;
    
    if (this.chargeWindupTimer > 0) {
      this.chargeWindupTimer -= delta;
    }
    if (this.chargeCooldownTimer > 0) {
      this.chargeCooldownTimer -= delta;
    }
    
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const isFacingPlayer = (this.flipX && player.x < this.x) || (!this.flipX && player.x > this.x);
    
    // Start charge if in range and facing player
    if (dist < 180 && isFacingPlayer && this.chargeCooldownTimer <= 0 && !this.isCharging && this.chargeWindupTimer <= 0) {
      this.chargeWindupTimer = 400;
      this.isCharging = true;
    }
    
    // Execute charge
    if (this.chargeWindupTimer <= 0 && this.isCharging) {
      this.performCharge();
      this.isCharging = false;
      this.chargeCooldownTimer = 2000;
    }
  }
  
  private performCharge(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const chargeDir = this.flipX ? -1 : 1;
    body.setVelocityX(chargeDir * 300);
    
    // Flash effect during charge
    this.visualElements.forEach(el => {
      if ((el as any).setAlpha) {
        this.scene.tweens.add({
          targets: el,
          alpha: 0.5,
          duration: 100,
          yoyo: true,
          repeat: 2
        });
      }
    });
    
    // Stop after short duration
    this.scene.time.delayedCall(250, () => {
      if (this.active) {
        body.setVelocityX(0);
      }
    });
  }
  
  private updateVisualPositions(): void {
    const offsets = [
      { x: 0, y: -8 },      // skull body
      { x: -12, y: -20 },   // left horn
      { x: 12, y: -20 },    // right horn
      { x: 0, y: -25 },     // center crest
      { x: -6, y: -2 },     // crack1
      { x: 12, y: -3 },     // crack2
      { x: -10, y: -10 },   // left eye
      { x: 10, y: -10 },    // right eye
      { x: -10, y: -10 },   // left pupil
      { x: 10, y: -10 },    // right pupil
      { x: -10, y: -10 },   // left glow
      { x: 10, y: -10 },    // right glow
      { x: 0, y: 6 },       // jaw
    ];
    
    // Add teeth offsets
    for (let i = 0; i < 6; i++) {
      offsets.push({ x: -10 + i * 4, y: 10 });
    }
    
    // Add leg offsets
    const legOffsets = [
      { x: -14, y: 15 }, { x: 14, y: 15 },
      { x: -10, y: 18 }, { x: 10, y: 18 },
      { x: -6, y: 20 }, { x: 6, y: 20 }
    ];
    offsets.push(...legOffsets);
    
    this.visualElements.forEach((el, i) => {
      if (offsets[i]) {
        const flipMult = this.flipX ? -1 : 1;
        (el as any).setPosition(
          this.x + offsets[i].x * flipMult,
          this.y + offsets[i].y
        );
      }
    });
  }
  
  destroy(fromScene?: boolean): void {
    this.visualElements.forEach(el => el.destroy());
    this.visualElements = [];
    super.destroy(fromScene);
  }
}
