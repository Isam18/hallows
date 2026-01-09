import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyCombatConfig } from '../core/CombatConfig';

/**
 * SkullScuttler - Small, fast skull-spider creature
 * Based on Hollow Knight Silksong enemy - scuttling skull with spindly legs
 * Patrol enemy, doesn't actively chase player
 */
export class SkullScuttler extends Enemy {
  private visualElements: Phaser.GameObjects.GameObject[] = [];
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
    this.createVisuals();
  }
  
  private createVisuals(): void {
    // Main skull body - elongated, insectoid shape (pale bone white)
    const skullBody = this.scene.add.ellipse(0, 0, 28, 34, 0xe8e0d8);
    skullBody.setDepth(this.depth + 1);
    this.visualElements.push(skullBody);
    
    // Skull crest/horn on top - flame-like point
    const crest = this.scene.add.polygon(0, 0, [
      0, -30,   // Top point
      -8, -12,  // Left base
      8, -12    // Right base
    ], 0xd8d0c8);
    crest.setDepth(this.depth + 1);
    this.visualElements.push(crest);
    
    // Dark hollow eye sockets - large, menacing
    const leftEye = this.scene.add.ellipse(-7, -3, 10, 14, 0x0a0a0e);
    leftEye.setDepth(this.depth + 2);
    this.visualElements.push(leftEye);
    
    const rightEye = this.scene.add.ellipse(7, -3, 10, 14, 0x0a0a0e);
    rightEye.setDepth(this.depth + 2);
    this.visualElements.push(rightEye);
    
    // Small dim pupils - eerie red glow
    const leftPupil = this.scene.add.circle(-7, -3, 2.5, 0xaa3333);
    leftPupil.setDepth(this.depth + 3);
    leftPupil.setAlpha(0.7);
    this.visualElements.push(leftPupil);
    
    const rightPupil = this.scene.add.circle(7, -3, 2.5, 0xaa3333);
    rightPupil.setDepth(this.depth + 3);
    rightPupil.setAlpha(0.7);
    this.visualElements.push(rightPupil);
    
    // Small lower jaw/mouth area
    const jaw = this.scene.add.ellipse(0, 10, 16, 10, 0xd0c8c0);
    jaw.setDepth(this.depth + 1);
    this.visualElements.push(jaw);
    
    // Sharp teeth
    for (let i = 0; i < 4; i++) {
      const toothX = -6 + i * 4;
      const tooth = this.scene.add.triangle(
        toothX, 12,
        -1.5, 0,
        1.5, 0,
        0, 5,
        0xf0f0e8
      );
      tooth.setDepth(this.depth + 2);
      this.visualElements.push(tooth);
    }
    
    // Spindly spider-like legs - 6 legs
    const legConfigs = [
      { x: -10, y: 12, length: 12, angle: -35 },
      { x: 10, y: 12, length: 12, angle: 35 },
      { x: -8, y: 15, length: 10, angle: -20 },
      { x: 8, y: 15, length: 10, angle: 20 },
      { x: -6, y: 17, length: 8, angle: -10 },
      { x: 6, y: 17, length: 8, angle: 10 }
    ];
    
    legConfigs.forEach(cfg => {
      const leg = this.scene.add.rectangle(cfg.x, cfg.y, 2, cfg.length, 0x2a2a2a);
      leg.setAngle(cfg.angle);
      leg.setDepth(this.depth);
      this.visualElements.push(leg);
    });
    
    // Hide the sprite itself - we use visual elements
    this.setAlpha(0);
  }
  
  update(time: number, delta: number, player: any): void {
    super.update(time, delta, player);
    
    // Position visual elements to follow the sprite
    this.updateVisualPositions();
  }
  
  private updateVisualPositions(): void {
    const offsets = [
      { x: 0, y: -5 },      // skull body
      { x: 0, y: -22 },     // crest
      { x: -7, y: -8 },     // left eye
      { x: 7, y: -8 },      // right eye
      { x: -7, y: -8 },     // left pupil
      { x: 7, y: -8 },      // right pupil
      { x: 0, y: 5 },       // jaw
    ];
    
    // Add teeth offsets (4 teeth)
    for (let i = 0; i < 4; i++) {
      offsets.push({ x: -6 + i * 4, y: 10 });
    }
    
    // Add leg offsets (6 legs)
    const legOffsets = [
      { x: -10, y: 12 }, { x: 10, y: 12 },
      { x: -8, y: 15 }, { x: 8, y: 15 },
      { x: -6, y: 17 }, { x: 6, y: 17 }
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
