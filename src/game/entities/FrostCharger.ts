import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Frost Charger - Heavy ice biome ground enemy.
 * Slow patrol, telegraphed charge attack dealing 4 damage.
 * Freezes, paws ground, then dashes at 1.5x player speed.
 */
type ChargerAIState = 'patrol' | 'telegraph' | 'charging' | 'recovering' | 'hurt' | 'dead';

export class FrostCharger extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: ChargerAIState = 'patrol';
  private currentHp: number;

  private patrolDir: 1 | -1 = 1;
  private turnCooldownTimer = 0;

  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;

  // Charge attack
  private telegraphTimer = 0;
  private readonly TELEGRAPH_DURATION = 1500; // 1.5s windup
  private chargeDir: 1 | -1 = 1;
  private chargeTimer = 0;
  private readonly CHARGE_DURATION = 1200;
  private readonly CHARGE_SPEED = 270; // ~1.5x player walk speed (180)
  private recoveryTimer = 0;
  private readonly RECOVERY_DURATION = 800;
  private chargeCooldown = 0;
  private readonly CHARGE_COOLDOWN = 3000;

  // Telegraph visuals
  private telegraphParticles: Phaser.GameObjects.Graphics[] = [];
  private pawAnimTimer = 0;

  // Hit tracking
  private isDead = false;
  private lastHitBySwingId = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'frostCharger');

    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);

    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.setFlipX(this.patrolDir < 0);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateAI(player, delta);
    this.updateVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.turnCooldownTimer > 0) this.turnCooldownTimer -= delta;
    if (this.chargeCooldown > 0) this.chargeCooldown -= delta;
  }

  private updateAI(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.aiState) {
      case 'patrol': {
        // Slow patrol
        if (body.blocked.left) { this.patrolDir = 1; this.turnCooldownTimer = 300; }
        else if (body.blocked.right) { this.patrolDir = -1; this.turnCooldownTimer = 300; }

        // Edge detection
        if (body.blocked.down && this.turnCooldownTimer <= 0) {
          const checkX = this.x + this.patrolDir * (this.cfg.width / 2 + 8);
          const checkY = this.y + this.cfg.height / 2 + 10;
          const ground = this.scene.physics.overlapRect(checkX - 2, checkY, 4, 20, true, false);
          if (ground.length === 0) {
            this.patrolDir = -this.patrolDir as 1 | -1;
            this.turnCooldownTimer = 300;
          }
        }

        body.setVelocityX(this.patrolDir * this.cfg.moveSpeedPatrol);
        this.setFlipX(this.patrolDir < 0);

        // Check for charge trigger
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const lineOfSight = Math.abs(this.y - player.y) < 60;
        if (dist < this.cfg.aggroRangePx && lineOfSight && this.chargeCooldown <= 0) {
          this.aiState = 'telegraph';
          this.telegraphTimer = this.TELEGRAPH_DURATION;
          this.chargeDir = player.x > this.x ? 1 : -1;
          body.setVelocityX(0);
          this.setFlipX(this.chargeDir < 0);
          this.pawAnimTimer = 0;
        }
        break;
      }

      case 'telegraph': {
        body.setVelocityX(0);
        this.telegraphTimer -= delta;
        this.pawAnimTimer += delta;

        // Paw ground visual - bob up and down
        if (this.pawAnimTimer > 400) {
          this.pawAnimTimer = 0;
          this.scene.tweens.add({
            targets: this,
            y: this.y - 4,
            duration: 100,
            yoyo: true,
            ease: 'Sine.easeInOut'
          });
        }

        // Spawn ice particles during telegraph
        if (Math.random() < 0.15) {
          const px = this.x + Phaser.Math.Between(-20, 20);
          const py = this.y + Phaser.Math.Between(-15, 15);
          const g = this.scene.add.graphics();
          g.fillStyle(0xaaddff, 0.8);
          g.fillCircle(px, py, Phaser.Math.Between(2, 4));
          this.scene.tweens.add({
            targets: g,
            alpha: 0,
            y: py - 15,
            duration: 500,
            onComplete: () => g.destroy()
          });
        }

        if (this.telegraphTimer <= 0) {
          this.aiState = 'charging';
          this.chargeTimer = this.CHARGE_DURATION;
          // Flash white to signal charge start
          this.setTint(0xffffff);
          this.scene.time.delayedCall(100, () => {
            if (!this.isDead) this.clearTint();
          });
        }
        break;
      }

      case 'charging': {
        this.chargeTimer -= delta;
        body.setVelocityX(this.chargeDir * this.CHARGE_SPEED);

        // Trail particles
        if (Math.random() < 0.3) {
          const g = this.scene.add.graphics();
          g.fillStyle(0x88ccff, 0.5);
          g.fillCircle(this.x - this.chargeDir * 15, this.y + 5, 3);
          this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 300,
            onComplete: () => g.destroy()
          });
        }

        // Stop on wall
        if ((this.chargeDir === 1 && body.blocked.right) || (this.chargeDir === -1 && body.blocked.left)) {
          this.chargeTimer = 0;
        }

        if (this.chargeTimer <= 0) {
          this.aiState = 'recovering';
          this.recoveryTimer = this.RECOVERY_DURATION;
          body.setVelocityX(0);
          this.chargeCooldown = this.CHARGE_COOLDOWN;
        }
        break;
      }

      case 'recovering': {
        this.recoveryTimer -= delta;
        body.setVelocityX(0);
        if (this.recoveryTimer <= 0) {
          this.aiState = 'patrol';
        }
        break;
      }

      case 'hurt': {
        if (this.hitstunTimer <= 0) {
          this.aiState = 'patrol';
          this.chargeCooldown = Math.max(this.chargeCooldown, 1000);
        }
        break;
      }

      case 'dead':
        body.setVelocityX(0);
        break;
    }
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else if (this.aiState === 'telegraph') {
      // Pulse icy tint during telegraph
      const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
      this.setAlpha(pulse);
      this.setTint(0xccddff);
    } else if (this.aiState === 'charging') {
      this.setTint(0x88bbff);
      this.setAlpha(1);
    } else {
      this.clearTint();
      this.setAlpha(1);
    }
  }

  getContactDamage(): number {
    // 4 damage during charge, normal contact damage otherwise
    return this.aiState === 'charging' ? 4 : this.cfg.contactDamage;
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;

    this.currentHp -= amount;

    this.aiState = 'hurt';
    this.hitstunTimer = this.cfg.hitstunMs;
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;

    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x,
      -this.cfg.knockbackOnHit.y
    );

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

    // Drop shells
    const dropCount = Phaser.Math.Between(this.cfg.dropShells.min, this.cfg.dropShells.max);
    for (let i = 0; i < dropCount; i++) {
      const pickup = new Pickup(this.scene, this.x + Phaser.Math.Between(-20, 20), this.y + Phaser.Math.Between(-10, 10), 'shells', 1);
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) gameScene.getPickupsGroup().add(pickup);
      const pb = pickup.body as Phaser.Physics.Arcade.Body;
      if (pb) {
        pb.setVelocity(Phaser.Math.Between(-60, 60), Phaser.Math.Between(-120, -60));
        this.scene.time.delayedCall(200, () => {
          if (pickup.active && pb) { pb.setVelocity(0, 0); pb.moves = false; }
        });
      }
    }

    // Ice shatter effect
    for (let i = 0; i < 8; i++) {
      const shard = this.scene.add.graphics();
      shard.fillStyle(Phaser.Math.Between(0, 1) ? 0xaaddff : 0x88ccee, 0.8);
      const size = Phaser.Math.Between(3, 7);
      shard.fillRect(this.x, this.y, size, size);
      this.scene.tweens.add({
        targets: shard,
        x: Phaser.Math.Between(-40, 40),
        y: Phaser.Math.Between(-50, -10),
        alpha: 0,
        duration: 400,
        onComplete: () => shard.destroy()
      });
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 0.6,
      duration: 200,
      ease: 'Power2',
      onComplete: () => this.destroy()
    });
  }

  isDying(): boolean { return this.isDead; }
  getAIState(): string { return this.aiState; }
  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.cfg.hp; }
  isInvulnerable(): boolean { return this.invulnTimer > 0; }
  getDisplayName(): string { return this.cfg.displayName; }
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - this.cfg.width / 2, this.y - this.cfg.height / 2, this.cfg.width, this.cfg.height);
  }
}
