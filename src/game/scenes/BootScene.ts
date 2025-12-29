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
    this.createGreenwayEnemySprites();
    this.createBossSprites();
    this.createPickupSprites();
    this.createEnvironmentSprites();
  }
  
  private createGreenwayEnemySprites(): void {
    // Create Mosskin - fluffy pale mossy humanoid with dark face and big eyes
    this.createMosskinSprite();
    this.createMosskinHurtSprite();
    
    // Create MossCreep - bushy green mound with glowing orange eyes
    this.createMossCreepSprite();
    this.createMossCreepHurtSprite();
    
    // Create MossWarrior - elite enemy with bush and warrior forms
    this.createMossWarriorSprites();
    
    // Create Squit - mosquito-like flying enemy
    this.createSquitSprite();
  }
  
  private createSquitSprite(): void {
    // Squit - mosquito-like flying enemy inspired by Hollow Knight reference
    // Features: teal/blue elongated body, translucent wings, dangling legs, long stinger
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 28;
    const cy = 20;
    
    // Wings (behind body) - translucent pale blue
    g.fillStyle(0xc8d8e8, 0.5);
    // Left wing
    g.beginPath();
    g.moveTo(cx - 4, cy - 6);
    g.lineTo(cx - 20, cy - 18);
    g.lineTo(cx - 22, cy - 10);
    g.lineTo(cx - 8, cy - 2);
    g.closePath();
    g.fillPath();
    
    // Right wing
    g.beginPath();
    g.moveTo(cx + 2, cy - 6);
    g.lineTo(cx + 16, cy - 20);
    g.lineTo(cx + 20, cy - 12);
    g.lineTo(cx + 6, cy - 2);
    g.closePath();
    g.fillPath();
    
    // Wing outlines
    g.lineStyle(1, 0x8898a8, 0.6);
    g.strokePath();
    
    // Wing veins
    g.lineStyle(0.5, 0x98a8b8, 0.4);
    g.lineBetween(cx - 12, cy - 12, cx - 18, cy - 14);
    g.lineBetween(cx + 10, cy - 14, cx + 16, cy - 16);
    
    // Dangling legs (thin, spindly)
    g.lineStyle(1.5, 0x283848);
    // Front legs
    g.lineBetween(cx - 2, cy + 6, cx - 8, cy + 18);
    g.lineBetween(cx + 2, cy + 6, cx + 8, cy + 18);
    // Middle legs  
    g.lineBetween(cx - 4, cy + 4, cx - 12, cy + 22);
    g.lineBetween(cx + 4, cy + 4, cx + 12, cy + 22);
    // Back legs
    g.lineBetween(cx - 2, cy + 2, cx - 10, cy + 26);
    g.lineBetween(cx + 2, cy + 2, cx + 10, cy + 26);
    
    // Leg joints/feet
    g.fillStyle(0x1a2838);
    g.fillCircle(cx - 8, cy + 18, 1.5);
    g.fillCircle(cx + 8, cy + 18, 1.5);
    g.fillCircle(cx - 12, cy + 22, 1.5);
    g.fillCircle(cx + 12, cy + 22, 1.5);
    g.fillCircle(cx - 10, cy + 26, 1.5);
    g.fillCircle(cx + 10, cy + 26, 1.5);
    
    // Main body - elongated teal/dark blue
    // Abdomen (back section - dark blue-green)
    g.fillStyle(0x2a4858);
    g.beginPath();
    g.moveTo(cx - 6, cy);
    g.lineTo(cx - 4, cy + 8);
    g.lineTo(cx, cy + 12);
    g.lineTo(cx + 4, cy + 8);
    g.lineTo(cx + 6, cy);
    g.closePath();
    g.fillPath();
    
    // Thorax (middle - lighter teal)
    g.fillStyle(0x4a7888);
    g.fillEllipse(cx, cy, 14, 10);
    
    // Thorax highlight
    g.fillStyle(0x5a98a8, 0.6);
    g.fillEllipse(cx, cy - 2, 8, 5);
    
    // Head - round with big eye
    g.fillStyle(0x4a7888);
    g.fillCircle(cx, cy - 8, 7);
    
    // Eye - large, dark with highlight
    g.fillStyle(0x1a2838);
    g.fillCircle(cx + 1, cy - 8, 5);
    
    // Eye shine
    g.fillStyle(0x88aabb, 0.7);
    g.fillCircle(cx - 1, cy - 10, 2);
    
    // Proboscis/stinger - long needle pointing forward-down
    g.lineStyle(2, 0x1a2838);
    g.lineBetween(cx, cy - 6, cx - 12, cy + 2);
    
    // Stinger tip
    g.fillStyle(0x0a1828);
    g.fillCircle(cx - 12, cy + 2, 1.5);
    
    // Body outline for definition
    g.lineStyle(1.5, 0x1a2838);
    g.strokeEllipse(cx, cy, 14, 10);
    g.strokeCircle(cx, cy - 8, 7);
    
    // Abdomen stripes
    g.lineStyle(1, 0x3a5868, 0.8);
    g.lineBetween(cx - 4, cy + 4, cx + 4, cy + 4);
    g.lineBetween(cx - 3, cy + 7, cx + 3, cy + 7);
    
    g.generateTexture('squit', 56, 40);
    g.destroy();
    
    // Create hurt version
    this.createSquitHurtSprite();
  }
  
  private createSquitHurtSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 28;
    const cy = 20;
    
    // White flash version
    // Wings
    g.fillStyle(0xffffff, 0.7);
    g.beginPath();
    g.moveTo(cx - 4, cy - 6);
    g.lineTo(cx - 20, cy - 18);
    g.lineTo(cx - 22, cy - 10);
    g.lineTo(cx - 8, cy - 2);
    g.closePath();
    g.fillPath();
    
    g.beginPath();
    g.moveTo(cx + 2, cy - 6);
    g.lineTo(cx + 16, cy - 20);
    g.lineTo(cx + 20, cy - 12);
    g.lineTo(cx + 6, cy - 2);
    g.closePath();
    g.fillPath();
    
    // Legs
    g.lineStyle(1.5, 0xdddddd);
    g.lineBetween(cx - 2, cy + 6, cx - 8, cy + 18);
    g.lineBetween(cx + 2, cy + 6, cx + 8, cy + 18);
    g.lineBetween(cx - 4, cy + 4, cx - 12, cy + 22);
    g.lineBetween(cx + 4, cy + 4, cx + 12, cy + 22);
    
    // Body
    g.fillStyle(0xffffff);
    g.fillEllipse(cx, cy, 14, 10);
    g.fillCircle(cx, cy - 8, 7);
    
    // Abdomen
    g.beginPath();
    g.moveTo(cx - 6, cy);
    g.lineTo(cx - 4, cy + 8);
    g.lineTo(cx, cy + 12);
    g.lineTo(cx + 4, cy + 8);
    g.lineTo(cx + 6, cy);
    g.closePath();
    g.fillPath();
    
    // Stinger
    g.lineStyle(2, 0xeeeeee);
    g.lineBetween(cx, cy - 6, cx - 12, cy + 2);
    
    g.generateTexture('squit_hurt', 56, 40);
    g.destroy();
  }
  
  private createMosskinSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 24;
    const cy = 30;
    
    // Fluffy mossy body like reference - pale green-gray organic shape
    // Outer fluffy layer
    g.fillStyle(0x8a9a88);
    g.fillEllipse(cx, cy + 2, 38, 42);
    
    // Fluffy texture bumps around body
    g.fillStyle(0x9aaa98);
    g.fillEllipse(cx - 14, cy - 4, 12, 14);
    g.fillEllipse(cx + 14, cy - 2, 11, 13);
    g.fillEllipse(cx - 12, cy + 12, 10, 12);
    g.fillEllipse(cx + 12, cy + 10, 11, 13);
    g.fillEllipse(cx, cy + 16, 14, 10);
    
    // Inner lighter fluff
    g.fillStyle(0xa8b8a6);
    g.fillEllipse(cx, cy, 28, 32);
    g.fillEllipse(cx - 8, cy - 6, 10, 12);
    g.fillEllipse(cx + 8, cy - 4, 9, 11);
    
    // Top tuft/antenna
    g.fillStyle(0x7a8a78);
    g.beginPath();
    g.moveTo(cx - 5, cy - 18);
    g.lineTo(cx, cy - 30);
    g.lineTo(cx + 5, cy - 18);
    g.closePath();
    g.fillPath();
    
    // Tuft fluff ball
    g.fillStyle(0x8a9a88);
    g.fillEllipse(cx, cy - 28, 10, 8);
    g.fillStyle(0x9aaa98);
    g.fillEllipse(cx, cy - 30, 7, 5);
    
    // Dark face area - recessed
    g.fillStyle(0x2a3028);
    g.fillEllipse(cx, cy - 6, 18, 16);
    
    // Deeper face shadow
    g.fillStyle(0x1a201a);
    g.fillEllipse(cx, cy - 4, 14, 12);
    
    // Large round eyes - black voids
    g.fillStyle(0x000000);
    g.fillCircle(cx - 5, cy - 6, 5);
    g.fillCircle(cx + 5, cy - 6, 5);
    
    // Eye shine
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(cx - 6, cy - 8, 2);
    g.fillCircle(cx + 4, cy - 8, 2);
    
    // Small feet
    g.fillStyle(0x6a7a68);
    g.fillEllipse(cx - 10, cy + 22, 8, 5);
    g.fillEllipse(cx + 10, cy + 22, 8, 5);
    
    // Subtle outline
    g.lineStyle(1.5, 0x5a6a58);
    g.strokeEllipse(cx, cy + 2, 38, 42);
    
    g.generateTexture('mosskin', 48, 56);
    g.destroy();
  }
  
  private createMosskinHurtSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 24;
    const cy = 30;
    
    // White flash version
    g.fillStyle(0xffffff);
    g.fillEllipse(cx, cy + 2, 38, 42);
    
    // Fluffy texture
    g.fillStyle(0xeeffee);
    g.fillEllipse(cx - 14, cy - 4, 12, 14);
    g.fillEllipse(cx + 14, cy - 2, 11, 13);
    g.fillEllipse(cx, cy + 16, 14, 10);
    
    // Tuft
    g.fillEllipse(cx, cy - 28, 10, 8);
    
    g.generateTexture('mosskin_hurt', 48, 56);
    g.destroy();
  }
  
  private createMossCreepSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 32;
    const cy = 24;
    
    // MossCreep - bushy foliage mound with glowing yellow eyes
    
    // Base shadow
    g.fillStyle(0x0a0c0a, 0.3);
    g.fillEllipse(cx, cy + 14, 50, 8);
    
    // Main body - dark green mound
    g.fillStyle(0x1a3a1c);
    g.fillEllipse(cx, cy + 4, 54, 30);
    
    // Leafy texture layers
    g.fillStyle(0x2a4a2c);
    g.fillEllipse(cx - 16, cy, 14, 12);
    g.fillEllipse(cx + 16, cy + 2, 13, 11);
    g.fillEllipse(cx, cy - 4, 18, 14);
    
    g.fillStyle(0x3a5a3c);
    g.fillEllipse(cx - 10, cy - 6, 12, 10);
    g.fillEllipse(cx + 8, cy - 8, 14, 11);
    g.fillEllipse(cx - 20, cy + 4, 10, 8);
    g.fillEllipse(cx + 20, cy + 2, 11, 9);
    
    // Top foliage bumps
    g.fillStyle(0x4a6a4c);
    g.fillEllipse(cx - 6, cy - 10, 10, 8);
    g.fillEllipse(cx + 4, cy - 12, 12, 9);
    g.fillEllipse(cx - 14, cy - 4, 8, 7);
    g.fillEllipse(cx + 14, cy - 6, 9, 7);
    
    // Dark eye cavity
    g.fillStyle(0x0a1a0c);
    g.fillEllipse(cx, cy + 8, 26, 14);
    
    // Yellow glowing eyes - outer glow
    g.fillStyle(0xffcc00, 0.4);
    g.fillEllipse(cx - 7, cy + 8, 12, 10);
    g.fillEllipse(cx + 7, cy + 8, 12, 10);
    
    // Yellow eyes main
    g.fillStyle(0xffdd22);
    g.fillEllipse(cx - 7, cy + 8, 8, 6);
    g.fillEllipse(cx + 7, cy + 8, 8, 6);
    
    // Bright center
    g.fillStyle(0xffee66);
    g.fillEllipse(cx - 7, cy + 7, 5, 4);
    g.fillEllipse(cx + 7, cy + 7, 5, 4);
    
    // Eye shine
    g.fillStyle(0xffffcc, 0.9);
    g.fillCircle(cx - 8, cy + 6, 2);
    g.fillCircle(cx + 6, cy + 6, 2);
    
    // Hidden feet
    g.fillStyle(0x2a3a2c);
    g.fillEllipse(cx - 16, cy + 16, 8, 5);
    g.fillEllipse(cx + 16, cy + 16, 8, 5);
    
    // Outline
    g.lineStyle(1.5, 0x0a1a0c);
    g.strokeEllipse(cx, cy + 4, 54, 30);
    
    g.generateTexture('mossCreep', 64, 40);
    g.destroy();
  }
  
  private createMossCreepHurtSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 32;
    const cy = 24;
    
    // White flash version
    g.fillStyle(0xffffff);
    g.fillEllipse(cx, cy + 4, 52, 28);
    
    // Texture bumps
    g.fillStyle(0xeeffee);
    g.fillEllipse(cx - 16, cy - 2, 12, 10);
    g.fillEllipse(cx, cy - 6, 14, 12);
    g.fillEllipse(cx + 14, cy - 4, 10, 10);
    
    // Eyes visible
    g.fillStyle(0xccddcc);
    g.fillEllipse(cx - 6, cy + 6, 5, 4);
    g.fillEllipse(cx + 6, cy + 6, 5, 4);
    
    g.generateTexture('mossCreep_hurt', 64, 40);
    g.destroy();
  }
  
  private createMossWarriorSprites(): void {
    // Bush form (camouflaged state)
    this.createMossWarriorBushSprite();
    
    // Warrior form (combat state)
    this.createMossWarriorSprite();
    this.createMossWarriorHurtSprite();
  }
  
  private createMossWarriorBushSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 30;
    const cy = 20;
    
    // Large leafy bush - looks like static environment
    // Base shadow
    g.fillStyle(0x0a0c0a, 0.4);
    g.fillEllipse(cx, cy + 18, 60, 10);
    
    // Main bush body - dark green layers
    g.fillStyle(0x1a3a1c);
    g.fillEllipse(cx, cy + 8, 58, 32);
    
    // Leafy texture layers
    g.fillStyle(0x2a4a2c);
    g.fillEllipse(cx - 18, cy + 2, 18, 16);
    g.fillEllipse(cx + 18, cy + 4, 17, 15);
    g.fillEllipse(cx, cy - 4, 22, 18);
    
    g.fillStyle(0x3a5a3c);
    g.fillEllipse(cx - 12, cy - 6, 14, 12);
    g.fillEllipse(cx + 10, cy - 8, 16, 13);
    g.fillEllipse(cx - 22, cy + 6, 12, 10);
    g.fillEllipse(cx + 22, cy + 4, 13, 11);
    
    // Top foliage bumps
    g.fillStyle(0x4a6a4c);
    g.fillEllipse(cx - 8, cy - 10, 12, 10);
    g.fillEllipse(cx + 6, cy - 12, 14, 11);
    g.fillEllipse(cx - 16, cy - 2, 10, 9);
    g.fillEllipse(cx + 16, cy - 4, 11, 9);
    
    // Hidden eye slits (barely visible when looking closely)
    g.fillStyle(0x0a1a0c);
    g.fillEllipse(cx - 6, cy + 10, 5, 2);
    g.fillEllipse(cx + 6, cy + 10, 5, 2);
    
    // Tiny eye gleam (hint that it's alive)
    g.fillStyle(0xffcc00, 0.2);
    g.fillCircle(cx - 5, cy + 10, 1.5);
    g.fillCircle(cx + 5, cy + 10, 1.5);
    
    g.generateTexture('mossWarrior_bush', 60, 40);
    g.destroy();
  }
  
  private createMossWarriorSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 32;
    const cy = 45;
    
    // Tall warrior form - inspired by Moss Knight
    // Body - tall leafy humanoid
    g.fillStyle(0x2a4a2c);
    g.fillRoundedRect(cx - 18, cy - 35, 36, 65, 4);
    
    // Shoulder pads / leafy armor
    g.fillStyle(0x3a5a3c);
    g.fillEllipse(cx - 20, cy - 25, 16, 12);
    g.fillEllipse(cx + 20, cy - 25, 16, 12);
    
    // Chest armor plates
    g.fillStyle(0x4a6a4c);
    g.fillRoundedRect(cx - 14, cy - 30, 28, 20, 3);
    
    // Head - beetle-like with moss
    g.fillStyle(0x3a5a3c);
    g.fillEllipse(cx, cy - 40, 26, 22);
    
    // Mossy head details
    g.fillStyle(0x5a7a5c);
    g.fillEllipse(cx - 8, cy - 46, 10, 8);
    g.fillEllipse(cx + 8, cy - 46, 10, 8);
    g.fillEllipse(cx, cy - 48, 12, 10);
    
    // Antennae
    g.fillStyle(0x2a3a2c);
    g.fillTriangle(cx - 8, cy - 50, cx - 12, cy - 64, cx - 4, cy - 52);
    g.fillTriangle(cx + 8, cy - 50, cx + 12, cy - 64, cx + 4, cy - 52);
    
    // Face mask - dark
    g.fillStyle(0x1a2a1c);
    g.fillEllipse(cx, cy - 38, 18, 14);
    
    // Eyes - glowing
    g.fillStyle(0xffcc00, 0.6);
    g.fillEllipse(cx - 5, cy - 38, 7, 5);
    g.fillEllipse(cx + 5, cy - 38, 7, 5);
    
    g.fillStyle(0xffdd22);
    g.fillEllipse(cx - 5, cy - 38, 5, 4);
    g.fillEllipse(cx + 5, cy - 38, 5, 4);
    
    // Eye shine
    g.fillStyle(0xffffcc);
    g.fillCircle(cx - 6, cy - 39, 1.5);
    g.fillCircle(cx + 4, cy - 39, 1.5);
    
    // Shield (left side) - large wooden with moss
    g.fillStyle(0x5a4a3a);
    g.fillRoundedRect(cx - 36, cy - 30, 18, 45, 3);
    
    // Shield moss patches
    g.fillStyle(0x4a6a4c);
    g.fillEllipse(cx - 28, cy - 20, 12, 8);
    g.fillEllipse(cx - 30, cy, 10, 10);
    g.fillEllipse(cx - 26, cy + 10, 8, 8);
    
    // Shield edge
    g.lineStyle(2, 0x3a3a2a);
    g.strokeRoundedRect(cx - 36, cy - 30, 18, 45, 3);
    
    // Sword arm (right side) - leaf blade
    g.fillStyle(0x4a6a4c);
    g.fillRoundedRect(cx + 18, cy - 20, 6, 40, 2);
    
    // Sword blade
    g.fillStyle(0x6a8a6c);
    g.beginPath();
    g.moveTo(cx + 24, cy - 15);
    g.lineTo(cx + 28, cy - 35);
    g.lineTo(cx + 34, cy - 38);
    g.lineTo(cx + 30, cy - 15);
    g.closePath();
    g.fillPath();
    
    // Blade edge highlight
    g.lineStyle(1, 0x8aaa8c);
    g.lineBetween(cx + 28, cy - 35, cx + 34, cy - 38);
    
    // Legs
    g.fillStyle(0x2a3a2c);
    g.fillRoundedRect(cx - 14, cy + 22, 10, 20, 2);
    g.fillRoundedRect(cx + 4, cy + 22, 10, 20, 2);
    
    // Feet
    g.fillStyle(0x3a4a3c);
    g.fillEllipse(cx - 9, cy + 40, 12, 6);
    g.fillEllipse(cx + 9, cy + 40, 12, 6);
    
    g.generateTexture('mossWarrior', 68, 90);
    g.destroy();
  }
  
  private createMossWarriorHurtSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 32;
    const cy = 45;
    
    // White flash version of warrior
    g.fillStyle(0xffffff);
    g.fillRoundedRect(cx - 18, cy - 35, 36, 65, 4);
    
    // Shoulder shapes
    g.fillStyle(0xeeffee);
    g.fillEllipse(cx - 20, cy - 25, 16, 12);
    g.fillEllipse(cx + 20, cy - 25, 16, 12);
    
    // Head
    g.fillEllipse(cx, cy - 40, 26, 22);
    
    // Shield
    g.fillStyle(0xddddcc);
    g.fillRoundedRect(cx - 36, cy - 30, 18, 45, 3);
    
    // Sword
    g.fillStyle(0xeeffee);
    g.fillRoundedRect(cx + 18, cy - 20, 6, 40, 2);
    
    g.generateTexture('mossWarrior_hurt', 68, 90);
    g.destroy();
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
    
    // Aspid - Ranged flying enemy
    this.createAspidSprite();
    
    // Husk Guard - Elite armored enemy
    this.createHuskGuardSprite();
    
    // Infected Husk - Passive environmental enemy
    this.createInfectedHuskSprite();
    
    // Basic Husk - Charging ground enemy with visual variants
    this.createBasicHuskSprites();
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

  private createAspidSprite(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 22; // Center X
    const cy = 20; // Center Y
    
    // === WINGS (translucent, larger than vengefly) ===
    g.fillStyle(0xd8c8c0, 0.5);
    g.fillEllipse(cx - 10, cy - 10, 22, 12);
    g.fillEllipse(cx + 10, cy - 10, 22, 12);
    g.lineStyle(1, 0xa09088, 0.4);
    g.strokeEllipse(cx - 10, cy - 10, 22, 12);
    g.strokeEllipse(cx + 10, cy - 10, 22, 12);
    
    // Wing veins
    g.lineStyle(0.5, 0x908880, 0.3);
    g.lineBetween(cx - 14, cy - 12, cx - 6, cy - 8);
    g.lineBetween(cx + 14, cy - 12, cx + 6, cy - 8);
    
    // === BODY (round, bulbous) ===
    // Main body - dark with orange infection
    g.fillStyle(0x4a4a58);
    g.fillEllipse(cx, cy + 4, 26, 22);
    
    // Glowing orange belly (infection)
    g.fillStyle(0xff6600);
    g.fillEllipse(cx, cy + 8, 18, 14);
    g.fillStyle(0xff8844, 0.8);
    g.fillEllipse(cx, cy + 6, 12, 10);
    g.fillStyle(0xffaa66, 0.6);
    g.fillEllipse(cx, cy + 5, 6, 6);
    
    // Body highlight
    g.fillStyle(0x5a5a68, 0.5);
    g.fillEllipse(cx - 4, cy, 8, 6);
    
    // === SMALL LEGS ===
    g.lineStyle(1.5, 0x3a3a48);
    g.lineBetween(cx - 6, cy + 12, cx - 10, cy + 20);
    g.lineBetween(cx + 6, cy + 12, cx + 10, cy + 20);
    g.lineBetween(cx - 2, cy + 13, cx - 4, cy + 19);
    g.lineBetween(cx + 2, cy + 13, cx + 4, cy + 19);
    
    // === HEAD (skull-like, with mandibles) ===
    g.fillStyle(0xe0d8d0);
    g.fillEllipse(cx, cy - 6, 16, 12);
    
    // Mandibles/pincers
    g.fillStyle(0xd0c8c0);
    g.beginPath();
    g.moveTo(cx - 6, cy - 4);
    g.lineTo(cx - 12, cy + 2);
    g.lineTo(cx - 4, cy);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(cx + 6, cy - 4);
    g.lineTo(cx + 12, cy + 2);
    g.lineTo(cx + 4, cy);
    g.closePath();
    g.fillPath();
    
    // Eyes - glowing orange
    g.fillStyle(0xff4400);
    g.fillEllipse(cx - 4, cy - 7, 4, 5);
    g.fillEllipse(cx + 4, cy - 7, 4, 5);
    g.fillStyle(0xff8844, 0.7);
    g.fillEllipse(cx - 4, cy - 8, 2, 3);
    g.fillEllipse(cx + 4, cy - 8, 2, 3);
    
    // Mouth/spit opening
    g.fillStyle(0x1a1a20);
    g.fillCircle(cx, cy - 2, 3);
    
    // === OUTLINES ===
    g.lineStyle(1.5, 0x3a3a48);
    g.strokeEllipse(cx, cy + 4, 26, 22);
    g.lineStyle(1, 0x2a2a30);
    g.strokeEllipse(cx, cy - 6, 16, 12);
    
    g.generateTexture('aspid', 48, 42);
    g.destroy();
    
    // Aspid hurt frame
    const hg = this.make.graphics({ x: 0, y: 0 });
    hg.fillStyle(0xffffff);
    hg.fillEllipse(cx - 10, cy - 10, 22, 12);
    hg.fillEllipse(cx + 10, cy - 10, 22, 12);
    hg.fillEllipse(cx, cy + 4, 26, 22);
    hg.fillEllipse(cx, cy - 6, 16, 12);
    hg.fillStyle(0xffddaa);
    hg.fillEllipse(cx, cy + 8, 18, 14);
    hg.generateTexture('aspid_hurt', 48, 42);
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
    const cx = 35;
    const cy = 30;
    
    // === SHADOW/GROUND ===
    g.fillStyle(0x1a2a3a, 0.3);
    g.fillEllipse(cx, cy + 26, 40, 8);
    
    // === CURLED UP BODY (layered for depth) ===
    // Back shell layer - darker
    g.fillStyle(0x3a4a58);
    g.fillEllipse(cx + 2, cy + 10, 58, 44);
    
    // Main body - hunched over
    g.fillStyle(0x4a5a6a);
    g.fillEllipse(cx, cy + 7, 56, 42);
    
    // Body highlight (top)
    g.fillStyle(0x5a6a7a, 0.6);
    g.fillEllipse(cx - 4, cy - 2, 30, 18);
    
    // Head tucked in
    g.fillStyle(0x5a6a7a);
    g.fillEllipse(cx - 12, cy - 6, 28, 24);
    
    // Head detail - face area
    g.fillStyle(0x6a7a8a);
    g.fillEllipse(cx - 14, cy - 4, 18, 16);
    
    // Hollow eyes (empty, sorrowful)
    g.fillStyle(0x1a1a20);
    g.fillEllipse(cx - 18, cy - 6, 5, 7);
    g.fillEllipse(cx - 10, cy - 5, 4, 6);
    
    // Arms wrapped around body
    g.fillStyle(0x4a5a6a);
    g.fillEllipse(cx + 14, cy, 18, 32);
    g.fillStyle(0x3a4a5a);
    g.fillEllipse(cx + 16, cy + 4, 12, 24);
    
    // Visible fingers/claws gripping
    g.fillStyle(0x5a6a7a);
    g.fillEllipse(cx + 6, cy + 14, 6, 4);
    g.fillEllipse(cx + 4, cy + 18, 5, 3);
    g.fillEllipse(cx + 8, cy + 20, 5, 3);
    
    // Legs curled underneath
    g.fillStyle(0x3a4a58);
    g.fillEllipse(cx - 8, cy + 20, 20, 12);
    g.fillEllipse(cx + 8, cy + 22, 16, 10);
    
    // === ARMOR/SHELL SEGMENTS ===
    g.lineStyle(1.5, 0x3a4a5a);
    g.beginPath();
    g.arc(cx, cy + 7, 20, Math.PI * 0.2, Math.PI * 0.8);
    g.strokePath();
    g.beginPath();
    g.arc(cx + 2, cy + 7, 26, Math.PI * 0.1, Math.PI * 0.9);
    g.strokePath();
    
    // === INFECTION PUSTULES (varied sizes, glowing) ===
    // Large central pustule cluster
    g.fillStyle(0xff5522);
    g.fillCircle(cx + 4, cy + 4, 10);
    g.fillStyle(0xff7744);
    g.fillCircle(cx + 4, cy + 3, 7);
    g.fillStyle(0xffaa66, 0.9);
    g.fillCircle(cx + 3, cy + 1, 4);
    g.fillStyle(0xffdd99, 0.7);
    g.fillCircle(cx + 2, cy, 2);
    
    // Secondary large pustule
    g.fillStyle(0xff6633);
    g.fillCircle(cx - 14, cy + 10, 6);
    g.fillStyle(0xffaa66, 0.8);
    g.fillCircle(cx - 15, cy + 8, 3);
    
    // Back pustules
    g.fillStyle(0xff7744);
    g.fillCircle(cx + 18, cy + 12, 6);
    g.fillStyle(0xffcc88, 0.7);
    g.fillCircle(cx + 17, cy + 10, 3);
    
    // Head infection
    g.fillStyle(0xff6633);
    g.fillCircle(cx - 7, cy - 10, 5);
    g.fillStyle(0xffaa66, 0.8);
    g.fillCircle(cx - 8, cy - 11, 2.5);
    
    // Scattered smaller pustules
    g.fillStyle(0xff8855);
    g.fillCircle(cx + 9, cy - 4, 3);
    g.fillCircle(cx - 20, cy + 4, 3);
    g.fillCircle(cx + 24, cy + 6, 3);
    g.fillCircle(cx - 4, cy + 18, 2.5);
    g.fillCircle(cx + 10, cy + 20, 2.5);
    g.fillCircle(cx - 18, cy + 16, 2);
    
    // Tiny infection spots (spreading)
    g.fillStyle(0xff9966, 0.6);
    g.fillCircle(cx + 14, cy - 2, 1.5);
    g.fillCircle(cx - 2, cy + 12, 1.5);
    g.fillCircle(cx + 22, cy + 18, 1.5);
    g.fillCircle(cx - 22, cy + 8, 1.5);
    g.fillCircle(cx + 6, cy + 8, 1.5);
    
    // Infection veins/tendrils
    g.lineStyle(1, 0xff7744, 0.5);
    g.lineBetween(cx + 4, cy + 14, cx + 2, cy + 20);
    g.lineBetween(cx - 14, cy + 16, cx - 10, cy + 22);
    g.lineBetween(cx + 18, cy + 18, cx + 14, cy + 24);
    
    // === BODY DETAILS ===
    // Shell crack lines
    g.lineStyle(1, 0x2a3a48, 0.7);
    g.lineBetween(cx - 18, cy, cx - 22, cy + 12);
    g.lineBetween(cx + 7, cy - 4, cx + 10, cy + 8);
    g.lineBetween(cx - 6, cy + 6, cx - 8, cy + 16);
    
    // Outline
    g.lineStyle(2, 0x2a3a4a);
    g.strokeEllipse(cx, cy + 7, 56, 42);
    g.lineStyle(1.5, 0x2a3a4a);
    g.strokeEllipse(cx - 12, cy - 6, 28, 24);
    
    g.generateTexture('infectedHusk', 72, 60);
    g.destroy();
    
    // Infected Husk hurt frame
    const hg = this.make.graphics({ x: 0, y: 0 });
    hg.fillStyle(0xffffff);
    hg.fillEllipse(cx, cy + 7, 56, 42);
    hg.fillEllipse(cx - 12, cy - 6, 28, 24);
    hg.fillEllipse(cx + 14, cy, 18, 32);
    hg.fillStyle(0xffddaa);
    hg.fillCircle(cx + 4, cy + 4, 10);
    hg.fillCircle(cx - 14, cy + 10, 6);
    hg.fillCircle(cx + 18, cy + 12, 6);
    hg.fillCircle(cx - 7, cy - 10, 5);
    hg.generateTexture('infectedHusk_hurt', 72, 60);
    hg.destroy();
  }

  private createBasicHuskSprites(): void {
    // Create two visual variants (Skin A and Skin B) inspired by Hollow Knight husks
    // Variant A: More rounded/bug-like (like the crawlid reference)
    // Variant B: Taller/humanoid (like the standing husk reference)
    this.createBasicHuskVariantA();
    this.createBasicHuskVariantB();
  }

  private createBasicHuskVariantA(): void {
    // Variant A: Round segmented bug-like husk (inspired by crawlid image)
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 22;
    const cy = 22;
    
    // === SEGMENTED BODY (round, bug-like) ===
    // Back segments - dark blue-gray
    g.fillStyle(0x5a6878);
    g.fillEllipse(cx + 6, cy + 8, 20, 18);
    g.fillStyle(0x4a5868);
    g.fillEllipse(cx + 2, cy + 6, 22, 20);
    g.fillStyle(0x5a6878);
    g.fillEllipse(cx - 4, cy + 4, 18, 18);
    
    // Main body - rounded segments
    g.fillStyle(0x6a7888);
    g.fillEllipse(cx, cy + 4, 26, 22);
    
    // Segment lines (horizontal stripes like the reference)
    g.lineStyle(1.5, 0x4a5868);
    g.beginPath();
    g.arc(cx, cy + 4, 10, Math.PI * 0.15, Math.PI * 0.85);
    g.strokePath();
    g.beginPath();
    g.arc(cx + 2, cy + 6, 8, Math.PI * 0.2, Math.PI * 0.8);
    g.strokePath();
    g.beginPath();
    g.arc(cx + 4, cy + 8, 6, Math.PI * 0.25, Math.PI * 0.75);
    g.strokePath();
    
    // === HEAD/MASK (pale, round with hollow eyes) ===
    g.fillStyle(0xe8e0d8); // Pale cream/white mask
    g.fillEllipse(cx - 8, cy, 14, 14);
    
    // Eye sockets - large, hollow, dark
    g.fillStyle(0x1a1a20);
    g.fillEllipse(cx - 10, cy - 2, 5, 6);
    g.fillEllipse(cx - 5, cy - 1, 4, 5);
    
    // Small snout/nose protrusion
    g.fillStyle(0xd8d0c8);
    g.beginPath();
    g.moveTo(cx - 14, cy + 2);
    g.lineTo(cx - 18, cy + 4);
    g.lineTo(cx - 14, cy + 6);
    g.closePath();
    g.fillPath();
    
    // === TINY LEGS (stubby, dark) ===
    g.fillStyle(0x2a3040);
    // Front legs
    g.fillEllipse(cx - 6, cy + 14, 4, 6);
    g.fillEllipse(cx + 2, cy + 15, 4, 5);
    // Back legs
    g.fillEllipse(cx + 8, cy + 14, 4, 6);
    
    // === OUTLINES ===
    g.lineStyle(1.5, 0x2a3a48);
    g.strokeEllipse(cx, cy + 4, 26, 22);
    g.lineStyle(1, 0x3a3a40);
    g.strokeEllipse(cx - 8, cy, 14, 14);
    
    g.generateTexture('basicHuskA', 44, 44);
    g.destroy();
    
    // Hurt frame
    const hg = this.make.graphics({ x: 0, y: 0 });
    hg.fillStyle(0xffffff);
    hg.fillEllipse(cx, cy + 4, 26, 22);
    hg.fillEllipse(cx - 8, cy, 14, 14);
    hg.generateTexture('basicHuskA_hurt', 44, 44);
    hg.destroy();
  }

  private createBasicHuskVariantB(): void {
    // Variant B: Tall standing husk (inspired by standing husk image)
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 18;
    const cy = 26;
    
    // === LONG THIN LEGS (dark, spindly) ===
    g.lineStyle(3, 0x2a2a35);
    // Left leg
    g.lineBetween(cx - 6, cy + 10, cx - 10, cy + 24);
    g.lineBetween(cx - 10, cy + 24, cx - 8, cy + 28);
    // Right leg
    g.lineBetween(cx + 6, cy + 10, cx + 10, cy + 24);
    g.lineBetween(cx + 10, cy + 24, cx + 8, cy + 28);
    
    // Feet (small triangles)
    g.fillStyle(0x2a2a35);
    g.fillTriangle(cx - 12, cy + 28, cx - 4, cy + 28, cx - 8, cy + 26);
    g.fillTriangle(cx + 12, cy + 28, cx + 4, cy + 28, cx + 8, cy + 26);
    
    // === SEGMENTED BODY (oval, striped) ===
    // Main body - blue-gray
    g.fillStyle(0x6a7080);
    g.fillEllipse(cx, cy + 4, 22, 26);
    
    // Segment stripes (horizontal lines)
    g.lineStyle(1.5, 0x4a5060);
    g.lineBetween(cx - 8, cy - 4, cx + 8, cy - 4);
    g.lineBetween(cx - 10, cy, cx + 10, cy);
    g.lineBetween(cx - 10, cy + 4, cx + 10, cy + 4);
    g.lineBetween(cx - 9, cy + 8, cx + 9, cy + 8);
    g.lineBetween(cx - 7, cy + 12, cx + 7, cy + 12);
    
    // Body highlight
    g.fillStyle(0x7a8090, 0.5);
    g.fillEllipse(cx - 3, cy, 8, 12);
    
    // === HEAD/MASK (pale, angular like the reference) ===
    // Mask shape - more angular/pointed
    g.fillStyle(0xe8e0d8);
    g.beginPath();
    g.moveTo(cx, cy - 22); // Top point
    g.lineTo(cx - 10, cy - 10);
    g.lineTo(cx - 8, cy - 4);
    g.lineTo(cx + 8, cy - 4);
    g.lineTo(cx + 10, cy - 10);
    g.closePath();
    g.fillPath();
    
    // Eye sockets - large hollow dark eyes
    g.fillStyle(0x1a1a20);
    g.fillEllipse(cx - 4, cy - 12, 5, 6);
    g.fillEllipse(cx + 4, cy - 12, 5, 6);
    
    // Mask outline
    g.lineStyle(1, 0x3a3a40);
    g.beginPath();
    g.moveTo(cx, cy - 22);
    g.lineTo(cx - 10, cy - 10);
    g.lineTo(cx - 8, cy - 4);
    g.lineTo(cx + 8, cy - 4);
    g.lineTo(cx + 10, cy - 10);
    g.closePath();
    g.strokePath();
    
    // === BODY OUTLINE ===
    g.lineStyle(1.5, 0x3a4050);
    g.strokeEllipse(cx, cy + 4, 22, 26);
    
    g.generateTexture('basicHuskB', 40, 56);
    g.destroy();
    
    // Hurt frame
    const hg = this.make.graphics({ x: 0, y: 0 });
    hg.fillStyle(0xffffff);
    hg.fillEllipse(cx, cy + 4, 22, 26);
    hg.beginPath();
    hg.moveTo(cx, cy - 22);
    hg.lineTo(cx - 10, cy - 10);
    hg.lineTo(cx - 8, cy - 4);
    hg.lineTo(cx + 8, cy - 4);
    hg.lineTo(cx + 10, cy - 10);
    hg.closePath();
    hg.fillPath();
    hg.generateTexture('basicHuskB_hurt', 40, 56);
    hg.destroy();
  }

  private createBossSprites(): void {
    // False Champion - Armored beetle knight inspired by False Knight
    // Idle frame
    this.createFalseChampionFrame('falseChampion_idle', 0, 0);
    // Walk frames
    this.createFalseChampionFrame('falseChampion_walk_0', 0, -2);
    this.createFalseChampionFrame('falseChampion_walk_1', 0, 2);
    // Attack frames (mace raised/down)
    this.createFalseChampionAttackFrame('falseChampion_attack_0', 0); // Mace up
    this.createFalseChampionAttackFrame('falseChampion_attack_1', 1); // Mace down
    // Jump frame
    this.createFalseChampionJumpFrame('falseChampion_jump');
    // Staggered frame (fallen over with maggot exposed)
    this.createFalseChampionStaggeredFrame('falseChampion_staggered');
    
    // Moss Titan - giant mossy creature
    this.createMossTitanSprite('mossTitan');
    this.createMossTitanStaggeredSprite('mossTitan_staggered');
    
    // Boss projectile spike / falling rock
    const spikeGraphics = this.make.graphics({ x: 0, y: 0 });
    spikeGraphics.fillStyle(0x555566);
    spikeGraphics.fillTriangle(15, 0, 0, 30, 30, 30);
    spikeGraphics.fillStyle(0x666677);
    spikeGraphics.fillTriangle(15, 6, 6, 26, 24, 26);
    spikeGraphics.lineStyle(2, 0x333344);
    spikeGraphics.strokeTriangle(15, 0, 0, 30, 30, 30);
    spikeGraphics.generateTexture('fallingRock', 30, 30);
    spikeGraphics.destroy();
  }
  
  private createMossTitanSprite(key: string): void {
    // Moss Titan - inspired by reference: bushy dark green/teal mossy creature 
    // with layered foliage texture, small red eyes peeking through
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 90;
    const cy = 60;
    
    // Base body - large mounded shape like reference
    // Dark teal/green base
    g.fillStyle(0x1a3830);
    g.fillEllipse(cx, cy + 20, 150, 80);
    
    // Layered mossy texture - multiple overlapping bush shapes
    // Back layer (darkest)
    g.fillStyle(0x1a4038);
    for (let i = 0; i < 8; i++) {
      const bx = cx - 60 + i * 18 + Math.sin(i * 1.3) * 8;
      const by = cy - 5 + Math.cos(i * 1.7) * 10;
      g.fillEllipse(bx, by, 28, 22);
    }
    
    // Middle layer - main mossy clumps
    g.fillStyle(0x2a5048);
    for (let i = 0; i < 10; i++) {
      const bx = cx - 65 + i * 15 + Math.sin(i * 2.1) * 6;
      const by = cy + 5 + Math.cos(i * 1.4) * 12;
      g.fillEllipse(bx, by, 25, 20);
    }
    
    // Top layer - lighter mossy tufts
    g.fillStyle(0x3a6058);
    for (let i = 0; i < 12; i++) {
      const bx = cx - 55 + i * 12 + Math.sin(i * 1.8) * 5;
      const by = cy - 15 + Math.cos(i * 2.2) * 8;
      g.fillEllipse(bx, by, 18, 14);
    }
    
    // Spiky/leafy protrusions on top
    g.fillStyle(0x2a4840);
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI - Math.PI * 0.1;
      const dist = 55 + Math.sin(i * 3) * 10;
      const px = cx + Math.cos(angle) * dist;
      const py = cy - 20 + Math.sin(angle) * 25;
      
      // Leaf/spike shape
      g.beginPath();
      g.moveTo(px, py - 15 - Math.random() * 8);
      g.lineTo(px - 6, py + 5);
      g.lineTo(px + 6, py + 5);
      g.closePath();
      g.fillPath();
    }
    
    // Additional leafy tufts on edges
    g.fillStyle(0x3a5850);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const px = cx + Math.cos(angle) * 65;
      const py = cy + 15 + Math.sin(angle) * 30;
      g.fillEllipse(px, py, 12, 10);
    }
    
    // Horizontal stripe patterns like reference
    g.lineStyle(3, 0x1a3028, 0.6);
    for (let i = 0; i < 5; i++) {
      const y = cy + i * 12 - 10;
      g.lineBetween(cx - 60 + i * 5, y, cx + 60 - i * 5, y);
    }
    
    // Face area - slightly darker recessed area
    g.fillStyle(0x152820);
    g.fillEllipse(cx - 30, cy + 15, 35, 28);
    
    // Eyes - small, red, glowing - peeking through moss
    g.fillStyle(0x1a1a15);
    g.fillEllipse(cx - 38, cy + 12, 12, 10);
    g.fillEllipse(cx - 22, cy + 12, 12, 10);
    
    // Eye glow (red like reference)
    g.fillStyle(0xcc2222);
    g.fillCircle(cx - 38, cy + 12, 4);
    g.fillCircle(cx - 22, cy + 12, 4);
    
    // Eye highlights
    g.fillStyle(0xff4444);
    g.fillCircle(cx - 39, cy + 11, 2);
    g.fillCircle(cx - 23, cy + 11, 2);
    
    // Dark outline around the whole creature
    g.lineStyle(3, 0x0a1810);
    g.strokeEllipse(cx, cy + 20, 152, 82);
    
    // Additional texture lines for leafy look
    g.lineStyle(1.5, 0x1a3028, 0.4);
    for (let i = 0; i < 6; i++) {
      const startX = cx - 50 + i * 20;
      g.lineBetween(startX, cy - 10, startX + 5, cy + 30);
    }
    
    g.generateTexture(key, 180, 120);
    g.destroy();
  }
  
  private createMossTitanStaggeredSprite(key: string): void {
    // Staggered Moss Titan - collapsed, more spread out, exposed weak point
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 90;
    const cy = 70;
    
    // Flattened/collapsed body
    g.fillStyle(0x1a3830);
    g.fillEllipse(cx, cy + 15, 160, 60);
    
    // Scattered moss clumps (disheveled)
    g.fillStyle(0x2a4840);
    for (let i = 0; i < 12; i++) {
      const bx = cx - 70 + i * 14 + Math.sin(i * 2) * 8;
      const by = cy + 10 + Math.cos(i * 1.5) * 15;
      g.fillEllipse(bx, by, 20, 16);
    }
    
    // Top tufts fallen over
    g.fillStyle(0x3a5850);
    for (let i = 0; i < 10; i++) {
      const bx = cx - 60 + i * 15;
      const by = cy - 5 + Math.sin(i) * 10;
      g.fillEllipse(bx, by, 15, 12);
    }
    
    // Exposed weak point - glowing core/head area
    g.fillStyle(0x4a8060);
    g.fillEllipse(cx + 40, cy - 10, 35, 28);
    
    // Inner glow
    g.fillStyle(0x66aa88);
    g.fillEllipse(cx + 40, cy - 10, 25, 20);
    
    // Vulnerable core
    g.fillStyle(0x88ddaa);
    g.fillCircle(cx + 40, cy - 10, 12);
    
    // Eyes dazed/spiraling
    g.fillStyle(0x1a1a15);
    g.fillEllipse(cx - 35, cy + 12, 14, 12);
    g.fillEllipse(cx - 15, cy + 12, 14, 12);
    
    // Dazed eye spirals
    g.lineStyle(2, 0x882222);
    g.strokeCircle(cx - 35, cy + 12, 5);
    g.strokeCircle(cx - 15, cy + 12, 5);
    g.lineStyle(1.5, 0xaa4444);
    g.strokeCircle(cx - 35, cy + 12, 3);
    g.strokeCircle(cx - 15, cy + 12, 3);
    
    // Dark outline
    g.lineStyle(3, 0x0a1810);
    g.strokeEllipse(cx, cy + 15, 162, 62);
    g.strokeEllipse(cx + 40, cy - 10, 36, 29);
    
    g.generateTexture(key, 180, 120);
    g.destroy();
  }
  
  private createFalseChampionFrame(key: string, xOffset: number, yOffset: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 50 + xOffset;
    const cy = 55 + yOffset;
    
    // === ARMORED BODY (bulky beetle shell) ===
    // Main armor shell - dark blue-grey
    g.fillStyle(0x4a5a6a);
    g.fillEllipse(cx, cy + 5, 70, 55);
    
    // Armor plates/segments
    g.fillStyle(0x5a6a7a);
    g.fillEllipse(cx, cy - 5, 64, 40);
    
    // Armor highlights
    g.fillStyle(0x6a7a8a, 0.6);
    g.fillEllipse(cx - 10, cy - 10, 20, 16);
    g.fillEllipse(cx + 10, cy - 10, 20, 16);
    
    // Segment lines
    g.lineStyle(2, 0x3a4a5a);
    g.lineBetween(cx - 20, cy - 18, cx - 20, cy + 20);
    g.lineBetween(cx, cy - 22, cx, cy + 15);
    g.lineBetween(cx + 20, cy - 18, cx + 20, cy + 20);
    
    // === HELMET (horned) ===
    g.fillStyle(0x4a5868);
    g.fillEllipse(cx, cy - 30, 44, 32);
    
    // Horns - curved upward
    g.fillStyle(0x3a4858);
    // Left horn
    g.beginPath();
    g.moveTo(cx - 18, cy - 45);
    g.lineTo(cx - 25, cy - 65);
    g.lineTo(cx - 12, cy - 40);
    g.closePath();
    g.fillPath();
    // Right horn
    g.beginPath();
    g.moveTo(cx + 18, cy - 45);
    g.lineTo(cx + 25, cy - 65);
    g.lineTo(cx + 12, cy - 40);
    g.closePath();
    g.fillPath();
    
    // Face visor - darker
    g.fillStyle(0x2a3a48);
    g.fillRect(cx - 16, cy - 35, 32, 18);
    
    // Eye slits - glowing
    g.fillStyle(0x1a1a20);
    g.fillEllipse(cx - 8, cy - 28, 6, 10);
    g.fillEllipse(cx + 8, cy - 28, 6, 10);
    
    // === LEGS (sturdy) ===
    g.fillStyle(0x4a5a68);
    g.fillRect(cx - 22, cy + 25, 12, 25);
    g.fillRect(cx + 10, cy + 25, 12, 25);
    
    // === MACE ARM (right side) ===
    // Arm
    g.fillStyle(0x4a5a68);
    g.fillRect(cx + 30, cy - 10, 14, 40);
    // Mace handle
    g.fillStyle(0x3a3a40);
    g.fillRect(cx + 42, cy - 5, 8, 50);
    // Mace head
    g.fillStyle(0x5a5a66);
    g.fillCircle(cx + 46, cy + 48, 18);
    // Mace spikes
    g.fillStyle(0x4a4a55);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sx = cx + 46 + Math.cos(angle) * 18;
      const sy = cy + 48 + Math.sin(angle) * 18;
      g.fillCircle(sx, sy, 5);
    }
    
    // === OUTLINES ===
    g.lineStyle(2.5, 0x2a3a48);
    g.strokeEllipse(cx, cy + 5, 70, 55);
    g.strokeEllipse(cx, cy - 30, 44, 32);
    
    g.generateTexture(key, 100, 110);
    g.destroy();
  }
  
  private createFalseChampionAttackFrame(key: string, phase: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 50;
    const cy = 55;
    
    // Body (same as idle)
    g.fillStyle(0x4a5a6a);
    g.fillEllipse(cx, cy + 5, 70, 55);
    g.fillStyle(0x5a6a7a);
    g.fillEllipse(cx, cy - 5, 64, 40);
    
    // Helmet
    g.fillStyle(0x4a5868);
    g.fillEllipse(cx, cy - 30, 44, 32);
    g.fillStyle(0x3a4858);
    g.beginPath();
    g.moveTo(cx - 18, cy - 45);
    g.lineTo(cx - 25, cy - 65);
    g.lineTo(cx - 12, cy - 40);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(cx + 18, cy - 45);
    g.lineTo(cx + 25, cy - 65);
    g.lineTo(cx + 12, cy - 40);
    g.closePath();
    g.fillPath();
    
    g.fillStyle(0x2a3a48);
    g.fillRect(cx - 16, cy - 35, 32, 18);
    g.fillStyle(0xff4444); // Angry red eyes during attack
    g.fillEllipse(cx - 8, cy - 28, 5, 8);
    g.fillEllipse(cx + 8, cy - 28, 5, 8);
    
    // Legs
    g.fillStyle(0x4a5a68);
    g.fillRect(cx - 22, cy + 25, 12, 25);
    g.fillRect(cx + 10, cy + 25, 12, 25);
    
    // Mace - different position based on phase
    if (phase === 0) {
      // Mace raised high
      g.fillStyle(0x4a5a68);
      g.fillRect(cx + 25, cy - 40, 14, 30);
      g.fillStyle(0x3a3a40);
      g.fillRect(cx + 28, cy - 70, 8, 40);
      g.fillStyle(0x5a5a66);
      g.fillCircle(cx + 32, cy - 75, 18);
      g.fillStyle(0x4a4a55);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        g.fillCircle(cx + 32 + Math.cos(angle) * 18, cy - 75 + Math.sin(angle) * 18, 5);
      }
    } else {
      // Mace smashing down
      g.fillStyle(0x4a5a68);
      g.fillRect(cx + 30, cy, 14, 35);
      g.fillStyle(0x3a3a40);
      g.fillRect(cx + 33, cy + 30, 8, 35);
      g.fillStyle(0xffaa44); // Glowing mace on impact
      g.fillCircle(cx + 37, cy + 68, 20);
      g.fillStyle(0xff6622);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        g.fillCircle(cx + 37 + Math.cos(angle) * 20, cy + 68 + Math.sin(angle) * 20, 6);
      }
    }
    
    g.lineStyle(2.5, 0x2a3a48);
    g.strokeEllipse(cx, cy + 5, 70, 55);
    
    g.generateTexture(key, 100, 110);
    g.destroy();
  }
  
  private createFalseChampionJumpFrame(key: string): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 50;
    const cy = 50;
    
    // Compact body for jump
    g.fillStyle(0x4a5a6a);
    g.fillEllipse(cx, cy + 8, 65, 50);
    g.fillStyle(0x5a6a7a);
    g.fillEllipse(cx, cy, 60, 38);
    
    // Helmet
    g.fillStyle(0x4a5868);
    g.fillEllipse(cx, cy - 25, 44, 32);
    g.fillStyle(0x3a4858);
    g.beginPath();
    g.moveTo(cx - 18, cy - 40);
    g.lineTo(cx - 25, cy - 60);
    g.lineTo(cx - 12, cy - 35);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(cx + 18, cy - 40);
    g.lineTo(cx + 25, cy - 60);
    g.lineTo(cx + 12, cy - 35);
    g.closePath();
    g.fillPath();
    
    g.fillStyle(0x2a3a48);
    g.fillRect(cx - 16, cy - 30, 32, 16);
    g.fillStyle(0xff6644);
    g.fillEllipse(cx - 8, cy - 24, 5, 7);
    g.fillEllipse(cx + 8, cy - 24, 5, 7);
    
    // Legs tucked
    g.fillStyle(0x4a5a68);
    g.fillRect(cx - 18, cy + 28, 10, 15);
    g.fillRect(cx + 8, cy + 28, 10, 15);
    
    // Mace held forward
    g.fillStyle(0x3a3a40);
    g.fillRect(cx + 25, cy - 10, 8, 45);
    g.fillStyle(0x5a5a66);
    g.fillCircle(cx + 29, cy + 38, 16);
    
    g.lineStyle(2.5, 0x2a3a48);
    g.strokeEllipse(cx, cy + 8, 65, 50);
    
    g.generateTexture(key, 100, 100);
    g.destroy();
  }
  
  private createFalseChampionStaggeredFrame(key: string): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 60;
    const cy = 50;
    
    // Armor shell fallen over (rotated)
    g.fillStyle(0x4a5a6a);
    g.fillEllipse(cx + 10, cy + 15, 75, 50);
    g.fillStyle(0x5a6a7a);
    g.fillEllipse(cx + 8, cy + 8, 68, 40);
    
    // Segment lines (tilted)
    g.lineStyle(2, 0x3a4a5a);
    g.lineBetween(cx - 10, cy, cx - 5, cy + 30);
    g.lineBetween(cx + 10, cy - 5, cx + 15, cy + 25);
    g.lineBetween(cx + 30, cy, cx + 35, cy + 30);
    
    // Helmet fallen to side
    g.fillStyle(0x4a5868);
    g.fillEllipse(cx - 25, cy + 10, 40, 30);
    
    // Horns pointing sideways
    g.fillStyle(0x3a4858);
    g.beginPath();
    g.moveTo(cx - 40, cy);
    g.lineTo(cx - 60, cy - 15);
    g.lineTo(cx - 35, cy + 8);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(cx - 40, cy + 20);
    g.lineTo(cx - 55, cy + 35);
    g.lineTo(cx - 35, cy + 18);
    g.closePath();
    g.fillPath();
    
    // === EXPOSED MAGGOT HEAD (vulnerable) ===
    // Pale fleshy head poking out
    g.fillStyle(0xe8ddd0);
    g.fillEllipse(cx + 45, cy - 5, 30, 25);
    
    // Worried expression
    g.fillStyle(0x1a1a20);
    g.fillEllipse(cx + 40, cy - 8, 5, 7);
    g.fillEllipse(cx + 52, cy - 8, 5, 7);
    
    // Open mouth (distressed)
    g.fillStyle(0x2a2a30);
    g.fillEllipse(cx + 46, cy + 5, 8, 6);
    
    // Blush marks
    g.fillStyle(0xffaaaa, 0.4);
    g.fillEllipse(cx + 38, cy, 6, 4);
    g.fillEllipse(cx + 54, cy, 6, 4);
    
    // Mace dropped
    g.fillStyle(0x3a3a40);
    g.fillRect(cx + 50, cy + 30, 6, 35);
    g.fillStyle(0x5a5a66);
    g.fillCircle(cx + 53, cy + 68, 14);
    
    // Legs flailing
    g.fillStyle(0x4a5a68);
    g.fillRect(cx - 5, cy + 35, 10, 18);
    g.fillRect(cx + 20, cy + 38, 10, 15);
    
    g.lineStyle(2, 0x2a3a48);
    g.strokeEllipse(cx + 10, cy + 15, 75, 50);
    g.strokeEllipse(cx + 45, cy - 5, 30, 25);
    
    g.generateTexture(key, 120, 100);
    g.destroy();
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
    
    // Breakable - Signpost (old ruined sign)
    this.createBreakableSignpost();
    this.createBreakablePole();
    this.createBreakableBarrel();
    
    // Spike hazard
    this.createSpikeTexture();
  }
  
  private createBreakableSignpost(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    
    // Wooden post
    g.fillStyle(0x4a3a2a);
    g.fillRect(8, 20, 6, 30);
    
    // Post detail
    g.fillStyle(0x5a4a3a);
    g.fillRect(9, 22, 4, 26);
    
    // Sign board (angled/broken)
    g.fillStyle(0x5a4a3a);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(22, 2);
    g.lineTo(20, 18);
    g.lineTo(2, 16);
    g.closePath();
    g.fillPath();
    
    // Sign highlight
    g.fillStyle(0x6a5a4a);
    g.fillRect(3, 4, 15, 8);
    
    // Cracks
    g.lineStyle(1, 0x3a2a1a, 0.7);
    g.lineBetween(5, 2, 8, 14);
    g.lineBetween(14, 4, 16, 12);
    
    // Nails
    g.fillStyle(0x3a3a3a);
    g.fillCircle(4, 6, 1.5);
    g.fillCircle(18, 8, 1.5);
    
    g.generateTexture('breakable_signpost', 24, 50);
    g.destroy();
  }
  
  private createBreakablePole(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    
    // Tall wooden pole
    g.fillStyle(0x4a3a2a);
    g.fillRect(3, 0, 8, 55);
    
    // Wood grain
    g.fillStyle(0x5a4a3a);
    g.fillRect(5, 2, 4, 51);
    
    // Cracks/weathering
    g.lineStyle(1, 0x3a2a1a, 0.6);
    g.lineBetween(4, 5, 6, 20);
    g.lineBetween(8, 30, 10, 45);
    
    // Top (broken/jagged)
    g.fillStyle(0x4a3a2a);
    g.beginPath();
    g.moveTo(3, 0);
    g.lineTo(5, -4);
    g.lineTo(7, 2);
    g.lineTo(9, -2);
    g.lineTo(11, 0);
    g.closePath();
    g.fillPath();
    
    g.generateTexture('breakable_pole', 14, 60);
    g.destroy();
  }
  
  private createBreakableBarrel(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const cx = 12;
    
    // Barrel body
    g.fillStyle(0x4a3a2a);
    g.fillEllipse(cx, 8, 22, 12);
    g.fillRect(1, 8, 22, 24);
    g.fillEllipse(cx, 32, 22, 12);
    
    // Barrel front
    g.fillStyle(0x5a4a3a);
    g.fillEllipse(cx, 32, 20, 10);
    
    // Metal bands
    g.fillStyle(0x3a4a5a);
    g.fillRect(0, 12, 24, 3);
    g.fillRect(0, 26, 24, 3);
    
    // Band highlights
    g.fillStyle(0x4a5a6a);
    g.fillRect(2, 12, 20, 1);
    g.fillRect(2, 26, 20, 1);
    
    // Wood planks vertical lines
    g.lineStyle(1, 0x3a2a1a, 0.5);
    g.lineBetween(6, 8, 6, 32);
    g.lineBetween(12, 8, 12, 32);
    g.lineBetween(18, 8, 18, 32);
    
    g.generateTexture('breakable_barrel', 24, 44);
    g.destroy();
  }
  
  private createSpikeTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const spikeCount = 8;
    const spikeWidth = 10;
    const totalWidth = spikeCount * spikeWidth;
    
    // Draw row of spikes
    for (let i = 0; i < spikeCount; i++) {
      const x = i * spikeWidth;
      
      // Spike body - dark metal
      g.fillStyle(0x3a4050);
      g.beginPath();
      g.moveTo(x, 20);
      g.lineTo(x + spikeWidth / 2, 0);
      g.lineTo(x + spikeWidth, 20);
      g.closePath();
      g.fillPath();
      
      // Spike highlight (left edge)
      g.fillStyle(0x4a5060, 0.7);
      g.beginPath();
      g.moveTo(x + 2, 18);
      g.lineTo(x + spikeWidth / 2, 3);
      g.lineTo(x + spikeWidth / 2 + 2, 8);
      g.lineTo(x + 4, 18);
      g.closePath();
      g.fillPath();
    }
    
    g.generateTexture('spike', totalWidth, 20);
    g.destroy();
  }

  create(): void {
    gameState.resetRun();
    this.scene.start('MenuScene');
  }
}
