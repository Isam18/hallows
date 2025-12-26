import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '../core/GameConfig';
import gameState from '../core/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1a1e2a, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);
    
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x5599dd, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
    });
    
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });
    
    // Generate placeholder sprites using graphics
    this.createPlaceholderSprites();
  }

  private createPlaceholderSprites(): void {
    // Player sprite
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(COLORS.player);
    playerGraphics.fillRoundedRect(0, 0, 24, 40, 4);
    // Cloak accent
    playerGraphics.fillStyle(COLORS.playerOutline);
    playerGraphics.fillRect(6, 8, 12, 4); // Eyes
    playerGraphics.fillTriangle(12, 40, 0, 30, 24, 30); // Cloak bottom
    playerGraphics.generateTexture('player', 24, 40);
    playerGraphics.destroy();
    
    // Attack slash
    const slashGraphics = this.make.graphics({ x: 0, y: 0 });
    slashGraphics.fillStyle(COLORS.playerOutline, 0.8);
    slashGraphics.slice(25, 25, 25, Phaser.Math.DegToRad(-45), Phaser.Math.DegToRad(45), false);
    slashGraphics.fillPath();
    slashGraphics.generateTexture('slash', 50, 50);
    slashGraphics.destroy();
    
    // Enemy - Spiky Grub
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(COLORS.enemy);
    enemyGraphics.fillEllipse(16, 14, 32, 24);
    // Spikes
    enemyGraphics.fillStyle(COLORS.enemyAccent);
    for (let i = 0; i < 5; i++) {
      enemyGraphics.fillTriangle(
        6 + i * 5, 4,
        3 + i * 5, 12,
        9 + i * 5, 12
      );
    }
    enemyGraphics.generateTexture('spikyGrub', 32, 24);
    enemyGraphics.destroy();
    
    // Boss
    const bossGraphics = this.make.graphics({ x: 0, y: 0 });
    bossGraphics.fillStyle(COLORS.boss);
    bossGraphics.fillEllipse(40, 35, 80, 60);
    bossGraphics.fillStyle(COLORS.bossAccent);
    // Spikes on boss
    for (let i = 0; i < 7; i++) {
      bossGraphics.fillTriangle(
        10 + i * 10, 5,
        5 + i * 10, 20,
        15 + i * 10, 20
      );
    }
    // Eyes
    bossGraphics.fillStyle(0xff0000);
    bossGraphics.fillCircle(25, 30, 5);
    bossGraphics.fillCircle(55, 30, 5);
    bossGraphics.generateTexture('elderGrub', 80, 60);
    bossGraphics.destroy();
    
    // Shell pickup
    const shellGraphics = this.make.graphics({ x: 0, y: 0 });
    shellGraphics.fillStyle(COLORS.shell);
    shellGraphics.fillCircle(8, 8, 8);
    shellGraphics.lineStyle(2, COLORS.shellGlow);
    shellGraphics.strokeCircle(8, 8, 8);
    shellGraphics.generateTexture('shell', 16, 16);
    shellGraphics.destroy();
    
    // Bench
    const benchGraphics = this.make.graphics({ x: 0, y: 0 });
    benchGraphics.fillStyle(COLORS.bench);
    benchGraphics.fillRect(0, 30, 60, 15); // Seat
    benchGraphics.fillRect(5, 0, 8, 30); // Left back
    benchGraphics.fillRect(47, 0, 8, 30); // Right back
    benchGraphics.fillRect(5, 35, 8, 10); // Left leg
    benchGraphics.fillRect(47, 35, 8, 10); // Right leg
    benchGraphics.generateTexture('bench', 60, 45);
    benchGraphics.destroy();
    
    // Death marker (dropped shells)
    const markerGraphics = this.make.graphics({ x: 0, y: 0 });
    markerGraphics.lineStyle(3, COLORS.shellGlow, 0.8);
    markerGraphics.strokeCircle(15, 15, 12);
    markerGraphics.fillStyle(COLORS.shell, 0.6);
    markerGraphics.fillCircle(15, 15, 8);
    markerGraphics.generateTexture('deathMarker', 30, 30);
    markerGraphics.destroy();
    
    // Portal/transition indicator
    const portalGraphics = this.make.graphics({ x: 0, y: 0 });
    portalGraphics.fillStyle(COLORS.portal, 0.3);
    portalGraphics.fillRect(0, 0, 30, 100);
    portalGraphics.lineStyle(2, COLORS.portal, 0.8);
    portalGraphics.strokeRect(0, 0, 30, 100);
    portalGraphics.generateTexture('portal', 30, 100);
    portalGraphics.destroy();
    
    // Boss projectile spike
    const spikeGraphics = this.make.graphics({ x: 0, y: 0 });
    spikeGraphics.fillStyle(COLORS.bossAccent);
    spikeGraphics.fillTriangle(8, 0, 0, 20, 16, 20);
    spikeGraphics.generateTexture('spike', 16, 20);
    spikeGraphics.destroy();
  }

  create(): void {
    // Initialize game state
    gameState.resetRun();
    
    // Go to menu or game
    this.scene.start('MenuScene');
  }
}
