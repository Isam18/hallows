import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyCombatConfig } from '../core/CombatConfig';

/**
 * SkullScuttler - Small skull-spider based on reference image 1
 * Rounded skull with single flame-like crest, hollow eyes, thin spider legs
 */
export class SkullScuttler extends Enemy {
  private visualElements: Phaser.GameObjects.GameObject[] = [];
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
    this.createVisuals();
  }
  
  private createVisuals(): void {
    // Main skull - rounded, compact shape (bone white/cream)
    const skullMain = this.scene.add.ellipse(0, 0, 32, 36, 0xd4ccc4);
    skullMain.setStrokeStyle(2, 0x2a2828);
    skullMain.setDepth(this.depth + 2);
    this.visualElements.push(skullMain);
    
    // Single flame-like pointed crest on top
    const crest = this.scene.add.polygon(0, 0, [
      0, -32,    // Sharp top point
      -10, -8,   // Left base
      -4, -14,   // Left indent
      0, -10,    // Center dip
      4, -14,    // Right indent  
      10, -8     // Right base
    ], 0xc8c0b8);
    crest.setStrokeStyle(2, 0x2a2828);
    crest.setDepth(this.depth + 2);
    this.visualElements.push(crest);
    
    // Large hollow left eye socket - dark black void
    const leftEyeSocket = this.scene.add.ellipse(-8, -2, 12, 16, 0x0a0808);
    leftEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(leftEyeSocket);
    
    // Large hollow right eye socket
    const rightEyeSocket = this.scene.add.ellipse(8, -2, 12, 16, 0x0a0808);
    rightEyeSocket.setDepth(this.depth + 3);
    this.visualElements.push(rightEyeSocket);
    
    // Tiny dim pupils deep in sockets
    const leftPupil = this.scene.add.circle(-8, 0, 2, 0x444444);
    leftPupil.setDepth(this.depth + 4);
    this.visualElements.push(leftPupil);
    
    const rightPupil = this.scene.add.circle(8, 0, 2, 0x444444);
    rightPupil.setDepth(this.depth + 4);
    this.visualElements.push(rightPupil);
    
    // Small jaw/mouth opening
    const mouth = this.scene.add.ellipse(0, 12, 14, 8, 0x1a1818);
    mouth.setDepth(this.depth + 3);
    this.visualElements.push(mouth);
    
    // Small fangs
    const leftFang = this.scene.add.triangle(0, 0, -4, 10, -2, 10, -3, 16, 0xf0ece8);
    leftFang.setDepth(this.depth + 4);
    this.visualElements.push(leftFang);
    
    const rightFang = this.scene.add.triangle(0, 0, 2, 10, 4, 10, 3, 16, 0xf0ece8);
    rightFang.setDepth(this.depth + 4);
    this.visualElements.push(rightFang);
    
    // Thin black spider legs - 6 total
    // Front pair (angled forward)
    const legFL = this.createLeg(-12, 8, 18, -50);
    const legFR = this.createLeg(12, 8, 18, 50);
    
    // Middle pair (angled out)
    const legML = this.createLeg(-14, 12, 16, -30);
    const legMR = this.createLeg(14, 12, 16, 30);
    
    // Back pair (angled back)
    const legBL = this.createLeg(-10, 16, 14, -10);
    const legBR = this.createLeg(10, 16, 14, 10);
    
    this.visualElements.push(legFL, legFR, legML, legMR, legBL, legBR);
    
    // Hide sprite body
    this.setAlpha(0);
  }
  
  private createLeg(x: number, y: number, length: number, angle: number): Phaser.GameObjects.Rectangle {
    const leg = this.scene.add.rectangle(x, y, 2, length, 0x1a1818);
    leg.setAngle(angle);
    leg.setDepth(this.depth + 1);
    return leg;
  }
  
  update(time: number, delta: number, player: any): void {
    super.update(time, delta, player);
    this.updateVisualPositions();
  }
  
  private updateVisualPositions(): void {
    const offsets = [
      { x: 0, y: -4 },     // skull main
      { x: 0, y: -18 },    // crest
      { x: -8, y: -6 },    // left eye
      { x: 8, y: -6 },     // right eye
      { x: -8, y: -4 },    // left pupil
      { x: 8, y: -4 },     // right pupil
      { x: 0, y: 8 },      // mouth
      { x: -3, y: 10 },    // left fang
      { x: 3, y: 10 },     // right fang
      // Legs
      { x: -12, y: 10 },   // front left
      { x: 12, y: 10 },    // front right
      { x: -14, y: 14 },   // mid left
      { x: 14, y: 14 },    // mid right
      { x: -10, y: 18 },   // back left
      { x: 10, y: 18 },    // back right
    ];
    
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
