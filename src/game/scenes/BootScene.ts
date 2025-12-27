import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '../core/GameConfig';
import gameState from '../core/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
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
    
    this.createPlaceholderSprites();
  }

  private createPlaceholderSprites(): void {
    this.createPlayerSprites();
    this.createEnemySprites();
    this.createBossSprites();
    this.createPickupSprites();
    this.createEnvironmentSprites();
  }

  private createPlayerSprites(): void {
    // Player idle - refined knight silhouette with cloak
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    
    // Cloak body - dark with clean shape
    playerGraphics.fillStyle(0x1a1e2a);
    playerGraphics.fillRoundedRect(4, 12, 16, 28, 3);
    
    // Cloak flutter at bottom
    playerGraphics.fillTriangle(4, 36, 0, 42, 10, 38);
    playerGraphics.fillTriangle(20, 36, 24, 42, 14, 38);
    
    // Inner cloak lining - subtle blue
    playerGraphics.fillStyle(0x3a5577);
    playerGraphics.fillRect(6, 14, 2, 20);
    playerGraphics.fillRect(16, 14, 2, 20);
    
    // Mask/head - white with clean shape
    playerGraphics.fillStyle(0xf0f4f8);
    playerGraphics.fillRoundedRect(5, 4, 14, 12, 4);
    
    // Eye holes - deep black
    playerGraphics.fillStyle(0x000000);
    playerGraphics.fillEllipse(8, 9, 3, 4);
    playerGraphics.fillEllipse(16, 9, 3, 4);
    
    // Outline for definition
    playerGraphics.lineStyle(2, 0x0a0c10);
    playerGraphics.strokeRoundedRect(4, 12, 16, 28, 3);
    playerGraphics.strokeRoundedRect(5, 4, 14, 12, 4);
    
    playerGraphics.generateTexture('player', 24, 44);
    playerGraphics.destroy();
    
    // Player run frames (2 frames)
    for (let frame = 0; frame < 2; frame++) {
      const runGraphics = this.make.graphics({ x: 0, y: 0 });
      const legOffset = frame === 0 ? 2 : -2;
      
      // Cloak body
      runGraphics.fillStyle(0x1a1e2a);
      runGraphics.fillRoundedRect(4, 12, 16, 26, 3);
      
      // Legs in motion
      runGraphics.fillTriangle(6 + legOffset, 36, 4, 44, 10, 38);
      runGraphics.fillTriangle(18 - legOffset, 36, 20, 44, 14, 38);
      
      // Inner lining
      runGraphics.fillStyle(0x3a5577);
      runGraphics.fillRect(6, 14, 2, 18);
      runGraphics.fillRect(16, 14, 2, 18);
      
      // Head
      runGraphics.fillStyle(0xf0f4f8);
      runGraphics.fillRoundedRect(5, 4, 14, 12, 4);
      
      // Eyes
      runGraphics.fillStyle(0x000000);
      runGraphics.fillEllipse(8, 9, 3, 4);
      runGraphics.fillEllipse(16, 9, 3, 4);
      
      // Outline
      runGraphics.lineStyle(2, 0x0a0c10);
      runGraphics.strokeRoundedRect(4, 12, 16, 26, 3);
      runGraphics.strokeRoundedRect(5, 4, 14, 12, 4);
      
      runGraphics.generateTexture(`player_run_${frame}`, 24, 44);
      runGraphics.destroy();
    }
    
    // Player jump pose
    const jumpGraphics = this.make.graphics({ x: 0, y: 0 });
    
    // Stretched cloak
    jumpGraphics.fillStyle(0x1a1e2a);
    jumpGraphics.fillRoundedRect(4, 14, 16, 24, 3);
    jumpGraphics.fillTriangle(4, 34, -2, 44, 12, 36);
    jumpGraphics.fillTriangle(20, 34, 26, 44, 12, 36);
    
    // Lining
    jumpGraphics.fillStyle(0x3a5577);
    jumpGraphics.fillRect(6, 16, 2, 16);
    jumpGraphics.fillRect(16, 16, 2, 16);
    
    // Head slightly up
    jumpGraphics.fillStyle(0xf0f4f8);
    jumpGraphics.fillRoundedRect(5, 2, 14, 12, 4);
    
    // Eyes
    jumpGraphics.fillStyle(0x000000);
    jumpGraphics.fillEllipse(8, 7, 3, 4);
    jumpGraphics.fillEllipse(16, 7, 3, 4);
    
    // Outline
    jumpGraphics.lineStyle(2, 0x0a0c10);
    jumpGraphics.strokeRoundedRect(4, 14, 16, 24, 3);
    jumpGraphics.strokeRoundedRect(5, 2, 14, 12, 4);
    
    jumpGraphics.generateTexture('player_jump', 24, 44);
    jumpGraphics.destroy();
    
    // Player dash (motion blur effect)
    const dashGraphics = this.make.graphics({ x: 0, y: 0 });
    
    // Streaked body
    dashGraphics.fillStyle(0x1a1e2a, 0.4);
    dashGraphics.fillRect(0, 14, 8, 22);
    dashGraphics.fillStyle(0x1a1e2a, 0.7);
    dashGraphics.fillRect(8, 14, 8, 24);
    dashGraphics.fillStyle(0x1a1e2a);
    dashGraphics.fillRoundedRect(16, 12, 16, 28, 3);
    
    // Lining
    dashGraphics.fillStyle(0x5599dd, 0.8);
    dashGraphics.fillRect(18, 14, 2, 22);
    dashGraphics.fillRect(28, 14, 2, 22);
    
    // Head
    dashGraphics.fillStyle(0xf0f4f8);
    dashGraphics.fillRoundedRect(17, 4, 14, 12, 4);
    
    // Eyes
    dashGraphics.fillStyle(0x000000);
    dashGraphics.fillEllipse(20, 9, 3, 4);
    dashGraphics.fillEllipse(28, 9, 3, 4);
    
    dashGraphics.generateTexture('player_dash', 32, 44);
    dashGraphics.destroy();
    
    // Attack slash arc
    const slashGraphics = this.make.graphics({ x: 0, y: 0 });
    
    // Main arc
    slashGraphics.lineStyle(4, 0xf0f4f8, 0.9);
    slashGraphics.beginPath();
    slashGraphics.arc(30, 30, 28, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60));
    slashGraphics.strokePath();
    
    // Accent line
    slashGraphics.lineStyle(2, 0x5599dd, 0.7);
    slashGraphics.beginPath();
    slashGraphics.arc(30, 30, 24, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50));
    slashGraphics.strokePath();
    
    // Motion lines
    slashGraphics.lineStyle(1, 0xf0f4f8, 0.5);
    slashGraphics.lineBetween(30, 10, 50, 6);
    slashGraphics.lineBetween(30, 50, 50, 54);
    
    slashGraphics.generateTexture('slash', 60, 60);
    slashGraphics.destroy();
  }

  private createEnemySprites(): void {
    // SpikyGrub - refined bug design
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    
    // Body - light fill with thickness
    enemyGraphics.fillStyle(0xd0d4d8);
    enemyGraphics.fillEllipse(18, 16, 32, 22);
    
    // Darker underbelly
    enemyGraphics.fillStyle(0x9099a0);
    enemyGraphics.fillEllipse(18, 20, 28, 10);
    
    // Spines - blue accents with sharp points
    enemyGraphics.fillStyle(0x3a7799);
    for (let i = 0; i < 5; i++) {
      const x = 6 + i * 6;
      enemyGraphics.fillTriangle(x, 2, x - 3, 10, x + 3, 10);
    }
    
    // Spine highlights
    enemyGraphics.fillStyle(0x5599cc);
    for (let i = 0; i < 5; i++) {
      const x = 6 + i * 6;
      enemyGraphics.fillTriangle(x, 4, x - 1, 8, x + 1, 8);
    }
    
    // Simple face - minimal dots for eyes
    enemyGraphics.fillStyle(0x1a1e2a);
    enemyGraphics.fillCircle(10, 14, 2);
    enemyGraphics.fillCircle(16, 14, 2);
    
    // Thick outline
    enemyGraphics.lineStyle(2.5, 0x1a1e2a);
    enemyGraphics.strokeEllipse(18, 16, 32, 22);
    
    enemyGraphics.generateTexture('spikyGrub', 36, 28);
    enemyGraphics.destroy();
    
    // Enemy hurt frame (flash white)
    const hurtGraphics = this.make.graphics({ x: 0, y: 0 });
    hurtGraphics.fillStyle(0xffffff);
    hurtGraphics.fillEllipse(18, 16, 32, 22);
    hurtGraphics.fillStyle(0xccddff);
    for (let i = 0; i < 5; i++) {
      const x = 6 + i * 6;
      hurtGraphics.fillTriangle(x, 2, x - 3, 10, x + 3, 10);
    }
    hurtGraphics.generateTexture('spikyGrub_hurt', 36, 28);
    hurtGraphics.destroy();
    
    // Vengefly - Hollow Knight inspired flying enemy
    this.createVengeflySprite();
    
    // Husk Guard - Elite armored enemy
    this.createHuskGuardSprite();
    
    // Infected Husk - Passive environmental enemy
    this.createInfectedHuskSprite();
  }

  private createVengeflySprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 20; // Center X
    const cy = 18; // Center Y
    
    // === WINGS (translucent, behind body) ===
    // Left wing - pale translucent
    g.fillStyle(0xc8d0d8, 0.6);
    g.fillEllipse(cx - 8, cy - 8, 18, 10);
    g.lineStyle(1, 0x8090a0, 0.5);
    g.strokeEllipse(cx - 8, cy - 8, 18, 10);
    
    // Right wing
    g.fillStyle(0xc8d0d8, 0.6);
    g.fillEllipse(cx + 8, cy - 8, 18, 10);
    g.lineStyle(1, 0x8090a0, 0.5);
    g.strokeEllipse(cx + 8, cy - 8, 18, 10);
    
    // Wing veins
    g.lineStyle(0.5, 0x9aa0a8, 0.4);
    g.lineBetween(cx - 12, cy - 10, cx - 4, cy - 6);
    g.lineBetween(cx - 14, cy - 7, cx - 6, cy - 7);
    g.lineBetween(cx + 12, cy - 10, cx + 4, cy - 6);
    g.lineBetween(cx + 14, cy - 7, cx + 6, cy - 7);
    
    // === BODY (dark blue segmented) ===
    // Main thorax - dark blue
    g.fillStyle(0x3a4a68);
    g.fillEllipse(cx, cy + 2, 16, 12);
    
    // Abdomen segments (behind)
    g.fillStyle(0x2a3a58);
    g.fillEllipse(cx + 8, cy + 6, 10, 8);
    g.fillEllipse(cx + 14, cy + 8, 7, 6);
    
    // Segment lines for detail
    g.lineStyle(1, 0x1a2a40);
    g.lineBetween(cx - 2, cy - 2, cx - 2, cy + 8);
    g.lineBetween(cx + 4, cy, cx + 4, cy + 10);
    g.lineBetween(cx + 10, cy + 3, cx + 10, cy + 11);
    
    // Body highlight
    g.fillStyle(0x4a5a78, 0.6);
    g.fillEllipse(cx - 2, cy, 6, 4);
    
    // === LEGS (small, dangling) ===
    g.lineStyle(1.5, 0x2a3a50);
    // Front legs
    g.lineBetween(cx - 4, cy + 6, cx - 8, cy + 14);
    g.lineBetween(cx - 3, cy + 6, cx - 5, cy + 13);
    // Back legs  
    g.lineBetween(cx + 2, cy + 7, cx + 4, cy + 14);
    g.lineBetween(cx + 6, cy + 8, cx + 9, cy + 15);
    
    // === HEAD (pale skull/mask) ===
    // Skull base - pale cream/white
    g.fillStyle(0xe8e0d8);
    g.fillEllipse(cx - 10, cy + 2, 12, 10);
    
    // Pointed snout/beak
    g.fillStyle(0xd8d0c8);
    g.beginPath();
    g.moveTo(cx - 16, cy + 2);
    g.lineTo(cx - 24, cy + 4);
    g.lineTo(cx - 16, cy + 6);
    g.closePath();
    g.fillPath();
    
    // Snout detail line
    g.lineStyle(1, 0xa09080);
    g.lineBetween(cx - 16, cy + 4, cx - 22, cy + 4);
    
    // Eye sockets - dark hollow
    g.fillStyle(0x1a1a20);
    g.fillEllipse(cx - 12, cy, 4, 5);
    g.fillEllipse(cx - 8, cy + 1, 3, 4);
    
    // Skull outline
    g.lineStyle(1.5, 0x2a2a30);
    g.strokeEllipse(cx - 10, cy + 2, 12, 10);
    
    // Body outline
    g.lineStyle(1.5, 0x1a2a40);
    g.strokeEllipse(cx, cy + 2, 16, 12);
    
    g.generateTexture('vengefly', 44, 36);
    g.destroy();
    
    // Vengefly hurt frame (white flash)
    const hg = this.make.graphics({ x: 0, y: 0 });
    
    // Simplified white silhouette for hurt flash
    hg.fillStyle(0xffffff);
    hg.fillEllipse(cx - 8, cy - 8, 18, 10); // Wings
    hg.fillEllipse(cx + 8, cy - 8, 18, 10);
    hg.fillEllipse(cx, cy + 2, 16, 12); // Body
    hg.fillEllipse(cx + 8, cy + 6, 10, 8);
    hg.fillEllipse(cx - 10, cy + 2, 12, 10); // Head
    
    hg.generateTexture('vengefly_hurt', 44, 36);
    hg.destroy();
  }

  private createHuskGuardSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 32; // Center X (2x player size)
    const cy = 40; // Center Y
    
    // === BODY (bulky armored thorax) ===
    // Main armored body - dark blue/grey
    g.fillStyle(0x3a4a5a);
    g.fillEllipse(cx, cy + 5, 50, 45);
    
    // Armor plates - segmented look
    g.fillStyle(0x4a5a6a);
    g.fillEllipse(cx, cy - 5, 46, 30);
    
    // Armor highlights
    g.fillStyle(0x5a6a7a, 0.7);
    g.fillEllipse(cx - 8, cy - 10, 14, 12);
    g.fillEllipse(cx + 8, cy - 10, 14, 12);
    
    // Armor segment lines
    g.lineStyle(2, 0x2a3a4a);
    g.lineBetween(cx - 15, cy - 15, cx - 15, cy + 20);
    g.lineBetween(cx, cy - 20, cx, cy + 15);
    g.lineBetween(cx + 15, cy - 15, cx + 15, cy + 20);
    
    // Underbelly - darker
    g.fillStyle(0x2a3a48);
    g.fillEllipse(cx, cy + 20, 40, 20);
    
    // === HELMET HEAD ===
    // Main helmet - distinctive shape
    g.fillStyle(0x4a5a68);
    g.fillEllipse(cx, cy - 30, 36, 28);
    
    // Helmet crest
    g.fillStyle(0x3a4a58);
    g.beginPath();
    g.moveTo(cx, cy - 50);
    g.lineTo(cx - 10, cy - 30);
    g.lineTo(cx + 10, cy - 30);
    g.closePath();
    g.fillPath();
    
    // Face plate - pale mask
    g.fillStyle(0xd0d8e0);
    g.fillEllipse(cx, cy - 28, 22, 18);
    
    // Eye slits - dark hollow
    g.fillStyle(0x1a1a20);
    g.fillEllipse(cx - 6, cy - 30, 5, 8);
    g.fillEllipse(cx + 6, cy - 30, 5, 8);
    
    // Mouth guard
    g.fillStyle(0x3a4a58);
    g.fillRect(cx - 8, cy - 22, 16, 6);
    g.lineStyle(1, 0x2a3a48);
    g.lineBetween(cx - 6, cy - 22, cx - 6, cy - 16);
    g.lineBetween(cx, cy - 22, cx, cy - 16);
    g.lineBetween(cx + 6, cy - 22, cx + 6, cy - 16);
    
    // === LEGS (sturdy) ===
    g.fillStyle(0x3a4a5a);
    // Front legs
    g.fillRect(cx - 18, cy + 22, 8, 20);
    g.fillRect(cx + 10, cy + 22, 8, 20);
    // Back legs
    g.fillRect(cx - 12, cy + 25, 6, 18);
    g.fillRect(cx + 6, cy + 25, 6, 18);
    
    // Leg armor
    g.fillStyle(0x4a5a6a);
    g.fillRect(cx - 18, cy + 22, 8, 6);
    g.fillRect(cx + 10, cy + 22, 8, 6);
    
    // === CLUB ARM (attack weapon) ===
    g.fillStyle(0x3a4a58);
    g.fillRect(cx + 22, cy - 10, 10, 35);
    // Club head
    g.fillStyle(0x4a5a68);
    g.fillEllipse(cx + 27, cy + 28, 14, 10);
    
    // === OUTLINES ===
    g.lineStyle(2, 0x1a2a38);
    g.strokeEllipse(cx, cy + 5, 50, 45);
    g.strokeEllipse(cx, cy - 30, 36, 28);
    
    g.generateTexture('huskGuard', 64, 80);
    g.destroy();
    
    // Husk Guard hurt frame
    const hg = this.make.graphics({ x: 0, y: 0 });
    hg.fillStyle(0xffffff);
    hg.fillEllipse(cx, cy + 5, 50, 45);
    hg.fillEllipse(cx, cy - 30, 36, 28);
    hg.fillRect(cx - 18, cy + 22, 8, 20);
    hg.fillRect(cx + 10, cy + 22, 8, 20);
    hg.fillRect(cx + 22, cy - 10, 10, 35);
    hg.fillEllipse(cx + 27, cy + 28, 14, 10);
    hg.generateTexture('huskGuard_hurt', 64, 80);
    hg.destroy();
  }

  private createInfectedHuskSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 35;  // Larger canvas
    const cy = 30;
    
    // === CURLED UP BODY ===
    // Main body - hunched over (1.75x larger)
    g.fillStyle(0x4a5a6a);
    g.fillEllipse(cx, cy + 7, 56, 42);
    
    // Head tucked in
    g.fillStyle(0x5a6a7a);
    g.fillEllipse(cx - 10, cy - 7, 28, 24);
    
    // Arms wrapped around
    g.fillStyle(0x4a5a6a);
    g.fillEllipse(cx + 14, cy, 18, 32);
    
    // === INFECTION PUSTULES (orange glow) ===
    // Large central pustule
    g.fillStyle(0xff6633);
    g.fillCircle(cx + 4, cy + 4, 9);
    g.fillStyle(0xffaa66, 0.8);
    g.fillCircle(cx + 4, cy + 2, 5);
    
    // Secondary pustules
    g.fillStyle(0xff7744);
    g.fillCircle(cx - 14, cy + 10, 5);
    g.fillCircle(cx + 18, cy + 14, 5);
    g.fillCircle(cx - 7, cy - 10, 4);
    
    // Pustule highlights
    g.fillStyle(0xffcc88, 0.7);
    g.fillCircle(cx - 14, cy + 8, 2.5);
    g.fillCircle(cx + 18, cy + 12, 2.5);
    
    // Small infection spots
    g.fillStyle(0xff8855, 0.6);
    g.fillCircle(cx + 9, cy - 4, 2.5);
    g.fillCircle(cx - 18, cy + 4, 2.5);
    g.fillCircle(cx + 22, cy + 4, 2.5);
    g.fillCircle(cx - 4, cy + 18, 2);
    g.fillCircle(cx + 10, cy + 20, 2);
    
    // === DETAILS ===
    // Body segment lines
    g.lineStyle(1.5, 0x3a4a5a);
    g.lineBetween(cx - 18, cy, cx - 18, cy + 18);
    g.lineBetween(cx + 7, cy - 4, cx + 7, cy + 22);
    
    // Outline
    g.lineStyle(2, 0x2a3a4a);
    g.strokeEllipse(cx, cy + 7, 56, 42);
    
    g.generateTexture('infectedHusk', 72, 60);
    g.destroy();
    
    // Infected Husk hurt frame
    const hg = this.make.graphics({ x: 0, y: 0 });
    hg.fillStyle(0xffffff);
    hg.fillEllipse(cx, cy + 7, 56, 42);
    hg.fillEllipse(cx - 10, cy - 7, 28, 24);
    hg.fillStyle(0xffddaa);
    hg.fillCircle(cx + 4, cy + 4, 9);
    hg.fillCircle(cx - 14, cy + 10, 5);
    hg.fillCircle(cx + 18, cy + 14, 5);
    hg.generateTexture('infectedHusk_hurt', 72, 60);
    hg.destroy();
  }

  private createBossSprites(): void {
    // Elder Grub - larger, more imposing
    const bossGraphics = this.make.graphics({ x: 0, y: 0 });
    
    // Main body
    bossGraphics.fillStyle(0xc0c4c8);
    bossGraphics.fillEllipse(45, 40, 85, 65);
    
    // Underbelly shadow
    bossGraphics.fillStyle(0x707880);
    bossGraphics.fillEllipse(45, 50, 75, 35);
    
    // Large spines
    bossGraphics.fillStyle(0x2a5577);
    for (let i = 0; i < 7; i++) {
      const x = 10 + i * 11;
      const h = i === 3 ? 22 : 16; // Center spine taller
      bossGraphics.fillTriangle(x, 8, x - 5, 8 + h, x + 5, 8 + h);
    }
    
    // Spine highlights
    bossGraphics.fillStyle(0x4488bb);
    for (let i = 0; i < 7; i++) {
      const x = 10 + i * 11;
      const h = i === 3 ? 12 : 8;
      bossGraphics.fillTriangle(x, 10, x - 2, 10 + h, x + 2, 10 + h);
    }
    
    // Eyes - menacing red glow
    bossGraphics.fillStyle(0x220000);
    bossGraphics.fillCircle(28, 35, 10);
    bossGraphics.fillCircle(62, 35, 10);
    
    bossGraphics.fillStyle(0xcc2222);
    bossGraphics.fillCircle(28, 35, 7);
    bossGraphics.fillCircle(62, 35, 7);
    
    bossGraphics.fillStyle(0xff4444);
    bossGraphics.fillCircle(30, 33, 3);
    bossGraphics.fillCircle(64, 33, 3);
    
    // Thick outline
    bossGraphics.lineStyle(3, 0x1a1e2a);
    bossGraphics.strokeEllipse(45, 40, 85, 65);
    
    bossGraphics.generateTexture('elderGrub', 90, 75);
    bossGraphics.destroy();
    
    // Boss projectile spike
    const spikeGraphics = this.make.graphics({ x: 0, y: 0 });
    spikeGraphics.fillStyle(0x3a7799);
    spikeGraphics.fillTriangle(10, 0, 0, 24, 20, 24);
    spikeGraphics.fillStyle(0x5599cc);
    spikeGraphics.fillTriangle(10, 4, 5, 20, 15, 20);
    spikeGraphics.lineStyle(2, 0x1a1e2a);
    spikeGraphics.strokeTriangle(10, 0, 0, 24, 20, 24);
    spikeGraphics.generateTexture('spike', 20, 24);
    spikeGraphics.destroy();
  }

  private createPickupSprites(): void {
    // Shell pickup - refined gem/shell look
    const shellGraphics = this.make.graphics({ x: 0, y: 0 });
    
    // Outer glow
    shellGraphics.fillStyle(0x5599dd, 0.3);
    shellGraphics.fillCircle(10, 10, 10);
    
    // Main shell
    shellGraphics.fillStyle(0xeebb44);
    shellGraphics.fillCircle(10, 10, 7);
    
    // Highlight
    shellGraphics.fillStyle(0xffdd88);
    shellGraphics.fillCircle(8, 8, 3);
    
    // Outline
    shellGraphics.lineStyle(1.5, 0xcc9922);
    shellGraphics.strokeCircle(10, 10, 7);
    
    shellGraphics.generateTexture('shell', 20, 20);
    shellGraphics.destroy();
    
    // Death marker
    const markerGraphics = this.make.graphics({ x: 0, y: 0 });
    
    // Outer pulse ring
    markerGraphics.lineStyle(2, 0x5599dd, 0.5);
    markerGraphics.strokeCircle(18, 18, 16);
    
    // Inner ring
    markerGraphics.lineStyle(2.5, 0xeebb44, 0.8);
    markerGraphics.strokeCircle(18, 18, 10);
    
    // Center
    markerGraphics.fillStyle(0xffdd88, 0.7);
    markerGraphics.fillCircle(18, 18, 6);
    
    markerGraphics.generateTexture('deathMarker', 36, 36);
    markerGraphics.destroy();
  }

  private createEnvironmentSprites(): void {
    // Bench
    const benchGraphics = this.make.graphics({ x: 0, y: 0 });
    
    // Back rest
    benchGraphics.fillStyle(0x4a5060);
    benchGraphics.fillRoundedRect(8, 0, 6, 30, 2);
    benchGraphics.fillRoundedRect(46, 0, 6, 30, 2);
    
    // Seat
    benchGraphics.fillStyle(0x5a6070);
    benchGraphics.fillRoundedRect(0, 26, 60, 12, 3);
    
    // Seat highlight
    benchGraphics.fillStyle(0x6a7080);
    benchGraphics.fillRect(4, 28, 52, 4);
    
    // Legs
    benchGraphics.fillStyle(0x3a4050);
    benchGraphics.fillRect(8, 36, 6, 10);
    benchGraphics.fillRect(46, 36, 6, 10);
    
    // Outline
    benchGraphics.lineStyle(2, 0x2a3040);
    benchGraphics.strokeRoundedRect(0, 26, 60, 12, 3);
    
    benchGraphics.generateTexture('bench', 60, 46);
    benchGraphics.destroy();
    
    // Portal
    const portalGraphics = this.make.graphics({ x: 0, y: 0 });
    
    // Gradient glow effect
    portalGraphics.fillStyle(0x5599dd, 0.1);
    portalGraphics.fillRect(0, 0, 30, 100);
    portalGraphics.fillStyle(0x5599dd, 0.2);
    portalGraphics.fillRect(5, 0, 20, 100);
    portalGraphics.fillStyle(0x5599dd, 0.3);
    portalGraphics.fillRect(10, 0, 10, 100);
    
    // Edge lines
    portalGraphics.lineStyle(2, 0x5599dd, 0.6);
    portalGraphics.lineBetween(2, 0, 2, 100);
    portalGraphics.lineBetween(28, 0, 28, 100);
    
    portalGraphics.generateTexture('portal', 30, 100);
    portalGraphics.destroy();
  }

  create(): void {
    gameState.resetRun();
    this.scene.start('MenuScene');
  }
}
