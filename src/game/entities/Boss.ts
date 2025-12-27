import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';
import bossData from '../data/boss.json';
import type { Player } from './Player';
import type { GameScene } from '../scenes/GameScene';

type BossState = 
  | 'idle' 
  | 'leapSmash' 
  | 'maceCombo' 
  | 'rageTantrum' 
  | 'staggered' 
  | 'recovering'
  | 'dead';

const CFG = bossData.falseChampion;

export class Boss extends Phaser.Physics.Arcade.Sprite {
  private gameScene: GameScene;
  private bossHp: number;
  private bossMaxHp: number;
  private bossState: BossState = 'idle';
  private stateTimer = 0;
  private cooldown = 0;
  private facing: 1 | -1 = -1;
  private dead = false;
  
  // Stagger system
  private staggerDamage = 0;
  private isStaggered = false;
  private headHitbox: Phaser.GameObjects.Rectangle | null = null;
  private headExposed = false;
  
  // Combat tracking
  private fightStartTime = 0;
  private totalDamageDealt = 0;
  
  // Attack state
  private leapPhase: 'rising' | 'hanging' | 'falling' | 'landed' = 'rising';
  private comboSwingsRemaining = 0;
  private comboSwingTimer = 0;
  private tantrumTimer = 0;
  private rockSpawnTimer = 0;
  
  // Visual elements
  private maceSprite: Phaser.GameObjects.Rectangle | null = null;
  private shockwave: Phaser.GameObjects.Rectangle | null = null;
  private fallingRocks: Phaser.GameObjects.Rectangle[] = [];
  
  // Arena gates
  private leftGate: Phaser.GameObjects.Rectangle | null = null;
  private rightGate: Phaser.GameObjects.Rectangle | null = null;
  private gatesLocked = false;
  
