import Phaser from 'phaser';
import { Enemy, EnemyCombatConfig } from './Enemy';

export class SkullRavager extends Enemy {
  private chargeWindupTimer = 0;
  private chargeDurationTimer = 0;
  private jumpWindupTimer = 0;
  private isCharging = false;
  private isJumping = false;
  private isMultiJumping = false;
  private multiJumpCount = 0;
  private attackCooldownTimer = 0;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
  }
  
  protected createVisuals(): void {
    // Massive skull - boss-sized
    const skullBody = this.scene.add.ellipse(0, -8, 85, 95, 0xf8f0e8);
    skullBody.setDepth(2);
    this.add(skullBody);
    
    // Skull texture lines - battle damage
    const textureLines = [
      { x1: -20, y1: -25, x2: -25, y2: 10 },
      { x1: 20, y1: -30, x2: 25, y2: 5 },
      { x1: 0, y1: -35, x2: 5, y2: -5 },
      { x1: -35, y1: 0, x2: -40, y2: 20 },
      { x1: 35, y1: -5, x2: 40, y2: 15 }
    ];
    
    textureLines.forEach(line => {
      const lineObj = this.scene.add.line(line.x1, line.y1, line.x1, line.y1, line.x2, line.y2, 0x4a4038);
      lineObj.setStrokeStyle(3, 0x4a4038);
      lineObj.setDepth(3);
      this.add(lineObj);
    });
    
    // Enormous hollow eye sockets
    const leftEye = this.scene.add.ellipse(-25, -15, 28, 35, 0x050505);
    leftEye.setDepth(3);
    this.add(leftEye);
    
    const rightEye = this.scene.add.ellipse(25, -15, 28, 35, 0x050505);
    rightEye.setDepth(3);
    this.add(rightEye);
    
    // Burning orange pupils - intense
    const leftPupil = this.scene.add.circle(-25, -15, 7, 0xff4400);
    leftPupil.setDepth(4);
    leftPupil.setAlpha(0.95);
    this.add(leftPupil);
    
    const rightPupil = this.scene.add.circle(25, -15, 7, 0xff4400);
    rightPupil.setDepth(4);
    rightPupil.setAlpha(0.95);
    this.add(rightPupil);
    
    // Intense glow around pupils
    const leftGlow = this.scene.add.circle(-25, -15, 15, 0xff2200);
    leftGlow.setDepth(3);
    leftGlow.setAlpha(0.4);
    this.add(leftGlow);
    
    const rightGlow = this.scene.add.circle(25, -15, 15, 0xff2200);
    rightGlow.setDepth(3);
    rightGlow.setAlpha(0.4);
    this.add(rightGlow);
    
    // Massive jaw with huge teeth
    const jaw = this.scene.add.ellipse(0, 20, 55, 28, 0xf0e8e0);
    jaw.setDepth(2);
    this.add(jaw);
    
    // Many large sharp teeth - terrifying
    for (let i = 0; i < 12; i++) {
      const toothX = -26 + i * 4.5;
      const tooth = this.scene.add.triangle(
        toothX, 22,
        toothX - 3, 32,
        toothX + 3, 32,
        0xffffff
      );
      tooth.setDepth(3);
      this.add(tooth);
    }
    
    // Ornate crown/horns - boss-like
    // Main crown
    const crownBase = this.scene.add.triangle(
      0, -45,
      -25, -55,
      25, -55,
      0xe8e0d8
    );
    crownBase.setDepth(2);
    this.add(crownBase);
    
    const crownMid = this.scene.add.triangle(
      0, -52,
      -15, -62,
      15, -62,
      0xe0d8d0
    );
    crownMid.setDepth(2);
    this.add(crownMid);
    
    const crownTip = this.scene.add.triangle(
      0, -58,
      -8, -68,
      8, -68,
      0xd8d0c8
    );
    crownTip.setDepth(2);
    this.add(crownTip);
    
    // Large curved horns
    const leftHorn = this.scene.add.ellipse(-35, -50, 12, 28, 0xe0d8d0);
    leftHorn.setAngle(-0.5);
    leftHorn.setDepth(2);
    this.add(leftHorn);
    
    const rightHorn = this.scene.add.ellipse(35, -50, 12, 28, 0xe0d8d0);
    rightHorn.setAngle(0.5);
    rightHorn.setDepth(2);
    this.add(rightHorn);
    
    // Additional horn points
    const leftHornTip = this.scene.add.ellipse(-42, -58, 6, 15, 0xd8d0c8);
    leftHornTip.setAngle(-0.4);
    leftHornTip.setDepth(3);
    this.add(leftHornTip);
    
    const rightHornTip = this.scene.add.ellipse(42, -58, 6, 15, 0xd8d0c8);
    rightHornTip.setAngle(0.4);
    rightHornTip.setDepth(3);
    this.add(rightHornTip);
    
    // Many powerful segmented legs - eight total
    const legPositions = [
      { x: -28, y: 32, width: 6, length: 20, angle: -0.5 },
      { x: 28, y: 32, width: 6, length: 20, angle: 0.5 },
      { x: -22, y: 38, width: 5, length: 18, angle: -0.3 },
      { x: 22, y: 38, width: 5, length: 18, angle: 0.3 },
      { x: -16, y: 42, width: 4, length: 16, angle: -0.15 },
      { x: 16, y: 42, width: 4, length: 16, angle: 0.15 },
      { x: -10, y: 45, width: 4, length: 14, angle: -0.05 },
      { x: 10, y: 45, width: 4, length: 14, angle: 0.05 }
    ];
    
    legPositions.forEach((pos) => {
      const leg = this.scene.add.rectangle(pos.x, pos.y, pos.width, pos.length, 0xc0b8b0);
      leg.setDepth(1);
      leg.setAngle(pos.angle * 180 / Math.PI);
      this.add(leg);
    });
    
    // Spiked collar on back
    for (let i = 0; i < 5; i++) {
      const spikeX = -30 + i * 15;
      const spike = this.scene.add.triangle(
        spikeX, 0,
        spikeX - 4, -10,
        spikeX + 4, -10,
        0xd8d0c8
      );
      spike.setDepth(2);
      this.add(spike);
    }
  }
  
  protected updateBehavior(time: number, delta: number, player: Phaser.GameObjects.Sprite): void {
    if (this.isDying() || this.isInvulnerable()) return;
    
    // Update all timers
    if (this.chargeWindupTimer > 0) {
      this.chargeWindupTimer -= delta;
    }
    if (this.chargeDurationTimer > 0) {
      this.chargeDurationTimer -= delta;
    }
    if (this.jumpWindupTimer > 0) {
      this.jumpWindupTimer -= delta;
    }
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
    }
    
    // Decide on next attack
    if (this.attackCooldownTimer <= 0 && !this.isCharging && !this.isJumping && !this.isMultiJumping) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      
      if (dist < 150) {
        // Close range - charge attack
        this.chargeWindupTimer = 500; // 0.5s windup
        this.isCharging = true;
        this.attackCooldownTimer = 3000;
      } else if (dist > 400) {
        // Far range - jump attack
        this.jumpWindupTimer = 400; // 0.4s windup
        this.isJumping = true;
        this.attackCooldownTimer = 3500;
      } else {
        // Mid range - multi jump (random chance)
        if (Math.random() > 0.6) {
          this.isMultiJumping = true;
          this.multiJumpCount = 5;
          this.jumpWindupTimer = 300; // 0.3s windup
          this.attackCooldownTimer = 5000;
        } else {
          // Default to charge
          this.chargeWindupTimer = 500;
          this.isCharging = true;
          this.attackCooldownTimer = 3000;
        }
      }
    }
    
    // Execute charge attack
    if (this.chargeWindupTimer <= 0 && this.isCharging) {
      this.performChargeAttack();
      this.isCharging = false;
    }
    
    // Execute jump attack
    if (this.jumpWindupTimer <= 0 && this.isJumping) {
      this.performJumpAttack(player);
      this.isJumping = false;
    }
    
    // Execute multi jump
    if (this.jumpWindupTimer <= 0 && this.isMultiJumping) {
      if (this.multiJumpCount > 0) {
        this.performMultiJump();
        this.multiJumpCount--;
        if (this.multiJumpCount > 0) {
          this.jumpWindupTimer = 400; // Delay between jumps
        } else {
          this.isMultiJumping = false;
        }
      }
    }
  }
  
  private performChargeAttack(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const chargeDir = this.flipX ? -1 : 1;
    
    // Faster than player sprint
    body.setVelocityX(chargeDir * 350);
    
    // Visual feedback - shake and glow
    this.scene.tweens.add({
      targets: this,
      alpha: 0.6,
      duration: 80,
      yoyo: true,
      repeat: 5
    });
    
    // Stop after 0.8s
    this.chargeDurationTimer = 800;
    
    this.scene.time.delayedCall(800, () => {
      if (this.active) {
        body.setVelocityX(0);
      }
    });
  }
  
  private performJumpAttack(player: Phaser.GameObjects.Sprite): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Calculate jump direction towards player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    body.setVelocityX((dx / dist) * 200);
    body.setVelocityY(-400); // High jump
    
    // Spawn debris on landing
    this.scene.time.delayedCall(800, () => {
      this.spawnDebris(8); // 8 falling rocks
    });
  }
  
  private performMultiJump(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Stay in place, just jump up
    body.setVelocityX(0);
    body.setVelocityY(-350);
    
    // Spawn 3 debris per jump
    this.scene.time.delayedCall(600, () => {
      this.spawnDebris(3);
    });
  }
  
  private spawnDebris(count: number): void {
    // Spawn falling rock debris at player's position
    for (let i = 0; i < count; i++) {
      const offsetX = Phaser.Math.Between(-150, 150);
      const offsetY = Phaser.Math.Between(-100, 0);
      
      // This would create debris - you'd need a Debris entity class
      // For now, we'll just create visual effects
      const debris = this.scene.add.circle(
        this.x + offsetX,
        this.y + offsetY,
        8,
        0x6a5040
      );
      
      this.scene.tweens.add({
        targets: debris,
        y: debris.y + 200,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => {
          debris.destroy();
        }
      });
    }
  }
}
