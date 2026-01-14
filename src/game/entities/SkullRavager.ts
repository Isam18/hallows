import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyCombatConfig } from '../core/CombatConfig';

/**
 * SkullRavager - Large menacing skull based on reference image 3
 * Hollow Knight style: dark gray skull, jagged crown with 5+ horns, hollow eyes, wide jaw with teeth, wing-like claws
 */
export class SkullRavager extends Enemy {
  private visualElements: Phaser.GameObjects.GameObject[] = [];
  private attackState: 'idle' | 'windup' | 'charging' | 'jumping' | 'cooldown' = 'idle';
  private attackTimer = 0;
  private jumpCount = 0;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
    this.createVisuals();
  }
  
  private createVisuals(): void {
    // Main skull body - large, dark gray like reference
    const skullMain = this.scene.add.ellipse(0, 0, 60, 52, 0x6a6464);
    skullMain.setStrokeStyle(4, 0x1a1a1a);
    skullMain.setDepth(this.depth + 2);
    this.visualElements.push(skullMain);
    
    // Jagged crown with multiple horns (5 prominent spikes like reference)
    // Far left horn
    const hornFL = this.scene.add.polygon(0, 0, [
      -26, -4,
      -36, -32,
      -22, -8
    ], 0x7a7474);
    hornFL.setStrokeStyle(3, 0x1a1a1a);
    hornFL.setDepth(this.depth + 2);
    this.visualElements.push(hornFL);
    
    // Left horn
    const hornL = this.scene.add.polygon(0, 0, [
      -16, -8,
      -24, -44,
      -10, -12
    ], 0x7a7474);
    hornL.setStrokeStyle(3, 0x1a1a1a);
    hornL.setDepth(this.depth + 2);
    this.visualElements.push(hornL);
    
    // Center horn (tallest)
    const hornC = this.scene.add.polygon(0, 0, [
      -6, -12,
      0, -52,
      6, -12
    ], 0x7a7474);
    hornC.setStrokeStyle(3, 0x1a1a1a);
    hornC.setDepth(this.depth + 2);
    this.visualElements.push(hornC);
    
    // Right horn
    const hornR = this.scene.add.polygon(0, 0, [
      10, -12,
      24, -44,
      16, -8
    ], 0x7a7474);
    hornR.setStrokeStyle(3, 0x1a1a1a);
    hornR.setDepth(this.depth + 2);
    this.visualElements.push(hornR);
    
    // Far right horn
    const hornFR = this.scene.add.polygon(0, 0, [
      22, -8,
      36, -32,
      26, -4
    ], 0x7a7474);
    hornFR.setStrokeStyle(3, 0x1a1a1a);
    hornFR.setDepth(this.depth + 2);
    this.visualElements.push(hornFR);
    
    // Left eye socket - large hollow void
    const leftEyeSocket = this.scene.add.ellipse(-14, -4, 16, 20, 0x1a1a1a);
    leftEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(leftEyeSocket);
    
    // Right eye socket
    const rightEyeSocket = this.scene.add.ellipse(14, -4, 16, 20, 0x1a1a1a);
    rightEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(rightEyeSocket);
    
    // Nose hole
    const nose = this.scene.add.ellipse(0, 8, 8, 10, 0x1a1a1a);
    nose.setDepth(this.depth + 3);
    this.visualElements.push(nose);
    
    // Wide jaw with teeth
    const jaw = this.scene.add.ellipse(0, 20, 40, 14, 0x5a5454);
    jaw.setStrokeStyle(3, 0x1a1a1a);
    jaw.setDepth(this.depth + 2);
    this.visualElements.push(jaw);
    
    // Row of sharp teeth
    for (let i = 0; i < 7; i++) {
      const toothX = -12 + i * 4;
      const tooth = this.scene.add.triangle(0, 0, -2, 0, 0, 6, 2, 0, 0xd0c8c8);
      tooth.setStrokeStyle(1, 0x1a1a1a);
      tooth.setPosition(toothX, 16);
      tooth.setDepth(this.depth + 4);
      this.visualElements.push(tooth);
    }
    
    // Wing-like claw appendages (distinctive feature from ref)
    // Left wing-claw
    const leftWing = this.scene.add.polygon(0, 0, [
      -26, 4,      // Inner top
      -48, -6,     // Outer top
      -52, 8,      // Outer mid
      -44, 22,     // Outer bottom
      -28, 18      // Inner bottom
    ], 0x4a4444);
    leftWing.setStrokeStyle(3, 0x1a1a1a);
    leftWing.setDepth(this.depth + 1);
    this.visualElements.push(leftWing);
    
    // Right wing-claw
    const rightWing = this.scene.add.polygon(0, 0, [
      26, 4,
      48, -6,
      52, 8,
      44, 22,
      28, 18
    ], 0x4a4444);
    rightWing.setStrokeStyle(3, 0x1a1a1a);
    rightWing.setDepth(this.depth + 1);
    this.visualElements.push(rightWing);
    
    // Small feet/legs underneath
    const leftFoot = this.scene.add.ellipse(-18, 28, 14, 8, 0x3a3434);
    leftFoot.setStrokeStyle(2, 0x1a1a1a);
    leftFoot.setDepth(this.depth + 1);
    this.visualElements.push(leftFoot);
    
    const rightFoot = this.scene.add.ellipse(18, 28, 14, 8, 0x3a3434);
    rightFoot.setStrokeStyle(2, 0x1a1a1a);
    rightFoot.setDepth(this.depth + 1);
    this.visualElements.push(rightFoot);
    
    this.setAlpha(0);
  }
  
  update(time: number, delta: number, player: any): void {
    super.update(time, delta, player);
    this.updateAttackBehavior(delta, player);
    this.updateVisualPositions();
  }
  
  private updateAttackBehavior(delta: number, player: any): void {
    if (this.isDying() || this.isInvulnerable()) return;
    
    this.attackTimer -= delta;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    switch (this.attackState) {
      case 'idle':
        if (dist < 250 && this.attackTimer <= 0) {
          if (dist > 150 || Math.random() > 0.5) {
            this.startJumpAttack(player);
          } else {
            this.startCharge(player);
          }
        }
        break;
        
      case 'windup':
        if (this.attackTimer <= 0) {
          this.attackState = 'charging';
          this.attackTimer = 600;
          const chargeDir = player.x > this.x ? 1 : -1;
          body.setVelocityX(chargeDir * 350);
          this.flipX = chargeDir < 0;
        }
        break;
        
      case 'charging':
        if (this.attackTimer <= 0 || body.blocked.left || body.blocked.right) {
          body.setVelocityX(0);
          this.attackState = 'cooldown';
          this.attackTimer = 1500;
        }
        break;
        
      case 'jumping':
        if (body.blocked.down && body.velocity.y >= 0) {
          this.createGroundPound();
          this.jumpCount++;
          if (this.jumpCount >= 3) {
            this.attackState = 'cooldown';
            this.attackTimer = 2000;
            this.jumpCount = 0;
          } else {
            this.scene.time.delayedCall(200, () => {
              if (this.active && this.attackState === 'jumping') {
                this.performJump(player);
              }
            });
          }
        }
        break;
        
      case 'cooldown':
        if (this.attackTimer <= 0) {
          this.attackState = 'idle';
        }
        break;
    }
  }
  
  private startCharge(player: any): void {
    this.attackState = 'windup';
    this.attackTimer = 400;
  }
  
  private startJumpAttack(player: any): void {
    this.attackState = 'jumping';
    this.jumpCount = 0;
    this.performJump(player);
  }
  
  private performJump(player: any): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dirToPlayer = player.x > this.x ? 1 : -1;
    body.setVelocityY(-400);
    body.setVelocityX(dirToPlayer * 150);
    this.flipX = dirToPlayer < 0;
  }
  
  private createGroundPound(): void {
    this.scene.cameras.main.shake(150, 0.02);
    const shockwave = this.scene.add.ellipse(this.x, this.y + 40, 20, 10, 0x4a4444, 0.8);
    shockwave.setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: shockwave,
      scaleX: 8,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => shockwave.destroy()
    });
  }
  
  private updateVisualPositions(): void {
    const flipMult = this.flipX ? -1 : 1;
    
    const positions = [
      { x: 0, y: -6 },      // skull main
      { x: -28, y: -18 },   // horn FL
      { x: -16, y: -26 },   // horn L
      { x: 0, y: -30 },     // horn C
      { x: 16, y: -26 },    // horn R
      { x: 28, y: -18 },    // horn FR
      { x: -14, y: -10 },   // left eye
      { x: 14, y: -10 },    // right eye
      { x: 0, y: 2 },       // nose
      { x: 0, y: 14 },      // jaw
    ];
    
    // Update main elements
    for (let i = 0; i < 10 && i < this.visualElements.length; i++) {
      const el = this.visualElements[i] as any;
      if (positions[i]) {
        el.setPosition(
          this.x + positions[i].x * flipMult,
          this.y + positions[i].y
        );
      }
    }
    
    // Update teeth (elements 10-16)
    for (let i = 0; i < 7; i++) {
      const tooth = this.visualElements[10 + i] as any;
      if (tooth) {
        tooth.setPosition(
          this.x + (-12 + i * 4) * flipMult,
          this.y + 10
        );
      }
    }
    
    // Update wing-claws (elements 17-18)
    const leftWing = this.visualElements[17] as any;
    const rightWing = this.visualElements[18] as any;
    if (leftWing) leftWing.setPosition(this.x + -38 * flipMult, this.y + 6);
    if (rightWing) rightWing.setPosition(this.x + 38 * flipMult, this.y + 6);
    
    // Update feet (elements 19-20)
    const leftFoot = this.visualElements[19] as any;
    const rightFoot = this.visualElements[20] as any;
    if (leftFoot) leftFoot.setPosition(this.x + -18 * flipMult, this.y + 22);
    if (rightFoot) rightFoot.setPosition(this.x + 18 * flipMult, this.y + 22);
  }
  
  destroy(fromScene?: boolean): void {
    this.visualElements.forEach(el => el.destroy());
    this.visualElements = [];
    super.destroy(fromScene);
  }
}
