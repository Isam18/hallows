import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyCombatConfig } from '../core/CombatConfig';

/**
 * SkullScuttler - Small skull-spider based on reference image 1
 * Hollow Knight style: rounded gray skull, single flame crest, hollow dark eyes, 4 thin legs
 */
export class SkullScuttler extends Enemy {
  private visualElements: Phaser.GameObjects.GameObject[] = [];
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
    this.createVisuals();
  }
  
  private createVisuals(): void {
    // Main skull body - rounded, grayish like reference
    const skullMain = this.scene.add.ellipse(0, 0, 28, 32, 0xa8a0a0);
    skullMain.setStrokeStyle(3, 0x1a1a1a);
    skullMain.setDepth(this.depth + 2);
    this.visualElements.push(skullMain);
    
    // Single pointed flame crest on top (distinctive feature from ref)
    const crest = this.scene.add.polygon(0, 0, [
      0, -28,     // Sharp tip
      -8, -6,     // Left base
      0, -10,     // Center notch
      8, -6       // Right base
    ], 0xb0a8a8);
    crest.setStrokeStyle(3, 0x1a1a1a);
    crest.setDepth(this.depth + 2);
    this.visualElements.push(crest);
    
    // Left eye socket - large hollow dark void (Hollow Knight style)
    const leftEyeSocket = this.scene.add.ellipse(-6, -4, 10, 14, 0x1a1a1a);
    leftEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(leftEyeSocket);
    
    // Right eye socket
    const rightEyeSocket = this.scene.add.ellipse(6, -4, 10, 14, 0x1a1a1a);
    rightEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(rightEyeSocket);
    
    // Small mouth/nose area
    const mouth = this.scene.add.ellipse(0, 8, 8, 6, 0x1a1a1a);
    mouth.setDepth(this.depth + 3);
    this.visualElements.push(mouth);
    
    // Two small fangs
    const leftFang = this.scene.add.triangle(0, 0, -2, 0, 0, 6, 2, 0, 0xc8c0c0);
    leftFang.setStrokeStyle(1, 0x1a1a1a);
    leftFang.setDepth(this.depth + 4);
    this.visualElements.push(leftFang);
    
    const rightFang = this.scene.add.triangle(0, 0, -2, 0, 0, 6, 2, 0, 0xc8c0c0);
    rightFang.setStrokeStyle(1, 0x1a1a1a);
    rightFang.setDepth(this.depth + 4);
    this.visualElements.push(rightFang);
    
    // 4 thin black spider legs (2 per side like reference)
    // Front legs - angled forward
    const legFL = this.createSpiderLeg(-12, 6, -22, 18);
    const legFR = this.createSpiderLeg(12, 6, 22, 18);
    
    // Back legs - angled back
    const legBL = this.createSpiderLeg(-10, 12, -18, 26);
    const legBR = this.createSpiderLeg(10, 12, 18, 26);
    
    this.visualElements.push(legFL, legFR, legBL, legBR);
    
    // Hide sprite body
    this.setAlpha(0);
  }
  
  private createSpiderLeg(startX: number, startY: number, endX: number, endY: number): Phaser.GameObjects.Line {
    const leg = this.scene.add.line(0, 0, startX, startY, endX, endY, 0x1a1a1a);
    leg.setLineWidth(2.5);
    leg.setDepth(this.depth + 1);
    return leg;
  }
  
  update(time: number, delta: number, player: any): void {
    super.update(time, delta, player);
    this.updateVisualPositions();
  }
  
  private updateVisualPositions(): void {
    const flipMult = this.flipX ? -1 : 1;
    
    // Position all elements relative to sprite
    const positions = [
      { x: 0, y: -2 },      // skull main
      { x: 0, y: -16 },     // crest
      { x: -6, y: -6 },     // left eye
      { x: 6, y: -6 },      // right eye
      { x: 0, y: 6 },       // mouth
      { x: -3, y: 12 },     // left fang
      { x: 3, y: 12 },      // right fang
    ];
    
    // Update main elements
    for (let i = 0; i < 7 && i < this.visualElements.length; i++) {
      const el = this.visualElements[i] as any;
      if (positions[i]) {
        el.setPosition(
          this.x + positions[i].x * flipMult,
          this.y + positions[i].y
        );
      }
    }
    
    // Update legs (lines need special handling)
    const legData = [
      { sx: -12, sy: 6, ex: -22, ey: 18 },   // front left
      { sx: 12, sy: 6, ex: 22, ey: 18 },     // front right
      { sx: -10, sy: 12, ex: -18, ey: 26 },  // back left
      { sx: 10, sy: 12, ex: 18, ey: 26 },    // back right
    ];
    
    for (let i = 0; i < 4; i++) {
      const leg = this.visualElements[7 + i] as Phaser.GameObjects.Line;
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
