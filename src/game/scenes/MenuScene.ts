import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';
import gameState from '../core/GameState';

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Text;
  private endlessButton!: Phaser.GameObjects.Text;
  private arenaButton!: Phaser.GameObjects.Text;
  private debugButton!: Phaser.GameObjects.Text;
  private particles!: Phaser.GameObjects.Graphics;
  private debugMode = false;
  private arenaContainer?: Phaser.GameObjects.Container;

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
    this.titleText = this.add.text(width / 2, height * 0.30, 'HALLOW NEST', {
      fontFamily: 'Cinzel, serif',
      fontSize: '64px',
      color: '#e8e8e8',
      stroke: '#5599dd',
      strokeThickness: 2,
    }).setOrigin(0.5);
    
    // Subtitle
    this.add.text(width / 2, height * 0.40, 'A cursed vessel awakens...', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '18px',
      color: '#888899',
    }).setOrigin(0.5);
    
    // Start button
    this.startButton = this.add.text(width / 2, height * 0.55, '[ BEGIN JOURNEY ]', {
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
    
    // Endless Deads button
    this.endlessButton = this.add.text(width / 2, height * 0.63, '[ ENDLESS DEADS ]', {
      fontFamily: 'Cinzel, serif',
      fontSize: '20px',
      color: '#cc4444',
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.endlessButton.setColor('#ff6666');
      this.endlessButton.setScale(1.1);
    })
    .on('pointerout', () => {
      this.endlessButton.setColor('#cc4444');
      this.endlessButton.setScale(1);
    })
    .on('pointerdown', () => {
      this.startEndlessMode();
    });

    // Arena Mode button (green)
    this.arenaButton = this.add.text(width / 2, height * 0.68, '[ ARENA MODE ]', {
      fontFamily: 'Cinzel, serif',
      fontSize: '20px',
      color: '#44cc66',
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.arenaButton.setColor('#88ff99');
      this.arenaButton.setScale(1.1);
    })
    .on('pointerout', () => {
      this.arenaButton.setColor('#44cc66');
      this.arenaButton.setScale(1);
    })
    .on('pointerdown', () => {
      this.showArenaMenu();
    });

    // Debug mode toggle button
    this.debugButton = this.add.text(width / 2, height * 0.78, '[ DEBUG MODE: OFF ]', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '16px',
      color: '#666677',
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.debugButton.setColor(this.debugMode ? '#ff8866' : '#88aa88');
      this.debugButton.setScale(1.05);
    })
    .on('pointerout', () => {
      this.debugButton.setColor(this.debugMode ? '#ff6644' : '#666677');
      this.debugButton.setScale(1);
    })
    .on('pointerdown', () => {
      this.toggleDebugMode();
    });
    
    // Debug mode explanation
    this.add.text(width / 2, height * 0.79, 'Shows hitboxes, stats, and enables teleport commands', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#444455',
    }).setOrigin(0.5);
    
    // Controls hint
    this.add.text(width / 2, height * 0.88, 'WASD / Arrows: Move  |  Space: Jump  |  Shift: Dash  |  K: Attack  |  E: Interact', {
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
    
    // D key to toggle debug
    this.input.keyboard?.on('keydown-D', () => {
      this.toggleDebugMode();
    });
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }

  private toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    
    if (this.debugMode) {
      this.debugButton.setText('[ DEBUG MODE: ON ]');
      this.debugButton.setColor('#ff6644');
    } else {
      this.debugButton.setText('[ DEBUG MODE: OFF ]');
      this.debugButton.setColor('#666677');
    }
    
    // Store in registry for GameScene to access
    this.registry.set('debugMode', this.debugMode);
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
      this.scene.start('GameScene', { 
        levelId: 'forgottenCrossroads', 
        spawnId: 'default',
        debugMode: this.debugMode
      });
    });
  }

  private startEndlessMode(): void {
    gameState.resetRun();
    // Set 6 HP / 6 maxHp for endless mode
    (gameState as any).playerData.maxHp = 6;
    (gameState as any).playerData.hp = 6;
    gameState.refillSoul();
    gameState.setState('playing');
    
    this.cameras.main.fadeOut(300, 30, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { 
        levelId: 'endlessArena', 
        spawnId: 'default',
        debugMode: this.debugMode,
        endlessMode: true
      });
    });
  }

  private showArenaMenu(): void {
    if (this.arenaContainer) return;
    const { width, height } = this.cameras.main;
    const container = this.add.container(0, 0);
    this.arenaContainer = container;

    // Dim background
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    bg.setInteractive();
    container.add(bg);

    const title = this.add.text(width / 2, height * 0.12, 'ARENA MODE', {
      fontFamily: 'Cinzel, serif',
      fontSize: '40px',
      color: '#44cc66',
      stroke: '#114422',
      strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(title);

    const subtitle = this.add.text(width / 2, height * 0.20, 'Choose your stage', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '16px',
      color: '#88aa99',
    }).setOrigin(0.5);
    container.add(subtitle);

    const stages = [
      { name: 'Forgotten Brawl', stars: 1, max: 12, levelId: 'forgottenBrawl', locked: false },
      { name: 'Spiky', stars: 3, max: 12, levelId: 'spikyArena', locked: false },
      { name: '???', stars: 0, max: 12, levelId: '', locked: true },
    ];

    stages.forEach((stage, i) => {
      const cy = height * (0.34 + i * 0.18);
      const cardW = width * 0.6;
      const cardH = height * 0.14;
      const cx = width / 2;

      const cardColor = stage.locked ? 0x222222 : 0x1a3a22;
      const cardStroke = stage.locked ? 0x444444 : 0x44cc66;
      const card = this.add.rectangle(cx, cy, cardW, cardH, cardColor, 0.9)
        .setStrokeStyle(2, cardStroke);
      container.add(card);

      const nameColor = stage.locked ? '#555566' : '#e8ffe8';
      const nameText = this.add.text(cx - cardW / 2 + 24, cy - 14, stage.locked ? '??? LOCKED' : stage.name, {
        fontFamily: 'Cinzel, serif',
        fontSize: '22px',
        color: nameColor,
      }).setOrigin(0, 0.5);
      container.add(nameText);

      // Stars display
      const starsStr = `${stage.stars}/${stage.max}  ` + '★'.repeat(stage.stars) + '☆'.repeat(stage.max - stage.stars);
      const starColor = stage.locked ? '#444455' : '#ffcc44';
      const starsText = this.add.text(cx - cardW / 2 + 24, cy + 16, starsStr, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '13px',
        color: starColor,
      }).setOrigin(0, 0.5);
      container.add(starsText);

      if (!stage.locked) {
        card.setInteractive({ useHandCursor: true })
          .on('pointerover', () => { card.setFillStyle(0x2a5a35, 0.95); })
          .on('pointerout', () => { card.setFillStyle(cardColor, 0.9); })
          .on('pointerdown', () => { this.startArenaStage(stage.levelId); });
      }
    });

    const closeBtn = this.add.text(width / 2, height * 0.92, '[ BACK ]', {
      fontFamily: 'Cinzel, serif',
      fontSize: '18px',
      color: '#888899',
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => closeBtn.setColor('#ffffff'))
    .on('pointerout', () => closeBtn.setColor('#888899'))
    .on('pointerdown', () => this.hideArenaMenu());
    container.add(closeBtn);
  }

  private hideArenaMenu(): void {
    this.arenaContainer?.destroy();
    this.arenaContainer = undefined;
  }

  private startArenaStage(levelId: string): void {
    gameState.resetRun();
    gameState.setState('playing');
    this.cameras.main.fadeOut(300, 0, 30, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', {
        levelId,
        spawnId: 'default',
        debugMode: this.debugMode,
        arenaMode: true,
      });
    });
  }
}
