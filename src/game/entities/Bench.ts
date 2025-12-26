import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';
import benchesData from '../data/benches.json';

/**
 * Bench Configuration Interface
 * Loaded from benches.json
 */
export interface BenchConfig {
  id: string;
  displayName: string;
  healMode: 'full' | 'amount' | 'none';
  healAmount: number;
  setsRespawn: boolean;
  opensCharmUI: boolean;
  enemyRespawnMode: 'none' | 'currentRoom' | 'currentBiome' | 'all';
  enemyRespawnDelayMs: number;
  savesGame: boolean;
  restoresDash: boolean;
}

export class Bench extends Phaser.Physics.Arcade.Sprite {
  private benchId: string;
  private spawnId: string;
  private config: BenchConfig;
  private roomId: string;
  
  // Interaction state
  private playerInRange = false;
  private interactCooldown = 0;
  private promptText: Phaser.GameObjects.Text | null = null;
  private glowGraphics: Phaser.GameObjects.Graphics | null = null;
  private isActivated = false;

  constructor(
    scene: Phaser.Scene, 
    x: number, 
    y: number, 
    spawnId: string,
    benchTypeId: string = 'basic_bench',
    roomId: string = 'default'
  ) {
    super(scene, x + 30, y + 22, 'bench');
    
    this.benchId = benchTypeId;
    this.spawnId = spawnId;
    this.roomId = roomId;
    
    // Load config from data
    const benchTypes = benchesData.benchTypes as Record<string, BenchConfig>;
    this.config = benchTypes[benchTypeId] || benchTypes[benchesData.defaultBenchType];
    
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    
    // Set up collision body for interaction zone
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(80, 60);
    body.setOffset(-10, -10);
    
    // Create glow effect
    this.createGlowEffect();
    
    // Create interaction prompt (hidden by default)
    this.createPrompt();
  }

  private createGlowEffect(): void {
    this.glowGraphics = this.scene.add.graphics();
    this.updateGlow();
  }

  private updateGlow(): void {
    if (!this.glowGraphics) return;
    
    this.glowGraphics.clear();
    
    // Draw a subtle glow around the bench
    const glowColor = this.isActivated ? 0xd4a84b : 0x5599dd;
    const glowAlpha = this.playerInRange ? 0.4 : 0.2;
    
    this.glowGraphics.fillStyle(glowColor, glowAlpha);
    this.glowGraphics.fillCircle(this.x, this.y, 45);
    
    if (this.playerInRange) {
      // Extra glow when in range
      this.glowGraphics.fillStyle(glowColor, 0.15);
      this.glowGraphics.fillCircle(this.x, this.y, 60);
    }
  }

  private createPrompt(): void {
    this.promptText = this.scene.add.text(this.x, this.y - 50, 'E: Rest', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 8, y: 4 },
    });
    this.promptText.setOrigin(0.5);
    this.promptText.setVisible(false);
    this.promptText.setDepth(100);
  }

  update(delta: number): void {
    // Update cooldown
    if (this.interactCooldown > 0) {
      this.interactCooldown -= delta;
    }
  }

  /**
   * Called when player enters interaction range
   */
  setPlayerInRange(inRange: boolean): void {
    if (this.playerInRange !== inRange) {
      this.playerInRange = inRange;
      this.promptText?.setVisible(inRange);
      this.updateGlow();
    }
  }

  /**
   * Attempt to interact with the bench
   * @returns true if interaction started successfully
   */
  tryInteract(): boolean {
    if (!this.playerInRange) return false;
    if (this.interactCooldown > 0) return false;
    
    this.interactCooldown = 500; // 500ms cooldown to prevent re-trigger
    this.isActivated = true;
    this.updateGlow();
    
    return true;
  }

  /**
   * Check if player is in range for interaction
   */
  isPlayerInRange(): boolean {
    return this.playerInRange;
  }

  // Getters
  getSpawnId(): string { 
    return this.spawnId; 
  }
  
  getBenchId(): string { 
    return this.benchId; 
  }
  
  getConfig(): BenchConfig { 
    return this.config; 
  }
  
  getRoomId(): string { 
    return this.roomId; 
  }
  
  getDisplayName(): string {
    return this.config.displayName;
  }

  destroy(fromScene?: boolean): void {
    this.promptText?.destroy();
    this.glowGraphics?.destroy();
    super.destroy(fromScene);
  }
}
