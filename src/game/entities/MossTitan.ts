import Phaser from 'phaser';
import bossData from '../data/boss.json';
import type { Player } from './Player';
import type { GameScene } from '../scenes/GameScene';

type BossState = 
  | 'idle' 
  | 'groundPound' 
  | 'chargeAttack' 
  | 'sporeBurst' 
  | 'roarAttack'
  | 'staggered' 
  | 'recovering'
  | 'dead';

const CFG = bossData.mossTitan;

export class MossTitan extends Phaser.Physics.Arcade.Sprite {
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
  private poundPhase: 'windup' | 'hanging' | 'slam' | 'landed' = 'windup';
  private chargeTimer = 0;
  private sporeParticles: Phaser.GameObjects.GameObject[] = [];
  private roarPhase: 'windup' | 'roaring' | 'recovering' = 'windup';
  private roarRing: Phaser.GameObjects.Ellipse | null = null;
  
  // Arena bounds
  private arenaLeft = 0;
  private arenaRight = 0;
  
  // Arena gates
  private leftGate: Phaser.GameObjects.Rectangle | null = null;
  private rightGate: Phaser.GameObjects.Rectangle | null = null;
  private gatesLocked = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'mossTitan');
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
    
    // Set up arena bounds
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
    
    // Check head exposure conditions
    this.checkHeadExposure(time);
    
    // Update roar ring
    if (this.roarRing) {
      this.roarRing.scale += delta * 0.003;
      this.roarRing.alpha -= delta * 0.001;
      if (this.roarRing.alpha <= 0) {
        this.roarRing.destroy();
        this.roarRing = null;
      }
    }
    
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.bossState) {
      case 'idle':
        body.setVelocityX(0);
        if (this.cooldown <= 0) {
          this.chooseNextAttack(player);
        }
        break;
        
      case 'groundPound':
        this.updateGroundPound(body, player, delta);
        break;
        
      case 'chargeAttack':
        this.updateChargeAttack(body, player, delta);
        break;
        
      case 'sporeBurst':
        this.updateSporeBurst(body, player, delta);
        break;
        
      case 'roarAttack':
        this.updateRoarAttack(body, player, delta);
        break;
        
      case 'staggered':
        body.setVelocityX(0);
        if (this.stateTimer > CFG.staggerDuration) {
          this.recoverFromStagger();
        }
        break;
        
      case 'recovering':
        if (this.stateTimer > CFG.staggerRecoveryRageTime) {
          this.bossState = 'idle';
          this.cooldown = 1000;
        }
        break;
    }
    
    // Update head hitbox position if exposed
    if (this.headHitbox && this.headExposed && this.isStaggered) {
      this.headHitbox.setPosition(this.x, this.y - 80);
    }
  }

  private chooseNextAttack(player: Player): void {
    const distance = Math.abs(player.x - this.x);
    const rand = Math.random();
    
    // Choose based on distance and randomness
    if (distance > 300 || rand < 0.35) {
      this.startGroundPound(player);
    } else if (rand < 0.65) {
      this.startChargeAttack(player);
    } else if (rand < 0.8) {
      this.startSporeBurst();
    } else {
      this.startRoarAttack();
    }
  }

  private startGroundPound(player: Player): void {
    this.bossState = 'groundPound';
    this.stateTimer = 0;
    this.poundPhase = 'windup';
    this.cooldown = CFG.attackPatterns.groundPound.cooldown;
    
    // Face player
    this.facing = player.x > this.x ? 1 : -1;
    this.setFlipX(this.facing < 0);
  }

  private updateGroundPound(body: Phaser.Physics.Arcade.Body, player: Player, delta: number): void {
    const cfg = CFG.attackPatterns.groundPound;
    
    switch (this.poundPhase) {
      case 'windup':
        // Crouch animation
        if (this.stateTimer > cfg.windupTime) {
          this.poundPhase = 'hanging';
          this.stateTimer = 0;
        }
        break;
        
      case 'hanging':
        // Lift off ground slightly
        body.setVelocityY(-200);
        if (this.stateTimer > 300) {
          this.poundPhase = 'slam';
          this.stateTimer = 0;
        }
        break;
        
      case 'slam':
        // Slam down
        body.setVelocityY(cfg.slamSpeed);
        if (body.blocked.down || this.y > this.gameScene.currentLevel.height - 100) {
          this.poundPhase = 'landed';
          this.stateTimer = 0;
          this.createShockwave();
          this.gameScene.cameras.main.shake(300, 0.04);
          body.setVelocityY(0);
        }
        break;
        
      case 'landed':
        if (this.stateTimer > 500) {
          this.bossState = 'idle';
        }
        break;
    }
  }

  private createShockwave(): void {
    const cfg = CFG.attackPatterns.groundPound;
    const shockwave = this.scene.add.rectangle(
      this.x, 
      this.y + CFG.height * CFG.scale / 2, 
      0, 
      30, 
      0x44ff44, 
      0.8
    );
    
    // Animate shockwave expanding
    this.scene.tweens.add({
      targets: shockwave,
      width: cfg.shockwaveWidth * 2,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => shockwave.destroy()
    });
    
    // Check player collision with shockwave
    this.scene.time.delayedCall(50, () => {
      const player = this.gameScene.player;
      const shockBounds = shockwave.getBounds();
      const playerBounds = player.getBounds();
      
      if (Phaser.Geom.Rectangle.Overlaps(shockBounds, playerBounds)) {
        player.takeDamage(cfg.shockwaveDamage, this.x);
      }
    });
  }

  private startChargeAttack(player: Player): void {
    this.bossState = 'chargeAttack';
    this.stateTimer = 0;
    this.chargeTimer = 0;
    this.cooldown = CFG.attackPatterns.chargeAttack.cooldown;
    
    this.facing = player.x > this.x ? 1 : -1;
    this.setFlipX(this.facing < 0);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
  }

  private updateChargeAttack(body: Phaser.Physics.Arcade.Body, player: Player, delta: number): void {
    const cfg = CFG.attackPatterns.chargeAttack;
    this.chargeTimer += delta;
    
    if (this.chargeTimer < cfg.windupTime) {
      // Windup - slight back animation
    } else if (this.chargeTimer < cfg.windupTime + cfg.chargeDuration) {
      // Charging forward
      body.setVelocityX(this.facing * cfg.chargeSpeed);
      
      // Create dust trail
      if (Math.random() < 0.3) {
        this.createDustParticle();
      }
      
      // Check player collision
      const player = this.gameScene.player;
      const dist = Math.abs(player.x - this.x);
      if (dist < 60 && Math.abs(player.y - this.y) < 80) {
        player.takeDamage(cfg.damage, this.x);
      }
    } else {
      // End charge
      this.bossState = 'idle';
      body.setVelocityX(0);
      this.gameScene.cameras.main.shake(200, 0.02);
    }
  }

  private startSporeBurst(): void {
    this.bossState = 'sporeBurst';
    this.stateTimer = 0;
    this.cooldown = CFG.attackPatterns.sporeBurst.cooldown;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
  }

  private updateSporeBurst(body: Phaser.Physics.Arcade.Body, player: Player, delta: number): void {
    const cfg = CFG.attackPatterns.sporeBurst;
    
    if (this.stateTimer > cfg.windupTime && this.sporeParticles.length === 0) {
      // Release spores
      const player = this.gameScene.player;
      const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
      
      for (let i = 0; i < cfg.sporeCount; i++) {
        const angle = angleToPlayer + (i - cfg.sporeCount / 2) * 0.3;
        this.createSpore(angle);
      }
    }
    
    if (this.stateTimer > 1500) {
      this.bossState = 'idle';
    }
  }

  private createSpore(angle: number): void {
    const speed = 200;
    const spore = this.scene.add.ellipse(this.x, this.y - 40, 15, 10, 0x66ff66, 0.9);
    this.scene.physics.add.existing(spore);
    
    const sporeBody = spore.body as Phaser.Physics.Arcade.Body;
    sporeBody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    sporeBody.setCollideWorldBounds(true);
    sporeBody.setBounce(0.6);
    
    this.sporeParticles.push(spore);
    
    // Animate spore
    this.scene.tweens.add({
      targets: spore,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 2000,
      delay: 500,
      ease: 'Power2',
      onComplete: () => {
        spore.destroy();
        const idx = this.sporeParticles.indexOf(spore);
        if (idx > -1) this.sporeParticles.splice(idx, 1);
      }
    });
    
    // Check player collision
    this.scene.time.addEvent({
      delay: 50,
      repeat: 20,
      callback: () => {
        if (!spore.active) return;
        const player = this.gameScene.player;
        const sporeBounds = spore.getBounds();
        const playerBounds = player.getBounds();
        
        if (Phaser.Geom.Rectangle.Overlaps(sporeBounds, playerBounds)) {
          player.takeDamage(CFG.attackPatterns.sporeBurst.sporeDamage, this.x);
          spore.destroy();
          const idx = this.sporeParticles.indexOf(spore);
          if (idx > -1) this.sporeParticles.splice(idx, 1);
        }
      }
    });
  }

  private startRoarAttack(): void {
    this.bossState = 'roarAttack';
    this.stateTimer = 0;
    this.roarPhase = 'windup';
    this.cooldown = CFG.attackPatterns.roarAttack.cooldown;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
  }

  private updateRoarAttack(body: Phaser.Physics.Arcade.Body, player: Player, delta: number): void {
    const cfg = CFG.attackPatterns.roarAttack;
    
    switch (this.roarPhase) {
      case 'windup':
        if (this.stateTimer > cfg.windupTime) {
          this.roarPhase = 'roaring';
          this.stateTimer = 0;
          this.createRoarRing();
          this.gameScene.cameras.main.shake(400, 0.03);
          
          // Check player in range
          const player = this.gameScene.player;
          const dist = Math.abs(player.x - this.x);
          if (dist < cfg.roarRange) {
            player.takeDamage(cfg.roarDamage, this.x);
          }
        }
        break;
        
      case 'roaring':
        if (this.stateTimer > 800) {
          this.roarPhase = 'recovering';
          this.stateTimer = 0;
        }
        break;
        
      case 'recovering':
        if (this.stateTimer > 500) {
          this.bossState = 'idle';
        }
        break;
    }
  }

  private createRoarRing(): void {
    this.roarRing = this.scene.add.ellipse(
      this.x,
      this.y - 40,
      50,
      30,
      0x88ff88,
      0.8
    );
    this.roarRing.setStrokeStyle(4, 0x44ff44);
    this.roarRing.setDepth(100);
  }

  private createDustParticle(): void {
    const dust = this.scene.add.circle(
      this.x - this.facing * 60,
      this.y + 20,
      Phaser.Math.Between(5, 12),
      0x5a8a5a,
      0.7
    );
    
    this.scene.tweens.add({
      targets: dust,
      x: dust.x - this.facing * 20,
      y: dust.y - Phaser.Math.Between(10, 30),
      alpha: 0,
      scale: 0.3,
      duration: 300,
      onComplete: () => dust.destroy()
    });
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
        this.y - 80,
        60,
        50,
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

  takeDamage(amount: number, fromX: number, swingId?: number): boolean {
    if (this.dead || this.isInvulnerable()) return false;
    
    this.totalDamageDealt += amount;
    
    // If staggered and head exposed, damage main HP
    if (this.isStaggered && this.headExposed) {
      this.bossHp -= amount;
      this.flashGreen();
      
      if (this.bossHp <= 0) {
        this.die();
      }
      return true;
    } else if (!this.isStaggered) {
      // Add to stagger meter
      this.staggerDamage += amount;
      this.flashGreen();
      
      if (this.staggerDamage >= CFG.staggerThreshold) {
        this.enterStagger();
      }
      return true;
    }
    
    return false;
  }

  private flashGreen(): void {
    this.setTint(0x88ff88);
    this.scene.time.delayedCall(100, () => {
      if (!this.dead) {
        this.clearTint();
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
    
    // Show head hitbox if conditions met
    if (this.headExposed) {
      this.showHeadHitbox();
    }
    
    // Stagger animation
    this.scene.tweens.add({
      targets: this,
      y: this.y + 10,
      duration: 200,
      yoyo: true,
      ease: 'Bounce.easeOut'
    });
    
    // Camera shake
    this.gameScene.cameras.main.shake(150, 0.02);
  }
  
  private recoverFromStagger(): void {
    this.isStaggered = false;
    this.staggerDamage = 0;
    
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
    if (this.headHitbox) this.headHitbox.destroy();
    if (this.roarRing) this.roarRing.destroy();
    this.sporeParticles.forEach(s => s.destroy());
    
    // Open gates
    this.openGates();
    
    // === DEATH SEQUENCE ===
    
    // Phase 1: Roar (1s)
    this.scene.time.delayedCall(0, () => {
      this.createDeathRoar();
    });
    
    // Phase 2: Moss explosion (2s)
    this.scene.time.delayedCall(1000, () => {
      this.createMossExplosion();
    });
    
    // Phase 3: Collapse (4s)
    this.scene.time.delayedCall(3000, () => {
      this.createCollapse();
    });
    
    // Phase 4: Final (5s)
    this.scene.time.delayedCall(5000, () => {
      this.gameScene.handleBossDefeated();
    });
  }

  private createDeathRoar(): void {
    // Massive roar effect
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        const ring = this.scene.add.ellipse(this.x, this.y - 40, 50 + i * 20, 30, 0x44ff44, 0.6);
        ring.setStrokeStyle(3, 0x22aa22);
        ring.setDepth(100);
        
        this.scene.tweens.add({
          targets: ring,
          scaleX: 3,
          scaleY: 3,
          alpha: 0,
          duration: 600,
          ease: 'Power2',
          onComplete: () => ring.destroy()
        });
      });
    }
    
    this.gameScene.cameras.main.shake(600, 0.03);
  }

  private createMossExplosion(): void {
    // Burst of moss and spores
    for (let i = 0; i < 40; i++) {
      const size = Phaser.Math.Between(10, 25);
      const color = Phaser.Math.RND.pick([0x44ff44, 0x66dd66, 0x88bb88, 0x33aa33]);
      
      const particle = this.scene.add.ellipse(
        this.x + Phaser.Math.Between(-60, 60),
        this.y + Phaser.Math.Between(-50, 30),
        size,
        size * 0.7,
        color
      );
      
      const angle = Math.random() * Math.PI * 2;
      const distance = Phaser.Math.Between(100, 250);
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance - 80,
        alpha: 0,
        rotation: Phaser.Math.Between(-3, 3),
        duration: Phaser.Math.Between(800, 1500),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
    
    // Central flash
    const flash = this.scene.add.circle(this.x, this.y, 80, 0x88ff88, 0.9);
    this.scene.tweens.add({
      targets: flash,
      radius: 150,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
  }

  private createCollapse(): void {
    // Fall over with thud
    this.scene.tweens.add({
      targets: this,
      angle: this.facing * 90,
      y: this.y + 40,
      duration: 600,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.gameScene.cameras.main.shake(400, 0.05);
        this.createCorpse();
      }
    });
  }

  private createCorpse(): void {
    // Mossy corpse
    const corpseX = this.x;
    const corpseY = this.y + 30;
    
    // Main body mound
    const bodyMound = this.scene.add.ellipse(corpseX, corpseY, 160, 80, 0x338833);
    bodyMound.setDepth(-1);
    
    // Moss patches
    for (let i = 0; i < 8; i++) {
      const patch = this.scene.add.ellipse(
        corpseX + Phaser.Math.Between(-70, 70),
        corpseY + Phaser.Math.Between(-30, 30),
        Phaser.Math.Between(20, 40),
        Phaser.Math.Between(15, 25),
        0x44aa44
      );
      patch.setDepth(-0.9);
    }
    
    // Glowing spores lingering
    for (let i = 0; i < 6; i++) {
      const spore = this.scene.add.circle(
        corpseX + Phaser.Math.Between(-50, 50),
        corpseY + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(5, 10),
        0x66ff66,
        0.6
      );
      spore.setDepth(-0.8);
      
      this.scene.tweens.add({
        targets: spore,
        alpha: 0.2,
        duration: 1500,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Hide actual boss
    this.setVisible(false);
    this.setActive(false);
  }

  // Gate management
  lockGates(leftGate: Phaser.GameObjects.Rectangle, rightGate: Phaser.GameObjects.Rectangle): void {
    this.leftGate = leftGate;
    this.rightGate = rightGate;
    this.gatesLocked = true;
  }

  private openGates(): void {
    if (this.leftGate) {
      this.scene.tweens.add({
        targets: this.leftGate,
        y: this.leftGate.y - 250,
        duration: 500,
        ease: 'Power2'
      });
    }
    if (this.rightGate) {
      this.scene.tweens.add({
        targets: this.rightGate,
        y: this.rightGate.y - 250,
        duration: 500,
        ease: 'Power2'
      });
    }
  }

  // Public getters
  getHp(): number { return this.bossHp; }
  getMaxHp(): number { return this.bossMaxHp; }
  getName(): string { return CFG.name; }
  getSubtitle(): string { return CFG.subtitle; }
  getNameColor(): string { return CFG.nameColor; }
  isDying(): boolean { return this.dead; }
  isInStagger(): boolean { return this.isStaggered; }
  isInvulnerable(): boolean { 
    // Staggered with exposed head is vulnerable, recovering is invulnerable
    if (this.isStaggered && this.headExposed) return false;
    return this.dead || this.bossState === 'recovering';
  }
  
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
  
  // Enemy interface compatibility for when spawned as regular enemy
  getContactDamage(): number {
    return CFG.contactDamage;
  }
}
