import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Frontier Scout - Tactical skirmisher from a crimson insect colony.
 * Maintains distance, throws boomerang rings, switches to melee if cornered.
 */
type ScoutAIState = 'patrol' | 'skirmish' | 'throwing' | 'melee' | 'retreating' | 'hurt' | 'dead';

export class FrontierScout extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: ScoutAIState = 'patrol';
  private currentHp: number;

  // Spawn
  private spawnX: number;
  private spawnY: number;

  // Movement
  private patrolDir: 1 | -1 = 1;
  private dashTimer = 0;
  private dashCooldown = 1200;
  private isDashing = false;
  private dashDuration = 0;

  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;

  // Ranged
  private throwTimer = 0;
  private throwCooldown = 2500;
  private projectiles: Phaser.GameObjects.Group;

  // Melee
  private meleeTimer = 0;
  private meleeCooldown = 600;
  private meleeActive = false;
  private meleeHitbox: Phaser.Geom.Rectangle | null = null;

  // Preferred distances
  private preferredDist = 160;
  private tooCloseDist = 70;
  private meleeDist = 50;

  // State
  private isDead = false;
  private lastHitBySwingId = -1;
  private retreatTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'frontierScout');

    this.spawnX = x;
    this.spawnY = y;
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);

    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.setFlipX(this.patrolDir < 0);

    this.projectiles = scene.add.group();
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateAIState(player, delta);
    this.applyMovement(player, delta);
    this.updateProjectiles(player, delta);
    this.updateMelee(player, delta);
    this.updateVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.dashTimer > 0) this.dashTimer -= delta;
    if (this.throwTimer > 0) this.throwTimer -= delta;
    if (this.meleeTimer > 0) this.meleeTimer -= delta;
    if (this.retreatTimer > 0) this.retreatTimer -= delta;
    if (this.dashDuration > 0) {
      this.dashDuration -= delta;
      if (this.dashDuration <= 0) this.isDashing = false;
    }
  }

  private updateAIState(player: Player, delta: number): void {
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (dist < this.meleeDist) {
          this.aiState = 'melee';
        } else {
          this.aiState = 'retreating';
          this.retreatTimer = 400;
        }
      }
      return;
    }
    if (this.aiState === 'dead') return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (this.aiState === 'retreating') {
      if (this.retreatTimer <= 0) {
        this.aiState = dist < this.cfg.aggroRangePx ? 'skirmish' : 'patrol';
      }
      return;
    }

    if (this.aiState === 'patrol') {
      if (dist < this.cfg.aggroRangePx) {
        this.aiState = 'skirmish';
      }
    } else if (this.aiState === 'skirmish') {
      if (dist > this.cfg.deaggroRangePx) {
        this.aiState = 'patrol';
      } else if (dist < this.meleeDist) {
        this.aiState = 'melee';
      }
    } else if (this.aiState === 'melee') {
      if (dist > this.tooCloseDist + 30) {
        this.aiState = 'retreating';
        this.retreatTimer = 300;
      }
    }
  }

  private applyMovement(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.aiState) {
      case 'patrol': {
        if (body.blocked.left) this.patrolDir = 1;
        else if (body.blocked.right) this.patrolDir = -1;

        // Edge check
        if (body.blocked.down) {
          const checkX = this.x + this.patrolDir * (this.cfg.width / 2 + 20);
          const checkY = this.y + this.cfg.height / 2 + 10;
          const ground = this.scene.physics.overlapRect(checkX - 2, checkY, 4, 20, true, false);
          if (ground.length === 0) this.patrolDir = -this.patrolDir as 1 | -1;
        }

        body.setVelocityX(this.patrolDir * this.cfg.moveSpeedPatrol);
        this.setFlipX(this.patrolDir < 0);
        break;
      }

      case 'skirmish': {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const dir = player.x > this.x ? 1 : -1;
        this.setFlipX(dir < 0);

        if (dist < this.tooCloseDist) {
          // Back away with a jerky dash
          if (this.dashTimer <= 0 && !this.isDashing) {
            this.isDashing = true;
            this.dashDuration = 200;
            this.dashTimer = this.dashCooldown;
            body.setVelocityX(-dir * this.cfg.moveSpeedAggro * 1.5);
            body.setVelocityY(-80);
          } else if (!this.isDashing) {
            body.setVelocityX(-dir * this.cfg.moveSpeedAggro * 0.6);
          }
        } else if (dist > this.preferredDist + 30) {
          // Close in
          body.setVelocityX(dir * this.cfg.moveSpeedAggro * 0.5);
        } else {
          // At ideal range - throw rings
          body.setVelocityX(0);
          if (this.throwTimer <= 0) {
            this.throwRing(player);
            this.throwTimer = this.throwCooldown;
          }
        }
        break;
      }

      case 'melee': {
        const dir = player.x > this.x ? 1 : -1;
        this.setFlipX(dir < 0);
        // Quick stab then jump away
        if (this.meleeTimer <= 0 && !this.meleeActive) {
          this.meleeActive = true;
          this.meleeTimer = this.meleeCooldown;
          // Create melee hitbox briefly
          const hbX = this.x + dir * 25;
          this.meleeHitbox = new Phaser.Geom.Rectangle(hbX - 15, this.y - 10, 30, 20);

          // Visual stab effect
          const stab = this.scene.add.rectangle(hbX, this.y, 30, 4, 0xccccaa, 0.8);
          this.scene.tweens.add({
            targets: stab,
            alpha: 0,
            scaleX: 0.3,
            duration: 150,
            onComplete: () => stab.destroy()
          });

          // After stab, jump away
          this.scene.time.delayedCall(120, () => {
            this.meleeActive = false;
            this.meleeHitbox = null;
            if (!this.isDead) {
              body.setVelocityX(-dir * 250);
              body.setVelocityY(-180);
              this.aiState = 'retreating';
              this.retreatTimer = 500;
            }
          });
        }
        break;
      }

      case 'retreating': {
        const dir = player.x > this.x ? 1 : -1;
        this.setFlipX(dir < 0);
        // Dash away from player
        if (!this.isDashing && body.blocked.down) {
          body.setVelocityX(-dir * this.cfg.moveSpeedAggro * 0.8);
        }
        break;
      }

      case 'hurt':
        break;

      case 'dead':
        body.setVelocityX(0);
        break;
    }
  }

  private throwRing(player: Player): void {
    const dir = player.x > this.x ? 1 : -1;

    // Create ring projectile
    const ring = this.scene.add.ellipse(this.x + dir * 15, this.y - 5, 14, 14);
    ring.setStrokeStyle(3, 0xeeddcc);
    ring.setFillStyle(0x000000, 0);
    this.scene.physics.add.existing(ring);

    const ringBody = ring.body as Phaser.Physics.Arcade.Body;
    ringBody.setAllowGravity(false);

    // Throw toward player with slight arc
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = 220;
    ringBody.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 40
    );

    // Store data for boomerang
    (ring as any).lifetime = 0;
    (ring as any).maxTravel = 300;
    (ring as any).returning = false;
    (ring as any).ownerX = this.x;
    (ring as any).ownerY = this.y;
    (ring as any).spinAngle = 0;

    this.projectiles.add(ring);

    // Flash on throw
    this.setTint(0xffccaa);
    this.scene.time.delayedCall(80, () => {
      if (!this.isDead) this.clearTint();
    });
  }

  private updateProjectiles(player: Player, delta: number): void {
    const playerBounds = player.getBounds();

    this.projectiles.getChildren().forEach((proj) => {
      const ring = proj as Phaser.GameObjects.Ellipse;
      if (!ring.active) return;

      const data = ring as any;
      data.lifetime += delta;

      // Spin the ring visually
      data.spinAngle += delta * 0.015;
      ring.setRotation(data.spinAngle);

      // Boomerang logic
      if (!data.returning) {
        const traveled = Phaser.Math.Distance.Between(data.ownerX, data.ownerY, ring.x, ring.y);
        if (traveled >= data.maxTravel || data.lifetime > 800) {
          data.returning = true;
        }
      }

      if (data.returning) {
        // Return toward scout's current position
        const angle = Phaser.Math.Angle.Between(ring.x, ring.y, this.x, this.y);
        const returnSpeed = 250;
        const ringBody = ring.body as Phaser.Physics.Arcade.Body;
        ringBody.setVelocity(
          Math.cos(angle) * returnSpeed,
          Math.sin(angle) * returnSpeed
        );

        // Destroy if back near scout
        const distBack = Phaser.Math.Distance.Between(ring.x, ring.y, this.x, this.y);
        if (distBack < 20) {
          ring.destroy();
          return;
        }
      }

      // Check player collision
      const ringBounds = ring.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(ringBounds, playerBounds)) {
        player.takeDamage(1, ring.x);
        ring.destroy();
        return;
      }

      // Timeout safety
      if (data.lifetime > 4000) {
        ring.destroy();
      }
    });
  }

  private updateMelee(player: Player, delta: number): void {
    if (!this.meleeActive || !this.meleeHitbox) return;

    const playerBounds = player.getBounds();
    if (Phaser.Geom.Rectangle.Overlaps(this.meleeHitbox, playerBounds)) {
      player.takeDamage(this.cfg.contactDamage, this.x);
      this.meleeActive = false;
      this.meleeHitbox = null;
    }
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      this.clearTint();
      this.setAlpha(1);
    }
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

    // Destroy projectiles
    this.projectiles.getChildren().forEach(p => p.destroy());

    // Death particles - crimson
    this.createDeathParticles();

    // Drop shells
    const dropCount = Phaser.Math.Between(this.cfg.dropShells.min, this.cfg.dropShells.max);
    for (let i = 0; i < dropCount; i++) {
      const offsetX = Phaser.Math.Between(-20, 20);
      const offsetY = Phaser.Math.Between(-10, 10);
      const pickup = new Pickup(this.scene, this.x + offsetX, this.y + offsetY, 'shells', 1);
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) gameScene.getPickupsGroup().add(pickup);
      const pickupBody = pickup.body as Phaser.Physics.Arcade.Body;
      if (pickupBody) {
        pickupBody.setVelocity(Phaser.Math.Between(-60, 60), Phaser.Math.Between(-120, -60));
        this.scene.time.delayedCall(200, () => {
          if (pickup.active && pickupBody) {
            pickupBody.setVelocity(0, 0);
            pickupBody.moves = false;
          }
        });
      }
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 0.5,
      duration: 200,
      ease: 'Power2',
      onComplete: () => this.destroy()
    });
  }

  private createDeathParticles(): void {
    const count = Phaser.Math.Between(10, 14);
    for (let i = 0; i < count; i++) {
      const color = i % 3 === 0 ? 0x8a2222 : i % 3 === 1 ? 0xcc4444 : 0x1a1a1a;
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-10, 10),
        this.y + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(2, 5),
        color
      );
      const angle = (i / count) * Math.PI * 2;
      const dist = Phaser.Math.Between(30, 60);
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * dist,
        y: particle.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(250, 450),
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    const flash = this.scene.add.circle(this.x, this.y, 20, 0xaa3333, 0.7);
    this.scene.tweens.add({
      targets: flash,
      radius: 35,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
  }

  // Public getters
  getContactDamage(): number { return this.cfg.contactDamage; }
  
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.cfg.width / 2,
      this.y - this.cfg.height / 2,
      this.cfg.width,
      this.cfg.height
    );
  }
  
  isDying(): boolean { return this.isDead; }
  getAIState(): ScoutAIState { return this.aiState; }
  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.cfg.hp; }
  isInvulnerable(): boolean { return this.invulnTimer > 0; }
  getDisplayName(): string { return this.cfg.displayName; }
}
