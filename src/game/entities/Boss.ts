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

  // Animation tracking
  private animTimer = 0;
  private walkFrame = 0;
  private attackFrame = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'falseChampion_idle');
    this.gameScene = scene;
    this.bossMaxHp = CFG.maxHp;
    this.bossHp = this.bossMaxHp;
    this.fightStartTime = scene.time.now;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setSize(CFG.width, CFG.height);
    this.setCollideWorldBounds(true);
    this.clearTint();
    this.setScale(CFG.scale);
    
    // No separate mace sprite - it's part of the character
    this.maceSprite = null;
    
    // Set up arena bounds
    this.arenaLeft = x - 500;
    this.arenaRight = x + 500;

    this.cooldown = 1500;
  }

  update(time: number, delta: number, player: Player): void {
    if (this.dead) return;
    
    this.stateTimer += delta;
    this.cooldown -= delta;
    this.animTimer += delta;
    
    // Update facing toward player
    if (this.bossState === 'idle') {
      this.facing = player.x > this.x ? 1 : -1;
      this.setFlipX(this.facing < 0);
    }
    
    // Check head exposure conditions
    this.checkHeadExposure(time);
    
    // Update falling rocks
    this.updateFallingRocks(delta);
    
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.bossState) {
      case 'idle':
        body.setVelocityX(0);
        // Idle animation - slight bounce
        this.setTexture('falseChampion_idle');
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
        this.setTexture('falseChampion_staggered');
        if (this.stateTimer > CFG.staggerDuration) {
          this.recoverFromStagger();
        }
        break;
        
      case 'recovering':
        // Stand back up animation
        this.setTexture('falseChampion_idle');
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
    
    // Use jump sprite
    this.setTexture('falseChampion_jump');
    
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
        this.setTexture('falseChampion_jump');
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
        // Mace raised
        this.setTexture('falseChampion_attack_0');
        
        if (this.stateTimer > cfg.hangTime) {
          this.leapPhase = 'falling';
          body.setAllowGravity(true);
          body.setVelocityY(cfg.slamSpeed);
        }
        break;
        
      case 'falling':
        // Mace down for impact
        this.setTexture('falseChampion_attack_1');
        if (body.blocked.down) {
          this.leapPhase = 'landed';
          this.createShockwave();
          this.scene.cameras.main.shake(200, 0.03);
          this.stateTimer = 0;
        }
        break;
        
      case 'landed':
        this.setTexture('falseChampion_idle');
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
    
    // Animate attack frames
    const swingPhase = (this.comboSwingTimer % cfg.swingDelay) / cfg.swingDelay;
    if (swingPhase < 0.5) {
      this.setTexture('falseChampion_attack_0'); // Wind up
    } else {
      this.setTexture('falseChampion_attack_1'); // Swing down
    }
    
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
    // Visual flash effect
    this.setTint(0xffaaaa);
    this.scene.time.delayedCall(100, () => {
      if (!this.dead) this.clearTint();
    });
    
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
    
    // Alternate attack frames rapidly for tantrum
    const smashFrame = Math.floor(this.tantrumTimer / 150) % 2;
    this.setTexture(smashFrame === 0 ? 'falseChampion_attack_0' : 'falseChampion_attack_1');
    
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

  // Mace is now part of the sprite, no separate update needed

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
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    
    // Clean up attacks
    if (this.shockwave) this.shockwave.destroy();
    if (this.headHitbox) this.headHitbox.destroy();
    this.fallingRocks.forEach(r => r.destroy());
    
    // Open gates
    this.openGates();
    
    // === PHASE 1: THE SCREAM (freeze and shriek) ===
    this.setTexture('falseChampion_staggered');
    
    // Look upward effect
    this.scene.tweens.add({
      targets: this,
      angle: -15,
      duration: 300,
      ease: 'Power2'
    });
    
    // Shriek visual effect - expanding rings
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        const shriekRing = this.scene.add.circle(this.x, this.y - 30, 20, 0xff6600, 0.6);
        this.scene.tweens.add({
          targets: shriekRing,
          radius: 100 + i * 30,
          alpha: 0,
          duration: 400,
          ease: 'Power2',
          onComplete: () => shriekRing.destroy()
        });
      });
    }
    
    // Camera shake for scream
    this.scene.cameras.main.shake(600, 0.02);
    
    // === PHASE 2: THE EXPLOSION (after 800ms) ===
    this.scene.time.delayedCall(800, () => {
      this.createDeathExplosion();
    });
    
    // === PHASE 3: THE COLLAPSE (after 2800ms) ===
    this.scene.time.delayedCall(2800, () => {
      // Fall over with heavy thud
      this.scene.tweens.add({
        targets: this,
        angle: 90,
        y: this.y + 30,
        duration: 400,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          // Screen shake for impact
          this.scene.cameras.main.shake(300, 0.04);
          
          // === PHASE 4: THE CORPSE (permanent) ===
          this.createCorpse();
          
          // === PHASE 5: REVEAL SECRET PATH ===
          this.scene.time.delayedCall(1000, () => {
            this.revealSecretPath();
            this.gameScene.handleBossDefeated();
          });
        }
      });
    });
  }

  private createDeathExplosion(): void {
    // Create burst of orange infection particles for 2 seconds
    const explosionDuration = 2000;
    const particleInterval = 50;
    let elapsed = 0;
    
    const timer = this.scene.time.addEvent({
      delay: particleInterval,
      callback: () => {
        elapsed += particleInterval;
        
        // Burst of particles
        for (let i = 0; i < 5; i++) {
          const particle = this.scene.add.rectangle(
            this.x + Phaser.Math.Between(-40, 40),
            this.y + Phaser.Math.Between(-50, 30),
            Phaser.Math.Between(10, 25),
            Phaser.Math.Between(10, 25),
            Phaser.Math.Between(0, 1) > 0.5 ? 0xff6600 : 0xff8844
          );
          
          this.scene.tweens.add({
            targets: particle,
            x: particle.x + Phaser.Math.Between(-150, 150),
            y: particle.y + Phaser.Math.Between(-200, 50),
            alpha: 0,
            scale: 0,
            rotation: Phaser.Math.Between(-3, 3),
            duration: Phaser.Math.Between(600, 1200),
            ease: 'Cubic.easeOut',
            onComplete: () => particle.destroy()
          });
        }
        
        // Screen shake during explosion
        this.scene.cameras.main.shake(100, 0.015);
        
        if (elapsed >= explosionDuration) {
          timer.destroy();
        }
      },
      loop: true
    });
    
    // Flash effect
    this.scene.cameras.main.flash(400, 255, 100, 0);
  }

  private createCorpse(): void {
    // Create permanent corpse visual behind where boss dies
    const corpseX = this.x;
    const corpseY = this.y + 20;
    
    // Armor shell corpse - darker, static
    const corpseBody = this.scene.add.ellipse(corpseX + 10, corpseY, 90, 50, 0x3a4a5a);
    corpseBody.setDepth(-1);
    
    // Helmet fallen
    const corpseHelmet = this.scene.add.ellipse(corpseX - 30, corpseY - 10, 50, 35, 0x3a4858);
    corpseHelmet.setDepth(-1);
    
    // Mace dropped nearby
    const maceDrop = this.scene.add.circle(corpseX + 60, corpseY + 15, 18, 0x4a4a55);
    maceDrop.setDepth(-1);
    
    // Add some infection goo leaking
    for (let i = 0; i < 5; i++) {
      const goo = this.scene.add.circle(
        corpseX + Phaser.Math.Between(-40, 40),
        corpseY + Phaser.Math.Between(-10, 20),
        Phaser.Math.Between(5, 12),
        0xff6600,
        0.6
      );
      goo.setDepth(-1);
    }
    
    // Hide the actual boss sprite
    this.setVisible(false);
    this.setActive(false);
  }

  private revealSecretPath(): void {
    // Create crumbling wall effect at back of arena
    const wallX = this.arenaRight - 30;
    const wallY = this.y - 50;
    
    // Create wall chunks that fall away
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        const chunk = this.scene.add.rectangle(
          wallX + col * 40,
          wallY + row * 50,
          35,
          45,
          0x555566
        );
        
        // Delay based on position for cascading effect
        this.scene.time.delayedCall((row + col) * 150, () => {
          this.scene.physics.add.existing(chunk);
          const chunkBody = chunk.body as Phaser.Physics.Arcade.Body;
          chunkBody.setVelocity(
            Phaser.Math.Between(-50, 100),
            Phaser.Math.Between(-100, 50)
          );
          chunkBody.setAngularVelocity(Phaser.Math.Between(-200, 200));
          
          // Camera shake for each chunk
          this.scene.cameras.main.shake(80, 0.01);
          
          // Fade and destroy
          this.scene.tweens.add({
            targets: chunk,
            alpha: 0,
            duration: 1000,
            delay: 500,
            onComplete: () => chunk.destroy()
          });
        });
      }
    }
    
    // Create portal/path reveal after chunks fall
    this.scene.time.delayedCall(1500, () => {
      const secretPortal = this.scene.add.rectangle(wallX, wallY + 50, 50, 150, 0x5599dd, 0.6);
      secretPortal.setDepth(-0.5);
      
      // Glow animation
      this.scene.tweens.add({
        targets: secretPortal,
        alpha: 0.3,
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    });
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
