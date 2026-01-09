
import Phaser from 'phaser';
import { Enemy, EnemyCombatConfig } from './Enemy';

export class SkullBrute extends Enemy {
  private chargeWindupTimer = 0;
  private chargeDurationTimer = 0;
  private isCharging = false;
  private attackCooldownTimer = 0;
  private originalMoveSpeed: number;
  private isSlowed = false;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
    this.originalMoveSpeed = this.moveSpeed || 120;
  }
  
  protected createVisuals(): void {
    // Large, bulky skull - bruiser type
    const skullBody = this.scene.add.ellipse(0, -5, 60, 70, 0xf0e8e0);
    skullBody.setDepth(2);
    this.add(skullBody);
    
    // Heavy bone structure - thick neck
    const neck = this.scene.add.ellipse(0, 25, 40, 25, 0xe8e0d8);
    neck.setDepth(2);
    this.add(neck);
    
    // Large, hollow eye sockets - menacing but not evil like Ravager
    const leftEye = this.scene.add.ellipse(-18, -10, 20, 24, 0x0a0a0e);
    leftEye.setDepth(3);
    this.add(leftEye);
    
    const rightEye = this.scene.add.ellipse(18, -10, 20, 24, 0x0a0a0e);
    rightEye.setDepth(3);
    this.add(rightEye);
    
    // Red/orange pupils - focused, aggressive
    const leftPupil = this.scene.add.circle(-18, -10, 5, 0xcc4422);
    leftPupil.setDepth(4);
    leftPupil.setAlpha(0.8);
    this.add(leftPupil);
    
    const rightPupil = this.scene.add.circle(18, -10, 5, 0xcc4422);
    rightPupil.setDepth(4);
    rightPupil.setAlpha(0.8);
    this.add(rightPupil);
    
    // Heavy jaw - thick and sturdy
    const jaw = this.scene.add.ellipse(0, 20, 45, 25, 0xe8e0d8);
    jaw.setDepth(2);
    this.add(jaw);
    
    // Large, blunt teeth - designed for crushing
    for (let i = 0; i < 8; i++) {
      const toothX = -18 + i * 5;
      const tooth = this.scene.add.triangle(
        toothX, 22,
        toothX - 2.5, 32,
        toothX + 2.5, 32,
        0xffffff
      );
      tooth.setDepth(3);
      this.add(tooth);
    }
    
    // Heavy brow ridges - brutish appearance
    const leftBrow = this.scene.add.ellipse(-18, -22, 15, 8, 0xd8d0c8);
    leftBrow.setDepth(2);
    this.add(leftBrow);
    
    const rightBrow = this.scene.add.ellipse(18, -22, 15, 8, 0xd8d0c8);
    rightBrow.setDepth(2);
    this.add(rightBrow);
    
    // Small horns - not as ornate as Ravager
    const leftHorn = this.scene.add.ellipse(-22, -32, 8, 18, 0xe0d8d0);
    leftHorn.setAngle(-0.3);
    leftHorn.setDepth(2);
    this.add(leftHorn);
    
    const rightHorn = this.scene.add.ellipse(22, -32, 8, 18, 0xe0d8d0);
    rightHorn.setAngle(0.3);
    rightHorn.setDepth(2);
    this.add(rightHorn);
    
    // Six powerful, thick legs - sturdy and strong
    const legPositions = [
      { x: -20, y: 35, width: 8, length: 22, angle: -0.4 },
      { x: 20, y: 35, width: 8, length: 22, angle: 0.4 },
      { x: -14, y: 40, width: 7, length: 20, angle: -0.2 },
      { x: 14, y: 40, width: 7, length: 20, angle: 0.2 },
      { x: -8, y: 45, width: 6, length: 18, angle: -0.1 },
      { x: 8, y: 45, width: 6, length: 18, angle: 0.1 }
    ];
    
    legPositions.forEach((pos) => {
      const leg = this.scene.add.rectangle(pos.x, pos.y, pos.width, pos.length, 0xb8b0a8);
      leg.setDepth(1);
      leg.setAngle(pos.angle * 180 / Math.PI);
      this.add(leg);
    });
    
    // Armored back plates - tough appearance
    for (let i = 0; i < 4; i++) {
      const plateX = -15 + i * 10;
      const plate = this.scene.add.ellipse(
        plateX, 0,
        8, 12,
        0xd8d0c8
      );
      plate.setDepth(2);
      this.add(plate);
    }
  }
  
  protected updateBehavior(time: number, delta: number, player: Phaser.GameObjects.Sprite): void {
    if (this.isDying() || this.isInvulnerable()) return;
    
    // Update timers
    if (this.chargeWindupTimer > 0) {
      this.chargeWindupTimer -= delta;
    }
    if (this.chargeDurationTimer > 0) {
      this.chargeDurationTimer -= delta;
    }
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
    }
    
    // Check if in slime (would be set by collision with slime pool)
    // For now, we'll use a simple check based on y position in room 3
    const inSlime = this.y > 600 && this.x > 300 && this.x < 900;
    
    if (inSlime && !this.isSlowed) {
      this.moveSpeed = this.originalMoveSpeed * 0.4; // Slowed to 40% speed
      this.isSlowed = true;
      this.setAlpha(0.7); // Visual feedback
    } else if (!inSlime && this.isSlowed) {
      this.moveSpeed = this.originalMoveSpeed;
      this.isSlowed = false;
      this.setAlpha(1.0);
    }
    
    // Decide to charge if cooldown ready and not currently charging
    if (this.attackCooldownTimer <= 0 && !this.isCharging) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      
      // Charge if player is in range
      if (dist < 500) {
        this.chargeWindupTimer = 600; // 0.6s windup - slower than Ravager
        this.isCharging = true;
        this.attackCooldownTimer = 4000; // 4s cooldown
      }
    }
    
    // Execute charge attack
    if (this.chargeWindupTimer <= 0 && this.isCharging) {
      this.performChargeAttack(player);
      this.isCharging = false;
    }
    
    // Stop charging after duration
    if (this.chargeDurationTimer <= 0) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(0);
    }
  }
  
  private performChargeAttack(player: Phaser.GameObjects.Sprite): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Always charge toward player
    const dx = player.x - this.x;
    const chargeDir = dx > 0 ? 1 : -1;
    
    // Flip sprite to face player
    this.flipX = chargeDir === -1;
    
    // Charge speed - slower than Ravager but still dangerous
    const chargeSpeed = this.isSlowed ? this.moveSpeed * 1.2 : 250;
    body.setVelocityX(chargeDir * chargeSpeed);
    
    // Visual feedback - shake during charge
    this.scene.tweens.add({
      targets: this,
      x: this.x + (chargeDir * 10),
      duration: 50,
      yoyo: true,
      repeat: 3
    });
    
    // Charge for 0.8s
    this.chargeDurationTimer = 800;
  }
  
  public setSlowed(isSlowed: boolean): void {
    if (isSlowed && !this.isSlowed) {
      this.moveSpeed = this.originalMoveSpeed * 0.4;
      this.isSlowed = true;
      this.setAlpha(0.7);
    } else if (!isSlowed && this.isSlowed) {
      this.moveSpeed = this.originalMoveSpeed;
      this.isSlowed = false;
      this.setAlpha(1.0);
    }
  }
}
