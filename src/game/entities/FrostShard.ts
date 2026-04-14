import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';
import gameState from '../core/GameState';

/**
 * Frost Shard - Glass-cannon ice enemy.
 * Very low HP (1-2 hits), fast erratic movement, devastating blitz dash (6 dmg).
 * On death shatters into ice needles dealing 1 dmg in a radius.
 */
type ShardAIState = 'skitter' | 'telegraph' | 'blitz' | 'cooldown' | 'hurt' | 'dead';

export class FrostShard extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: ShardAIState = 'skitter';
  private currentHp: number;

  // Skitter movement
  private skitterDir: 1 | -1 = 1;
  private skitterChangeTimer = 0;
  private readonly SKITTER_CHANGE_INTERVAL = 300; // Change direction frequently

  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;

  // Blitz attack
  private telegraphTimer = 0;
  private readonly TELEGRAPH_DURATION = 600; // Quick telegraph
  private blitzDir: { x: number; y: number } = { x: 0, y: 0 };
  private blitzTimer = 0;
  private readonly BLITZ_DURATION = 400;
  private readonly BLITZ_SPEED = 500; // Very fast
  private cooldownTimer = 0;
  private readonly COOLDOWN_DURATION = 1500;
  private blitzCooldown = 0;

  // State
  private isDead = false;
  private lastHitBySwingId = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'frostShard');

    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);

    this.skitterDir = Math.random() > 0.5 ? 1 : -1;
    this.setFlipX(this.skitterDir < 0);
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
    if (this.blitzCooldown > 0) this.blitzCooldown -= delta;
  }

  private updateAI(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.aiState) {
      case 'skitter': {
        // Erratic jittery movement
        this.skitterChangeTimer -= delta;
        if (this.skitterChangeTimer <= 0) {
          // Randomly change direction, biased away from player
          const toPlayer = player.x > this.x ? 1 : -1;
          // 70% chance to move away from player, 30% toward
          this.skitterDir = Math.random() < 0.7 ? -toPlayer as 1 | -1 : toPlayer as 1 | -1;
          this.skitterChangeTimer = this.SKITTER_CHANGE_INTERVAL + Phaser.Math.Between(-100, 100);
        }

        // Wall bouncing
        if (body.blocked.left) this.skitterDir = 1;
        else if (body.blocked.right) this.skitterDir = -1;

        // Edge detection
        if (body.blocked.down) {
          const checkX = this.x + this.skitterDir * (this.cfg.width / 2 + 6);
          const checkY = this.y + this.cfg.height / 2 + 10;
          const ground = this.scene.physics.overlapRect(checkX - 2, checkY, 4, 20, true, false);
          if (ground.length === 0) {
            this.skitterDir = -this.skitterDir as 1 | -1;
          }
        }

        body.setVelocityX(this.skitterDir * this.cfg.moveSpeedPatrol);
        this.setFlipX(this.skitterDir < 0);

        // Check for blitz trigger
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (dist < this.cfg.aggroRangePx && this.blitzCooldown <= 0) {
          this.aiState = 'telegraph';
          this.telegraphTimer = this.TELEGRAPH_DURATION;
          body.setVelocityX(0);
          // Calculate direction to player
          const angle = Math.atan2(player.y - this.y, player.x - this.x);
          this.blitzDir = { x: Math.cos(angle), y: Math.sin(angle) };
        }

        // Emit cold mist particles
        if (Math.random() < 0.08) {
          const g = this.scene.add.graphics();
          g.fillStyle(0xccddff, 0.4);
          g.fillCircle(this.x + Phaser.Math.Between(-12, 12), this.y + Phaser.Math.Between(-8, 8), 2);
          this.scene.tweens.add({
            targets: g, alpha: 0, y: '-=10', duration: 400,
            onComplete: () => g.destroy()
          });
        }
        break;
      }

      case 'telegraph': {
        body.setVelocityX(0);
        this.telegraphTimer -= delta;

        // Pulse bright blue
        if (Math.random() < 0.25) {
          const g = this.scene.add.graphics();
          g.fillStyle(0x44aaff, 0.7);
          g.fillCircle(this.x + Phaser.Math.Between(-15, 15), this.y + Phaser.Math.Between(-10, 10), 3);
          this.scene.tweens.add({
            targets: g, alpha: 0, duration: 300,
            onComplete: () => g.destroy()
          });
        }

        if (this.telegraphTimer <= 0) {
          this.aiState = 'blitz';
          this.blitzTimer = this.BLITZ_DURATION;
        }
        break;
      }

      case 'blitz': {
        this.blitzTimer -= delta;
        body.setVelocity(
          this.blitzDir.x * this.BLITZ_SPEED,
          this.blitzDir.y * this.BLITZ_SPEED
        );
        this.setFlipX(this.blitzDir.x < 0);

        // Speed trail
        if (Math.random() < 0.4) {
          const g = this.scene.add.graphics();
          g.fillStyle(0x66bbff, 0.6);
          g.fillCircle(this.x, this.y, 4);
          this.scene.tweens.add({
            targets: g, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 200,
            onComplete: () => g.destroy()
          });
        }

        if ((body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down) || this.blitzTimer <= 0) {
          this.aiState = 'cooldown';
          this.cooldownTimer = this.COOLDOWN_DURATION;
          this.blitzCooldown = 2500;
          body.setVelocity(0, 0);
        }
        break;
      }

      case 'cooldown': {
        this.cooldownTimer -= delta;
        body.setVelocityX(0);
        if (this.cooldownTimer <= 0) {
          this.aiState = 'skitter';
        }
        break;
      }

      case 'hurt': {
        if (this.hitstunTimer <= 0) {
          this.aiState = 'skitter';
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
      // Bright pulsing blue
      const pulse = Math.sin(Date.now() * 0.015) * 0.4 + 0.6;
      this.setTint(0x44aaff);
      this.setAlpha(pulse);
    } else if (this.aiState === 'blitz') {
      this.setTint(0x2288ff);
      this.setAlpha(1);
    } else {
      this.clearTint();
      this.setAlpha(1);
    }
  }

  getContactDamage(): number {
    // 6 damage during blitz, normal otherwise
    return this.aiState === 'blitz' ? 6 : this.cfg.contactDamage;
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

    // DEATH SHATTER - ice needle burst dealing 1 damage in radius
    const shatterRadius = 80;
    const deathX = this.x;
    const deathY = this.y;

    // Visual: burst of ice needles
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = Phaser.Math.Between(100, 200);
      const needle = this.scene.add.graphics();
      needle.fillStyle(Phaser.Math.RND.pick([0xaaddff, 0x88ccee, 0xccddff, 0xffffff]), 0.9);
      const len = Phaser.Math.Between(4, 10);
      // Draw needle shape
      needle.fillRect(deathX, deathY, 2, len);
      needle.setRotation(angle);
      this.scene.tweens.add({
        targets: needle,
        x: Math.cos(angle) * shatterRadius,
        y: Math.sin(angle) * shatterRadius,
        alpha: 0,
        duration: 350,
        onComplete: () => needle.destroy()
      });
    }

    // Shatter damage zone - check if player is in radius after short delay
    this.scene.time.delayedCall(50, () => {
      const gameScene = this.scene as any;
      if (gameScene.player && gameScene.player.active) {
        const playerDist = Phaser.Math.Distance.Between(deathX, deathY, gameScene.player.x, gameScene.player.y);
        if (playerDist < shatterRadius) {
          const currentHp = gameState.getHp();
          gameState.setHp(currentHp - 1);
          if (gameState.getHp() <= 0) {
          gameState.setHp(currentHp - 1);
          if (gameState.getHp() <= 0) {
            gameScene.handlePlayerDeath();
          } else {
            // Knockback player away from shatter
            const kbDir = gameScene.player.x > deathX ? 1 : -1;
            const playerBody = gameScene.player.body as Phaser.Physics.Arcade.Body;
            if (playerBody) {
              playerBody.setVelocity(kbDir * 200, -150);
            }
            // Flash player
            gameScene.player.setTint(0xff4444);
            this.scene.time.delayedCall(150, () => {
              if (gameScene.player && gameScene.player.active) gameScene.player.clearTint();
            });
          }
        }
      }
    });

    // Fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 150,
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
