import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';
import gameState from '../core/GameState';

/**
 * Colony Siege-Construct - Heavy siege mini-boss.
 * Massive HP, can't be staggered. Ground-pound shockwaves + radial core explosions.
 * Below 50% HP enters defensive mode (frontal immunity + faster shockwaves).
 * Must hit glowing tendrils between plates to deal damage.
 */
type SiegeState = 'idle' | 'groundPound' | 'coreExplosion' | 'defensive' | 'repositioning' | 'hurt' | 'dead';

export class SiegeConstruct extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: SiegeState = 'idle';
  private currentHp: number;
  private maxHp: number;

  // Timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private actionCooldown = 2500;
  private stateTimer = 0;

  // Ground Pound
  private poundWindup = 0;
  private readonly POUND_WINDUP = 600;
  private poundSlammed = false;

  // Core Explosion
  private coreWindup = 0;
  private readonly CORE_WINDUP = 1200;
  private coreFired = false;

  // Defensive mode
  private isDefensive = false;
  private defensiveTimer = 0;
  private readonly DEFENSIVE_DURATION = 3000;
  private defensiveCooldown = 0;

  // Reposition
  private repositionCooldown = 0;

  // Shockwave graphics
  private shockwaves: { g: Phaser.GameObjects.Graphics; x: number; y: number; vx: number; lifetime: number; isRadial?: boolean; radius?: number }[] = [];

  // Tendril hitboxes (vulnerability zones)
  private tendrilZones: { offsetX: number; offsetY: number }[] = [
    { offsetX: -25, offsetY: -10 },
    { offsetX: 25, offsetY: -10 },
    { offsetX: 0, offsetY: 20 },
    { offsetX: -18, offsetY: 15 },
    { offsetX: 18, offsetY: 15 },
  ];

  // Core pulse visual
  private corePulseAlpha = 0;

  private isDead = false;
  private lastHitBySwingId = -1;
  private facing: 1 | -1 = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'siegeConstruct');

    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.maxHp = this.cfg.hp;
    this.currentHp = this.maxHp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(1.8);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.cfg.width, this.cfg.height);
    body.setOffset((this.width - this.cfg.width) / 2, (this.height - this.cfg.height) / 2);
    body.setAllowGravity(false);
    body.setImmovable(true);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateShockwaves(player, delta);
    this.updateAI(player, delta);
    this.updateVisuals(delta);
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.actionCooldown > 0) this.actionCooldown -= delta;
    if (this.defensiveCooldown > 0) this.defensiveCooldown -= delta;
    if (this.repositionCooldown > 0) this.repositionCooldown -= delta;
  }

  private updateShockwaves(player: Player, delta: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.lifetime -= delta;

      if (sw.isRadial && sw.radius !== undefined) {
        // Radial expansion
        sw.radius += 180 * (delta / 1000);
        sw.g.clear();
        sw.g.lineStyle(4, 0xff3333, 0.6);
        sw.g.strokeCircle(sw.x, sw.y, sw.radius);

        // Check player collision with ring
        const playerDist = Phaser.Math.Distance.Between(sw.x, sw.y, player.x, player.y);
        if (Math.abs(playerDist - sw.radius) < 25) {
          this.hitPlayer(player, 2, sw.x);
          sw.g.destroy();
          this.shockwaves.splice(i, 1);
          continue;
        }
      } else {
        // Ground shockwave
        sw.x += sw.vx * (delta / 1000);
        sw.g.setPosition(sw.x, sw.y);

        // Check player collision
        const dist = Math.abs(sw.x - player.x);
        const yDist = Math.abs(sw.y - player.y);
        if (dist < 25 && yDist < 35) {
          this.hitPlayer(player, 2, sw.x);
          sw.g.destroy();
          this.shockwaves.splice(i, 1);
          continue;
        }
      }

      if (sw.lifetime <= 0) {
        sw.g.destroy();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private hitPlayer(player: Player, damage: number, fromX: number): void {
    gameState.damage(damage);
    const gameScene = this.scene as any;
    if (gameState.getPlayerData().hp <= 0) {
      gameScene.handlePlayerDeath?.();
    } else {
      const kbDir = player.x > fromX ? 1 : -1;
      const playerBody = player.body as Phaser.Physics.Arcade.Body;
      if (playerBody) playerBody.setVelocity(kbDir * 280, -200);
      player.setTint(0xff4444);
      this.scene.time.delayedCall(200, () => {
        if (player.active) player.clearTint();
      });
    }
  }

  private updateAI(player: Player, delta: number): void {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Face player
    this.facing = player.x < this.x ? -1 : 1;
    this.setFlipX(this.facing < 0);

    // Defensive mode trigger at 50% HP
    if (!this.isDefensive && this.currentHp <= this.maxHp * 0.5 && this.defensiveCooldown <= 0) {
      this.isDefensive = true;
      this.aiState = 'defensive';
      this.defensiveTimer = this.DEFENSIVE_DURATION;
      this.invulnTimer = 500; // Brief invuln on entering

      // Visual: plates retract
      const shield = this.scene.add.graphics();
      shield.fillStyle(0x333344, 0.5);
      shield.fillCircle(this.x, this.y, 50);
      this.scene.tweens.add({
        targets: shield, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 500,
        onComplete: () => shield.destroy()
      });
    }

    switch (this.aiState) {
      case 'idle': {
        if (this.actionCooldown <= 0 && dist < this.cfg.aggroRangePx) {
          // Reposition if player is too far
          if (dist > 300 && this.repositionCooldown <= 0) {
            this.doReposition(player);
            break;
          }

          // Choose attack
          if (Math.random() < 0.6) {
            this.aiState = 'groundPound';
            this.poundWindup = this.POUND_WINDUP;
            this.poundSlammed = false;
          } else {
            this.aiState = 'coreExplosion';
            this.coreWindup = this.CORE_WINDUP;
            this.coreFired = false;
          }
        }
        break;
      }

      case 'groundPound': {
        this.poundWindup -= delta;

        // Telegraph: shake/glow
        if (Math.random() < 0.2) {
          const g = this.scene.add.graphics();
          g.fillStyle(0xff3333, 0.5);
          g.fillCircle(this.x + Phaser.Math.Between(-15, 15), this.y + 30, 3);
          this.scene.tweens.add({
            targets: g, alpha: 0, y: '+=8', duration: 250,
            onComplete: () => g.destroy()
          });
        }

        if (this.poundWindup <= 0 && !this.poundSlammed) {
          this.poundSlammed = true;
          this.fireGroundPound();
          this.actionCooldown = this.isDefensive ? 1200 : 2500;
          this.scene.time.delayedCall(500, () => {
            if (!this.isDead) this.aiState = this.isDefensive ? 'defensive' : 'idle';
          });
        }
        break;
      }

      case 'coreExplosion': {
        this.coreWindup -= delta;
        this.corePulseAlpha = Math.sin(Date.now() * 0.008) * 0.5 + 0.5;

        // Telegraph: core pulses brighter
        if (Math.random() < 0.12) {
          const g = this.scene.add.graphics();
          g.fillStyle(0xff2222, 0.6);
          g.fillCircle(this.x + Phaser.Math.Between(-8, 8), this.y + Phaser.Math.Between(-8, 8), 4);
          this.scene.tweens.add({
            targets: g, alpha: 0, scaleX: 2, scaleY: 2, duration: 400,
            onComplete: () => g.destroy()
          });
        }

        if (this.coreWindup <= 0 && !this.coreFired) {
          this.coreFired = true;
          this.fireCoreExplosion();
          this.actionCooldown = this.isDefensive ? 1500 : 3500;
          this.scene.time.delayedCall(600, () => {
            if (!this.isDead) this.aiState = this.isDefensive ? 'defensive' : 'idle';
          });
        }
        break;
      }

      case 'defensive': {
        this.defensiveTimer -= delta;

        if (this.defensiveTimer <= 0) {
          this.isDefensive = false;
          this.defensiveCooldown = 8000;
          this.actionCooldown = 800;
          this.aiState = 'idle';
        } else if (this.actionCooldown <= 0) {
          // Rapid shockwave sequence in defensive mode
          if (Math.random() < 0.5) {
            this.fireGroundPound();
          } else {
            this.fireCoreExplosion();
          }
          this.actionCooldown = 1200;
        }
        break;
      }

      case 'repositioning':
        // Handled by delayed call
        break;

      case 'hurt': {
        if (this.hitstunTimer <= 0) {
          this.aiState = 'idle';
        }
        break;
      }

      case 'dead':
        break;
    }
  }

  private doReposition(player: Player): void {
    this.aiState = 'repositioning';
    this.repositionCooldown = 5000;

    // Vanish
    const vanish = this.scene.add.graphics();
    vanish.fillStyle(0xff3333, 0.4);
    vanish.fillCircle(this.x, this.y, 30);
    this.scene.tweens.add({
      targets: vanish, alpha: 0, scaleX: 2, scaleY: 2, duration: 400,
      onComplete: () => vanish.destroy()
    });

    this.setAlpha(0.3);

    // Short teleport toward player
    const targetX = player.x + (Math.random() > 0.5 ? 120 : -120);
    const worldBounds = this.scene.physics.world.bounds;
    const clampedX = Phaser.Math.Clamp(targetX, worldBounds.left + 80, worldBounds.right - 80);

    this.scene.time.delayedCall(500, () => {
      if (this.isDead) return;
      this.x = clampedX;
      this.setAlpha(1);

      const appear = this.scene.add.graphics();
      appear.fillStyle(0xff3333, 0.4);
      appear.fillCircle(this.x, this.y, 30);
      this.scene.tweens.add({
        targets: appear, alpha: 0, scaleX: 2, scaleY: 2, duration: 400,
        onComplete: () => appear.destroy()
      });

      this.actionCooldown = 1000;
      this.aiState = 'idle';
    });
  }

  private fireGroundPound(): void {
    // Slam visual
    const slam = this.scene.add.graphics();
    slam.fillStyle(0xff3333, 0.6);
    slam.fillRect(this.x - 20, this.y + 30, 40, 8);
    this.scene.tweens.add({
      targets: slam, alpha: 0, scaleY: 3, duration: 300,
      onComplete: () => slam.destroy()
    });

    // Two ground waves traveling left and right
    for (const dir of [-1, 1]) {
      const wave = this.scene.add.graphics();
      wave.fillStyle(0xff4444, 0.7);
      for (let s = 0; s < 4; s++) {
        const sx = s * 10 * dir;
        wave.fillTriangle(sx, 0, sx - 5, -12 - s * 2, sx + 5, -12 - s * 2);
      }

      const floorY = this.y + this.displayHeight / 2;
      wave.setPosition(this.x, floorY);

      this.shockwaves.push({
        g: wave,
        x: this.x,
        y: floorY,
        vx: dir * 220,
        lifetime: 2500,
      });
    }
  }

  private fireCoreExplosion(): void {
    // Core flash
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xff2222, 0.7);
    flash.fillCircle(this.x, this.y, 20);
    this.scene.tweens.add({
      targets: flash, alpha: 0, scaleX: 3, scaleY: 3, duration: 400,
      onComplete: () => flash.destroy()
    });

    // Radial shockwave
    const ring = this.scene.add.graphics();
    this.shockwaves.push({
      g: ring,
      x: this.x,
      y: this.y,
      vx: 0,
      lifetime: 2000,
      isRadial: true,
      radius: 10,
    });
  }

  private updateVisuals(delta: number): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else if (this.aiState === 'coreExplosion') {
      this.setTint(0xff4444);
      this.setAlpha(0.8 + this.corePulseAlpha * 0.2);
    } else if (this.isDefensive) {
      this.setTint(0x666688);
      this.setAlpha(0.9);
    } else if (this.aiState === 'groundPound') {
      this.setTint(0xcc3333);
    } else {
      this.clearTint();
      this.setAlpha(1);
    }

    // Red glow particles at joints
    if (Math.random() < 0.06 && !this.isDead) {
      const zone = this.tendrilZones[Phaser.Math.Between(0, this.tendrilZones.length - 1)];
      const g = this.scene.add.graphics();
      g.fillStyle(0xff3333, 0.4);
      g.fillCircle(this.x + zone.offsetX, this.y + zone.offsetY, Phaser.Math.Between(2, 4));
      this.scene.tweens.add({
        targets: g, alpha: 0, y: '-=10', duration: 500,
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

    // Defensive mode: immune to frontal attacks
    if (this.isDefensive) {
      const attackFromFront = (fromX < this.x && this.flipX) || (fromX > this.x && !this.flipX);
      if (attackFromFront) {
        // Blocked!
        const spark = this.scene.add.graphics();
        spark.fillStyle(0x888899, 0.8);
        spark.fillCircle(this.x + (this.flipX ? -30 : 30), this.y, 10);
        this.scene.tweens.add({
          targets: spark, alpha: 0, scaleX: 2, scaleY: 2, duration: 200,
          onComplete: () => spark.destroy()
        });
        return false;
      }
    }

    // Check if hit is near a tendril zone for bonus damage
    let tendrilHit = false;
    for (const zone of this.tendrilZones) {
      const tendrilX = this.x + zone.offsetX;
      const tendrilY = this.y + zone.offsetY;
      const hitDist = Math.abs(fromX - tendrilX);
      if (hitDist < 30) {
        tendrilHit = true;
        break;
      }
    }

    this.lastHitBySwingId = swingId;
    const finalDamage = tendrilHit ? amount * 2 : amount;
    this.currentHp -= finalDamage;

    // No stagger from standard attacks - only brief flash
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;

    // Tendril hit feedback
    if (tendrilHit) {
      const spark = this.scene.add.graphics();
      spark.fillStyle(0xff6633, 0.8);
      spark.fillCircle(fromX, this.y, 12);
      this.scene.tweens.add({
        targets: spark, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 300,
        onComplete: () => spark.destroy()
      });
    }

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

    // Clean up shockwaves
    this.shockwaves.forEach(sw => sw.g.destroy());
    this.shockwaves = [];

    // Drop shells
    const dropCount = Phaser.Math.Between(this.cfg.dropShells.min, this.cfg.dropShells.max);
    for (let i = 0; i < dropCount; i++) {
      const pickup = new Pickup(this.scene, this.x + Phaser.Math.Between(-35, 35), this.y + Phaser.Math.Between(-20, 20), 'shells', 1);
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) gameScene.getPickupsGroup().add(pickup);
      const pb = pickup.body as Phaser.Physics.Arcade.Body;
      if (pb) {
        pb.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-160, -60));
        this.scene.time.delayedCall(200, () => {
          if (pickup.active && pb) { pb.setVelocity(0, 0); pb.moves = false; }
        });
      }
    }

    // Death: plates shatter with red energy burst
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const shard = this.scene.add.graphics();
      shard.fillStyle(Phaser.Math.RND.pick([0x333344, 0x222233, 0xff3333, 0xcc2222]), 0.9);
      // Rectangular plate chunks
      shard.fillRect(-6, -8, 12, 16);
      shard.setPosition(this.x, this.y);
      this.scene.tweens.add({
        targets: shard,
        x: this.x + Math.cos(angle) * 120,
        y: this.y + Math.sin(angle) * 120,
        alpha: 0,
        rotation: Math.PI * 2 + Math.random() * Math.PI,
        duration: 700,
        onComplete: () => shard.destroy()
      });
    }

    // Red core explosion
    const core = this.scene.add.graphics();
    core.fillStyle(0xff2222, 0.7);
    core.fillCircle(this.x, this.y, 30);
    this.scene.tweens.add({
      targets: core, alpha: 0, scaleX: 4, scaleY: 4, duration: 600,
      onComplete: () => core.destroy()
    });

    // Tendril burst
    for (const zone of this.tendrilZones) {
      const tendril = this.scene.add.graphics();
      tendril.fillStyle(0xcc2222, 0.7);
      tendril.fillCircle(this.x + zone.offsetX, this.y + zone.offsetY, 6);
      this.scene.tweens.add({
        targets: tendril, alpha: 0, scaleX: 3, scaleY: 3, duration: 400,
        onComplete: () => tendril.destroy()
      });
    }

    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 400,
      onComplete: () => this.destroy()
    });
  }

  isDying(): boolean { return this.isDead; }
  getAIState(): string { return this.aiState; }
  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.maxHp; }
  isInvulnerable(): boolean { return this.invulnTimer > 0; }
  getDisplayName(): string { return this.cfg.displayName; }
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - this.cfg.width / 2, this.y - this.cfg.height / 2, this.cfg.width, this.cfg.height);
  }
}
