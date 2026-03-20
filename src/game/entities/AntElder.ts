import Phaser from 'phaser';
import bossData from '../data/boss.json';
import type { Player } from './Player';
import type { GameScene } from '../scenes/GameScene';

type Phase = 1 | 2;

type BossState =
  | 'idle'
  | 'hiding'
  | 'sporeMines'
  | 'cloakSlam'
  | 'hiddenBlade'
  | 'shedding'
  // Phase 2
  | 'furySwipes'
  | 'leapingStrike'
  | 'dash'
  | 'dead';

const CFG = (bossData as any).antElder;

export class AntElder extends Phaser.Physics.Arcade.Sprite {
  private gameScene: GameScene;
  private bossHp: number;
  private bossMaxHp: number;
  private bossState: BossState = 'idle';
  private stateTimer = 0;
  private cooldown = 0;
  private facing: 1 | -1 = -1;
  private dead = false;
  private phase: Phase = 1;

  // Phase HP pools
  private phase1MaxHp: number;
  private phase2MaxHp: number;
  private phase1Hp: number;
  private phase2Hp: number;

  // Combat tracking
  private fightStartTime = 0;
  private playerMeleeTimer = 0; // tracks how long player stays in melee range

  // Attack state
  private hideTimer = 0;
  private sporeMines: Phaser.GameObjects.GameObject[] = [];
  private slamPhase: 'windup' | 'slam' | 'landed' = 'windup';
  private furySwipeCount = 0;
  private furySwipeTimer = 0;
  private leapPhase: 'rising' | 'diving' = 'rising';
  private leapTargetX = 0;
  private leapTargetY = 0;

  // Arena bounds
  private arenaLeft = 0;
  private arenaRight = 0;
  private arenaTop = 0;
  private arenaBottom = 0;

  // Gates
  private leftGate: Phaser.GameObjects.Rectangle | null = null;
  private rightGate: Phaser.GameObjects.Rectangle | null = null;

  // Boss HP bar (rendered in-game)
  private hpBarBg: Phaser.GameObjects.Rectangle | null = null;
  private hpBarFill: Phaser.GameObjects.Rectangle | null = null;
  private hpBarBorder: Phaser.GameObjects.Rectangle | null = null;
  private bossNameText: Phaser.GameObjects.Text | null = null;
  private phaseMarker: Phaser.GameObjects.Rectangle | null = null;

