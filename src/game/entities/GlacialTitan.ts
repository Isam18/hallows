import Phaser from 'phaser';
import bossData from '../data/boss.json';
import type { Player } from './Player';
import type { GameScene } from '../scenes/GameScene';
import gameState from '../core/GameState';

type TitanState =
  | 'idle'
  | 'frostQuake'
  | 'crystallineSpikes'
  | 'glacialBeam'
  | 'staggered'
  | 'recovering'
  | 'dead';

const CFG = (bossData as any).glacialTitan;

export class GlacialTitan extends Phaser.Physics.Arcade.Sprite {
  private gameScene: GameScene;
  private bossHp: number;
  private bossMaxHp: number;
  private bossState: TitanState = 'idle';
  private stateTimer = 0;
  private cooldown = 2000;
  private facing: 1 | -1 = -1;
  private dead = false;

  // Stagger system
  private staggerDamage = 0;
  private isStaggered = false;

  // Heart core (vulnerability)
  private heartGlow: Phaser.GameObjects.Ellipse | null = null;
  private heartExposed = false;
  private heartPulseTimer = 0;

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

  // Frost Quake
  private quakePhase: 'windup' | 'slam' | 'landed' = 'windup';
  private shockwaves: { g: Phaser.GameObjects.Graphics; x: number; y: number; vx: number; life: number }[] = [];

  // Crystalline Spikes
  private spikeWarnings: { g: Phaser.GameObjects.Graphics; x: number; timer: number }[] = [];
  private spikesSpawned = false;
  private spikeCount = 0;

  // Glacial Beam
  private beamPhase: 'charging' | 'firing' | 'done' = 'charging';
  private beamGraphics: Phaser.GameObjects.Graphics | null = null;
  private beamY = 0;

  // Arena bounds
  private arenaLeft = 0;
  private arenaRight = 0;

