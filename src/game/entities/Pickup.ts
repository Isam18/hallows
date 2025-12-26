import Phaser from 'phaser';

export class Pickup extends Phaser.GameObjects.Sprite {
  private amount: number;
  private collected = false;
  private baseY: number;
  private bobOffset = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, _type: string, amount: number) {
    super(scene, x, y, 'shell');
    this.amount = amount;
    this.baseY = y;
    
    scene.add.existing(this);
    
    // Add to physics for overlap detection only - NOT as a full physics body
    scene.physics.add.existing(this, false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Make it completely static - no physics simulation
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.moves = false; // Critical: disable physics movement entirely
    
    // Random starting phase for bob animation
    this.bobOffset = Math.random() * Math.PI * 2;
  }

  // Manual update for smooth bobbing - called from scene if needed
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    
    if (this.collected) return;
    
    // Smooth sinusoidal bob using time
    const bobAmount = Math.sin((time / 500) + this.bobOffset) * 4;
    this.y = this.baseY + bobAmount;
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    
    // Disable the physics body immediately to prevent double-collection
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
    }
    
    // Pop-up and fade animation
    this.scene.tweens.add({
      targets: this,
      y: this.y - 25,
      alpha: 0,
      scale: 1.4,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy()
    });
  }

  isCollected(): boolean {
    return this.collected;
  }

  getAmount(): number {
    return this.amount;
  }
}
