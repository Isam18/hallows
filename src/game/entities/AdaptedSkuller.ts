import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyCombatConfig } from '../core/CombatConfig';

/**
 * AdaptedSkuller - Medium skull based on reference image 2
 * Larger skull with 3 tall horn spikes forming crown, visible cracks, thicker legs
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
    // Main skull body - wider, more robust (grayish bone)
    const skullMain = this.scene.add.ellipse(0, 0, 44, 48, 0xc0b8b0);
    skullMain.setStrokeStyle(2, 0x2a2828);
    skullMain.setDepth(this.depth + 2);
    this.visualElements.push(skullMain);
    
    // THREE tall horn spikes forming crown (like reference image 2)
    // Left horn
    const leftHorn = this.scene.add.polygon(0, 0, [
      -18, -10,   // Base left
      -22, -42,   // Tip
      -10, -15    // Base right
    ], 0xb8b0a8);
    leftHorn.setStrokeStyle(2, 0x2a2828);
    leftHorn.setDepth(this.depth + 2);
    this.visualElements.push(leftHorn);
    
    // Center horn (tallest)
    const centerHorn = this.scene.add.polygon(0, 0, [
      -6, -12,    // Base left
      0, -50,     // Tip
      6, -12      // Base right
    ], 0xc8c0b8);
    centerHorn.setStrokeStyle(2, 0x2a2828);
    centerHorn.setDepth(this.depth + 2);
    this.visualElements.push(centerHorn);
    
    // Right horn
    const rightHorn = this.scene.add.polygon(0, 0, [
      10, -15,    // Base left
      22, -42,    // Tip
      18, -10     // Base right
    ], 0xb8b0a8);
    rightHorn.setStrokeStyle(2, 0x2a2828);
    rightHorn.setDepth(this.depth + 2);
    this.visualElements.push(rightHorn);
    
    // Crack lines on skull (battle damage)
    const crack1 = this.scene.add.line(0, 0, -8, -10, -4, 8, 0x3a3430);
    crack1.setStrokeStyle(2, 0x3a3430);
    crack1.setDepth(this.depth + 3);
    this.visualElements.push(crack1);
    
    const crack2 = this.scene.add.line(0, 0, 10, -8, 14, 6, 0x3a3430);
    crack2.setStrokeStyle(2, 0x3a3430);
    crack2.setDepth(this.depth + 3);
    this.visualElements.push(crack2);
    
    // Large hollow eye sockets
    const leftEyeSocket = this.scene.add.ellipse(-12, -4, 14, 18, 0x0a0808);
    leftEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(leftEyeSocket);
    
    const rightEyeSocket = this.scene.add.ellipse(12, -4, 14, 18, 0x0a0808);
    rightEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(rightEyeSocket);
    
    // Small dark pupils
    const leftPupil = this.scene.add.circle(-12, -2, 3, 0x2a2828);
    leftPupil.setDepth(this.depth + 4);
    this.visualElements.push(leftPupil);
    
    const rightPupil = this.scene.add.circle(12, -2, 3, 0x2a2828);
    rightPupil.setDepth(this.depth + 4);
    this.visualElements.push(rightPupil);
    
    // Jaw/mouth area
    const mouth = this.scene.add.ellipse(0, 16, 20, 10, 0x1a1818);
    mouth.setDepth(this.depth + 3);
    this.visualElements.push(mouth);
    
    // Teeth
    for (let i = 0; i < 5; i++) {
      const toothX = -8 + i * 4;
      const tooth = this.scene.add.triangle(0, 0, -1.5, 0, 1.5, 0, 0, 5, 0xf0ece8);
      tooth.setPosition(toothX, 14);
      tooth.setDepth(this.depth + 4);
      this.visualElements.push(tooth);
    }
    
    // Thicker spider legs - 6 total
    const legFL = this.createLeg(-16, 14, 20, -45);
    const legFR = this.createLeg(16, 14, 20, 45);
    const legML = this.createLeg(-18, 18, 18, -25);
    const legMR = this.createLeg(18, 18, 18, 25);
    const legBL = this.createLeg(-14, 22, 16, -8);
    const legBR = this.createLeg(14, 22, 16, 8);
    
    this.visualElements.push(legFL, legFR, legML, legMR, legBL, legBR);
    
    this.setAlpha(0);
  }
  
  private createLeg(x: number, y: number, length: number, angle: number): Phaser.GameObjects.Rectangle {
    const leg = this.scene.add.rectangle(x, y, 3, length, 0x1a1818);
    leg.setAngle(angle);
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
    const offsets = [
      { x: 0, y: -6 },     // skull main
      { x: -14, y: -24 },  // left horn
      { x: 0, y: -28 },    // center horn
      { x: 14, y: -24 },   // right horn
      { x: -6, y: -4 },    // crack1
      { x: 12, y: -2 },    // crack2
      { x: -12, y: -8 },   // left eye
      { x: 12, y: -8 },    // right eye
      { x: -12, y: -6 },   // left pupil
      { x: 12, y: -6 },    // right pupil
      { x: 0, y: 10 },     // mouth
    ];
    
    // Teeth offsets
    for (let i = 0; i < 5; i++) {
      offsets.push({ x: -8 + i * 4, y: 12 });
    }
    
    // Leg offsets
    offsets.push(
      { x: -16, y: 16 }, { x: 16, y: 16 },
      { x: -18, y: 20 }, { x: 18, y: 20 },
      { x: -14, y: 24 }, { x: 14, y: 24 }
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
    super.destroy(fromScene);
  }
}