  // Combat tracking
  private totalDamageDealt = 0;
  private attackIndex = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'glacialTitan');
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

    this.arenaLeft = x - 600;
    this.arenaRight = x + 600;

    // Create heart core glow
    this.heartGlow = scene.add.ellipse(x, y - 40, 40, 40, 0x44aaff, 0.6);
    this.heartGlow.setDepth(this.depth + 1);

    // Create boss HP bar (screen-fixed at top center)
    this.createBossHPBar();
  }

  update(time: number, delta: number, player: Player): void {
    if (this.dead) return;

    this.stateTimer += delta;
    this.cooldown -= delta;
    this.heartPulseTimer += delta;

    // Update heart position
    if (this.heartGlow) {
      this.heartGlow.setPosition(this.x, this.y - 20);
      const pulse = 0.6 + Math.sin(this.heartPulseTimer * 0.004) * 0.3;
      this.heartGlow.setAlpha(pulse);
      // Scale pulse
      const sc = 1 + Math.sin(this.heartPulseTimer * 0.003) * 0.15;
      this.heartGlow.setScale(sc);
    }

    // Update shockwaves
    this.updateShockwaves(player, delta);
    // Update spike warnings
    this.updateSpikeWarnings(player, delta);

    if (this.bossState === 'idle') {
      this.facing = player.x > this.x ? 1 : -1;
      this.setFlipX(this.facing < 0);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.bossState) {
      case 'idle':
        body.setVelocityX(0);
        if (this.cooldown <= 0) {
          this.chooseAttack(player);
        }
        break;

      case 'frostQuake':
        this.updateFrostQuake(body, player, delta);
        break;

      case 'crystallineSpikes':
        this.updateCrystallineSpikes(player, delta);
        break;

      case 'glacialBeam':
        this.updateGlacialBeam(player, delta);
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
  }

  private chooseAttack(player: Player): void {
    // Cycle through attacks with some variation
    const attacks: TitanState[] = ['frostQuake', 'crystallineSpikes', 'glacialBeam'];
    const idx = this.attackIndex % attacks.length;
    this.attackIndex++;

    // Mix it up occasionally
    const chosen = Math.random() < 0.3
      ? attacks[Phaser.Math.Between(0, attacks.length - 1)]
      : attacks[idx];

    switch (chosen) {
      case 'frostQuake':
        this.startFrostQuake(player);
        break;
      case 'crystallineSpikes':
        this.startCrystallineSpikes(player);
        break;
      case 'glacialBeam':
        this.startGlacialBeam(player);
        break;
    }
  }

  // ========================
  // FROST-QUAKE
  // ========================
  private startFrostQuake(player: Player): void {
    this.bossState = 'frostQuake';
    this.stateTimer = 0;
    this.quakePhase = 'windup';
    this.cooldown = CFG.attackPatterns.frostQuake.cooldown;
    this.facing = player.x > this.x ? 1 : -1;
    this.setFlipX(this.facing < 0);
  }

  private updateFrostQuake(body: Phaser.Physics.Arcade.Body, player: Player, delta: number): void {
    const cfg = CFG.attackPatterns.frostQuake;

    switch (this.quakePhase) {
      case 'windup':
        // Shake/telegraph
        this.x += Math.sin(this.stateTimer * 0.05) * 1.5;
        this.setTint(0x88ccff);
        if (this.stateTimer > cfg.windupTime) {
          this.quakePhase = 'slam';
          this.stateTimer = 0;
        }
        break;

      case 'slam':
        body.setVelocityY(cfg.slamSpeed);
        if (body.blocked.down || this.y > this.gameScene.currentLevel.height - 100) {
          this.quakePhase = 'landed';
          this.stateTimer = 0;
          this.fireQuakeShockwaves();
          this.gameScene.cameras.main.shake(400, 0.04);
        }
        break;

      case 'landed':
        body.setVelocityY(0);
        this.clearTint();
        if (this.stateTimer > 600) {
          this.bossState = 'idle';
          this.cooldown = cfg.cooldown;
        }
        break;
    }
  }

  private fireQuakeShockwaves(): void {
    const floorY = this.y + (this.displayHeight / 2);

    for (const dir of [-1, 1]) {
      const wave = this.scene.add.graphics();
      wave.fillStyle(0x44aaff, 0.7);
      for (let s = 0; s < 5; s++) {
        const sx = s * 12 * dir;
        wave.fillTriangle(sx, 0, sx - 8, -18 - s * 3, sx + 8, -18 - s * 3);
      }
      wave.setPosition(this.x, floorY);

      this.shockwaves.push({
        g: wave,
        x: this.x,
        y: floorY,
        vx: dir * 250,
        life: 3000,
      });
    }

    // Slam visual
    const slam = this.scene.add.graphics();
    slam.fillStyle(0x44aaff, 0.5);
    slam.fillRect(this.x - 40, floorY - 5, 80, 10);
    this.scene.tweens.add({
      targets: slam, alpha: 0, scaleY: 3, duration: 400,
      onComplete: () => slam.destroy()
    });
  }

  private updateShockwaves(player: Player, delta: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= delta;
      sw.x += sw.vx * (delta / 1000);
      sw.g.setPosition(sw.x, sw.y);

      const dist = Math.abs(sw.x - player.x);
      const yDist = Math.abs(sw.y - player.y);
      if (dist < 30 && yDist < 40) {
        this.hitPlayer(player, CFG.attackPatterns.frostQuake.shockwaveDamage, sw.x);
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
  // CRYSTALLINE SPIKES
  // ========================
  private startCrystallineSpikes(player: Player): void {
    this.bossState = 'crystallineSpikes';
    this.stateTimer = 0;
    this.spikesSpawned = false;
    this.spikeCount = 0;
    this.cooldown = CFG.attackPatterns.crystallineSpikes.cooldown;

    // Create warning markers on ground
    const cfg = CFG.attackPatterns.crystallineSpikes;
    const count = cfg.spikeCount;
    const arenaW = this.arenaRight - this.arenaLeft;

    for (let i = 0; i < count; i++) {
      const sx = this.arenaLeft + 60 + Math.random() * (arenaW - 120);
      const warn = this.scene.add.graphics();
      warn.fillStyle(0xff4444, 0.4);
      warn.fillRect(sx - 10, this.gameScene.currentLevel.height - 60, 20, 8);

      this.spikeWarnings.push({ g: warn, x: sx, timer: cfg.warningTime });
    }
  }

  private updateCrystallineSpikes(player: Player, delta: number): void {
    // Warnings handled in updateSpikeWarnings
    if (this.spikeWarnings.length === 0 && this.spikesSpawned) {
      if (this.stateTimer > 1000) {
        this.bossState = 'idle';
      }
    }
  }

  private updateSpikeWarnings(player: Player, delta: number): void {
    for (let i = this.spikeWarnings.length - 1; i >= 0; i--) {
      const sw = this.spikeWarnings[i];
      sw.timer -= delta;

      // Flash warning
      sw.g.setAlpha(Math.sin(Date.now() * 0.01) > 0 ? 0.6 : 0.2);

      if (sw.timer <= 0) {
        // Spike erupts
        sw.g.destroy();
        this.spikeWarnings.splice(i, 1);
        this.eruptSpike(sw.x, player);
        this.spikesSpawned = true;
        this.stateTimer = 0;
      }
    }
  }

  private eruptSpike(x: number, player: Player): void {
    const floorY = this.gameScene.currentLevel.height - 60;
    const spike = this.scene.add.graphics();
    spike.fillStyle(0x88ccff, 0.8);
    // Tall ice spike
    spike.fillTriangle(x, floorY, x - 15, floorY + 60, x + 15, floorY + 60);
    spike.fillTriangle(x, floorY - 40, x - 10, floorY, x + 10, floorY);

    // Check player hit
    const dist = Math.abs(x - player.x);
    const yDist = floorY - player.y;
    if (dist < 25 && yDist >= -20 && yDist <= 80) {
      this.hitPlayer(player, CFG.attackPatterns.crystallineSpikes.damage, x);
    }

    // Spike lingers then fades
    this.scene.tweens.add({
      targets: spike, alpha: 0, duration: 1500, delay: 800,
      onComplete: () => spike.destroy()
    });

    // Screen shake per spike
    this.gameScene.cameras.main.shake(100, 0.01);
  }

  // ========================
  // GLACIAL BEAM
  // ========================
  private startGlacialBeam(player: Player): void {
    this.bossState = 'glacialBeam';
    this.stateTimer = 0;
    this.beamPhase = 'charging';
    this.beamY = player.y; // Target player's current Y
    this.cooldown = CFG.attackPatterns.glacialBeam.cooldown;

    // Charging visual
    this.setTint(0x66ddff);
  }

  private updateGlacialBeam(player: Player, delta: number): void {
    const cfg = CFG.attackPatterns.glacialBeam;

    switch (this.beamPhase) {
      case 'charging': {
        // Telegraph: growing glow at core
        if (Math.random() < 0.15) {
          const g = this.scene.add.graphics();
          g.fillStyle(0x66ddff, 0.5);
          g.fillCircle(this.x, this.y - 20 + Phaser.Math.Between(-5, 5), Phaser.Math.Between(4, 8));
          this.scene.tweens.add({
            targets: g, alpha: 0, scaleX: 2, scaleY: 2, duration: 300,
            onComplete: () => g.destroy()
          });
        }

        // Warning line
        if (this.stateTimer > cfg.chargeTime * 0.5 && !this.beamGraphics) {
          this.beamGraphics = this.scene.add.graphics();
          this.beamGraphics.lineStyle(2, 0xff4444, 0.3);
          this.beamGraphics.lineBetween(this.arenaLeft, this.beamY, this.arenaRight, this.beamY);
        }

        if (this.stateTimer > cfg.chargeTime) {
          this.beamPhase = 'firing';
          this.stateTimer = 0;
          if (this.beamGraphics) { this.beamGraphics.destroy(); this.beamGraphics = null; }
        }
        break;
      }

      case 'firing': {
        // Fire the beam across the arena
        if (!this.beamGraphics) {
          this.beamGraphics = this.scene.add.graphics();
        }
        this.beamGraphics.clear();

        const beamHeight = cfg.beamWidth;
        this.beamGraphics.fillStyle(0x44ddff, 0.7);
        this.beamGraphics.fillRect(this.arenaLeft, this.beamY - beamHeight / 2, this.arenaRight - this.arenaLeft, beamHeight);

        // Inner bright core
        this.beamGraphics.fillStyle(0xccffff, 0.5);
        this.beamGraphics.fillRect(this.arenaLeft, this.beamY - beamHeight / 4, this.arenaRight - this.arenaLeft, beamHeight / 2);

        // Check player collision
        const playerInBeam = player.y > this.beamY - beamHeight / 2 - 15 && player.y < this.beamY + beamHeight / 2 + 15;
        if (playerInBeam && this.stateTimer % 300 < delta) {
          this.hitPlayer(player, cfg.damage, this.x);
        }

        this.gameScene.cameras.main.shake(cfg.duration / 10, 0.015);

        if (this.stateTimer > cfg.duration) {
          this.beamPhase = 'done';
          this.stateTimer = 0;
          this.beamGraphics.destroy();
          this.beamGraphics = null;
          this.clearTint();
        }
        break;
      }

      case 'done':
        if (this.stateTimer > 400) {
          this.bossState = 'idle';
        }
        break;
    }
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
      if (pb) pb.setVelocity(kbDir * 300, -220);
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

    // Emit HP update
    const gs = this.gameScene as any;
    gs.emitUIEvent?.('bossHpUpdate', {
      hp: this.bossHp,
      maxHp: this.bossMaxHp,
    });

    return true;
  }

  private enterStagger(): void {
    this.isStaggered = true;
    this.staggerDamage = 0;
    this.bossState = 'staggered';
    this.stateTimer = 0;
    this.heartExposed = true;

    // Clean up active attacks
    this.cleanupAttacks();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    // Heart pulses brighter when exposed
    if (this.heartGlow) {
      this.heartGlow.setFillStyle(0x88ddff, 1);
      this.heartGlow.setScale(1.5);
    }

    this.setTint(0x88aacc);
  }

  private recoverFromStagger(): void {
    this.isStaggered = false;
    this.heartExposed = false;
    this.bossState = 'recovering';
    this.stateTimer = 0;
    this.clearTint();

    if (this.heartGlow) {
      this.heartGlow.setFillStyle(0x44aaff, 0.6);
      this.heartGlow.setScale(1);
    }

    // Recovery roar
    this.gameScene.cameras.main.shake(300, 0.02);
    const ring = this.scene.add.ellipse(this.x, this.y, 60, 40, 0x44aaff, 0.5);
    this.scene.tweens.add({
      targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 600,
      onComplete: () => ring.destroy()
    });
  }

  private cleanupAttacks(): void {
    // Shockwaves
    this.shockwaves.forEach(sw => sw.g.destroy());
    this.shockwaves = [];
    // Spike warnings
    this.spikeWarnings.forEach(sw => sw.g.destroy());
    this.spikeWarnings = [];
    // Beam
    if (this.beamGraphics) { this.beamGraphics.destroy(); this.beamGraphics = null; }
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
    this.openGates();

    // Phase 1: Ice shatter roar
    this.scene.time.delayedCall(0, () => this.createDeathRoar());
    // Phase 2: Ice explosion
    this.scene.time.delayedCall(1000, () => this.createIceExplosion());
    // Phase 3: Collapse
    this.scene.time.delayedCall(3000, () => this.createCollapse());
    // Phase 4: Victory
    this.scene.time.delayedCall(5000, () => {
      this.gameScene.handleBossDefeated();
      (this.gameScene as any).showGlacialTitanVictory?.();
    });
  }

  private createDeathRoar(): void {
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        const ring = this.scene.add.ellipse(this.x, this.y - 40, 50 + i * 20, 30, 0x44aaff, 0.6);
        ring.setStrokeStyle(3, 0x2288cc);
        ring.setDepth(100);
        this.scene.tweens.add({
          targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 600,
          ease: 'Power2', onComplete: () => ring.destroy()
        });
      });
    }
    this.gameScene.cameras.main.shake(600, 0.04);
  }

  private createIceExplosion(): void {
    for (let i = 0; i < 50; i++) {
      const size = Phaser.Math.Between(8, 22);
      const color = Phaser.Math.RND.pick([0x44aaff, 0x66ccff, 0x88ddff, 0xaaeeff, 0xccffff]);
      const particle = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-80, 80),
        this.y + Phaser.Math.Between(-60, 40),
        size, size * 0.6, color
      );

      const angle = Math.random() * Math.PI * 2;
      const distance = Phaser.Math.Between(120, 300);
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance - 100,
        alpha: 0, rotation: Phaser.Math.Between(-4, 4),
        duration: Phaser.Math.Between(800, 1500),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    // Central flash
    const flash = this.scene.add.circle(this.x, this.y, 80, 0x88eeff, 0.9);
    this.scene.tweens.add({
      targets: flash, radius: 160, alpha: 0, duration: 500,
      ease: 'Power2', onComplete: () => flash.destroy()
    });
  }

  private createCollapse(): void {
    this.scene.tweens.add({
      targets: this,
      angle: this.facing * 90, y: this.y + 50,
      duration: 700, ease: 'Bounce.easeOut',
      onComplete: () => {
        this.gameScene.cameras.main.shake(500, 0.06);
        this.createCorpse();
      }
    });
  }

  private createCorpse(): void {
    const cx = this.x;
    const cy = this.y + 40;

    // Frozen rubble mound
    const mound = this.scene.add.ellipse(cx, cy, 200, 90, 0x1a2840);
    mound.setDepth(-1);

    // Ice crystal shards sticking out
    for (let i = 0; i < 10; i++) {
      const shard = this.scene.add.rectangle(
        cx + Phaser.Math.Between(-80, 80),
        cy + Phaser.Math.Between(-35, 25),
        Phaser.Math.Between(6, 14),
        Phaser.Math.Between(15, 35),
        0x44aaff, 0.5
      );
      shard.setAngle(Phaser.Math.Between(-30, 30));
      shard.setDepth(-0.9);
    }

    // Fading heart glow
    if (this.heartGlow) {
      this.scene.tweens.add({
        targets: this.heartGlow, alpha: 0, duration: 3000,
        onComplete: () => { this.heartGlow?.destroy(); this.heartGlow = null; }
      });
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
    if (this.isStaggered && this.heartExposed) return false;
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
    // Heart core acts as the "head" weak point when staggered
    if (this.heartExposed && this.heartGlow) {
      return new Phaser.Geom.Rectangle(
        this.x - 25, this.y - 55, 50, 50
      );
    }
    return null;
  }

  private createBossHPBar(): void {
    const cam = this.scene.cameras.main;
    const barX = cam.width / 2;
    const barY = 50;

    // Name
    this.hpBarNameText = this.scene.add.text(barX, barY - 18, CFG.name.toUpperCase(), {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#44aaff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.hpBarNameText.setOrigin(0.5);
    this.hpBarNameText.setScrollFactor(0);
    this.hpBarNameText.setDepth(999);

    // Background
    this.hpBarBg = this.scene.add.rectangle(barX, barY, this.HP_BAR_WIDTH + 4, this.HP_BAR_HEIGHT + 4, 0x000000, 0.8);
    this.hpBarBg.setScrollFactor(0);
    this.hpBarBg.setDepth(999);

    // Fill
    this.hpBarFill = this.scene.add.rectangle(
      barX - this.HP_BAR_WIDTH / 2, barY,
      this.HP_BAR_WIDTH, this.HP_BAR_HEIGHT,
      0x44aaff, 0.9
    );
    this.hpBarFill.setOrigin(0, 0.5);
    this.hpBarFill.setScrollFactor(0);
    this.hpBarFill.setDepth(1000);

    // Border
    this.hpBarBorder = this.scene.add.rectangle(barX, barY, this.HP_BAR_WIDTH + 4, this.HP_BAR_HEIGHT + 4);
    this.hpBarBorder.setStrokeStyle(2, 0x44aaff, 0.6);
    this.hpBarBorder.setFillStyle(0x000000, 0);
    this.hpBarBorder.setScrollFactor(0);
    this.hpBarBorder.setDepth(1000);
  }

  private updateHPBar(): void {
    if (!this.hpBarFill) return;
    const ratio = Math.max(0, this.bossHp / this.bossMaxHp);
    this.hpBarFill.width = this.HP_BAR_WIDTH * ratio;

    // Color shifts as HP drops
    if (ratio < 0.25) {
      this.hpBarFill.setFillStyle(0xff4444, 0.9);
    } else if (ratio < 0.5) {
      this.hpBarFill.setFillStyle(0xff8844, 0.9);
    } else {
      this.hpBarFill.setFillStyle(0x44aaff, 0.9);
    }
  }

  private destroyHPBar(): void {
    this.hpBarBg?.destroy();
    this.hpBarFill?.destroy();
    this.hpBarBorder?.destroy();
    this.hpBarNameText?.destroy();
  }
}
