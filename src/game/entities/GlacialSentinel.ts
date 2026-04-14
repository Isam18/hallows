import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';
import gameState from '../core/GameState';

/**
 * Glacial Sentinel - Ancient floating construct that fires ice shard projectiles.
 * Hovers in place, fires 3-shard volleys, and shields when player gets close.
 */
type SentinelAIState = 'hover' | 'volley' | 'cooldown' | 'shielding' | 'hurt' | 'dead';

export class GlacialSentinel extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: SentinelAIState = 'hover';
  private currentHp: number;

  // Hover
  private hoverBaseY: number;
  private hoverTimer = 0;
  private readonly HOVER_AMPLITUDE = 12;
  private readonly HOVER_SPEED = 0.002;

  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;

  // Volley attack
  private volleyTimer = 0;
  private readonly VOLLEY_INTERVAL = 3500;
  private shardsToFire = 0;
  private shardFireTimer = 0;
  private readonly SHARD_FIRE_DELAY = 200; // ms between each shard
  private cooldownTimer = 0;
  private readonly COOLDOWN_DURATION = 2000;

  // Shield
  private shieldTimer = 0;
  private readonly SHIELD_DURATION = 1000;
  private shieldCooldown = 0;

  // Projectiles
  private projectiles: Phaser.GameObjects.Group;

  // Orbit shards (visual)
  private orbitShards: Phaser.GameObjects.Graphics[] = [];
  private orbitAngle = 0;
  private shardsAvailable = 6;

  private isDead = false;
  private lastHitBySwingId = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'glacialSentinel');

    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    this.hoverBaseY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    this.projectiles = scene.add.group();
    this.volleyTimer = this.VOLLEY_INTERVAL;

    // Create orbit shard visuals
    this.createOrbitShards();
  }

  private createOrbitShards(): void {
    for (let i = 0; i < 6; i++) {
      const g = this.scene.add.graphics();
      g.fillStyle(0xaaddff, 0.8);
      g.fillTriangle(0, -5, -3, 3, 3, 3);
      g.lineStyle(1, 0xeef4ff);
      g.strokeTriangle(0, -5, -3, 3, 3, 3);
      this.orbitShards.push(g);
    }
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateOrbitShards(delta);
    this.updateProjectiles(player, delta);
    this.updateAI(player, delta);
    this.updateVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.shieldCooldown > 0) this.shieldCooldown -= delta;
  }

  private updateOrbitShards(delta: number): void {
    this.orbitAngle += delta * 0.002;
    for (let i = 0; i < this.orbitShards.length; i++) {
      const g = this.orbitShards[i];
      if (i < this.shardsAvailable) {
        const angle = this.orbitAngle + (i / 6) * Math.PI * 2;
        const radius = this.aiState === 'shielding' ? 12 : 35;
        g.setPosition(this.x + Math.cos(angle) * radius, this.y + Math.sin(angle) * radius);
        g.setAlpha(1);
      } else {
        g.setAlpha(0);
      }
    }
  }

  private updateProjectiles(player: Player, delta: number): void {
    this.projectiles.getChildren().forEach((obj: Phaser.GameObjects.GameObject) => {
      const proj = obj as Phaser.GameObjects.Graphics & { vx: number; vy: number; lifetime: number };
      if (!proj.active) return;

      proj.lifetime -= delta;
      proj.x += proj.vx * (delta / 1000);
      proj.y += proj.vy * (delta / 1000);

      // Check player collision
      const dist = Phaser.Math.Distance.Between(proj.x, proj.y, player.x, player.y);
      if (dist < 20) {
        gameState.damage(1);
        const gameScene = this.scene as any;
        if (gameState.getPlayerData().hp <= 0) {
          gameScene.handlePlayerDeath?.();
        } else {
          const kbDir = player.x > proj.x ? 1 : -1;
          const playerBody = player.body as Phaser.Physics.Arcade.Body;
          if (playerBody) playerBody.setVelocity(kbDir * 180, -120);
          player.setTint(0xff4444);
          this.scene.time.delayedCall(150, () => {
            if (player.active) player.clearTint();
          });
        }
        this.destroyProjectile(proj);
        return;
      }

      if (proj.lifetime <= 0) {
        this.destroyProjectile(proj);
      }
    });
  }

  private destroyProjectile(proj: Phaser.GameObjects.Graphics): void {
    // Small burst
    const burst = this.scene.add.graphics();
    burst.fillStyle(0xaaddff, 0.6);
    burst.fillCircle(proj.x, proj.y, 6);
    this.scene.tweens.add({
      targets: burst, alpha: 0, scaleX: 2, scaleY: 2, duration: 200,
      onComplete: () => burst.destroy()
    });
    proj.destroy();
  }

  private fireShardProjectile(player: Player): void {
    if (this.shardsAvailable <= 0) return;
    this.shardsAvailable--;

    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    // Add slight spread
    const spread = (Math.random() - 0.5) * 0.3;
    const finalAngle = angle + spread;
    const speed = 280;

    const proj = this.scene.add.graphics() as Phaser.GameObjects.Graphics & { vx: number; vy: number; lifetime: number };
    proj.fillStyle(0x66ccff, 0.9);
    proj.fillTriangle(0, -4, -3, 4, 3, 4);
    proj.lineStyle(1, 0xeef4ff);
    proj.strokeTriangle(0, -4, -3, 4, 3, 4);
    proj.setPosition(this.x, this.y);
    proj.setRotation(finalAngle + Math.PI / 2);

    (proj as any).vx = Math.cos(finalAngle) * speed;
    (proj as any).vy = Math.sin(finalAngle) * speed;
    (proj as any).lifetime = 3000;

    this.projectiles.add(proj);
  }

  private updateAI(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Hover bobbing
    this.hoverTimer += delta * this.HOVER_SPEED;
    const hoverY = this.hoverBaseY + Math.sin(this.hoverTimer) * this.HOVER_AMPLITUDE;
    if (this.aiState !== 'hurt') {
      this.y = hoverY;
    }

    // Face player
    this.setFlipX(player.x < this.x);

    switch (this.aiState) {
      case 'hover': {
        this.volleyTimer -= delta;

        // Shield check - melee range
        if (dist < 60 && this.shieldCooldown <= 0) {
          this.aiState = 'shielding';
          this.shieldTimer = this.SHIELD_DURATION;
          this.shieldCooldown = 3000;
          break;
        }

        // Ready to fire volley
        if (this.volleyTimer <= 0 && dist < this.cfg.aggroRangePx && this.shardsAvailable >= 3) {
          this.aiState = 'volley';
          this.shardsToFire = 3;
          this.shardFireTimer = 0;
          // Core pulse effect
          const pulse = this.scene.add.graphics();
          pulse.fillStyle(0x44ddff, 0.5);
          pulse.fillCircle(this.x, this.y, 20);
          this.scene.tweens.add({
            targets: pulse, alpha: 0, scaleX: 2, scaleY: 2, duration: 400,
            onComplete: () => pulse.destroy()
          });
        }
        break;
      }

      case 'volley': {
        this.shardFireTimer -= delta;
        if (this.shardFireTimer <= 0 && this.shardsToFire > 0) {
          this.fireShardProjectile(player);
          this.shardsToFire--;
          this.shardFireTimer = this.SHARD_FIRE_DELAY;
        }
        if (this.shardsToFire <= 0) {
          this.aiState = 'cooldown';
          this.cooldownTimer = this.COOLDOWN_DURATION;
        }
        break;
      }

      case 'cooldown': {
        this.cooldownTimer -= delta;
        // Regrow shards during cooldown
        if (this.cooldownTimer <= 0) {
          this.shardsAvailable = Math.min(6, this.shardsAvailable + 3);
          this.volleyTimer = this.VOLLEY_INTERVAL;
          this.aiState = 'hover';
        }
        break;
      }

      case 'shielding': {
        this.shieldTimer -= delta;
        body.setVelocity(0, 0);

        // Contact damage during shield
        if (dist < 40) {
          gameState.damage(1);
          const gameScene = this.scene as any;
          if (gameState.getPlayerData().hp <= 0) {
            gameScene.handlePlayerDeath?.();
          } else {
            const kbDir = player.x > this.x ? 1 : -1;
            const playerBody = player.body as Phaser.Physics.Arcade.Body;
            if (playerBody) playerBody.setVelocity(kbDir * 200, -150);
            player.setTint(0xff4444);
            this.scene.time.delayedCall(150, () => {
              if (player.active) player.clearTint();
            });
          }
        }

        if (this.shieldTimer <= 0) {
          this.aiState = 'hover';
          this.volleyTimer = this.VOLLEY_INTERVAL * 0.5;
        }
        break;
      }

      case 'hurt': {
        if (this.hitstunTimer <= 0) {
          this.aiState = 'hover';
        }
        break;
      }

      case 'dead':
        body.setVelocity(0, 0);
        break;
    }
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else if (this.aiState === 'shielding') {
      this.setTint(0x88aacc);
      this.setAlpha(0.8);
    } else if (this.aiState === 'volley') {
      this.setTint(0x44ddff);
    } else {
      this.clearTint();
      this.setAlpha(1);
    }

    // Frost breath particles from core
    if (Math.random() < 0.06 && !this.isDead) {
      const g = this.scene.add.graphics();
      g.fillStyle(0xccddff, 0.3);
      g.fillCircle(this.x + Phaser.Math.Between(-8, 8), this.y + Phaser.Math.Between(-8, 8), Phaser.Math.Between(2, 4));
      this.scene.tweens.add({
        targets: g, alpha: 0, y: '-=15', duration: 600,
        onComplete: () => g.destroy()
      });
    }
  }

  getContactDamage(): number {
    return this.aiState === 'shielding' ? 1 : this.cfg.contactDamage;
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;

    // Shield blocks front-facing attacks
    if (this.aiState === 'shielding') {
      const attackFromFront = (fromX < this.x && this.flipX) || (fromX > this.x && !this.flipX);
      if (attackFromFront) {
        // Blocked! Spark effect
        const spark = this.scene.add.graphics();
        spark.fillStyle(0xeef4ff, 0.8);
        spark.fillCircle(this.x + (this.flipX ? -20 : 20), this.y, 8);
        this.scene.tweens.add({
          targets: spark, alpha: 0, scaleX: 2, scaleY: 2, duration: 200,
          onComplete: () => spark.destroy()
        });
        return false;
      }
    }

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

    // Clean up orbit shards
    this.orbitShards.forEach(g => g.destroy());
    this.orbitShards = [];

    // Clean up projectiles
    this.projectiles.clear(true, true);

    // Drop shells
    const dropCount = Phaser.Math.Between(this.cfg.dropShells.min, this.cfg.dropShells.max);
    for (let i = 0; i < dropCount; i++) {
      const pickup = new Pickup(this.scene, this.x + Phaser.Math.Between(-25, 25), this.y + Phaser.Math.Between(-15, 15), 'shells', 1);
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) gameScene.getPickupsGroup().add(pickup);
      const pb = pickup.body as Phaser.Physics.Arcade.Body;
      if (pb) {
        pb.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-140, -60));
        this.scene.time.delayedCall(200, () => {
          if (pickup.active && pb) { pb.setVelocity(0, 0); pb.moves = false; }
        });
      }
    }

    // Death: plates shatter outward
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const shard = this.scene.add.graphics();
      shard.fillStyle(Phaser.Math.RND.pick([0x556677, 0x445566, 0xaaddff, 0x66aacc]), 0.9);
      // Diamond shapes
      shard.fillTriangle(0, -6, -4, 0, 0, 6);
      shard.fillTriangle(0, -6, 4, 0, 0, 6);
      shard.setPosition(this.x, this.y);
      this.scene.tweens.add({
        targets: shard,
        x: this.x + Math.cos(angle) * 80,
        y: this.y + Math.sin(angle) * 80,
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 500,
        onComplete: () => shard.destroy()
      });
    }

    // Cyan core explosion
    const core = this.scene.add.graphics();
    core.fillStyle(0x44ddff, 0.7);
    core.fillCircle(this.x, this.y, 15);
    this.scene.tweens.add({
      targets: core, alpha: 0, scaleX: 3, scaleY: 3, duration: 400,
      onComplete: () => core.destroy()
    });

    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 200,
      onComplete: () => this.destroy()
    });
  }

  isDying(): boolean { return this.isDead; }
  getAIState(): string { return this.aiState; }
  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.cfg.hp; }
  isInvulnerable(): boolean { return this.invulnTimer > 0 || (this.aiState === 'shielding'); }
  getDisplayName(): string { return this.cfg.displayName; }
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - this.cfg.width / 2, this.y - this.cfg.height / 2, this.cfg.width, this.cfg.height);
  }
}
