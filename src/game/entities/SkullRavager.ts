import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyCombatConfig } from '../core/CombatConfig';

/**
 * SkullRavager - Large menacing skull based on reference image 3
 * Massive cream skull, bright glowing orange-red eyes, tall multi-pronged crown
 */
export class SkullRavager extends Enemy {
  private visualElements: Phaser.GameObjects.GameObject[] = [];
  private attackState: 'idle' | 'windup' | 'charging' | 'jumping' | 'cooldown' = 'idle';
  private attackTimer = 0;
  private jumpCount = 0;
  private leftGlow: Phaser.GameObjects.Arc | null = null;
  private rightGlow: Phaser.GameObjects.Arc | null = null;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
    this.createVisuals();
  }
  
  private createVisuals(): void {
    // Massive skull body - cream/bone white like reference
    const skullMain = this.scene.add.ellipse(0, 0, 70, 60, 0xf0e8e0);
    skullMain.setStrokeStyle(3, 0x2a2828);
    skullMain.setDepth(this.depth + 2);
    this.visualElements.push(skullMain);
    
    // Tall multi-pronged crown (5 spikes like reference image 3)
    // Outer left horn
    const hornOL = this.scene.add.polygon(0, 0, [
      -28, -8, -34, -50, -20, -15
    ], 0xe8e0d8);
    hornOL.setStrokeStyle(2, 0x2a2828);
    hornOL.setDepth(this.depth + 2);
    this.visualElements.push(hornOL);
    
    // Inner left horn
    const hornIL = this.scene.add.polygon(0, 0, [
      -14, -12, -18, -55, -8, -18
    ], 0xf0e8e0);
    hornIL.setStrokeStyle(2, 0x2a2828);
    hornIL.setDepth(this.depth + 2);
    this.visualElements.push(hornIL);
    
    // Center horn (tallest)
    const hornC = this.scene.add.polygon(0, 0, [
      -6, -15, 0, -65, 6, -15
    ], 0xf8f0e8);
    hornC.setStrokeStyle(2, 0x2a2828);
    hornC.setDepth(this.depth + 2);
    this.visualElements.push(hornC);
    
    // Inner right horn
    const hornIR = this.scene.add.polygon(0, 0, [
      8, -18, 18, -55, 14, -12
    ], 0xf0e8e0);
    hornIR.setStrokeStyle(2, 0x2a2828);
    hornIR.setDepth(this.depth + 2);
    this.visualElements.push(hornIR);
    
    // Outer right horn
    const hornOR = this.scene.add.polygon(0, 0, [
      20, -15, 34, -50, 28, -8
    ], 0xe8e0d8);
    hornOR.setStrokeStyle(2, 0x2a2828);
    hornOR.setDepth(this.depth + 2);
    this.visualElements.push(hornOR);
    
    // Large menacing eye sockets - deep black
    const leftEyeSocket = this.scene.add.ellipse(-18, -5, 22, 26, 0x0a0505);
    leftEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(leftEyeSocket);
    
    const rightEyeSocket = this.scene.add.ellipse(18, -5, 22, 26, 0x0a0505);
    rightEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(rightEyeSocket);
    
    // BRIGHT GLOWING ORANGE-RED PUPILS (key feature from reference)
    const leftPupil = this.scene.add.circle(-18, -3, 7, 0xff4400);
    leftPupil.setDepth(this.depth + 5);
    this.visualElements.push(leftPupil);
    
    const rightPupil = this.scene.add.circle(18, -3, 7, 0xff4400);
    rightPupil.setDepth(this.depth + 5);
    this.visualElements.push(rightPupil);
    
    // Intense glow effect around pupils
    this.leftGlow = this.scene.add.circle(-18, -3, 12, 0xff2200);
    this.leftGlow.setAlpha(0.6);
    this.leftGlow.setDepth(this.depth + 4);
    this.visualElements.push(this.leftGlow);
    
    this.rightGlow = this.scene.add.circle(18, -3, 12, 0xff2200);
    this.rightGlow.setAlpha(0.6);
    this.rightGlow.setDepth(this.depth + 4);
    this.visualElements.push(this.rightGlow);
    
    // Heavy jaw
    const jaw = this.scene.add.ellipse(0, 22, 45, 22, 0xe8e0d8);
    jaw.setStrokeStyle(2, 0x2a2828);
    jaw.setDepth(this.depth + 2);
    this.visualElements.push(jaw);
    
    // Many sharp teeth
    for (let i = 0; i < 9; i++) {
      const toothX = -16 + i * 4;
      const toothH = (i === 0 || i === 8) ? 5 : (i === 4 ? 9 : 7);
      const tooth = this.scene.add.triangle(0, 0, -2, 0, 2, 0, 0, toothH, 0xffffff);
      tooth.setPosition(toothX, 18);
      tooth.setDepth(this.depth + 4);
      this.visualElements.push(tooth);
    }
    
    // Powerful thick legs - 4 pairs
    const legFL = this.createLeg(-24, 28, 28, -40);
    const legFR = this.createLeg(24, 28, 28, 40);
    const legML = this.createLeg(-28, 34, 24, -20);
    const legMR = this.createLeg(28, 34, 24, 20);
    const legBL = this.createLeg(-22, 38, 20, -5);
    const legBR = this.createLeg(22, 38, 20, 5);
    
    this.visualElements.push(legFL, legFR, legML, legMR, legBL, legBR);
    
    this.setAlpha(0);
  }
  
  private createLeg(x: number, y: number, length: number, angle: number): Phaser.GameObjects.Rectangle {
    const leg = this.scene.add.rectangle(x, y, 5, length, 0x1a1818);
    leg.setAngle(angle);
    leg.setDepth(this.depth + 1);
    return leg;
  }
  
  update(time: number, delta: number, player: any): void {
    super.update(time, delta, player);
    this.updateAttackBehavior(delta, player);
    this.updateVisualPositions();
    this.animateEyes(time);
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
    const shockwave = this.scene.add.ellipse(this.x, this.y + 40, 20, 10, 0xff6600, 0.8);
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
  
  private animateEyes(time: number): void {
    // Pulsing glow effect
    const glowAlpha = 0.5 + Math.sin(time * 0.008) * 0.3;
    if (this.leftGlow) this.leftGlow.setAlpha(glowAlpha);
    if (this.rightGlow) this.rightGlow.setAlpha(glowAlpha);
  }
  
  private updateVisualPositions(): void {
    const offsets = [
      { x: 0, y: -8 },      // skull main
      { x: -26, y: -28 },   // horn OL
      { x: -12, y: -32 },   // horn IL
      { x: 0, y: -36 },     // horn C
      { x: 12, y: -32 },    // horn IR
      { x: 26, y: -28 },    // horn OR
      { x: -18, y: -12 },   // left eye socket
      { x: 18, y: -12 },    // right eye socket
      { x: -18, y: -10 },   // left pupil
      { x: 18, y: -10 },    // right pupil
      { x: -18, y: -10 },   // left glow
      { x: 18, y: -10 },    // right glow
      { x: 0, y: 14 },      // jaw
    ];
    
    // Teeth
    for (let i = 0; i < 9; i++) {
      offsets.push({ x: -16 + i * 4, y: 12 });
    }
    
    // Legs
    offsets.push(
      { x: -24, y: 24 }, { x: 24, y: 24 },
      { x: -28, y: 30 }, { x: 28, y: 30 },
      { x: -22, y: 34 }, { x: 22, y: 34 }
    );
    
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
    this.leftGlow = null;
    this.rightGlow = null;
    super.destroy(fromScene);
  }
}
