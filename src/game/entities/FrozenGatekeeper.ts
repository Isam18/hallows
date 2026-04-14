import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';
import gameState from '../core/GameState';

/**
 * Frozen Gatekeeper - Recurring mini-boss encountered 4 times in the frozen biome.
 * Stage 1: Basic Frost Pulse attacks
 * Stage 2: Adds Crystal Veil shield
 * Stage 3: Summons tracking frost shards
 * Stage 4: Frenzy mode at 20% HP with rapid teleports
 */
type GatekeeperState = 'idle' | 'hover' | 'frostPulse' | 'crystalVeil' | 'summoning' | 'teleportDash' | 'frenzy' | 'hurt' | 'dead';

export class FrozenGatekeeper extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: GatekeeperState = 'idle';
  private currentHp: number;
  private maxHp: number;

  // Stage (1-4) determines abilities
  private stage: number;

  // Hover
  private hoverBaseY: number;
  private hoverTimer = 0;

  // Timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private actionCooldown = 2000; // Initial delay before first attack
  private stateTimer = 0;

  // Frost Pulse
  private pulseWindup = 0;
  private readonly PULSE_WINDUP = 800;
  private pulseFired = false;

  // Crystal Veil
  private veilTimer = 0;
  private readonly VEIL_DURATION = 2500;
  private veilCooldown = 0;
  private veilShards: Phaser.GameObjects.Graphics[] = [];
  private veilAngle = 0;
  private isVeilActive = false;

  // Teleport dash
  private teleportCooldown = 0;

  // Summoning
  private summonCooldown = 0;
  private summonCount = 0;

  // Frenzy
  private inFrenzy = false;
  private frenzyPulseTimer = 0;

  // Projectiles (frost pulse waves)
  private pulseWaves: Phaser.GameObjects.Graphics[] = [];

  // Summoned shards (tracking projectiles)
  private summonedShards: { g: Phaser.GameObjects.Graphics; vx: number; vy: number; lifetime: number }[] = [];

  // Arena bounds
  private arenaLeft = 0;
  private arenaRight = 0;

  private isDead = false;
  private lastHitBySwingId = -1;
  private facing: 1 | -1 = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig, stage: number = 1) {
    super(scene, x, y, config.spriteKey || 'frozenGatekeeper');

    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    // Scale HP by stage
    const hpMultiplier = 1 + (stage - 1) * 0.3;
    this.maxHp = Math.floor(this.cfg.hp * hpMultiplier);
    this.currentHp = this.maxHp;
    this.stage = stage;
    this.hoverBaseY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    this.arenaLeft = x - 400;
    this.arenaRight = x + 400;

    // Create veil shards for stage 2+
    if (this.stage >= 2) {
      this.createVeilShards();
    }
  }

  private createVeilShards(): void {
    for (let i = 0; i < 8; i++) {
      const g = this.scene.add.graphics();
      g.fillStyle(0x88ccff, 0.7);
      g.fillTriangle(0, -8, -4, 4, 4, 4);
      g.lineStyle(1, 0xccddff);
      g.strokeTriangle(0, -8, -4, 4, 4, 4);
      g.setAlpha(0);
      this.veilShards.push(g);
    }
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateHover(delta);
    this.updateVeilVisuals(delta);
    this.updatePulseWaves(player, delta);
    this.updateSummonedShards(player, delta);
    this.updateAI(player, delta);
    this.updateVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.actionCooldown > 0) this.actionCooldown -= delta;
    if (this.veilCooldown > 0) this.veilCooldown -= delta;
    if (this.teleportCooldown > 0) this.teleportCooldown -= delta;
    if (this.summonCooldown > 0) this.summonCooldown -= delta;
  }

  private updateHover(delta: number): void {
    if (this.aiState === 'hurt' || this.aiState === 'dead') return;
    this.hoverTimer += delta * 0.0015;
    this.y = this.hoverBaseY + Math.sin(this.hoverTimer) * 10;
  }

  private updateVeilVisuals(delta: number): void {
    this.veilAngle += delta * 0.003;
    for (let i = 0; i < this.veilShards.length; i++) {
      const g = this.veilShards[i];
      if (this.isVeilActive) {
        const angle = this.veilAngle + (i / this.veilShards.length) * Math.PI * 2;
        const radius = 40;
        g.setPosition(this.x + Math.cos(angle) * radius, this.y + Math.sin(angle) * radius);
        g.setRotation(angle);
        g.setAlpha(0.8);
      } else {
        g.setAlpha(0);
      }
    }
  }

  private updatePulseWaves(player: Player, delta: number): void {
    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      const wave = this.pulseWaves[i] as any;
      wave.lifetime -= delta;
      wave.x += wave.vx * (delta / 1000);

      // Check player collision
      const dist = Math.abs(wave.x - player.x);
      const yDist = Math.abs(wave.y - player.y);
      if (dist < 30 && yDist < 40) {
        gameState.damage(2);
        const gameScene = this.scene as any;
        if (gameState.getPlayerData().hp <= 0) {
          gameScene.handlePlayerDeath?.();
        } else {
          const kbDir = player.x > wave.x ? 1 : -1;
          const playerBody = player.body as Phaser.Physics.Arcade.Body;
          if (playerBody) playerBody.setVelocity(kbDir * 250, -180);
          player.setTint(0x44aaff);
          this.scene.time.delayedCall(200, () => {
            if (player.active) player.clearTint();
          });
        }
        wave.destroy();
        this.pulseWaves.splice(i, 1);
        continue;
      }

      if (wave.lifetime <= 0) {
        wave.destroy();
        this.pulseWaves.splice(i, 1);
      }
    }
  }

  private updateSummonedShards(player: Player, delta: number): void {
    for (let i = this.summonedShards.length - 1; i >= 0; i--) {
      const shard = this.summonedShards[i];
      shard.lifetime -= delta;

      // Track toward player
      const angle = Math.atan2(player.y - shard.g.y, player.x - shard.g.x);
      const trackSpeed = 120;
      shard.vx += Math.cos(angle) * 0.5;
      shard.vy += Math.sin(angle) * 0.5;
      const speed = Math.sqrt(shard.vx * shard.vx + shard.vy * shard.vy);
      if (speed > trackSpeed) {
        shard.vx = (shard.vx / speed) * trackSpeed;
        shard.vy = (shard.vy / speed) * trackSpeed;
      }

      shard.g.x += shard.vx * (delta / 1000);
      shard.g.y += shard.vy * (delta / 1000);

      // Player collision
      const dist = Phaser.Math.Distance.Between(shard.g.x, shard.g.y, player.x, player.y);
      if (dist < 18) {
        gameState.damage(1);
        const gameScene = this.scene as any;
        if (gameState.getPlayerData().hp <= 0) {
          gameScene.handlePlayerDeath?.();
        } else {
          const kbDir = player.x > shard.g.x ? 1 : -1;
          const playerBody = player.body as Phaser.Physics.Arcade.Body;
          if (playerBody) playerBody.setVelocity(kbDir * 150, -100);
          player.setTint(0x44aaff);
          this.scene.time.delayedCall(150, () => {
            if (player.active) player.clearTint();
          });
        }
        shard.g.destroy();
        this.summonedShards.splice(i, 1);
        continue;
      }

      if (shard.lifetime <= 0) {
        this.scene.tweens.add({
          targets: shard.g, alpha: 0, duration: 200,
          onComplete: () => shard.g.destroy()
        });
        this.summonedShards.splice(i, 1);
      }
    }
  }

  private updateAI(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Face player
    this.facing = player.x < this.x ? -1 : 1;
    this.setFlipX(this.facing < 0);

    // Check frenzy trigger (stage 4, <20% HP)
    if (this.stage >= 4 && !this.inFrenzy && this.currentHp <= this.maxHp * 0.2) {
      this.inFrenzy = true;
      this.aiState = 'frenzy';
      this.frenzyPulseTimer = 0;
      // Visual burst
      const burst = this.scene.add.graphics();
      burst.fillStyle(0x44ddff, 0.6);
      burst.fillCircle(this.x, this.y, 40);
      this.scene.tweens.add({
        targets: burst, alpha: 0, scaleX: 3, scaleY: 3, duration: 500,
        onComplete: () => burst.destroy()
      });
    }

    switch (this.aiState) {
      case 'idle': {
        this.actionCooldown -= delta;
        if (this.actionCooldown <= 0) {
          this.aiState = 'hover';
        }
        break;
      }

      case 'hover': {
        if (this.actionCooldown > 0) break;

        // Slow hover toward player area
        const moveDir = player.x > this.x ? 1 : -1;
        body.setVelocityX(moveDir * 30);

        // Decision making
        // Teleport if player is far and cooldown ready
        if (dist > 250 && this.teleportCooldown <= 0) {
          this.doTeleportDash(player);
          break;
        }

        // Crystal Veil if player is close (stage 2+)
        if (this.stage >= 2 && dist < 80 && this.veilCooldown <= 0) {
          this.aiState = 'crystalVeil';
          this.veilTimer = this.VEIL_DURATION;
          this.isVeilActive = true;
          body.setVelocityX(0);
          break;
        }

        // Summon (stage 3+)
        if (this.stage >= 3 && this.summonCooldown <= 0 && this.summonCount < 3) {
          this.aiState = 'summoning';
          this.stateTimer = 800;
          body.setVelocityX(0);
          break;
        }

        // Frost Pulse - primary attack
        if (dist < this.cfg.aggroRangePx) {
          this.aiState = 'frostPulse';
          this.pulseWindup = this.PULSE_WINDUP;
          this.pulseFired = false;
          body.setVelocityX(0);
        }
        break;
      }

      case 'frostPulse': {
        body.setVelocityX(0);
        this.pulseWindup -= delta;

        // Telegraph: energy limbs glow
        if (Math.random() < 0.15) {
          const g = this.scene.add.graphics();
          g.fillStyle(0x44ddff, 0.6);
          g.fillCircle(
            this.x + Phaser.Math.Between(-20, 20),
            this.y + Phaser.Math.Between(10, 30),
            Phaser.Math.Between(2, 5)
          );
          this.scene.tweens.add({
            targets: g, alpha: 0, y: '+=10', duration: 300,
            onComplete: () => g.destroy()
          });
        }

        if (this.pulseWindup <= 0 && !this.pulseFired) {
          this.pulseFired = true;
          this.fireFrostPulse();
          this.actionCooldown = this.inFrenzy ? 800 : 2500;
          this.scene.time.delayedCall(400, () => {
            if (!this.isDead) this.aiState = 'hover';
          });
        }
        break;
      }

      case 'crystalVeil': {
        this.veilTimer -= delta;
        body.setVelocityX(0);

        if (this.veilTimer <= 0) {
          this.isVeilActive = false;
          this.veilCooldown = 6000;
          this.actionCooldown = 1000;
          this.aiState = 'hover';
        }
        break;
      }

      case 'summoning': {
        this.stateTimer -= delta;
        body.setVelocityX(0);

        if (this.stateTimer <= 0) {
          this.spawnTrackingShard();
          this.summonCount++;
          this.summonCooldown = 5000;
          this.actionCooldown = 1500;
          this.aiState = 'hover';
        }

        // Summoning particles
        if (Math.random() < 0.2) {
          const g = this.scene.add.graphics();
          g.fillStyle(0x66ccff, 0.5);
          g.fillCircle(
            this.x + Phaser.Math.Between(-30, 30),
            this.y + Phaser.Math.Between(-30, 30),
            3
          );
          this.scene.tweens.add({
            targets: g, alpha: 0, duration: 400,
            onComplete: () => g.destroy()
          });
        }
        break;
      }

      case 'teleportDash': {
        // Handled by tween callback
        break;
      }

      case 'frenzy': {
        // Stage 4 frenzy: rapid teleports + frost pulses
        this.frenzyPulseTimer -= delta;

        if (this.frenzyPulseTimer <= 0) {
          // Alternate between teleport and pulse
          if (Math.random() < 0.4 && this.teleportCooldown <= 0) {
            this.doTeleportDash(player);
          } else {
            this.fireFrostPulse();
          }
          this.frenzyPulseTimer = 600 + Math.random() * 400;
        }

        // Constant frost breath
        if (Math.random() < 0.15) {
          const g = this.scene.add.graphics();
          g.fillStyle(0x44ddff, 0.4);
          g.fillCircle(this.x + Phaser.Math.Between(-15, 15), this.y + Phaser.Math.Between(-20, 20), 3);
          this.scene.tweens.add({
            targets: g, alpha: 0, y: '-=20', duration: 400,
            onComplete: () => g.destroy()
          });
        }
        break;
      }

      case 'hurt': {
        if (this.hitstunTimer <= 0) {
          this.aiState = this.inFrenzy ? 'frenzy' : 'hover';
        }
        break;
      }

      case 'dead':
        body.setVelocity(0, 0);
        break;
    }
  }

  private doTeleportDash(player: Player): void {
    this.aiState = 'teleportDash';
    this.teleportCooldown = this.inFrenzy ? 1500 : 4000;

    // Vanish effect
    const vanish = this.scene.add.graphics();
    vanish.fillStyle(0x44ddff, 0.5);
    vanish.fillCircle(this.x, this.y, 25);
    this.scene.tweens.add({
      targets: vanish, alpha: 0, scaleX: 2, scaleY: 2, duration: 300,
      onComplete: () => vanish.destroy()
    });

    // Teleport behind player
    this.setAlpha(0);
    const behindX = player.x + (player.x > this.x ? -80 : 80);
    const clampedX = Phaser.Math.Clamp(behindX, this.arenaLeft + 50, this.arenaRight - 50);

    this.scene.time.delayedCall(400, () => {
      if (this.isDead) return;
      this.x = clampedX;
      this.hoverBaseY = player.y - 40;
      this.setAlpha(1);

      // Appear effect
      const appear = this.scene.add.graphics();
      appear.fillStyle(0x44ddff, 0.5);
      appear.fillCircle(this.x, this.y, 25);
      this.scene.tweens.add({
        targets: appear, alpha: 0, scaleX: 2, scaleY: 2, duration: 300,
        onComplete: () => appear.destroy()
      });

      this.actionCooldown = this.inFrenzy ? 300 : 800;
      this.aiState = this.inFrenzy ? 'frenzy' : 'hover';
    });
  }

  private fireFrostPulse(): void {
    // Slam effect at position
    const slamEffect = this.scene.add.graphics();
    slamEffect.fillStyle(0x44ddff, 0.5);
    slamEffect.fillRect(this.x - 15, this.y + 20, 30, 10);
    this.scene.tweens.add({
      targets: slamEffect, alpha: 0, scaleY: 2, duration: 300,
      onComplete: () => slamEffect.destroy()
    });

    // Create wave going left and right
    for (const dir of [-1, 1]) {
      const wave = this.scene.add.graphics() as any;
      wave.fillStyle(0x66ccff, 0.7);
      // Ice spike shape
      for (let s = 0; s < 5; s++) {
        const sx = s * 12 * dir;
        wave.fillTriangle(sx, 0, sx - 4, -15 - s * 3, sx + 4, -15 - s * 3);
      }
      wave.setPosition(this.x, this.y + 30);
      wave.vx = dir * 200;
      wave.lifetime = 2000;
      this.pulseWaves.push(wave);
    }
  }

  private spawnTrackingShard(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x88ccff, 0.8);
    g.fillTriangle(0, -6, -4, 4, 4, 4);
    g.lineStyle(1, 0xccddff);
    g.strokeTriangle(0, -6, -4, 4, 4, 4);
    g.setPosition(this.x + Phaser.Math.Between(-20, 20), this.y - 20);

    // Launch upward first then track
    this.summonedShards.push({
      g,
      vx: Phaser.Math.Between(-30, 30),
      vy: -80,
      lifetime: 6000
    });
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else if (this.aiState === 'frostPulse') {
      const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
      this.setTint(0x44ddff);
      this.setAlpha(pulse);
    } else if (this.isVeilActive) {
      this.setTint(0x88aacc);
    } else if (this.inFrenzy) {
      // Rapid flicker
      this.setTint(Date.now() % 200 < 100 ? 0x44ddff : 0x2288cc);
    } else {
      this.clearTint();
      this.setAlpha(1);
    }

    // Ghostly particles
    if (Math.random() < 0.05 && !this.isDead) {
      const g = this.scene.add.graphics();
      g.fillStyle(0x44aadd, 0.2);
      g.fillCircle(this.x + Phaser.Math.Between(-20, 20), this.y + Phaser.Math.Between(-30, 30), Phaser.Math.Between(2, 5));
      this.scene.tweens.add({
        targets: g, alpha: 0, y: '-=20', duration: 800,
        onComplete: () => g.destroy()
      });
    }
  }

  getContactDamage(): number {
    return this.cfg.contactDamage;
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;

    // Crystal Veil blocks all attacks
    if (this.isVeilActive) {
      const spark = this.scene.add.graphics();
      spark.fillStyle(0xccddff, 0.8);
      const sparkX = this.x + (fromX < this.x ? -35 : 35);
      spark.fillCircle(sparkX, this.y, 10);
      this.scene.tweens.add({
        targets: spark, alpha: 0, scaleX: 2, scaleY: 2, duration: 200,
        onComplete: () => spark.destroy()
      });
      return false;
    }

    this.lastHitBySwingId = swingId;
    this.currentHp -= amount;

    if (!this.inFrenzy) {
      this.aiState = 'hurt';
      this.hitstunTimer = this.cfg.hitstunMs;
    }
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;

    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(knockDir * this.cfg.knockbackOnHit.x, -this.cfg.knockbackOnHit.y);

    if (this.currentHp <= 0) {
      this.die();
    }
    return true;
  }

  private die(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.aiState = 'dead';

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;

    // Clean up
    this.veilShards.forEach(g => g.destroy());
    this.veilShards = [];
    this.pulseWaves.forEach(w => w.destroy());
    this.pulseWaves = [];
    this.summonedShards.forEach(s => s.g.destroy());
    this.summonedShards = [];

    // Track gatekeeper defeat in game state
    const gameScene = this.scene as any;
    const gatekeeperKey = `frozenGatekeeper_stage${this.stage}`;
    if (gameScene.registry) {
      gameScene.registry.set(gatekeeperKey, true);
    }

    // Drop shells
    const dropCount = Phaser.Math.Between(this.cfg.dropShells.min, this.cfg.dropShells.max);
    for (let i = 0; i < dropCount; i++) {
      const pickup = new Pickup(this.scene, this.x + Phaser.Math.Between(-30, 30), this.y + Phaser.Math.Between(-20, 20), 'shells', 1);
      if (gameScene.getPickupsGroup) gameScene.getPickupsGroup().add(pickup);
      const pb = pickup.body as Phaser.Physics.Arcade.Body;
      if (pb) {
        pb.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-150, -60));
        this.scene.time.delayedCall(200, () => {
          if (pickup.active && pb) { pb.setVelocity(0, 0); pb.moves = false; }
        });
      }
    }

    // Death: spectral dissolution
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const shard = this.scene.add.graphics();
      shard.fillStyle(Phaser.Math.RND.pick([0x44ddff, 0x2288cc, 0x88ccff, 0x1a3355]), 0.8);
      shard.fillTriangle(0, -8, -5, 5, 5, 5);
      shard.setPosition(this.x, this.y);
      this.scene.tweens.add({
        targets: shard,
        x: this.x + Math.cos(angle) * 100,
        y: this.y + Math.sin(angle) * 100,
        alpha: 0,
        rotation: Math.PI * 3,
        duration: 700,
        onComplete: () => shard.destroy()
      });
    }

    // Core explosion
    const core = this.scene.add.graphics();
    core.fillStyle(0x44ddff, 0.6);
    core.fillCircle(this.x, this.y, 25);
    this.scene.tweens.add({
      targets: core, alpha: 0, scaleX: 4, scaleY: 4, duration: 600,
      onComplete: () => core.destroy()
    });

    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 300,
      onComplete: () => this.destroy()
    });
  }

  isDying(): boolean { return this.isDead; }
  getAIState(): string { return this.aiState; }
  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.maxHp; }
  isInvulnerable(): boolean { return this.invulnTimer > 0 || this.isVeilActive; }
  getDisplayName(): string { return `${this.cfg.displayName} (Stage ${this.stage})`; }
  getStage(): number { return this.stage; }
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - this.cfg.width / 2, this.y - this.cfg.height / 2, this.cfg.width, this.cfg.height);
  }
}
