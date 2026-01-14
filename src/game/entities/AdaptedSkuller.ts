import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyCombatConfig } from '../core/CombatConfig';

/**
 * AdaptedSkuller - Medium skull based on reference image 2
 * Hollow Knight style: gray skull with 3 horns (two side, one center), crack mark, crab-like legs
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
    // Main skull body - larger, grayish like reference
    const skullMain = this.scene.add.ellipse(0, 0, 40, 44, 0x8a8484);
    skullMain.setStrokeStyle(3, 0x1a1a1a);
    skullMain.setDepth(this.depth + 2);
    this.visualElements.push(skullMain);
    
    // Left horn (sweeping outward)
    const leftHorn = this.scene.add.polygon(0, 0, [
      -14, -8,    // Base inner
      -28, -36,   // Tip
      -20, -6     // Base outer
    ], 0x9a9494);
    leftHorn.setStrokeStyle(3, 0x1a1a1a);
    leftHorn.setDepth(this.depth + 2);
    this.visualElements.push(leftHorn);
    
    // Center horn (pointed up, tallest)
    const centerHorn = this.scene.add.polygon(0, 0, [
      -5, -10,    // Base left
      0, -44,     // Tip
      5, -10      // Base right
    ], 0x9a9494);
    centerHorn.setStrokeStyle(3, 0x1a1a1a);
    centerHorn.setDepth(this.depth + 2);
    this.visualElements.push(centerHorn);
    
    // Right horn (sweeping outward)
    const rightHorn = this.scene.add.polygon(0, 0, [
      14, -8,     // Base inner
      28, -36,    // Tip
      20, -6      // Base outer
    ], 0x9a9494);
    rightHorn.setStrokeStyle(3, 0x1a1a1a);
    rightHorn.setDepth(this.depth + 2);
    this.visualElements.push(rightHorn);
    
    // Crack line on skull (distinctive battle damage from ref)
    const crack = this.scene.add.line(0, 0, -6, -12, 2, 8, 0x1a1a1a);
    crack.setLineWidth(2);
    crack.setDepth(this.depth + 3);
    this.visualElements.push(crack);
    
    // Left eye socket - hollow dark void
    const leftEyeSocket = this.scene.add.ellipse(-10, -2, 12, 16, 0x1a1a1a);
    leftEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(leftEyeSocket);
    
    // Right eye socket
    const rightEyeSocket = this.scene.add.ellipse(10, -2, 12, 16, 0x1a1a1a);
    rightEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(rightEyeSocket);
    
    // Small dark dot for nose/mouth
    const mouth = this.scene.add.circle(0, 12, 4, 0x1a1a1a);
    mouth.setDepth(this.depth + 3);
    this.visualElements.push(mouth);
    
    // 4 thick crab-like legs (2 per side like reference)
    // Front legs
    const legFL = this.createCrabLeg(-16, 10, -30, 24);
    const legFR = this.createCrabLeg(16, 10, 30, 24);
    
    // Back legs
    const legBL = this.createCrabLeg(-14, 18, -26, 32);
    const legBR = this.createCrabLeg(14, 18, 26, 32);
    
    this.visualElements.push(legFL, legFR, legBL, legBR);
    
    this.setAlpha(0);
  }
  
  private createCrabLeg(startX: number, startY: number, endX: number, endY: number): Phaser.GameObjects.Line {
    const leg = this.scene.add.line(0, 0, startX, startY, endX, endY, 0x1a1a1a);
    leg.setLineWidth(4);
    leg.setDepth(this.depth + 1);
    return leg;
  }
  
  update(time: number, delta: number, player: any): void {
    super.update(time, delta, player);
    this.updateChargeBehavior(delta, player);
    this.updateVisualPositions();
  }
  
  private updateChargeBehavior(delta: number, player: any): void {
    if (this.isDying() || this.isInvulnerable()) return;
    
    if (this.chargeWindupTimer > 0) this.chargeWindupTimer -= delta;
    if (this.chargeCooldownTimer > 0) this.chargeCooldownTimer -= delta;
    
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const isFacingPlayer = (this.flipX && player.x < this.x) || (!this.flipX && player.x > this.x);
    
    if (dist < 180 && isFacingPlayer && this.chargeCooldownTimer <= 0 && !this.isCharging && this.chargeWindupTimer <= 0) {
      this.chargeWindupTimer = 400;
      this.isCharging = true;
    }
    
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
    
    this.scene.time.delayedCall(250, () => {
      if (this.active) body.setVelocityX(0);
    });
  }
  
  private updateVisualPositions(): void {
    const flipMult = this.flipX ? -1 : 1;
    
    const positions = [
      { x: 0, y: -4 },      // skull main
      { x: -16, y: -20 },   // left horn
      { x: 0, y: -24 },     // center horn
      { x: 16, y: -20 },    // right horn
      { x: -2, y: -4 },     // crack
      { x: -10, y: -6 },    // left eye
      { x: 10, y: -6 },     // right eye
      { x: 0, y: 8 },       // mouth
    ];
    
    // Update main elements
    for (let i = 0; i < 8 && i < this.visualElements.length; i++) {
      const el = this.visualElements[i] as any;
      if (positions[i]) {
        el.setPosition(
          this.x + positions[i].x * flipMult,
          this.y + positions[i].y
        );
      }
    }
    
    // Update crack line specially
    const crack = this.visualElements[4] as Phaser.GameObjects.Line;
    if (crack) {
      crack.setTo(-6 * flipMult, -12, 2 * flipMult, 8);
      crack.setPosition(this.x, this.y - 4);
    }
    
    // Update legs
    const legData = [
      { sx: -16, sy: 10, ex: -30, ey: 24 },
      { sx: 16, sy: 10, ex: 30, ey: 24 },
      { sx: -14, sy: 18, ex: -26, ey: 32 },
      { sx: 14, sy: 18, ex: 26, ey: 32 },
    ];
    
    for (let i = 0; i < 4; i++) {
      const leg = this.visualElements[8 + i] as Phaser.GameObjects.Line;
      if (leg) {
        const ld = legData[i];
        leg.setTo(ld.sx * flipMult, ld.sy, ld.ex * flipMult, ld.ey);
        leg.setPosition(this.x, this.y);
      }
    }
  }
  
  destroy(fromScene?: boolean): void {
    this.visualElements.forEach(el => el.destroy());
    this.visualElements = [];
    super.destroy(fromScene);
  }
}
