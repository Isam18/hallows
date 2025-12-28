import Phaser from 'phaser';
import gameState from '../core/GameState';

/**
 * A door that requires a melee attack to open
 * Once opened, stays open permanently (saved to game state)
 */
export class MeleeDoor extends Phaser.Physics.Arcade.Sprite {
  private doorId: string;
  private isOpen: boolean = false;
  private hp: number = 1;
  private doorWidth: number;
  private doorHeight: number;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number = 40,
    height: number = 100,
    doorId: string
  ) {
    super(scene, x + width / 2, y + height / 2, 'meleeDoor');
    
    this.doorId = doorId;
    this.doorWidth = width;
    this.doorHeight = height;
    
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body
    
    // Check if already opened
    if (gameState.isDoorOpened(doorId)) {
      this.isOpen = true;
      this.setVisible(false);
      this.setActive(false);
      (this.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      return;
    }
    
    // Set up visual and physics
    this.setupVisual();
  }

  private setupVisual(): void {
    // Create door texture if not exists
    if (!this.scene.textures.exists('meleeDoor')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      
      // Wooden door with metal bands
      g.fillStyle(0x4a3020);
      g.fillRect(0, 0, 40, 100);
      
      // Wood grain
      g.fillStyle(0x3a2510);
      g.fillRect(5, 0, 3, 100);
      g.fillRect(15, 0, 2, 100);
      g.fillRect(28, 0, 3, 100);
      g.fillRect(35, 0, 2, 100);
      
      // Metal bands
      g.fillStyle(0x555555);
      g.fillRect(0, 15, 40, 6);
      g.fillRect(0, 50, 40, 6);
      g.fillRect(0, 85, 40, 6);
      
      // Metal studs
      g.fillStyle(0x666666);
      g.fillCircle(5, 18, 3);
      g.fillCircle(35, 18, 3);
      g.fillCircle(5, 53, 3);
      g.fillCircle(35, 53, 3);
      g.fillCircle(5, 88, 3);
      g.fillCircle(35, 88, 3);
      
      // Handle
      g.fillStyle(0x777777);
      g.fillRect(30, 45, 6, 14);
      
      g.generateTexture('meleeDoor', 40, 100);
      g.destroy();
    }
    
    this.setTexture('meleeDoor');
    this.setDisplaySize(this.doorWidth, this.doorHeight);
    
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(this.doorWidth, this.doorHeight);
    body.updateFromGameObject();
  }

  takeDamage(amount: number, fromX?: number): boolean {
    if (this.isOpen) return false;
    
    this.hp -= amount;
    
    // Visual feedback - shake
    this.scene.tweens.add({
      targets: this,
      x: this.x + (fromX && fromX < this.x ? 5 : -5),
      duration: 50,
      yoyo: true,
      repeat: 2,
      ease: 'Quad.easeOut'
    });
    
    // Sound effect (wood impact)
    this.createImpactEffect();
    
    if (this.hp <= 0) {
      this.open();
      return true;
    }
    
    return false;
  }

  private createImpactEffect(): void {
    // Wood splinter particles
    if (!this.scene.textures.exists('woodSplinter')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x6a4830);
      g.fillRect(0, 0, 4, 8);
      g.generateTexture('woodSplinter', 4, 8);
      g.destroy();
    }
    
    const particles = this.scene.add.particles(this.x, this.y, 'woodSplinter', {
      speed: { min: 30, max: 80 },
      angle: { min: 160, max: 200 },
      scale: { start: 1, end: 0.3 },
      lifespan: 400,
      gravityY: 200,
      quantity: 4,
      rotate: { min: 0, max: 360 },
      emitting: false
    });
    
    particles.explode(4);
    this.scene.time.delayedCall(500, () => particles.destroy());
  }

  private open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    
    // Save to game state
    gameState.setDoorOpened(this.doorId);
    
    // Opening animation
    this.scene.tweens.add({
      targets: this,
      angle: -90,
      x: this.x - this.doorWidth / 2,
      y: this.y - this.doorHeight / 4,
      alpha: 0.7,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Disable collider
        const body = this.body as Phaser.Physics.Arcade.StaticBody;
        body.enable = false;
        
        // Fade out completely
        this.scene.tweens.add({
          targets: this,
          alpha: 0,
          duration: 500,
          delay: 200
        });
      }
    });
    
    // Create dust cloud
    this.createDustCloud();
  }

  private createDustCloud(): void {
    if (!this.scene.textures.exists('doorDust')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x888888, 0.6);
      g.fillCircle(8, 8, 8);
      g.generateTexture('doorDust', 16, 16);
      g.destroy();
    }
    
    const particles = this.scene.add.particles(this.x, this.y + this.doorHeight / 3, 'doorDust', {
      speed: { min: 20, max: 60 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 600,
      gravityY: -20,
      quantity: 8,
      emitting: false
    });
    
    particles.explode(8);
    this.scene.time.delayedCall(700, () => particles.destroy());
  }

  isOpenState(): boolean {
    return this.isOpen;
  }

  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.doorWidth / 2,
      this.y - this.doorHeight / 2,
      this.doorWidth,
      this.doorHeight
    );
  }
}
