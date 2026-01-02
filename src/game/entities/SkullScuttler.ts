import Phaser from 'phaser';
import { Enemy, EnemyCombatConfig } from './Enemy';

export class SkullScuttler extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
  }
  
  protected createVisuals(): void {
    // Elongated skull body - Hollow Knight style
    const skullBody = this.scene.add.ellipse(0, -5, 32, 38, 0xe8e0d8);
    skullBody.setDepth(2);
    this.add(skullBody);
    
    // Dark hollow eye sockets - larger, more menacing
    const leftEye = this.scene.add.ellipse(-9, -10, 12, 16, 0x0a0a0e);
    leftEye.setDepth(3);
    this.add(leftEye);
    
    const rightEye = this.scene.add.ellipse(9, -10, 12, 16, 0x0a0a0e);
    rightEye.setDepth(3);
    this.add(rightEye);
    
    // Small glowing red pupils - dim, eerie
    const leftPupil = this.scene.add.circle(-9, -10, 2, 0xaa2222);
    leftPupil.setDepth(4);
    leftPupil.setAlpha(0.6);
    this.add(leftPupil);
    
    const rightPupil = this.scene.add.circle(9, -10, 2, 0xaa2222);
    rightPupil.setDepth(4);
    rightPupil.setAlpha(0.6);
    this.add(rightPupil);
    
    // Lower jaw - detached, smaller
    const jaw = this.scene.add.ellipse(0, 10, 20, 12, 0xd8d0c8);
    jaw.setDepth(2);
    this.add(jaw);
    
    // Small sharp teeth
    for (let i = 0; i < 5; i++) {
      const toothX = -8 + i * 4;
      const tooth = this.scene.add.triangle(
        toothX, 12,
        toothX - 1.5, 16,
        toothX + 1.5, 16,
        0xf0f0e8
      );
      tooth.setDepth(3);
      this.add(tooth);
    }
    
    // Skull crest on top - insect-like
    const crest = this.scene.add.triangle(
      0, -22,
      -6, -28,
      6, -28,
      0xd8d0c8
    );
    crest.setDepth(2);
    this.add(crest);
    
    // Antenna-like protrusions
    const leftAntenna = this.scene.add.rectangle(-8, -24, 2, 8, 0xc8c0b8);
    leftAntenna.setDepth(2);
    this.add(leftAntenna);
    
    const rightAntenna = this.scene.add.rectangle(8, -24, 2, 8, 0xc8c0b8);
    rightAntenna.setDepth(2);
    this.add(rightAntenna);
    
    // Multiple spindly legs - insect-like movement
    const legPositions = [
      { x: -10, y: 18, angle: -0.3 },
      { x: 10, y: 18, angle: 0.3 },
      { x: -8, y: 22, angle: -0.15 },
      { x: 8, y: 22, angle: 0.15 }
    ];
    
    legPositions.forEach((pos, i) => {
      const leg = this.scene.add.rectangle(pos.x, pos.y, 3, 10, 0xa0a098);
      leg.setDepth(1);
      leg.setAngle(pos.angle * 180 / Math.PI);
      this.add(leg);
    });
  }
  
  protected updateBehavior(time: number, delta: number, player: Phaser.GameObjects.Sprite): void {
    if (this.isDying() || this.isInvulnerable()) return;
    
    // No agro - let parent handle patrol
    // Empty override - Enemy class handles patrol behavior
  }
}
