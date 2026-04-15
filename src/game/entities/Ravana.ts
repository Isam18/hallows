import Phaser from 'phaser';
import bossData from '../data/boss.json';
import type { Player } from './Player';
import type { GameScene } from '../scenes/GameScene';
import gameState from '../core/GameState';

type RavanaState =
  | 'idle'
  | 'bladeCombo'
  | 'overheadSlam'
  | 'spiritVessels'
  | 'necroticVolley'
  | 'staggered'
  | 'recovering'
  | 'dead';

const CFG = (bossData as any).ravana;

export class Ravana extends Phaser.Physics.Arcade.Sprite {
  private gameScene: GameScene;
  private bossHp: number;
  private bossMaxHp: number;
  private bossState: RavanaState = 'idle';
  private stateTimer = 0;
  private cooldown = 2000;
  private facing: 1 | -1 = -1;
  private dead = false;

  // Stagger
  private staggerDamage = 0;
  private isStaggered = false;

  // HP Bar
  private hpBarBg: Phaser.GameObjects.Rectangle | null = null;
  private hpBarFill: Phaser.GameObjects.Rectangle | null = null;
  private hpBarBorder: Phaser.GameObjects.Rectangle | null = null;
  private hpBarNameText: Phaser.GameObjects.Text | null = null;
  private readonly HP_BAR_WIDTH = 300;
  private readonly HP_BAR_HEIGHT = 12;

  // Gates
  private leftGate: Phaser.GameObjects.Rectangle | null = null;
  private rightGate: Phaser.GameObjects.Rectangle | null = null;

  // Phase tracking
  private phase: 1 | 2 = 1;
  private attackIndex = 0;
  private totalDamageDealt = 0;

  // Blade combo
  private comboSwingsRemaining = 0;
  private comboSwingTimer = 0;
  private comboHitboxes: Phaser.GameObjects.Graphics[] = [];

  // Overhead slam
  private slamPhase: 'windup' | 'slam' | 'landed' = 'windup';
  private shockwaves: { g: Phaser.GameObjects.Graphics; x: number; y: number; vx: number; life: number }[] = [];

  // Spirit vessels
  private spiritVessels: { sprite: Phaser.GameObjects.Ellipse; vx: number; vy: number; hp: number }[] = [];
  private ashTraps: { g: Phaser.GameObjects.Graphics; x: number; y: number; life: number; playerTimeInside: number }[] = [];

  // Necrotic volleys (homing embers)
  private necroticEmbers: { g: Phaser.GameObjects.Ellipse; vx: number; vy: number; life: number }[] = [];
  private volleyTimer = 0;
  private volleyCount = 0;

  // Arena bounds
  private arenaLeft = 0;
  private arenaRight = 0;

