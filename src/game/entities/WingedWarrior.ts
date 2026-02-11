import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Winged Warrior - Elite aerial tank from a crimson insect colony.
 * Hovers at mid-height, dives with club slams, defends airspace with wide swings.
 * Bone mask must be broken before taking real damage.
 */
type WingedAIState = 'hover' | 'reposition' | 'stallDive' | 'diving' | 'hoverSwing' | 'recover' | 'hurt' | 'dead';

export class WingedWarrior extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: WingedAIState = 'hover';
  private currentHp: number;

  private spawnX: number;
  private spawnY: number;

  // Hover
  private hoverBaseY: number;
  private hoverOffset = 0;
  private hoverSpeed = 120;
  private preferredHeight = 120; // pixels above ground

  // Timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private actionCooldown = 0;
  private actionCooldownMax = 1200;
  private stallTimer = 0;
  private stallDuration = 600;
  private diveTimer = 0;
  private diveDuration = 400;
  private swingTimer = 0;
  private swingDuration = 350;
  private recoverTimer = 0;
  private recoverDuration = 800;

  // Mask
  private maskHp = 5;
  private maskBroken = false;

  // Attack
  private swingHitbox: Phaser.Geom.Rectangle | null = null;
  private swingDealt = false;
  private diveTarget: { x: number; y: number } | null = null;

  // Club visual
  private clubGraphic: Phaser.GameObjects.Graphics | null = null;
  private clubAngle = 0;

  // State
  private isDead = false;
  private lastHitBySwingId = -1;
  private facingDir: 1 | -1 = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'wingedWarrior');

    this.spawnX = x;
    this.spawnY = y;
    this.hoverBaseY = y - this.preferredHeight;
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    this.y = this.hoverBaseY;
    this.facingDir = Math.random() > 0.5 ? 1 : -1;
    this.setFlipX(this.facingDir < 0);

    this.clubGraphic = scene.add.graphics();
    this.clubGraphic.setDepth(this.depth + 1);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateAI(player, delta);
    this.updateVisuals();
    this.drawClub();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.actionCooldown > 0) this.actionCooldown -= delta;
    this.hoverOffset += delta * 0.003;
  }

  private updateAI(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        this.aiState = 'recover';
        this.recoverTimer = this.recoverDuration * 0.5;
      }
      return;
    }
    if (this.aiState === 'dead') return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    this.facingDir = player.x < this.x ? -1 : 1;
    this.setFlipX(this.facingDir < 0);

    if (this.aiState === 'hover') {
      // Update hover base to follow player vertically
      const targetHoverY = player.y - this.preferredHeight;
      this.hoverBaseY += (targetHoverY - this.hoverBaseY) * 0.02;

      // Hover with sine wave
      const targetY = this.hoverBaseY + Math.sin(this.hoverOffset) * 15;
      body.setVelocityY((targetY - this.y) * 3);

      // Actively follow player horizontally
      const dx = player.x - this.x;
      const preferDist = 80;
      if (Math.abs(dx) > preferDist + 20) {
        body.setVelocityX(Math.sign(dx) * this.hoverSpeed);
      } else if (Math.abs(dx) < preferDist - 20) {
        body.setVelocityX(-Math.sign(dx) * this.hoverSpeed * 0.4);
      } else {
        body.setVelocityX(Math.sign(dx) * this.hoverSpeed * 0.3);
      }

      if (this.actionCooldown <= 0) {
        // Check if player is jumping toward us
        const playerBody = player.body as Phaser.Physics.Arcade.Body;
        const playerRising = playerBody && playerBody.velocity.y < -50;
        const playerClose = dist < 100 && player.y < this.y + 30;

        if (playerRising && playerClose) {
          this.startHoverSwing();
        } else if (dist < 450) {
          this.startAerialSlam(player);
        }
      }
    }

    if (this.aiState === 'stallDive') {
      this.stallTimer -= delta;
      body.setVelocity(0, -20); // Float up slightly
      this.clubAngle = -50; // Raise club
      if (this.stallTimer <= 0 && this.diveTarget) {
        this.aiState = 'diving';
        this.diveTimer = this.diveDuration;
        this.swingDealt = false;
        this.clubAngle = 70;
      }
    }

    if (this.aiState === 'diving') {
      this.diveTimer -= delta;
      if (this.diveTarget) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.diveTarget.x, this.diveTarget.y);
        const speed = 380;
        body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        // Hitbox during dive
        if (!this.swingDealt) {
          const hb = new Phaser.Geom.Rectangle(this.x - 25, this.y - 20, 50, 50);
          const playerBounds = player.getBounds();
          if (Phaser.Geom.Rectangle.Overlaps(hb, playerBounds)) {
            player.takeDamage(2, this.x);
            this.swingDealt = true;
          }
        }
      }
      if (this.diveTimer <= 0) {
        this.aiState = 'recover';
        this.recoverTimer = this.recoverDuration;
        this.diveTarget = null;
        this.clubAngle = 0;
      }
    }

    if (this.aiState === 'hoverSwing') {
      this.swingTimer -= delta;
      // Wide horizontal arc
      if (!this.swingDealt && this.swingHitbox) {
        const playerBounds = player.getBounds();
        if (Phaser.Geom.Rectangle.Overlaps(this.swingHitbox, playerBounds)) {
          player.takeDamage(2, this.x);
          this.swingDealt = true;
        }
      }
      body.setVelocity(0, 0);
      if (this.swingTimer <= 0) {
        this.swingHitbox = null;
        this.clubAngle = 0;
        this.aiState = 'recover';
        this.recoverTimer = this.recoverDuration;
      }
    }

    if (this.aiState === 'recover') {
      this.recoverTimer -= delta;
      // Float back to hover height
      const targetY = this.hoverBaseY + Math.sin(this.hoverOffset) * 15;
      body.setVelocityY((targetY - this.y) * 1.5);
      body.setVelocityX(0);
      if (this.recoverTimer <= 0) {
        this.aiState = 'hover';
        this.actionCooldown = this.actionCooldownMax;
      }
    }
  }

  private startAerialSlam(player: Player): void {
    this.aiState = 'stallDive';
    this.stallTimer = this.stallDuration;
    this.diveTarget = { x: player.x, y: player.y };
  }

  private startHoverSwing(): void {
    this.aiState = 'hoverSwing';
    this.swingTimer = this.swingDuration;
    this.swingDealt = false;
    this.clubAngle = 90;
    this.swingHitbox = new Phaser.Geom.Rectangle(
      this.x - 35, this.y - 25, 70, 50
    );
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;

    if (!this.maskBroken) {
      this.maskHp -= amount;
      if (this.maskHp <= 0) {
        this.maskBroken = true;
        this.createMaskBreakEffect();
      }
      this.aiState = 'hurt';
      this.hitstunTimer = this.cfg.hitstunMs * 0.4;
      this.invulnTimer = this.cfg.invulnOnHitMs;
      this.hurtFlashTimer = this.cfg.hurtFlashMs;
      const knockDir = this.x > fromX ? 1 : -1;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(knockDir * 20, -15);
      return true;
    }

    this.currentHp -= amount;
    this.aiState = 'hurt';
    this.hitstunTimer = this.cfg.hitstunMs;
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;

    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x * 0.5,
      -this.cfg.knockbackOnHit.y * 0.5
    );

    if (this.currentHp <= 0) this.die();
    return true;
  }

  private createMaskBreakEffect(): void {
    const flash = this.scene.add.circle(this.x, this.y - 10, 25, 0xffffff, 0.9);
    this.scene.tweens.add({
      targets: flash, alpha: 0, scale: 2, duration: 200,
      onComplete: () => flash.destroy()
    });
    for (let i = 0; i < 8; i++) {
      const frag = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-5, 5), this.y - 15,
        Phaser.Math.Between(4, 8), Phaser.Math.Between(3, 6), 0xe8dcc8
      );
      const angle = (i / 8) * Math.PI * 2;
      this.scene.tweens.add({
        targets: frag,
        x: frag.x + Math.cos(angle) * Phaser.Math.Between(30, 60),
        y: frag.y + Math.sin(angle) * Phaser.Math.Between(20, 50) + 30,
        angle: Phaser.Math.Between(-180, 180), alpha: 0,
        duration: Phaser.Math.Between(400, 700), ease: 'Power2',
        onComplete: () => frag.destroy()
      });
    }
  }

  private die(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.aiState = 'dead';
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    if (this.clubGraphic) { this.clubGraphic.destroy(); this.clubGraphic = null; }

    // Death particles
    const count = Phaser.Math.Between(12, 16);
    for (let i = 0; i < count; i++) {
      const color = [0x8a2222, 0xcc4444, 0xe8dcc8, 0x333333][i % 4];
      const p = this.scene.add.circle(
        this.x + Phaser.Math.Between(-12, 12), this.y + Phaser.Math.Between(-12, 12),
        Phaser.Math.Between(2, 6), color
      );
      const angle = (i / count) * Math.PI * 2;
      this.scene.tweens.add({
        targets: p,
        x: p.x + Math.cos(angle) * Phaser.Math.Between(30, 70),
        y: p.y + Math.sin(angle) * Phaser.Math.Between(30, 70),
        alpha: 0, scale: 0.3,
        duration: Phaser.Math.Between(250, 500), ease: 'Power2',
        onComplete: () => p.destroy()
      });
    }

    // Drop shells
    const dropCount = Phaser.Math.Between(this.cfg.dropShells.min, this.cfg.dropShells.max);
    for (let i = 0; i < dropCount; i++) {
      const pickup = new Pickup(this.scene, this.x + Phaser.Math.Between(-20, 20), this.y + Phaser.Math.Between(-10, 10), 'shells', 1);
      const gs = this.scene as any;
      if (gs.getPickupsGroup) gs.getPickupsGroup().add(pickup);
      const pb = pickup.body as Phaser.Physics.Arcade.Body;
      if (pb) {
        pb.setVelocity(Phaser.Math.Between(-60, 60), Phaser.Math.Between(-120, -60));
        this.scene.time.delayedCall(200, () => { if (pickup.active && pb) { pb.setVelocity(0, 0); pb.moves = false; } });
      }
    }

    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 1.5, scaleY: 0.5,
      duration: 200, ease: 'Power2', onComplete: () => this.destroy()
    });
  }

  private drawClub(): void {
    if (!this.clubGraphic || this.isDead) return;
    this.clubGraphic.clear();
    const cx = this.x + this.facingDir * 12;
    const cy = this.y;
    const angle = this.facingDir < 0 ? Math.PI - this.clubAngle * Math.PI / 180 : this.clubAngle * Math.PI / 180;
    const len = 26;
    const endX = cx + Math.cos(angle) * len;
    const endY = cy - Math.sin(angle) * len;
    this.clubGraphic.lineStyle(4, 0x4a3a2a);
    this.clubGraphic.lineBetween(cx, cy, endX, endY);
    this.clubGraphic.fillStyle(0xe8dcc8);
    this.clubGraphic.fillCircle(endX, endY, 6);
    this.clubGraphic.fillStyle(0xd4c8b0);
    for (let i = 0; i < 3; i++) {
      const ja = angle + (i - 1) * 0.5;
      this.clubGraphic.fillTriangle(endX, endY, endX + Math.cos(ja) * 9, endY - Math.sin(ja) * 9, endX + Math.cos(ja + 0.3) * 7, endY - Math.sin(ja + 0.3) * 7);
    }
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTexture(this.maskBroken ? 'wingedWarrior_unmasked_hurt' : 'wingedWarrior_hurt');
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      this.setTexture(this.maskBroken ? 'wingedWarrior_unmasked' : 'wingedWarrior');
      this.setAlpha(1);
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.clubGraphic) { this.clubGraphic.destroy(); this.clubGraphic = null; }
    super.destroy(fromScene);
  }

  getContactDamage(): number { return this.cfg.contactDamage; }
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - this.cfg.width / 2, this.y - this.cfg.height / 2, this.cfg.width, this.cfg.height);
  }
  isDying(): boolean { return this.isDead; }
  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.cfg.hp; }
  isMaskBroken(): boolean { return this.maskBroken; }
  isInvulnerable(): boolean { return this.invulnTimer > 0; }
  getDisplayName(): string { return this.cfg.displayName; }
}
