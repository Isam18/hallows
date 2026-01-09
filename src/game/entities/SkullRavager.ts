import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyCombatConfig } from '../core/CombatConfig';

/**
 * SkullRavager - Large, menacing skull creature (mini-boss tier)
 * Hollow Knight Silksong inspired - massive skull with glowing orange eyes
 * Very aggressive, performs jump attacks and charges
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
    // Massive skull body - intimidating presence
    const skullBody = this.scene.add.ellipse(0, 0, 55, 50, 0xf0e8e0);
    skullBody.setDepth(this.depth + 1);
    this.visualElements.push(skullBody);
    
    // Large crown/horns - majestic but menacing
    const leftHorn = this.scene.add.polygon(0, 0, [
      -22, -10,  // Base
      -30, -40,  // Outer tip
      -12, -25   // Inner
    ], 0xe8e0d8);
    leftHorn.setDepth(this.depth + 1);
    this.visualElements.push(leftHorn);
    
    const rightHorn = this.scene.add.polygon(0, 0, [
      22, -10,   // Base
      30, -40,   // Outer tip
      12, -25    // Inner
    ], 0xe8e0d8);
    rightHorn.setDepth(this.depth + 1);
    this.visualElements.push(rightHorn);
    
    // Central crown spike
    const centerSpike = this.scene.add.polygon(0, 0, [
      0, -45,    // Top
      -10, -18,  // Left base
      10, -18    // Right base
    ], 0xd8d0c8);
    centerSpike.setDepth(this.depth + 1);
    this.visualElements.push(centerSpike);
    
    // Secondary horn spikes
    const leftSecondary = this.scene.add.polygon(0, 0, [
      -12, -15, -18, -32, -6, -20
    ], 0xd8d0c8);
    leftSecondary.setDepth(this.depth + 1);
    this.visualElements.push(leftSecondary);
    
    const rightSecondary = this.scene.add.polygon(0, 0, [
      12, -15, 18, -32, 6, -20
    ], 0xd8d0c8);
    rightSecondary.setDepth(this.depth + 1);
    this.visualElements.push(rightSecondary);
    
    // Large menacing eye sockets
    const leftEye = this.scene.add.ellipse(-14, -5, 18, 22, 0x0a0808);
    leftEye.setDepth(this.depth + 2);
    this.visualElements.push(leftEye);
    
    const rightEye = this.scene.add.ellipse(14, -5, 18, 22, 0x0a0808);
    rightEye.setDepth(this.depth + 2);
    this.visualElements.push(rightEye);
    
    // Bright glowing orange-red pupils - fierce
    const leftPupil = this.scene.add.circle(-14, -5, 6, 0xff4400);
    leftPupil.setDepth(this.depth + 3);
    this.visualElements.push(leftPupil);
    
    const rightPupil = this.scene.add.circle(14, -5, 6, 0xff4400);
    rightPupil.setDepth(this.depth + 3);
    this.visualElements.push(rightPupil);
    
    // Intense glow around pupils
    const leftGlow = this.scene.add.circle(-14, -5, 10, 0xff6622);
    leftGlow.setDepth(this.depth + 2);
    leftGlow.setAlpha(0.5);
    this.visualElements.push(leftGlow);
    
    const rightGlow = this.scene.add.circle(14, -5, 10, 0xff6622);
    rightGlow.setDepth(this.depth + 2);
    rightGlow.setAlpha(0.5);
    this.visualElements.push(rightGlow);
    
    // Powerful jaw
    const jaw = this.scene.add.ellipse(0, 18, 38, 20, 0xe8e0d8);
    jaw.setDepth(this.depth + 1);
    this.visualElements.push(jaw);
    
    // Rows of sharp fangs
    for (let i = 0; i < 8; i++) {
      const toothX = -14 + i * 4;
      const toothHeight = i === 0 || i === 7 ? 6 : (i === 3 || i === 4 ? 10 : 8);
      const tooth = this.scene.add.triangle(
        toothX, 20,
        -2, 0,
        2, 0,
        0, toothHeight,
        0xffffff
      );
      tooth.setDepth(this.depth + 2);
      this.visualElements.push(tooth);
    }
    
    // Armored body segment
    const bodyArmor = this.scene.add.ellipse(0, 38, 40, 25, 0xd0c8c0);
    bodyArmor.setDepth(this.depth);
    this.visualElements.push(bodyArmor);
    
    // Powerful legs - 4 thick limbs
    const legConfigs = [
      { x: -18, y: 45, length: 20, width: 6, angle: -25 },
      { x: 18, y: 45, length: 20, width: 6, angle: 25 },
      { x: -10, y: 50, length: 18, width: 5, angle: -10 },
      { x: 10, y: 50, length: 18, width: 5, angle: 10 }
    ];
    
    legConfigs.forEach(cfg => {
      const leg = this.scene.add.rectangle(cfg.x, cfg.y, cfg.width, cfg.length, 0x2a2a2a);
      leg.setAngle(cfg.angle);
      leg.setDepth(this.depth);
      this.visualElements.push(leg);
    });
    
    this.setAlpha(0);
  }
  
  update(time: number, delta: number, player: any): void {
    super.update(time, delta, player);
    
    // Update attack behavior
    this.updateAttackBehavior(delta, player);
    
    // Position visual elements
    this.updateVisualPositions();
    
    // Animate eye glow
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
          // Choose attack based on distance
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
          // Landed - create ground pound effect
          this.createGroundPound();
          this.jumpCount++;
          
          if (this.jumpCount >= 3) {
            this.attackState = 'cooldown';
            this.attackTimer = 2000;
            this.jumpCount = 0;
          } else {
            // Jump again
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
    
    // Visual windup - shake
    this.scene.tweens.add({
      targets: this.visualElements,
      x: '+=2',
      duration: 50,
      yoyo: true,
      repeat: 4
    });
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
    // Screen shake
    this.scene.cameras.main.shake(150, 0.02);
    
    // Visual shockwave
    const shockwave = this.scene.add.ellipse(this.x, this.y + 30, 20, 10, 0xff6600, 0.8);
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
    // Pulse the eye glows
    const glowAlpha = 0.4 + Math.sin(time * 0.005) * 0.2;
    
    // Eye glow elements are at indices 10 and 11
    if (this.visualElements[10]) {
      (this.visualElements[10] as Phaser.GameObjects.Arc).setAlpha(glowAlpha);
    }
    if (this.visualElements[11]) {
      (this.visualElements[11] as Phaser.GameObjects.Arc).setAlpha(glowAlpha);
    }
  }
  
  private updateVisualPositions(): void {
    const offsets = [
      { x: 0, y: -10 },     // skull body
      { x: -18, y: -22 },   // left horn
      { x: 18, y: -22 },    // right horn
      { x: 0, y: -28 },     // center spike
      { x: -10, y: -22 },   // left secondary
      { x: 10, y: -22 },    // right secondary
      { x: -14, y: -12 },   // left eye
      { x: 14, y: -12 },    // right eye
      { x: -14, y: -12 },   // left pupil
      { x: 14, y: -12 },    // right pupil
      { x: -14, y: -12 },   // left glow
      { x: 14, y: -12 },    // right glow
      { x: 0, y: 8 },       // jaw
    ];
    
    // Add teeth offsets (8 teeth)
    for (let i = 0; i < 8; i++) {
      offsets.push({ x: -14 + i * 4, y: 14 });
    }
    
    // Body armor
    offsets.push({ x: 0, y: 28 });
    
    // Add leg offsets (4 legs)
    const legOffsets = [
      { x: -18, y: 35 }, { x: 18, y: 35 },
      { x: -10, y: 40 }, { x: 10, y: 40 }
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