  // Ash vortex particles
  private ashParticleTimer = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'ravana');
    this.gameScene = scene;
    this.bossMaxHp = CFG.maxHp;
    this.bossHp = this.bossMaxHp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(CFG.width, CFG.height);
    this.setCollideWorldBounds(true);
    this.setScale(CFG.scale);
    this.setImmovable(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);

    this.arenaLeft = x - 500;
    this.arenaRight = x + 500;

    this.createBossHPBar();
  }

  update(time: number, delta: number, player: Player): void {
    if (this.dead) return;

    this.stateTimer += delta;
    this.cooldown -= delta;
    this.ashParticleTimer += delta;

    // Ambient ash vortex
    if (this.ashParticleTimer > 200) {
      this.ashParticleTimer = 0;
      this.spawnAshParticle();
    }

    // Update projectiles/entities
    this.updateShockwaves(player, delta);
    this.updateSpiritVessels(player, delta);
    this.updateAshTraps(player, delta);
    this.updateNecroticEmbers(player, delta);

    // Phase transition at 50% HP
    if (this.phase === 1 && this.bossHp <= this.bossMaxHp * 0.5) {
      this.phase = 2;
      // Phase 2 flash
      this.gameScene.cameras.main.flash(400, 80, 0, 80);
      this.setTint(0xaa44ff);
      this.scene.time.delayedCall(300, () => { if (!this.dead) this.clearTint(); });
    }

    if (this.bossState === 'idle') {
      this.facing = player.x > this.x ? 1 : -1;
      this.setFlipX(this.facing < 0);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.bossState) {
      case 'idle':
        // Walk toward player slowly
        const dist = player.x - this.x;
        if (Math.abs(dist) > 120) {
          body.setVelocityX(this.facing * 80);
        } else {
          body.setVelocityX(0);
        }
        if (this.cooldown <= 0) {
          this.chooseAttack(player);
        }
        break;

      case 'bladeCombo':
        this.updateBladeCombo(body, player, delta);
        break;

      case 'overheadSlam':
        this.updateOverheadSlam(body, player, delta);
        break;

      case 'spiritVessels':
        body.setVelocityX(0);
        // Just wait for vessels to be cleared
        if (this.spiritVessels.length === 0 && this.stateTimer > 1500) {
          this.bossState = 'idle';
          this.cooldown = 1500;
        }
        break;

      case 'necroticVolley':
        this.updateNecroticVolleyState(body, player, delta);
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
          this.cooldown = 800;
        }
        break;
    }
  }

  private chooseAttack(player: Player): void {
    const phase1Attacks: RavanaState[] = ['bladeCombo', 'overheadSlam', 'bladeCombo'];
    const phase2Attacks: RavanaState[] = ['bladeCombo', 'overheadSlam', 'spiritVessels', 'necroticVolley'];

    const attacks = this.phase === 1 ? phase1Attacks : phase2Attacks;
    const idx = this.attackIndex % attacks.length;
    this.attackIndex++;

    const chosen = Math.random() < 0.25
      ? attacks[Phaser.Math.Between(0, attacks.length - 1)]
      : attacks[idx];

    switch (chosen) {
      case 'bladeCombo': this.startBladeCombo(player); break;
      case 'overheadSlam': this.startOverheadSlam(player); break;
      case 'spiritVessels': this.startSpiritVessels(); break;
      case 'necroticVolley': this.startNecroticVolley(player); break;
    }
  }

  // ========================
  // BLADE COMBO - fast 180° sweeping slashes
  // ========================
  private startBladeCombo(player: Player): void {
    this.bossState = 'bladeCombo';
    this.stateTimer = 0;
    this.comboSwingsRemaining = this.phase === 1 ? 3 : 5;
    this.comboSwingTimer = 0;
    this.facing = player.x > this.x ? 1 : -1;
    this.setFlipX(this.facing < 0);
    this.cooldown = CFG.attackPatterns.bladeCombo.cooldown;
  }

  private updateBladeCombo(body: Phaser.Physics.Arcade.Body, player: Player, delta: number): void {
    this.comboSwingTimer += delta;
    const swingDelay = CFG.attackPatterns.bladeCombo.swingDelay;

    // Move toward player during combo
    body.setVelocityX(this.facing * CFG.attackPatterns.bladeCombo.forwardMove);

    if (this.comboSwingTimer >= swingDelay && this.comboSwingsRemaining > 0) {
      this.comboSwingTimer = 0;
      this.comboSwingsRemaining--;
      this.performSlash(player);
    }

    if (this.comboSwingsRemaining <= 0 && this.comboSwingTimer > 300) {
      body.setVelocityX(0);
      this.bossState = 'idle';
      this.cooldown = CFG.attackPatterns.bladeCombo.cooldown;
    }
  }

  private performSlash(player: Player): void {
    // Create visual slash arc
    const slash = this.scene.add.graphics();
    const range = CFG.attackPatterns.bladeCombo.range;

    // Alternating blade colors: orange flame and necrotic violet
    const isFlame = this.comboSwingsRemaining % 2 === 0;
    const color = isFlame ? 0xff6600 : 0x8844cc;
    const alpha = 0.6;

    slash.fillStyle(color, alpha);
    // Arc covering 180 degrees in facing direction
    const arcX = this.x + this.facing * 30;
    const arcY = this.y - 10;
    slash.beginPath();
    const startAngle = this.facing > 0 ? -Math.PI / 2 : Math.PI / 2;
    const endAngle = this.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    slash.arc(arcX, arcY, range, startAngle, endAngle, this.facing < 0);
    slash.lineTo(arcX, arcY);
    slash.closePath();
    slash.fillPath();

    this.scene.tweens.add({
      targets: slash, alpha: 0, duration: 200,
      onComplete: () => slash.destroy()
    });

    // Hit detection
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const inFront = (dx * this.facing) > -20;
    if (dist < range + 20 && inFront) {
      this.hitPlayer(player, CFG.attackPatterns.bladeCombo.damage, this.x);
    }
  }

  // ========================
  // OVERHEAD SLAM - heavy slam + shockwave
  // ========================
  private startOverheadSlam(player: Player): void {
    this.bossState = 'overheadSlam';
    this.stateTimer = 0;
    this.slamPhase = 'windup';
    this.facing = player.x > this.x ? 1 : -1;
    this.setFlipX(this.facing < 0);
    this.cooldown = CFG.attackPatterns.overheadSlam.cooldown;
  }

  private updateOverheadSlam(body: Phaser.Physics.Arcade.Body, player: Player, delta: number): void {
    switch (this.slamPhase) {
      case 'windup':
        // Rise up and telegraph
        this.x += Math.sin(this.stateTimer * 0.06) * 2;
        this.setTint(0xff4400);
        if (this.stateTimer > CFG.attackPatterns.overheadSlam.windupTime) {
          this.slamPhase = 'slam';
          this.stateTimer = 0;
          body.setVelocityY(-200); // leap up slightly
        }
        break;

      case 'slam':
        body.setVelocityY(CFG.attackPatterns.overheadSlam.slamSpeed);
        if (body.blocked.down || this.y > this.gameScene.currentLevel.height - 80) {
          this.slamPhase = 'landed';
          this.stateTimer = 0;
          this.fireShockwaves();
          this.gameScene.cameras.main.shake(500, 0.05);
          this.clearTint();
        }
        break;

      case 'landed':
        body.setVelocityY(0);
        body.setVelocityX(0);
        if (this.stateTimer > 800) {
          this.bossState = 'idle';
        }
        break;
    }
  }

  private fireShockwaves(): void {
    const floorY = this.y + (this.displayHeight / 2);
    for (const dir of [-1, 1]) {
      const wave = this.scene.add.graphics();
      wave.fillStyle(0xff6600, 0.7);
      for (let s = 0; s < 6; s++) {
        const sx = s * 14 * dir;
        wave.fillTriangle(sx, 0, sx - 10, -22 - s * 4, sx + 10, -22 - s * 4);
      }
      wave.setPosition(this.x, floorY);
      this.shockwaves.push({ g: wave, x: this.x, y: floorY, vx: dir * 280, life: 2500 });
    }
  }

  private updateShockwaves(player: Player, delta: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= delta;
      sw.x += sw.vx * (delta / 1000);
      sw.g.setPosition(sw.x, sw.y);

      const dist = Math.abs(sw.x - player.x);
      const yDist = Math.abs(sw.y - player.y);
      if (dist < 30 && yDist < 50) {
        this.hitPlayer(player, CFG.attackPatterns.overheadSlam.shockwaveDamage, sw.x);
        sw.g.destroy();
        this.shockwaves.splice(i, 1);
        continue;
      }
      if (sw.life <= 0) {
        sw.g.destroy();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  // ========================
  // SPIRIT VESSELS - Phase 2
  // ========================
  private startSpiritVessels(): void {
    this.bossState = 'spiritVessels';
    this.stateTimer = 0;
    this.cooldown = CFG.attackPatterns.spiritVessels.cooldown;

    // Anchor and summon visual
    this.setTint(0x8844cc);
    this.scene.time.delayedCall(300, () => { if (!this.dead) this.clearTint(); });

    const count = CFG.attackPatterns.spiritVessels.count;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const spawnDist = 150;
      const vx = this.x + Math.cos(angle) * spawnDist;
      const vy = this.y + Math.sin(angle) * spawnDist - 50;

      const vessel = this.scene.add.ellipse(vx, vy, 20, 28, 0xbb88ff, 0.5);
      vessel.setStrokeStyle(1, 0xdd99ff, 0.4);

      this.spiritVessels.push({ sprite: vessel, vx: 0, vy: 0, hp: 1 });
    }
  }

  private updateSpiritVessels(player: Player, delta: number): void {
    for (let i = this.spiritVessels.length - 1; i >= 0; i--) {
      const v = this.spiritVessels[i];
      // Float toward player
      const dx = player.x - v.sprite.x;
      const dy = player.y - v.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 80;
      if (dist > 5) {
        v.sprite.x += (dx / dist) * speed * (delta / 1000);
        v.sprite.y += (dy / dist) * speed * (delta / 1000);
      }

      // Wobble
      v.sprite.y += Math.sin(Date.now() * 0.005 + i) * 0.3;

      // Contact damage
      if (dist < 25) {
        this.hitPlayer(player, CFG.attackPatterns.spiritVessels.contactDamage, v.sprite.x);
        this.createAshTrap(v.sprite.x, v.sprite.y);
        v.sprite.destroy();
        this.spiritVessels.splice(i, 1);
        continue;
      }

      // Check if player attacked it (handled in takeDamage on the vessel side)
      // Vessels are checked in GameScene's attack overlap
    }
  }

  // Called from GameScene when player's nail hits a vessel area
  hitVessel(x: number, y: number): boolean {
    for (let i = this.spiritVessels.length - 1; i >= 0; i--) {
      const v = this.spiritVessels[i];
      const dx = v.sprite.x - x;
      const dy = v.sprite.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
        this.createAshTrap(v.sprite.x, v.sprite.y);
        v.sprite.destroy();
        this.spiritVessels.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  private createAshTrap(x: number, y: number): void {
    const trap = this.scene.add.graphics();
    trap.fillStyle(0x332244, 0.5);
    trap.fillEllipse(x, y, 40, 12);
    trap.fillStyle(0x553366, 0.3);
    trap.fillEllipse(x, y, 30, 8);
    this.ashTraps.push({ g: trap, x, y, life: 4000, playerTimeInside: 0 });
  }

  private updateAshTraps(player: Player, delta: number): void {
    for (let i = this.ashTraps.length - 1; i >= 0; i--) {
      const trap = this.ashTraps[i];
      trap.life -= delta;

      // Flicker alpha as it decays
      trap.g.setAlpha(0.3 + Math.sin(Date.now() * 0.008) * 0.15);

      // Check if player standing on it
      const dx = Math.abs(player.x - trap.x);
      const dy = Math.abs(player.y - trap.y);
      if (dx < 25 && dy < 20) {
        trap.playerTimeInside += delta;
        if (trap.playerTimeInside >= 500) {
          this.hitPlayer(player, CFG.attackPatterns.ashTrap.damage, trap.x);
          trap.playerTimeInside = 0;
        }
      } else {
        trap.playerTimeInside = 0;
      }

      if (trap.life <= 0) {
        trap.g.destroy();
        this.ashTraps.splice(i, 1);
      }
    }
  }

  // ========================
  // NECROTIC VOLLEYS - homing embers
  // ========================
  private startNecroticVolley(player: Player): void {
    this.bossState = 'necroticVolley';
    this.stateTimer = 0;
    this.volleyTimer = 0;
    this.volleyCount = 0;
    this.cooldown = CFG.attackPatterns.necroticVolley.cooldown;
    this.setTint(0x9944ff);
  }

  private updateNecroticVolleyState(body: Phaser.Physics.Arcade.Body, player: Player, delta: number): void {
    this.volleyTimer += delta;
    body.setVelocityX(0);

    const cfg = CFG.attackPatterns.necroticVolley;
    if (this.volleyTimer >= cfg.fireInterval && this.volleyCount < cfg.count) {
      this.volleyTimer = 0;
      this.volleyCount++;
      this.fireNecroticEmber(player);
    }

    if (this.volleyCount >= cfg.count && this.stateTimer > 2000) {
      this.clearTint();
      this.bossState = 'idle';
      this.cooldown = cfg.cooldown;
    }
  }

  private fireNecroticEmber(player: Player): void {
    const ember = this.scene.add.ellipse(
      this.x + this.facing * 40,
      this.y - 20 + Phaser.Math.Between(-20, 20),
      10, 10, 0xff6600, 0.8
    );
    ember.setStrokeStyle(2, 0x8844cc, 0.6);

    // Initial velocity toward player
    const dx = player.x - ember.x;
    const dy = player.y - ember.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 120;

    this.necroticEmbers.push({
      g: ember,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      life: 5000
    });
  }

  private updateNecroticEmbers(player: Player, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.necroticEmbers.length - 1; i >= 0; i--) {
      const e = this.necroticEmbers[i];
      e.life -= delta;

      // Homing: gently steer toward player
      const dx = player.x - e.g.x;
      const dy = player.y - e.g.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const steer = 60;
      e.vx += (dx / dist) * steer * dt;
      e.vy += (dy / dist) * steer * dt;

      // Cap speed
      const spd = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      const maxSpd = 180;
      if (spd > maxSpd) {
        e.vx = (e.vx / spd) * maxSpd;
        e.vy = (e.vy / spd) * maxSpd;
      }

      e.g.x += e.vx * dt;
      e.g.y += e.vy * dt;

      // Hit player
      if (dist < 20) {
        this.hitPlayer(player, CFG.attackPatterns.necroticVolley.damage, e.g.x);
        e.g.destroy();
        this.necroticEmbers.splice(i, 1);
        continue;
      }

      if (e.life <= 0) {
        e.g.destroy();
        this.necroticEmbers.splice(i, 1);
      }
    }
  }

  // ========================
  // ASH VORTEX AMBIANCE
  // ========================
  private spawnAshParticle(): void {
    const px = this.x + Phaser.Math.Between(-100, 100);
    const py = this.y + Phaser.Math.Between(-80, 60);
    const ash = this.scene.add.rectangle(px, py, 3, 3, 0x665544, 0.4);
    const angle = Math.random() * Math.PI * 2;
    this.scene.tweens.add({
      targets: ash,
      x: px + Math.cos(angle) * 60,
      y: py + Math.sin(angle) * 40 - 30,
      alpha: 0,
      duration: 1200,
      onComplete: () => ash.destroy()
    });
  }

  // ========================
  // DAMAGE
  // ========================
  private hitPlayer(player: Player, damage: number, fromX: number): void {
    gameState.damage(damage);
    const gs = this.scene as any;
    if (gameState.getPlayerData().hp <= 0) {
      gs.handlePlayerDeath?.();
    } else {
      const kbDir = player.x > fromX ? 1 : -1;
      const pb = player.body as Phaser.Physics.Arcade.Body;
      if (pb) pb.setVelocity(kbDir * 350, -250);
      player.setTint(0xff4444);
      this.scene.time.delayedCall(200, () => {
        if (player.active) player.clearTint();
      });
    }
  }

  takeDamage(amount: number, fromX: number): boolean {
    if (this.dead) return false;
    if (this.bossState === 'recovering') return false;

    this.bossHp -= amount;
    this.totalDamageDealt += amount;
    this.staggerDamage += amount;

    // Flash
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (!this.dead) this.clearTint();
    });

    // Stagger check
    if (this.staggerDamage >= CFG.staggerThreshold && !this.isStaggered) {
      this.enterStagger();
    }

    if (this.bossHp <= 0) {
      this.die();
    }

    this.updateHPBar();

    const gs = this.gameScene as any;
    gs.emitUIEvent?.('bossHpUpdate', { hp: this.bossHp, maxHp: this.bossMaxHp });

    return true;
  }

  private enterStagger(): void {
    this.isStaggered = true;
    this.staggerDamage = 0;
    this.bossState = 'staggered';
    this.stateTimer = 0;
    this.cleanupAttacks();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    this.setTint(0x886688);
  }

  private recoverFromStagger(): void {
    this.isStaggered = false;
    this.bossState = 'recovering';
    this.stateTimer = 0;
    this.clearTint();

    // Recovery burst
    this.gameScene.cameras.main.shake(300, 0.03);
    const ring = this.scene.add.ellipse(this.x, this.y, 60, 40, 0x8844cc, 0.5);
    this.scene.tweens.add({
      targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 600,
      onComplete: () => ring.destroy()
    });
  }

  private cleanupAttacks(): void {
    this.shockwaves.forEach(sw => sw.g.destroy());
    this.shockwaves = [];
    this.comboHitboxes.forEach(h => h.destroy());
    this.comboHitboxes = [];
    this.necroticEmbers.forEach(e => e.g.destroy());
    this.necroticEmbers = [];
    // Don't cleanup vessels or ash traps - they persist
  }

  // ========================
  // DEATH
  // ========================
  private die(): void {
    this.dead = true;
    this.bossState = 'dead';

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.cleanupAttacks();

    // Cleanup vessels and ash traps on death
    this.spiritVessels.forEach(v => v.sprite.destroy());
    this.spiritVessels = [];
    this.ashTraps.forEach(t => t.g.destroy());
    this.ashTraps = [];

    this.openGates();
    this.destroyHPBar();

    // Death sequence: necrotic explosion
    this.gameScene.cameras.main.shake(2000, 0.06);

    // Purple/orange explosion
    this.scene.time.delayedCall(500, () => this.createNecroticExplosion());

    // Collapse
    this.scene.time.delayedCall(2500, () => {
      this.scene.tweens.add({
        targets: this, angle: this.facing * 90, y: this.y + 50,
        duration: 700, ease: 'Bounce.easeOut',
        onComplete: () => {
          this.createCorpse();
          this.gameScene.cameras.main.shake(500, 0.06);
        }
      });
    });

    // Victory
    this.scene.time.delayedCall(4000, () => {
      this.gameScene.handleBossDefeated();
    });
  }

  private createNecroticExplosion(): void {
    for (let i = 0; i < 60; i++) {
      const size = Phaser.Math.Between(6, 18);
      const color = Phaser.Math.RND.pick([0xff6600, 0x8844cc, 0xbb66ff, 0xcc4400, 0x553388]);
      const particle = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-60, 60),
        this.y + Phaser.Math.Between(-50, 40),
        size, size * 0.7, color
      );
      const angle = Math.random() * Math.PI * 2;
      const distance = Phaser.Math.Between(100, 280);
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance - 80,
        alpha: 0, rotation: Phaser.Math.Between(-4, 4),
        duration: Phaser.Math.Between(600, 1400),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    // Central flash
    const flash = this.scene.add.circle(this.x, this.y, 70, 0xcc66ff, 0.9);
    this.scene.tweens.add({
      targets: flash, radius: 140, alpha: 0, duration: 500,
      ease: 'Power2', onComplete: () => flash.destroy()
    });
  }

  private createCorpse(): void {
    const cx = this.x;
    const cy = this.y + 40;

    // Dark mound of collapsed armor
    const mound = this.scene.add.ellipse(cx, cy, 180, 80, 0x1a1018);
    mound.setDepth(-1);

    // Spectral blade shards
    for (let i = 0; i < 8; i++) {
      const shard = this.scene.add.rectangle(
        cx + Phaser.Math.Between(-70, 70),
        cy + Phaser.Math.Between(-30, 20),
        Phaser.Math.Between(5, 12),
        Phaser.Math.Between(15, 30),
        Phaser.Math.RND.pick([0xff6600, 0x8844cc]),
        0.4
      );
      shard.setAngle(Phaser.Math.Between(-40, 40));
      shard.setDepth(-0.9);
    }

    this.setVisible(false);
    this.setActive(false);
  }

  // Gates
  lockGates(leftGate: Phaser.GameObjects.Rectangle, rightGate: Phaser.GameObjects.Rectangle): void {
    this.leftGate = leftGate;
    this.rightGate = rightGate;
  }

  private openGates(): void {
    if (this.leftGate) {
      this.scene.tweens.add({ targets: this.leftGate, y: this.leftGate.y - 250, duration: 500, ease: 'Power2' });
    }
    if (this.rightGate) {
      this.scene.tweens.add({ targets: this.rightGate, y: this.rightGate.y - 250, duration: 500, ease: 'Power2' });
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
  getContactDamage(): number { return CFG.contactDamage; }
  getHeadBounds(): Phaser.Geom.Rectangle | null {
    if (this.isStaggered) {
      // Iron mask is the weak point when staggered
      return new Phaser.Geom.Rectangle(this.x - 20, this.y - 60, 40, 40);
    }
    return null;
  }

  // HP Bar
  private createBossHPBar(): void {
    const cam = this.scene.cameras.main;
    const barX = cam.width / 2;
    const barY = 50;

    this.hpBarNameText = this.scene.add.text(barX, barY - 18, CFG.name.toUpperCase(), {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: CFG.nameColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.hpBarNameText.setOrigin(0.5);
    this.hpBarNameText.setScrollFactor(0);
    this.hpBarNameText.setDepth(999);

    this.hpBarBg = this.scene.add.rectangle(barX, barY, this.HP_BAR_WIDTH + 4, this.HP_BAR_HEIGHT + 4, 0x000000, 0.8);
    this.hpBarBg.setScrollFactor(0);
    this.hpBarBg.setDepth(999);

    this.hpBarFill = this.scene.add.rectangle(
      barX - this.HP_BAR_WIDTH / 2, barY,
      this.HP_BAR_WIDTH, this.HP_BAR_HEIGHT,
      0x8844cc, 0.9
    );
    this.hpBarFill.setOrigin(0, 0.5);
    this.hpBarFill.setScrollFactor(0);
    this.hpBarFill.setDepth(1000);

    this.hpBarBorder = this.scene.add.rectangle(barX, barY, this.HP_BAR_WIDTH + 4, this.HP_BAR_HEIGHT + 4);
    this.hpBarBorder.setStrokeStyle(2, 0x8844cc, 0.6);
    this.hpBarBorder.setFillStyle(0x000000, 0);
    this.hpBarBorder.setScrollFactor(0);
    this.hpBarBorder.setDepth(1000);
  }

  private updateHPBar(): void {
    if (!this.hpBarFill) return;
    const ratio = Math.max(0, this.bossHp / this.bossMaxHp);
    this.hpBarFill.width = this.HP_BAR_WIDTH * ratio;

    if (ratio < 0.25) {
      this.hpBarFill.setFillStyle(0xff4444, 0.9);
    } else if (ratio < 0.5) {
      this.hpBarFill.setFillStyle(0xff6600, 0.9);
    } else {
      this.hpBarFill.setFillStyle(0x8844cc, 0.9);
    }
  }

  private destroyHPBar(): void {
    this.hpBarBg?.destroy();
    this.hpBarFill?.destroy();
    this.hpBarBorder?.destroy();
    this.hpBarNameText?.destroy();
  }
}
