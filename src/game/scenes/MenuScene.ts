import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';
import gameState from '../core/GameState';

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Text;
  private particles!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    // Background
    this.cameras.main.setBackgroundColor('#0a0c12');
    
    // Ambient particles
    this.createAmbientParticles();
    
    // Title
    this.titleText = this.add.text(width / 2, height * 0.35, 'HALLOW NEST', {
      fontFamily: 'Cinzel, serif',
      fontSize: '64px',
      color: '#e8e8e8',
      stroke: '#5599dd',
      strokeThickness: 2,
    }).setOrigin(0.5);
    
    // Subtitle
    this.add.text(width / 2, height * 0.45, 'A cursed vessel awakens...', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '18px',
      color: '#888899',
    }).setOrigin(0.5);
    
    // Start button
    this.startButton = this.add.text(width / 2, height * 0.65, '[ BEGIN JOURNEY ]', {
      fontFamily: 'Cinzel, serif',
      fontSize: '24px',
      color: '#5599dd',
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.startButton.setColor('#88ccff');
      this.startButton.setScale(1.1);
    })
    .on('pointerout', () => {
      this.startButton.setColor('#5599dd');
      this.startButton.setScale(1);
    })
    .on('pointerdown', () => {
      this.startGame();
    });
    
    // Controls hint
    this.add.text(width / 2, height * 0.85, 'WASD / Arrows: Move  |  Space: Jump  |  Shift: Dash  |  K: Attack  |  E: Interact', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      color: '#555566',
    }).setOrigin(0.5);
    
    // Keyboard start
    this.input.keyboard?.once('keydown-SPACE', () => {
      this.startGame();
    });
    
    this.input.keyboard?.once('keydown-ENTER', () => {
      this.startGame();
    });
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }

  private createAmbientParticles(): void {
    const { width, height } = this.cameras.main;
    this.particles = this.add.graphics();
    
    // Create floating dust particles
    const particleCount = 30;
    const particleData: { x: number; y: number; size: number; speed: number; alpha: number }[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particleData.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.5,
        alpha: 0.1 + Math.random() * 0.3,
      });
    }
    
    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        this.particles.clear();
        particleData.forEach(p => {
          p.y -= p.speed;
          p.x += Math.sin(p.y * 0.01) * 0.3;
          if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
          }
          this.particles.fillStyle(COLORS.playerOutline, p.alpha);
          this.particles.fillCircle(p.x, p.y, p.size);
        });
      },
    });
  }

  private startGame(): void {
    gameState.resetRun();
    gameState.setState('playing');
    
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { levelId: 'fadingTown', spawnId: 'default' });
    });
  }
}
