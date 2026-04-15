import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';
import gameState from '../core/GameState';

/**
 * Warfield Brute - Hulking heavy-hitter for the Autumn Warfield.
 *
 * Slow, deliberate, immune to knockback. Punishes greedy players.
 * - Walks with screen-shake footsteps
 * - Cleaving Arc: 1s sword-drag telegraph → massive 180° swing (3 dmg)
 * - Shield Bash: fast horizontal stun if player lingers in front (1 dmg)
 * - Turns slowly but pivots quickly when flanked
 */
type BruteState = 'patrol' | 'pursue' | 'swordDrag' | 'cleave' | 'shieldBash' | 'recover' | 'hurt' | 'dead';

export class WarfieldBrute extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: BruteState = 'patrol';
  private currentHp: number;
  private maxHp: number;

  // Movement
  private facing: 1 | -1 = -1;
  private footstepTimer = 0;
  private readonly FOOTSTEP_INTERVAL = 600;
  private pivotCooldown = 0;

  // Cleaving Arc attack
  private dragTimer = 0;
  private readonly DRAG_DURATION = 1000; // 1s telegraph
  private cleaveTimer = 0;
  private readonly CLEAVE_DURATION = 400;
  private cleaveDamageDealt = false;
  private cleaveCooldown = 0;
  private readonly CLEAVE_COOLDOWN = 3500;

  // Shield Bash
  private playerInFrontTimer = 0;
  private readonly BASH_TRIGGER_TIME = 1200; // player in front for 1.2s triggers bash
  private bashTimer = 0;
  private readonly BASH_DURATION = 300;
  private bashDamageDealt = false;
  private bashCooldown = 0;
  private readonly BASH_COOLDOWN = 4000;

  // Recovery after attacks
  private recoverTimer = 0;
  private readonly RECOVER_DURATION = 800;

  // Combat
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private isDead = false;
  private lastHitBySwingId = -1;

  // Visuals
  private bodyGfx: Phaser.GameObjects.Graphics | null = null;
  private swordGfx: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'warfieldBrute');

    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    this.maxHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMass(8); // Very heavy
    body.setMaxVelocityX(60);

    this.facing = Math.random() > 0.5 ? 1 : -1;
    this.setFlipX(this.facing < 0);

    this.bodyGfx = scene.add.graphics();
    this.swordGfx = scene.add.graphics();
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateAI(player, delta);
    this.drawVisuals(player);
    this.updateSpriteVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hisstunDecr(delta);
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.cleaveCooldown > 0) this.cleaveCooldown -= delta;
    if (this.bashCooldown > 0) this.bashCooldown -= delta;
    if (this.pivotCooldown > 0) this.pivotCooldown -= delta;
  }

  private hisstunDecr(delta: number): void {
    this.hitstunTimer -= delta;
  }

  private updateAI(player: Player, delta: number): void {
    if (!player || !player.active) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    const playerDir = dx > 0 ? 1 : -1;
    const playerInFront = playerDir === this.facing;
    const playerBehind = !playerInFront;

    switch (this.aiState) {
      case 'patrol': {
        body.setVelocityX(this.facing * this.cfg.moveSpeedPatrol);

        // Footstep screen shake
        this.footstepTimer -= delta;
        if (this.footstepTimer <= 0 && body.blocked.down) {
          this.footstepTimer = this.FOOTSTEP_INTERVAL;
          this.scene.cameras.main.shake(80, 0.003);
        }

        // Aggro
        if (dist < this.cfg.aggroRangePx) {
          this.aiState = 'pursue';
        }

        // Edge detection - turn at edges
        if (body.blocked.left) this.facing = 1;
        if (body.blocked.right) this.facing = -1;
        this.setFlipX(this.facing < 0);
        break;
      }

      case 'pursue': {
        // Slow deliberate walk toward player
        this.facing = playerDir as 1 | -1;
        this.setFlipX(this.facing < 0);
        body.setVelocityX(this.facing * this.cfg.moveSpeedAggro);

        // Footstep shake
        this.footstepTimer -= delta;
        if (this.footstepTimer <= 0 && body.blocked.down) {
          this.footstepTimer = this.FOOTSTEP_INTERVAL;
          this.scene.cameras.main.shake(100, 0.004);
        }

        // Track player-in-front time for shield bash
        if (playerInFront && dist < 100) {
          this.playerInFrontTimer += delta;
        } else {
          this.playerInFrontTimer = Math.max(0, this.playerInFrontTimer - delta * 0.5);
        }

        // Quick pivot if player is behind
        if (playerBehind && dist < 120 && this.pivotCooldown <= 0) {
          this.facing = (this.facing * -1) as 1 | -1;
          this.setFlipX(this.facing < 0);
          this.pivotCooldown = 1500;
          // Pivot grunt shake
          this.scene.cameras.main.shake(60, 0.005);
        }

        // Shield bash if player stays in front too long
        if (this.playerInFrontTimer > this.BASH_TRIGGER_TIME && this.bashCooldown <= 0 && dist < 90) {
          this.aiState = 'shieldBash';
          this.bashTimer = this.BASH_DURATION;
          this.bashDamageDealt = false;
          this.playerInFrontTimer = 0;
          body.setVelocityX(0);
          break;
        }

        // Cleaving arc when in range
        if (dist < 130 && this.cleaveCooldown <= 0) {
          this.aiState = 'swordDrag';
          this.dragTimer = this.DRAG_DURATION;
          body.setVelocityX(0);
        }

        // Deaggro
        if (dist > this.cfg.deaggroRangePx) {
          this.aiState = 'patrol';
          this.playerInFrontTimer = 0;
        }
        break;
      }

      case 'swordDrag': {
        // 1 second telegraph - dragging sword on ground, creating sparks
        body.setVelocityX(0);
        this.dragTimer -= delta;

        if (this.dragTimer <= 0) {
          this.aiState = 'cleave';
          this.cleaveTimer = this.CLEAVE_DURATION;
          this.cleaveDamageDealt = false;
        }
        break;
      }

      case 'cleave': {
        body.setVelocityX(0);
        this.cleaveTimer -= delta;

        // Damage at peak of swing
        if (this.cleaveTimer < this.CLEAVE_DURATION * 0.5 && !this.cleaveDamageDealt) {
          this.cleaveDamageDealt = true;
          // Wide 180° arc - covers both in front and slightly behind
          const cleaveRange = 120;
          if (dist < cleaveRange) {
            // 3 hearts damage!
            gameState.damage(3);
            const kb = dx > 0 ? -400 : 400;
            const playerBody = player.body as Phaser.Physics.Arcade.Body;
            playerBody.setVelocity(kb, -250);
          }
          // Heavy slam shake
          this.scene.cameras.main.shake(300, 0.012);
        }

        if (this.cleaveTimer <= 0) {
          this.cleaveCooldown = this.CLEAVE_COOLDOWN;
          this.aiState = 'recover';
          this.recoverTimer = this.RECOVER_DURATION;
        }
        break;
      }

      case 'shieldBash': {
        body.setVelocityX(this.facing * 200); // Lunge forward
        this.bashTimer -= delta;

        if (this.bashTimer < this.BASH_DURATION * 0.4 && !this.bashDamageDealt) {
          this.bashDamageDealt = true;
          if (dist < 80 && playerInFront) {
            gameState.damage(1);
            const kb = this.facing * 300;
            const playerBody = player.body as Phaser.Physics.Arcade.Body;
            playerBody.setVelocity(kb, -100);
            // Stun effect: slow player briefly
            this.scene.time.delayedCall(100, () => {
              if (player.active) {
                (player.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
              }
            });
          }
          this.scene.cameras.main.shake(150, 0.008);
        }

        if (this.bashTimer <= 0) {
          this.bashCooldown = this.BASH_COOLDOWN;
          this.aiState = 'recover';
          this.recoverTimer = this.RECOVER_DURATION * 0.6;
          body.setVelocityX(0);
        }
        break;
      }

      case 'recover': {
        body.setVelocityX(0);
        this.recoverTimer -= delta;
        if (this.recoverTimer <= 0) {
          this.aiState = 'pursue';
        }
        break;
      }

      case 'hurt': {
        if (this.hitstunTimer <= 0) {
          this.aiState = 'pursue';
        }
        break;
      }
    }
  }

  private drawVisuals(player: Player): void {
    if (!this.bodyGfx || !this.swordGfx) return;
    this.bodyGfx.clear();
    this.swordGfx.clear();

    const x = this.x;
    const y = this.y;
    const f = this.facing;

    // Hulking body - dark brown fur
    this.bodyGfx.fillStyle(0x332211, 0.95);
    this.bodyGfx.fillEllipse(x, y + 5, 50, 55);

    // Bronze armor plates
    this.bodyGfx.fillStyle(0x886633, 0.9);
    this.bodyGfx.fillEllipse(x - f * 8, y - 10, 30, 25); // Shoulder plate
    this.bodyGfx.fillEllipse(x + f * 5, y + 15, 25, 20); // Hip plate

    // Fur texture lines
    this.bodyGfx.lineStyle(1, 0x221100, 0.5);
    for (let i = -3; i <= 3; i++) {
      this.bodyGfx.lineBetween(x - 15, y + i * 8, x + 15, y + i * 8 + 3);
    }

    // Legs - thick stumps
    this.bodyGfx.fillStyle(0x2a1a0a, 0.9);
    this.bodyGfx.fillEllipse(x - 12, y + 28, 18, 14);
    this.bodyGfx.fillEllipse(x + 12, y + 28, 18, 14);

    // Bronze helmet
    this.bodyGfx.fillStyle(0x997744, 0.95);
    this.bodyGfx.fillEllipse(x, y - 22, 28, 24);
    // Vent holes
    this.bodyGfx.fillStyle(0x111111, 1);
    for (let i = 0; i < 4; i++) {
      this.bodyGfx.fillCircle(x - 6 + i * 4, y - 25, 1.5);
    }
    // Helmet ridge
    this.bodyGfx.lineStyle(2, 0xaa8855, 0.8);
    this.bodyGfx.lineBetween(x - 12, y - 32, x + 12, y - 32);

    // Off-hand shield arm
    this.bodyGfx.fillStyle(0x776633, 0.8);
    this.bodyGfx.fillRoundedRect(x - f * 22, y - 5, 12, 20, 3);

    // SICKLE-SWORD visual
    const swordBaseX = x + f * 25;
    const swordBaseY = y;

    if (this.aiState === 'swordDrag') {
      // Sword dragging on ground - horizontal with sparks
      const dragPct = 1 - this.dragTimer / this.DRAG_DURATION;
      this.swordGfx.lineStyle(4, 0x666666, 0.9);
      this.swordGfx.lineBetween(swordBaseX, swordBaseY, swordBaseX + f * 60, y + 25);
      // Jagged edge
      this.swordGfx.lineStyle(2, 0x888888, 0.7);
      for (let i = 0; i < 5; i++) {
        const sx = swordBaseX + f * (12 + i * 10);
        this.swordGfx.lineBetween(sx, y + 22, sx + f * 3, y + 18);
      }
      // Spark particles
      if (dragPct > 0.2) {
        for (let i = 0; i < 2; i++) {
          const sparkX = swordBaseX + f * (30 + Math.random() * 30);
          const spark = this.scene.add.circle(sparkX, y + 26, 2, 0xffaa44, 0.9);
          this.scene.tweens.add({
            targets: spark, y: y + 10, alpha: 0, duration: 200,
            onComplete: () => spark.destroy()
          });
        }
      }
    } else if (this.aiState === 'cleave') {
      // Sweeping arc animation
      const cleavePct = 1 - this.cleaveTimer / this.CLEAVE_DURATION;
      const sweepAngle = -Math.PI * 0.8 + cleavePct * Math.PI; // 180° sweep
      const swordLen = 65;
      const tipX = swordBaseX + Math.cos(sweepAngle) * swordLen * f;
      const tipY = swordBaseY + Math.sin(sweepAngle) * swordLen;

      this.swordGfx.lineStyle(5, 0x777777, 1);
      this.swordGfx.lineBetween(swordBaseX, swordBaseY, tipX, tipY);
      // Sweep trail
      this.swordGfx.lineStyle(2, 0xffaa44, 0.4);
      for (let t = 0; t < 3; t++) {
        const trailAngle = sweepAngle - t * 0.15;
        const tx = swordBaseX + Math.cos(trailAngle) * swordLen * f;
        const ty = swordBaseY + Math.sin(trailAngle) * swordLen;
        this.swordGfx.lineBetween(swordBaseX, swordBaseY, tx, ty);
      }
    } else if (this.aiState === 'shieldBash') {
      // Shield bash - arm thrust forward
      this.bodyGfx.fillStyle(0x998866, 0.9);
      this.bodyGfx.fillRoundedRect(x + f * 20, y - 8, 18, 25, 4);
      // Impact lines
      this.bodyGfx.lineStyle(2, 0xffcc88, 0.6);
      this.bodyGfx.lineBetween(x + f * 38, y - 5, x + f * 45, y - 8);
      this.bodyGfx.lineBetween(x + f * 38, y + 5, x + f * 45, y + 8);
      // Sword held back
      this.swordGfx.lineStyle(4, 0x666666, 0.7);
      this.swordGfx.lineBetween(swordBaseX - f * 10, swordBaseY, swordBaseX - f * 10, swordBaseY - 55);
    } else {
      // Idle/walking - sword held vertically
      this.swordGfx.lineStyle(4, 0x666666, 0.9);
      this.swordGfx.lineBetween(swordBaseX, swordBaseY, swordBaseX + f * 5, swordBaseY - 55);
      // Jagged edge
      this.swordGfx.lineStyle(2, 0x888888, 0.6);
      for (let i = 0; i < 4; i++) {
        const sy = swordBaseY - 10 - i * 12;
        this.swordGfx.lineBetween(swordBaseX + f * 5, sy, swordBaseX + f * 10, sy - 4);
      }
      // Sword hilt
      this.swordGfx.fillStyle(0x554422, 1);
      this.swordGfx.fillRect(swordBaseX - 4, swordBaseY - 2, 8, 8);
    }

    // Recovery: panting visual
    if (this.aiState === 'recover') {
      const breathe = Math.sin(Date.now() * 0.008) * 2;
      this.bodyGfx.fillStyle(0x332211, 0.3);
      this.bodyGfx.fillEllipse(x, y + breathe, 54, 58);
    }
  }

  private updateSpriteVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else if (this.aiState === 'swordDrag') {
      this.setTint(0xffccaa); // Warming up tint
    } else if (this.aiState === 'recover') {
      this.setTint(0x999999); // Fatigued
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
    this.hurtFlashTimer = this.cfg.hurtFlashMs;
    this.invulnTimer = this.cfg.invulnOnHitMs;

    if (this.currentHp <= 0) {
      this.die();
      return true;
    }

    // NO knockback - immune to it. Brief hurt state only.
    this.aiState = 'hurt';
    this.hitstunTimer = 200;
    // No velocity change - stands firm

    return true;
  }

  private die(): void {
    this.isDead = true;
    this.aiState = 'dead';
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    // Heavy death: screen shake + collapse
    this.scene.cameras.main.shake(500, 0.02);

    // Armor chunks fly off
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const chunk = this.scene.add.rectangle(
        this.x + Math.cos(angle) * 10,
        this.y + Math.sin(angle) * 10,
        Phaser.Math.Between(6, 14),
        Phaser.Math.Between(6, 14),
        Phaser.Math.RND.pick([0x886633, 0x554422, 0x332211, 0x666666]),
        0.9
      );
      this.scene.tweens.add({
        targets: chunk,
        x: chunk.x + Math.cos(angle) * Phaser.Math.Between(50, 120),
        y: chunk.y + Math.sin(angle) * Phaser.Math.Between(50, 120) - 40,
        rotation: Phaser.Math.Between(-4, 4),
        alpha: 0,
        duration: Phaser.Math.Between(800, 1500),
        onComplete: () => chunk.destroy()
      });
    }

    // Drop shells
    const shells = Phaser.Math.Between(this.cfg.dropShells.min, this.cfg.dropShells.max);
    const pickup = new Pickup(this.scene, this.x, this.y - 10, 'shell', shells);
    const enemies = (this.scene as any).enemies;
    if (enemies) enemies.add(pickup);

    // Collapse and destroy
    this.scene.tweens.add({
      targets: this,
      alpha: 0, y: this.y + 15, angle: this.facing * 90,
      duration: 700,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.bodyGfx?.destroy();
        this.swordGfx?.destroy();
        this.destroy();
      }
    });
  }

  getContactDamage(): number {
    return this.cfg.contactDamage;
  }

  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.maxHp; }
  isDying(): boolean { return this.isDead; }
  isInvulnerable(): boolean { return this.invulnTimer > 0; }
  getDisplayName(): string { return this.cfg.displayName; }
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.cfg.width / 2,
      this.y - this.cfg.height / 2,
      this.cfg.width,
      this.cfg.height
    );
  }
}