  // Arena bounds for reference
  private arenaLeft = 0;
  private arenaRight = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'falseChampion');
    this.gameScene = scene;
    this.bossMaxHp = CFG.maxHp;
    this.bossHp = this.bossMaxHp;
    this.fightStartTime = scene.time.now;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setSize(CFG.width, CFG.height);
    this.setCollideWorldBounds(true);
    this.clearTint(); // Use actual sprite colors
    this.setScale(CFG.scale);
    
    // Hide mace sprite - the image already has the mace
    this.maceSprite = null;
    
    // Set up arena bounds (assuming 1200px wide arena)
    this.arenaLeft = x - 500;
    this.arenaRight = x + 500;

    this.cooldown = 1500;
  }

  update(time: number, delta: number, player: Player): void {
    if (this.dead) return;
    
    this.stateTimer += delta;
    this.cooldown -= delta;
    
    // Update facing toward player
    if (this.bossState === 'idle') {
      this.facing = player.x > this.x ? 1 : -1;
      this.setFlipX(this.facing < 0);
    }
    
    // Update mace position
    this.updateMacePosition();
    
    // Check head exposure conditions
    this.checkHeadExposure(time);
    
    // Update falling rocks
    this.updateFallingRocks(delta);
    
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.bossState) {
      case 'idle':
        body.setVelocityX(0);
        if (this.cooldown <= 0) {
          this.chooseNextAttack(player);
        }
        break;
        
      case 'leapSmash':
        this.updateLeapSmash(body, player, delta);
        break;
        
      case 'maceCombo':
        this.updateMaceCombo(body, player, delta);
        break;
        
      case 'rageTantrum':
        this.updateRageTantrum(body, delta);
        break;
        
      case 'staggered':
        body.setVelocityX(0);
        // Use staggered sprite - fallen over with exposed maggot
        if (this.stateTimer > CFG.staggerDuration) {
          this.recoverFromStagger();
        }
        break;
        
      case 'recovering':
        if (this.stateTimer > CFG.staggerRecoveryRageTime) {
          this.bossState = 'rageTantrum';
          this.stateTimer = 0;
          this.tantrumTimer = 0;
          this.rockSpawnTimer = 0;
        }
        break;
    }
    
    // Update head hitbox position if exposed
    if (this.headHitbox && this.headExposed && this.isStaggered) {
      this.headHitbox.setPosition(this.x, this.y - 60);
    }
  }

  private chooseNextAttack(player: Player): void {
    const distance = Math.abs(player.x - this.x);
    const rand = Math.random();
    
    // Choose based on distance and randomness
    if (distance > 300 || rand < 0.4) {
      this.startLeapSmash(player);
    } else {
      this.startMaceCombo();
    }
  }

  private startLeapSmash(player: Player): void {
    this.bossState = 'leapSmash';
    this.stateTimer = 0;
    this.leapPhase = 'rising';
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-CFG.attackPatterns.leapSmash.jumpHeight);
    
    // Jump toward player
    const dir = player.x > this.x ? 1 : -1;
    body.setVelocityX(dir * 150);
    this.facing = dir as 1 | -1;
    this.setFlipX(dir < 0);
  }

  private updateLeapSmash(body: Phaser.Physics.Arcade.Body, player: Player, delta: number): void {
    const cfg = CFG.attackPatterns.leapSmash;
    
    switch (this.leapPhase) {
      case 'rising':
        if (body.velocity.y >= 0) {
          this.leapPhase = 'hanging';
          this.stateTimer = 0;
          body.setVelocityX(0);
          body.setVelocityY(0);
          body.setAllowGravity(false);
        }
        break;
        
      case 'hanging':
        // Track player position
        const targetX = player.x;
        this.x += (targetX - this.x) * 0.05;
        
        if (this.stateTimer > cfg.hangTime) {
          this.leapPhase = 'falling';
          body.setAllowGravity(true);
          body.setVelocityY(cfg.slamSpeed);
        }
        break;
        
      case 'falling':
        if (body.blocked.down) {
          this.leapPhase = 'landed';
          this.createShockwave();
          this.scene.cameras.main.shake(200, 0.03);
          this.stateTimer = 0;
        }
        break;
        
      case 'landed':
        if (this.stateTimer > 300) {
          this.removeShockwave();
          this.bossState = 'idle';
          this.cooldown = cfg.cooldown;
        }
        break;
    }
  }

  private createShockwave(): void {
    const cfg = CFG.attackPatterns.leapSmash;
    this.shockwave = this.scene.add.rectangle(
      this.x, 
      this.y + CFG.height / 2, 
      cfg.shockwaveWidth * 2, 
      20, 
      0xff6600, 
      0.8
    );
    
    // Check player collision with shockwave
    this.scene.time.delayedCall(50, () => {
      if (this.shockwave) {
        const player = this.gameScene.player;
        const shockBounds = this.shockwave.getBounds();
        const playerBounds = player.getBounds();
        
        if (Phaser.Geom.Rectangle.Overlaps(shockBounds, playerBounds)) {
          player.takeDamage(cfg.shockwaveDamage, this.x);
        }
      }
    });
  }

  private removeShockwave(): void {
    if (this.shockwave) {
      this.shockwave.destroy();
      this.shockwave = null;
    }
  }

  private startMaceCombo(): void {
    this.bossState = 'maceCombo';
    this.stateTimer = 0;
    this.comboSwingsRemaining = CFG.attackPatterns.maceCombo.swings;
    this.comboSwingTimer = 0;
  }

  private updateMaceCombo(body: Phaser.Physics.Arcade.Body, player: Player, delta: number): void {
    const cfg = CFG.attackPatterns.maceCombo;
    this.comboSwingTimer += delta;
    
    if (this.comboSwingTimer >= cfg.swingDelay && this.comboSwingsRemaining > 0) {
      // Perform swing
      this.performMaceSwing();
      this.comboSwingsRemaining--;
      this.comboSwingTimer = 0;
      
      // Move forward slightly
      body.setVelocityX(this.facing * cfg.forwardMovePerSwing * 3);
      this.scene.cameras.main.shake(80, 0.01);
    }
    
    // Slow down between swings
    body.velocity.x *= 0.95;
    
    if (this.comboSwingsRemaining <= 0 && this.comboSwingTimer > cfg.swingDelay) {
      this.bossState = 'idle';
      this.cooldown = cfg.cooldown;
      body.setVelocityX(0);
    }
  }

  private performMaceSwing(): void {
    // Flash mace
    if (this.maceSprite) {
      this.maceSprite.setFillStyle(0xffffff);
      this.scene.time.delayedCall(100, () => {
        if (this.maceSprite) this.maceSprite.setFillStyle(0x555555);
      });
    }
    
    // Check hit
    const player = this.gameScene.player;
    const maceHitbox = new Phaser.Geom.Rectangle(
      this.x + (this.facing * 50),
      this.y - 30,
      80,
      100
    );
    
    if (Phaser.Geom.Rectangle.Overlaps(maceHitbox, player.getBounds())) {
      player.takeDamage(CFG.attackPatterns.maceCombo.damage, this.x);
    }
  }


  private updateRageTantrum(body: Phaser.Physics.Arcade.Body, delta: number): void {
    const cfg = CFG.attackPatterns.rageTantrum;
    this.tantrumTimer += delta;
    this.rockSpawnTimer += delta;
    
    // Move to center
    const centerX = (this.arenaLeft + this.arenaRight) / 2;
    body.setVelocityX((centerX - this.x) * 0.05);
    
    // Smash left and right
    if (Math.floor(this.tantrumTimer / cfg.smashInterval) % 2 === 0) {
      this.facing = -1;
    } else {
      this.facing = 1;
    }
    this.setFlipX(this.facing < 0);
    
    // Screen shake during tantrum
    if (Math.floor(this.tantrumTimer / cfg.smashInterval) !== Math.floor((this.tantrumTimer - delta) / cfg.smashInterval)) {
      this.scene.cameras.main.shake(100, 0.02);
      this.shakeBackgroundPillars();
    }
    
    // Spawn falling rocks
    if (this.rockSpawnTimer >= cfg.rockSpawnInterval) {
      this.spawnFallingRock();
      this.rockSpawnTimer = 0;
    }
    
    if (this.tantrumTimer > cfg.duration) {
      this.bossState = 'idle';
      this.cooldown = 1500;
    }
  }

  private shakeBackgroundPillars(): void {
    // Visual effect - could shake background elements
    // For now just additional screen effects
    this.scene.cameras.main.flash(50, 255, 100, 0, false);
  }

  private spawnFallingRock(): void {
    const rockX = Phaser.Math.Between(this.arenaLeft + 50, this.arenaRight - 50);
    const rock = this.scene.add.rectangle(rockX, 0, 40, 40, 0x666666);
    this.scene.physics.add.existing(rock);
    
    const rockBody = rock.body as Phaser.Physics.Arcade.Body;
    rockBody.setVelocityY(400);
    rockBody.setAllowGravity(false);
    
    this.fallingRocks.push(rock);
  }

  private updateFallingRocks(delta: number): void {
    const player = this.gameScene.player;
    const playerBounds = player.getBounds();
    
    this.fallingRocks = this.fallingRocks.filter(rock => {
      if (!rock.active) return false;
      
      const rockBounds = rock.getBounds();
      
      // Check player collision
      if (Phaser.Geom.Rectangle.Overlaps(rockBounds, playerBounds)) {
        player.takeDamage(CFG.attackPatterns.rageTantrum.rockDamage, rock.x);
        rock.destroy();
        return false;
      }
      
      // Remove if off screen
      if (rock.y > 700) {
        rock.destroy();
        return false;
      }
      
      return true;
    });
  }

  private updateMacePosition(): void {
    if (this.maceSprite) {
      this.maceSprite.setPosition(
        this.x + (this.facing * 70 * CFG.scale / 2),
        this.y
      );
    }
  }

  private checkHeadExposure(time: number): void {
    const timePassed = (time - this.fightStartTime) / 1000;
    const damageRatio = this.totalDamageDealt / this.bossMaxHp;
    
    const cfg = CFG.headExposureCondition;
    if (timePassed >= cfg.timeThresholdSec || damageRatio >= cfg.damageThresholdRatio) {
      this.headExposed = true;
    }
  }

  private showHeadHitbox(): void {
    if (!this.headHitbox) {
      this.headHitbox = this.scene.add.rectangle(
        this.x,
        this.y - 60,
        50,
        40,
        0xff8800,
        0.8
      );
    }
    this.headHitbox.setVisible(true);
  }

  private hideHeadHitbox(): void {
    if (this.headHitbox) {
      this.headHitbox.setVisible(false);
    }
  }

  takeDamage(amount: number, fromX: number): void {
    if (this.dead) return;
    
    this.totalDamageDealt += amount;
    
    // If staggered and head exposed, damage the main HP
    if (this.isStaggered && this.headExposed) {
      this.bossHp -= amount;
      this.flashWhite();
      
      if (this.bossHp <= 0) {
        this.die();
      }
    } else if (!this.isStaggered) {
      // Add to stagger meter
      this.staggerDamage += amount;
      this.flashWhite();
      
      if (this.staggerDamage >= CFG.staggerThreshold) {
        this.enterStagger();
      }
    }
  }

  private flashWhite(): void {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (!this.dead) {
        this.clearTint(); // Use actual sprite colors
      }
    });
  }

  private enterStagger(): void {
    this.isStaggered = true;
    this.bossState = 'staggered';
    this.stateTimer = 0;
    this.staggerDamage = 0;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    
    // Switch to staggered sprite (fallen over with maggot exposed)
    this.setTexture('falseChampion_staggered');
    this.clearTint();
    
    // Show head hitbox if conditions met
    if (this.headExposed) {
      this.showHeadHitbox();
    }
    
    // Slight bounce animation when falling
    this.scene.tweens.add({
      targets: this,
      y: this.y + 10,
      duration: 200,
      yoyo: true,
      ease: 'Bounce.easeOut'
    });
    
    // Camera shake on fall
    this.scene.cameras.main.shake(150, 0.02);
  }
  
  private recoverFromStagger(): void {
    this.isStaggered = false;
    this.staggerDamage = 0;
    
    // Switch back to normal sprite
    this.setTexture('falseChampion');
    this.clearTint();
    this.setAngle(0);
    
    this.hideHeadHitbox();
    
    this.bossState = 'recovering';
    this.stateTimer = 0;
  }

  private die(): void {
    this.dead = true;
    this.bossState = 'dead';
    
    // Clean up
    if (this.maceSprite) this.maceSprite.destroy();
    if (this.shockwave) this.shockwave.destroy();
    if (this.headHitbox) this.headHitbox.destroy();
    this.fallingRocks.forEach(r => r.destroy());
    
    // Open gates
    this.openGates();
    
    // Explosion effect - orange infection particles
    this.createDeathExplosion();
    
    // Fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 4,
      scaleY: 0.3,
      angle: 0,
      duration: 1500,
      onComplete: () => {
        this.gameScene.handleBossDefeated();
        this.destroy();
      }
    });
  }

  private createDeathExplosion(): void {
    // Create burst of orange particles
    for (let i = 0; i < 30; i++) {
      const particle = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-50, 50),
        this.y + Phaser.Math.Between(-50, 50),
        Phaser.Math.Between(8, 20),
        Phaser.Math.Between(8, 20),
        0xff6600
      );
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Phaser.Math.Between(-200, 200),
        y: particle.y + Phaser.Math.Between(-200, 100),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(800, 1500),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
    
    // Big screen shake
    this.scene.cameras.main.shake(500, 0.04);
    this.scene.cameras.main.flash(300, 255, 100, 0);
  }

  // Gate management for lock-in mechanic
  lockGates(leftGate: Phaser.GameObjects.Rectangle, rightGate: Phaser.GameObjects.Rectangle): void {
    this.leftGate = leftGate;
    this.rightGate = rightGate;
    this.gatesLocked = true;
  }

  private openGates(): void {
    if (this.leftGate) {
      this.scene.tweens.add({
        targets: this.leftGate,
        y: this.leftGate.y - 200,
        duration: 500,
        ease: 'Power2'
      });
    }
    if (this.rightGate) {
      this.scene.tweens.add({
        targets: this.rightGate,
        y: this.rightGate.y - 200,
        duration: 500,
        ease: 'Power2'
      });
    }
  }

  getHp(): number { return this.bossHp; }
  getMaxHp(): number { return this.bossMaxHp; }
  getName(): string { return CFG.name; }
  isDying(): boolean { return this.dead; }
  isInStagger(): boolean { return this.isStaggered; }
  
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - (CFG.width * CFG.scale) / 2,
      this.y - (CFG.height * CFG.scale) / 2,
      CFG.width * CFG.scale,
      CFG.height * CFG.scale
    );
  }
  
  getHeadBounds(): Phaser.Geom.Rectangle | null {
    if (this.headHitbox && this.headHitbox.visible) {
      return this.headHitbox.getBounds();
    }
    return null;
  }
}
