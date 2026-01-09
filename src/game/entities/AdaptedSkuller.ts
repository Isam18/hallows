import Phaser from 'phaser';
import { Enemy, EnemyCombatConfig } from './Enemy';

export class AdaptedSkuller extends Enemy {
  private chargeWindupTimer = 0;
  private isCharging = false;
  private chargeCooldownTimer = 0;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
  }
  
  protected createVisuals(): void {
    // Larger, more menacing skull - adapted variant
    const skullBody = this.scene.add.ellipse(0, -5, 45, 52, 0xf0e8e0);
    skullBody.setDepth(2);
    this.add(skullBody);
    
    // Cracks in skull - showing adaptation/damage
    const crack1 = this.scene.add.line(-12, -8, -8, -15, -5, 0, 0x3a3028);
    crack1.setStrokeStyle(2, 0x3a3028);
    crack1.setDepth(3);
    this.add(crack1);
    
    const crack2 = this.scene.add.line(15, -12, 12, -20, 18, 0, 0x3a3028);
    crack2.setStrokeStyle(2, 0x3a3028);
    crack2.setDepth(3);
    this.add(crack2);
    
    // Large hollow eye sockets
    const leftEye = this.scene.add.ellipse(-12, -12, 16, 20, 0x0a0a0e);
    leftEye.setDepth(3);
    this.add(leftEye);
    
    const rightEye = this.scene.add.ellipse(12, -12, 16, 20, 0x0a0a0e);
    rightEye.setDepth(3);
    this.add(rightEye);
    
    // Bright glowing orange pupils - more aggressive
    const leftPupil = this.scene.add.circle(-12, -12, 4, 0xff6600);
    leftPupil.setDepth(4);
    leftPupil.setAlpha(0.9);
    this.add(leftPupil);
    
    const rightPupil = this.scene.add.circle(12, -12, 4, 0xff6600);
    rightPupil.setDepth(4);
    rightPupil.setAlpha(0.9);
    this.add(rightPupil);
    
    // Glow around pupils
    const leftGlow = this.scene.add.circle(-12, -12, 8, 0xff4400);
    leftGlow.setDepth(3);
    leftGlow.setAlpha(0.3);
    this.add(leftGlow);
    
    const rightGlow = this.scene.add.circle(12, -12, 8, 0xff4400);
    rightGlow.setDepth(3);
    rightGlow.setAlpha(0.3);
    this.add(rightGlow);
    
    // Powerful jaw with many teeth
    const jaw = this.scene.add.ellipse(0, 15, 30, 18, 0xe8e0d8);
    jaw.setDepth(2);
    this.add(jaw);
    
    // Multiple sharp teeth - more aggressive
    for (let i = 0; i < 8; i++) {
      const toothX = -14 + i * 4;
      const tooth = this.scene.add.triangle(
        toothX, 18,
        toothX - 2, 24,
        toothX + 2, 24,
        0xf8f0e8
      );
      tooth.setDepth(3);
      this.add(tooth);
    }
    
    // Ornate skull crest - shows adaptation
    const crestBase = this.scene.add.triangle(
      0, -28,
      -12, -38,
      12, -38,
      0xe0d8d0
    );
    crestBase.setDepth(2);
    this.add(crestBase);
    
    const crestTip = this.scene.add.triangle(
      0, -35,
      -6, -42,
      6, -42,
      0xd8d0c8
    );
    crestTip.setDepth(2);
    this.add(crestTip);
    
    // Curved horn-like protrusions
    const leftHorn = this.scene.add.ellipse(-15, -32, 8, 18, 0xd8d0c8);
    leftHorn.setAngle(-0.3);
    leftHorn.setDepth(2);
    this.add(leftHorn);
    
    const rightHorn = this.scene.add.ellipse(15, -32, 8, 18, 0xd8d0c8);
    rightHorn.setAngle(0.3);
    rightHorn.setDepth(2);
    this.add(rightHorn);
    
    // Multiple segmented legs - adapted for speed
    const legPositions = [
      { x: -14, y: 22, width: 4, length: 14, angle: -0.4 },
      { x: 14, y: 22, width: 4, length: 14, angle: 0.4 },
      { x: -10, y: 26, width: 3, length: 12, angle: -0.2 },
      { x: 10, y: 26, width: 3, length: 12, angle: 0.2 },
      { x: -6, y: 28, width: 3, length: 10, angle: -0.1 },
      { x: 6, y: 28, width: 3, length: 10, angle: 0.1 }
    ];
    
    legPositions.forEach((pos) => {
      const leg = this.scene.add.rectangle(pos.x, pos.y, pos.width, pos.length, 0xb0a8a0);
      leg.setDepth(1);
      leg.setAngle(pos.angle * 180 / Math.PI);
      this.add(leg);
    });
  }
  
  protected updateBehavior(time: number, delta: number, player: Phaser.GameObjects.Sprite): void {
    if (this.isDying() || this.isInvulnerable()) return;
    
    // Update timers
    if (this.chargeWindupTimer > 0) {
      this.chargeWindupTimer -= delta;
    }
    if (this.chargeCooldownTimer > 0) {
      this.chargeCooldownTimer -= delta;
    }
    
    // Check if player is in aggro range and facing this enemy
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const isFacingPlayer = (this.flipX && player.x < this.x) || (!this.flipX && player.x > this.x);
    
    // Start charge windup if in range and facing player
    if (dist < 200 && isFacingPlayer && this.chargeCooldownTimer <= 0 && !this.isCharging && this.chargeWindupTimer <= 0) {
      this.chargeWindupTimer = 400; // 0.4s windup
      this.isCharging = true;
    }
    
    // Execute charge after windup
    if (this.chargeWindupTimer <= 0 && this.isCharging) {
      this.performCharge();
      this.isCharging = false;
      this.chargeCooldownTimer = 2000; // 2s cooldown
    }
  }
  
  private performCharge(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const chargeDir = this.flipX ? -1 : 1;
    body.setVelocityX(chargeDir * 350); // Quick lunge
    
    // Visual feedback - flash orange
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 3
    });
    
    // Stop charge after short duration
    this.scene.time.delayedCall(300, () => {
      if (this.active) {
        body.setVelocityX(0);
      }
    });
  }
}