  // Title card
  private titleShown = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'antElder_phase1_idle');
    this.gameScene = scene;

    this.phase1MaxHp = CFG.phase1.maxHp;
    this.phase2MaxHp = CFG.phase2.maxHp;
    this.phase1Hp = this.phase1MaxHp;
    this.phase2Hp = this.phase2MaxHp;
    this.bossMaxHp = this.phase1MaxHp; // current phase max
    this.bossHp = this.phase1Hp;
    this.fightStartTime = scene.time.now;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(CFG.phase1.width, CFG.phase1.height);
    this.setCollideWorldBounds(true);
    this.setScale(CFG.phase1.scale);

    this.arenaLeft = 30;
    this.arenaRight = 1370;
    this.arenaTop = 30;
    this.arenaBottom = 650;

    this.cooldown = 1500;

    // Create HP bar
    this.createHpBar();

    // Show title card
    this.showTitleCard();
  }

  private showTitleCard(): void {
    if (this.titleShown) return;
    this.titleShown = true;

    const cam = this.scene.cameras.main;
    // Title in top-left corner
    const titleX = 20;
    const titleY = 60;

    // "Ant Elder" in big red+dark green letters
    const titleBg = this.scene.add.rectangle(titleX + 120, titleY + 20, 280, 70, 0x000000, 0.7);
    titleBg.setScrollFactor(0);
    titleBg.setDepth(1000);
    titleBg.setOrigin(0.5);
    titleBg.setAlpha(0);

    const titleText = this.scene.add.text(titleX + 10, titleY, 'ANT ELDER', {
      fontFamily: 'Georgia, serif',
      fontSize: '42px',
      color: '#cc2222',
      fontStyle: 'bold',
      stroke: '#1a3a1a',
      strokeThickness: 6,
    });
    titleText.setScrollFactor(0);
    titleText.setDepth(1001);
    titleText.setAlpha(0);

    const subtitleText = this.scene.add.text(titleX + 10, titleY + 44, '~ Elder of the Colony ~', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#44aa44',
      fontStyle: 'italic',
    });
    subtitleText.setScrollFactor(0);
    subtitleText.setDepth(1001);
    subtitleText.setAlpha(0);

    // Fade in
    this.scene.tweens.add({
      targets: [titleBg, titleText, subtitleText],
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    });

    // Hold for 5 seconds, then fade out
    this.scene.time.delayedCall(5000, () => {
      this.scene.tweens.add({
        targets: [titleBg, titleText, subtitleText],
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          titleBg.destroy();
          titleText.destroy();
          subtitleText.destroy();
        }
      });
    });
  }

  private createHpBar(): void {
    const cam = this.scene.cameras.main;
    const barWidth = 300;
    const barHeight = 12;
    const barX = 20;
    const barY = 40;

    this.hpBarBg = this.scene.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight, 0x1a1a1a, 0.9);
    this.hpBarBg.setScrollFactor(0);
    this.hpBarBg.setDepth(999);

    this.hpBarFill = this.scene.add.rectangle(barX + barWidth / 2, barY, barWidth, barHeight - 2, 0xcc2222);
    this.hpBarFill.setScrollFactor(0);
    this.hpBarFill.setDepth(1000);

    this.hpBarBorder = this.scene.add.rectangle(barX + barWidth / 2, barY, barWidth + 4, barHeight + 4, 0x000000, 0);
    this.hpBarBorder.setStrokeStyle(2, 0x666666);
    this.hpBarBorder.setScrollFactor(0);
    this.hpBarBorder.setDepth(998);

    // Phase marker at 40% (where phase transition happens)
    const markerX = barX + barWidth * 0.4;
    this.phaseMarker = this.scene.add.rectangle(markerX, barY, 2, barHeight + 6, 0xffcc00);
    this.phaseMarker.setScrollFactor(0);
    this.phaseMarker.setDepth(1001);
  }

  private updateHpBar(): void {
    if (!this.hpBarFill || !this.hpBarBg) return;

    const barWidth = 300;
    const barX = 20;
    let ratio: number;

    if (this.phase === 1) {
      ratio = this.phase1Hp / this.phase1MaxHp;
    } else {
      ratio = this.phase2Hp / this.phase2MaxHp;
    }

    const fillWidth = Math.max(0, barWidth * ratio);
    this.hpBarFill.setSize(fillWidth, 10);
    this.hpBarFill.setPosition(barX + fillWidth / 2, this.hpBarFill.y);

    // Change color based on phase
    if (this.phase === 2) {
      (this.hpBarFill as any).setFillStyle(0xff4444);
      if (this.phaseMarker) this.phaseMarker.setVisible(false);
    }
  }

  update(time: number, delta: number, player: Player): void {
    if (this.dead) return;

    this.stateTimer += delta;
    this.cooldown -= delta;

    // Track player melee proximity
    const distToPlayer = Math.abs(player.x - this.x);
    if (distToPlayer < 80) {
      this.playerMeleeTimer += delta;
    } else {
      this.playerMeleeTimer = 0;
    }

    // Face player in idle
    if (this.bossState === 'idle' || this.bossState === 'dash') {
      this.facing = player.x > this.x ? 1 : -1;
      this.setFlipX(this.facing < 0);
    }

    this.updateHpBar();

    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.phase === 1) {
      this.updatePhase1(time, delta, player, body);
    } else {
      this.updatePhase2(time, delta, player, body);
    }

    // Update spore mines
    this.updateSporeMines(player);
  }

  // ======== PHASE 1: The Tank & Trapper ========
  private updatePhase1(time: number, delta: number, player: Player, body: Phaser.Physics.Arcade.Body): void {
    switch (this.bossState) {
      case 'idle':
        this.setTexture('antElder_phase1_idle');
        // Slow shuffle toward player
        const dir = player.x > this.x ? 1 : -1;
        body.setVelocityX(dir * CFG.phase1.moveSpeed);
        this.facing = dir as 1 | -1;
        this.setFlipX(dir < 0);

        // Hidden blade check: player too close for too long
        if (this.playerMeleeTimer > CFG.phase1.attacks.hiddenBlade.proximityTriggerMs && this.cooldown <= 0) {
          this.startHiddenBlade(player);
          break;
        }

        if (this.cooldown <= 0) {
          this.choosePhase1Attack(player);
        }
        break;

      case 'hiding':
        this.setTexture('antElder_phase1_hide');
        body.setVelocityX(0);
        this.hideTimer += delta;
        // Invulnerable while hiding
        if (this.hideTimer > CFG.phase1.attacks.hide.duration) {
          this.bossState = 'idle';
          this.cooldown = 1000;
          this.setAlpha(1);
        }
        break;

      case 'sporeMines':
        this.updateSporeMineAttack(delta, body);
        break;

      case 'cloakSlam':
        this.updateCloakSlam(delta, body, player);
        break;

      case 'hiddenBlade':
        this.updateHiddenBlade(delta, body, player);
        break;
    }
  }

  private choosePhase1Attack(player: Player): void {
    const rand = Math.random();

    if (rand < 0.15) {
      // Hide
      this.bossState = 'hiding';
      this.stateTimer = 0;
      this.hideTimer = 0;
      this.setAlpha(0.3);
      this.scene.cameras.main.shake(100, 0.01);
    } else if (rand < 0.55) {
      // Spore mines
      this.startSporeMines();
    } else {
      // Cloak slam
      this.startCloakSlam();
    }
  }

  private startSporeMines(): void {
    this.bossState = 'sporeMines';
    this.stateTimer = 0;
    this.setTexture('antElder_phase1_idle');

    // Shake animation
    this.scene.tweens.add({
      targets: this,
      x: this.x + 3,
      duration: 50,
      yoyo: true,
      repeat: 5
    });

    // Spawn 3-4 spore mines after shake
    this.scene.time.delayedCall(400, () => {
      const count = Phaser.Math.Between(3, 4);
      for (let i = 0; i < count; i++) {
        const offsetX = Phaser.Math.Between(-100, 100);
        const sporeX = Phaser.Math.Clamp(this.x + offsetX, this.arenaLeft + 50, this.arenaRight - 50);
        const spore = this.scene.add.circle(sporeX, this.y - 20, 8, 0x88ff44, 0.8);
        this.scene.physics.add.existing(spore);
        const sporeBody = spore.body as Phaser.Physics.Arcade.Body;
        sporeBody.setVelocityY(100);
        sporeBody.setVelocityX(Phaser.Math.Between(-30, 30));
        sporeBody.setAllowGravity(false);
        (spore as any).isSpore = true;
        (spore as any).landed = false;

        // Glow animation
        this.scene.tweens.add({
          targets: spore,
          alpha: 0.4,
          duration: 500,
          yoyo: true,
          repeat: -1
        });

        this.sporeMines.push(spore);
      }
    });
  }

  private updateSporeMineAttack(delta: number, body: Phaser.Physics.Arcade.Body): void {
    body.setVelocityX(0);
    if (this.stateTimer > 800) {
      this.bossState = 'idle';
      this.cooldown = CFG.phase1.attacks.sporeMines.cooldown;
    }
  }

  private updateSporeMines(player: Player): void {
    const playerBounds = player.getBounds();

    this.sporeMines = this.sporeMines.filter(spore => {
      const s = spore as Phaser.GameObjects.Arc;
      if (!s.active) return false;

      const sporeBody = s.body as Phaser.Physics.Arcade.Body;

      // Land on ground
      if (!(s as any).landed && s.y > this.arenaBottom - 60) {
        sporeBody.setVelocity(0, 0);
        (s as any).landed = true;
      }

      // Check player collision
      const sporeBounds = s.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(sporeBounds, playerBounds)) {
        // Explode - slow cloud visual
        this.createSlowCloud(s.x, s.y);
        player.takeDamage(CFG.phase1.attacks.sporeMines.damage, s.x);
        s.destroy();
        return false;
      }

      // Expire after 8 seconds
      if ((s as any).landed) {
        (s as any).landTime = ((s as any).landTime || 0) + 16;
        if ((s as any).landTime > 8000) {
          s.destroy();
          return false;
        }
      }

      return true;
    });
  }

  private createSlowCloud(x: number, y: number): void {
    // Green cloud visual
    for (let i = 0; i < 6; i++) {
      const cloud = this.scene.add.circle(
        x + Phaser.Math.Between(-20, 20),
        y + Phaser.Math.Between(-20, 10),
        Phaser.Math.Between(10, 20),
        0x66cc44,
        0.4
      );
      this.scene.tweens.add({
        targets: cloud,
        alpha: 0,
        scale: 2,
        duration: 800,
        onComplete: () => cloud.destroy()
      });
    }
  }

  private startCloakSlam(): void {
    this.bossState = 'cloakSlam';
    this.stateTimer = 0;
    this.slamPhase = 'windup';
    this.setTexture('antElder_phase1_idle');
  }

  private updateCloakSlam(delta: number, body: Phaser.Physics.Arcade.Body, player: Player): void {
    const cfg = CFG.phase1.attacks.cloakSlam;

    switch (this.slamPhase) {
      case 'windup':
        body.setVelocityX(0);
        // Rise slightly
        if (this.stateTimer < cfg.windupMs) {
          this.y -= 0.5;
        } else {
          this.slamPhase = 'slam';
          this.stateTimer = 0;
          body.setVelocityY(cfg.slamSpeed);
        }
        break;

      case 'slam':
        if (body.blocked.down) {
          this.slamPhase = 'landed';
          this.stateTimer = 0;
          body.setVelocityY(0);

          // Shockwave on both sides
          this.scene.cameras.main.shake(200, 0.03);
          this.createShockwave(this.x, this.y, cfg.shockwaveWidth, cfg.shockwaveDamage, player);
        }
        break;

      case 'landed':
        if (this.stateTimer > 400) {
          this.bossState = 'idle';
          this.cooldown = cfg.cooldown;
        }
        break;
    }
  }

  private createShockwave(x: number, y: number, width: number, damage: number, player: Player): void {
    // Left shockwave
    const leftWave = this.scene.add.rectangle(x - width / 2, y + 20, width, 15, 0xcc8844, 0.7);
    // Right shockwave
    const rightWave = this.scene.add.rectangle(x + width / 2, y + 20, width, 15, 0xcc8844, 0.7);

    [leftWave, rightWave].forEach(wave => {
      this.scene.tweens.add({
        targets: wave,
        alpha: 0,
        scaleX: 1.5,
        duration: 400,
        onComplete: () => wave.destroy()
      });
    });

    // Check player hit
    const playerBounds = player.getBounds();
    const leftBounds = leftWave.getBounds();
    const rightBounds = rightWave.getBounds();
    if (Phaser.Geom.Rectangle.Overlaps(leftBounds, playerBounds) ||
        Phaser.Geom.Rectangle.Overlaps(rightBounds, playerBounds)) {
      player.takeDamage(damage, x);
    }
  }

  private startHiddenBlade(player: Player): void {
    this.bossState = 'hiddenBlade';
    this.stateTimer = 0;
    this.playerMeleeTimer = 0;
  }

  private updateHiddenBlade(delta: number, body: Phaser.Physics.Arcade.Body, player: Player): void {
    const cfg = CFG.phase1.attacks.hiddenBlade;
    body.setVelocityX(0);

    if (this.stateTimer < cfg.windupMs) {
      // Wind up - slight telegraph
      this.setTint(0xffcccc);
    } else if (this.stateTimer < cfg.windupMs + 100) {
      this.clearTint();
      // Thrust blade
      const bladeX = this.x + this.facing * cfg.range;
      const blade = this.scene.add.rectangle(bladeX, this.y, cfg.range, 8, 0xdddddd, 0.9);

      this.scene.tweens.add({
        targets: blade,
        alpha: 0,
        duration: 200,
        onComplete: () => blade.destroy()
      });

      // Check hit
      const bladeBounds = blade.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(bladeBounds, player.getBounds())) {
        player.takeDamage(cfg.damage, this.x);
      }
    } else if (this.stateTimer > cfg.windupMs + 300) {
      this.bossState = 'idle';
      this.cooldown = cfg.cooldown;
    }
  }

  // ======== PHASE TRANSITION: The Shedding ========
  private startShedding(): void {
    this.bossState = 'shedding';
    this.stateTimer = 0;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    body.setVelocityY(0);

    // Screech + camera shake
    this.scene.cameras.main.shake(800, 0.04);
    this.scene.cameras.main.flash(300, 100, 20, 20);

    // Burst cloak into particles
    for (let i = 0; i < 30; i++) {
      const particle = this.scene.add.ellipse(
        this.x + Phaser.Math.Between(-40, 40),
        this.y + Phaser.Math.Between(-30, 30),
        Phaser.Math.Between(8, 20),
        Phaser.Math.Between(6, 14),
        0x4a5a3a,
        0.8
      );

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Phaser.Math.Between(-200, 200),
        y: particle.y + Phaser.Math.Between(-150, 100),
        alpha: 0,
        scale: 0,
        rotation: Phaser.Math.Between(-5, 5),
        duration: Phaser.Math.Between(800, 1500),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    // After 1.5s, switch to phase 2
    this.scene.time.delayedCall(1500, () => {
      this.phase = 2;
      this.bossHp = this.phase2Hp;
      this.bossMaxHp = this.phase2MaxHp;

      // Resize to phase 2 (smaller, agile)
      this.setSize(CFG.phase2.width, CFG.phase2.height);
      this.setScale(CFG.phase2.scale);
      this.setTexture('antElder_phase2_idle');
      this.setAlpha(1);

      // Update HP bar color
      this.updateHpBar();

      this.bossState = 'idle';
      this.cooldown = 1000;
    });
  }

  // ======== PHASE 2: The Unmasked Predator ========
  private updatePhase2(time: number, delta: number, player: Player, body: Phaser.Physics.Arcade.Body): void {
    switch (this.bossState) {
      case 'idle':
        this.setTexture('antElder_phase2_idle');
        if (this.cooldown <= 0) {
          this.choosePhase2Attack(player);
        } else {
          // Fast strafing movement
          const dir = player.x > this.x ? 1 : -1;
          body.setVelocityX(dir * CFG.phase2.moveSpeed);
        }
        break;

      case 'dash':
        this.setTexture('antElder_phase2_idle');
        if (this.stateTimer > 300) {
          this.bossState = 'idle';
          this.cooldown = 500;
        }
        break;

      case 'furySwipes':
        this.updateFurySwipes(delta, body, player);
        break;

      case 'leapingStrike':
        this.updateLeapingStrike(delta, body, player);
        break;

      case 'shedding':
        body.setVelocityX(0);
        break;
    }
  }

  private choosePhase2Attack(player: Player): void {
    const rand = Math.random();
    const dist = Math.abs(player.x - this.x);

    if (dist < 150 || rand < 0.5) {
      this.startFurySwipes(player);
    } else {
      this.startLeapingStrike(player);
    }
  }

  private startFurySwipes(player: Player): void {
    this.bossState = 'furySwipes';
    this.stateTimer = 0;
    this.furySwipeCount = 0;
    this.furySwipeTimer = 0;
    this.facing = player.x > this.x ? 1 : -1;
    this.setFlipX(this.facing < 0);
  }

  private updateFurySwipes(delta: number, body: Phaser.Physics.Arcade.Body, player: Player): void {
    const cfg = CFG.phase2.attacks.furySwipes;
    this.furySwipeTimer += delta;

    if (this.furySwipeTimer >= cfg.swipeDelay && this.furySwipeCount < cfg.swipeCount) {
      // Perform swipe
      this.furySwipeCount++;
      this.furySwipeTimer = 0;

      // Move forward with each swipe
      body.setVelocityX(this.facing * cfg.forwardMove);

      // Swipe hitbox
      const clawX = this.x + this.facing * 50;
      const clawHitbox = new Phaser.Geom.Rectangle(clawX - 25, this.y - 25, 50, 50);

      if (Phaser.Geom.Rectangle.Overlaps(clawHitbox, player.getBounds())) {
        player.takeDamage(cfg.damage, this.x);
      }

      // Visual claw slash
      const slash = this.scene.add.rectangle(clawX, this.y, 40, 6, 0xeeeeee, 0.8);
      slash.setAngle(this.facing > 0 ? -30 : 30);
      this.scene.tweens.add({
        targets: slash,
        alpha: 0,
        scaleX: 2,
        duration: 150,
        onComplete: () => slash.destroy()
      });

      this.scene.cameras.main.shake(60, 0.01);
    }

    if (this.furySwipeCount >= cfg.swipeCount && this.furySwipeTimer > cfg.swipeDelay) {
      body.setVelocityX(0);
      this.bossState = 'idle';
      this.cooldown = cfg.cooldown;
    }
  }

  private startLeapingStrike(player: Player): void {
    this.bossState = 'leapingStrike';
    this.stateTimer = 0;
    this.leapPhase = 'rising';
    this.leapTargetX = player.x;
    this.leapTargetY = player.y;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-500);
    body.setVelocityX(0);
    body.setAllowGravity(false);
  }

  private updateLeapingStrike(delta: number, body: Phaser.Physics.Arcade.Body, player: Player): void {
    const cfg = CFG.phase2.attacks.leapingStrike;

    switch (this.leapPhase) {
      case 'rising':
        if (this.stateTimer > 400 || this.y < this.arenaTop + 50) {
          this.leapPhase = 'diving';
          this.stateTimer = 0;
          // Update target to current player position
          this.leapTargetX = player.x;
          this.leapTargetY = player.y;
          // Dive at 45 degrees toward player
          const dx = this.leapTargetX - this.x;
          const angle = Math.atan2(this.arenaBottom - this.y, dx);
          body.setVelocity(
            Math.cos(angle) * cfg.diveSpeed,
            Math.sin(angle) * cfg.diveSpeed
          );
          this.facing = dx > 0 ? 1 : -1;
          this.setFlipX(this.facing < 0);
        }
        break;

      case 'diving':
        if (body.blocked.down || this.y > this.arenaBottom - 60) {
          body.setAllowGravity(true);
          body.setVelocity(0, 0);
          this.scene.cameras.main.shake(150, 0.02);

          // Check hit on landing
          const landHitbox = new Phaser.Geom.Rectangle(this.x - 40, this.y - 30, 80, 60);
          if (Phaser.Geom.Rectangle.Overlaps(landHitbox, player.getBounds())) {
            player.takeDamage(cfg.damage, this.x);
          }

          this.bossState = 'idle';
          this.cooldown = cfg.cooldown;
        }
        break;
    }
  }

  // ======== DAMAGE ========
  takeDamage(amount: number, fromX: number): void {
    if (this.dead) return;

    // Invulnerable while hiding
    if (this.bossState === 'hiding') return;

    // Phase 2 takes 1.5x damage
    const finalDamage = this.phase === 2 ? Math.ceil(amount * CFG.phase2.damageMultiplier) : amount;

    if (this.phase === 1) {
      this.phase1Hp -= finalDamage;
      if (this.phase1Hp < 0) this.phase1Hp = 0;
      this.bossHp = this.phase1Hp;

      // Phase transition when phase 1 HP is depleted
      if (this.phase1Hp <= 0) {
        this.startShedding();
        return;
      }
    } else {
      this.phase2Hp -= finalDamage;
      this.bossHp = this.phase2Hp;

      if (this.phase2Hp <= 0) {
        this.die();
        return;
      }
    }

    this.flashWhite();

    // Knockback
    const kb = this.phase === 1 ? 50 : 100;
    const dir = fromX < this.x ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(dir * kb);
  }

  private flashWhite(): void {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (!this.dead) this.clearTint();
    });
  }

  private die(): void {
    this.dead = true;
    this.bossState = 'dead';

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    // Clean up spore mines
    this.sporeMines.forEach(s => (s as any).destroy?.());
    this.sporeMines = [];

    // Death explosion
    this.scene.cameras.main.shake(600, 0.03);
    this.scene.cameras.main.flash(400, 200, 50, 50);

    for (let i = 0; i < 20; i++) {
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-30, 30),
        this.y + Phaser.Math.Between(-30, 30),
        Phaser.Math.Between(5, 15),
        Phaser.Math.RND.pick([0xcc2222, 0xff4444, 0xdddddd]),
        0.8
      );
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Phaser.Math.Between(-150, 150),
        y: particle.y + Phaser.Math.Between(-150, 100),
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(600, 1200),
        onComplete: () => particle.destroy()
      });
    }

    // Fade out boss
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 1000,
      delay: 500,
      onComplete: () => {
        this.setVisible(false);
        this.setActive(false);
      }
    });

    // Destroy HP bar
    this.scene.time.delayedCall(1500, () => {
      this.hpBarBg?.destroy();
      this.hpBarFill?.destroy();
      this.hpBarBorder?.destroy();
      this.phaseMarker?.destroy();
      this.bossNameText?.destroy();

      this.openGates();
      this.gameScene.handleBossDefeated();
    });
  }

  // Gate management
  lockGates(leftGate: Phaser.GameObjects.Rectangle, rightGate: Phaser.GameObjects.Rectangle): void {
    this.leftGate = leftGate;
    this.rightGate = rightGate;
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

  // Public getters
  getHp(): number { return this.phase === 1 ? this.phase1Hp : this.phase2Hp; }
  getMaxHp(): number { return this.phase === 1 ? this.phase1MaxHp : this.phase2MaxHp; }
  getName(): string { return CFG.name; }
  getSubtitle(): string { return CFG.subtitle; }
  getNameColor(): string { return CFG.nameColor; }
  isDying(): boolean { return this.dead; }
  isInStagger(): boolean { return false; }
  isInvulnerable(): boolean {
    return this.dead || this.bossState === 'hiding' || this.bossState === 'shedding';
  }
  getContactDamage(): number { return this.phase === 1 ? CFG.phase1.contactDamage : CFG.phase2.contactDamage; }

  getHitRect(): Phaser.Geom.Rectangle {
    const cfg = this.phase === 1 ? CFG.phase1 : CFG.phase2;
    return new Phaser.Geom.Rectangle(
      this.x - (cfg.width * cfg.scale) / 2,
      this.y - (cfg.height * cfg.scale) / 2,
      cfg.width * cfg.scale,
      cfg.height * cfg.scale
    );
  }

  getHeadBounds(): Phaser.Geom.Rectangle | null {
    return null; // No stagger/head mechanic for this boss
  }
}
