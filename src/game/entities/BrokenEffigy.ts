import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';
import gameState from '../core/GameState';

/**
 * Broken Effigy - Autumn Warfield mini-boss.
 *
 * A grotesque crawling fusion of dead bodies with a chest-eye weak point.
 * - Scuttles on all fours with erratic, jerky movement
 * - Soul-Gaze Beam: piercing beam from chest eye that slows the player
 * - Flailing Limb Swarm: wide melee knockback when player is close
 * - Mirror Mechanic: mimics player stance, becomes invulnerable, reflects damage
 * - Only vulnerable when the chest eye is exposed (after baiting limb flail)
 */
type EffigyState =
  | 'scuttle'
  | 'soulGaze'
  | 'limbFlail'
  | 'mirror'
  | 'exposed'
  | 'hurt'
  | 'dead';

export class BrokenEffigy extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: EffigyState = 'scuttle';
  private currentHp: number;
  private maxHp: number;

  // Movement
  private scuttleDir: 1 | -1 = 1;
  private scuttleChangeTimer = 0;
  private readonly SCUTTLE_CHANGE_MIN = 400;
  private readonly SCUTTLE_CHANGE_MAX = 1200;
  private scuttleSpeed = 90;
  private jerkTimer = 0;
  private readonly JERK_INTERVAL = 200;

  // Soul-Gaze Beam
  private gazeChargeTimer = 0;
  private readonly GAZE_CHARGE_DURATION = 1200;
  private gazeFireTimer = 0;
  private readonly GAZE_FIRE_DURATION = 1800;
  private gazeCooldown = 0;
  private readonly GAZE_COOLDOWN = 5000;
  private beamGraphics: Phaser.GameObjects.Graphics | null = null;
  private gazeDamageTickTimer = 0;

  // Limb Flail
  private flailTimer = 0;
  private readonly FLAIL_DURATION = 800;
  private flailCooldown = 0;
  private readonly FLAIL_COOLDOWN = 3000;
  private flailDamageDealt = false;

  // Mirror Mechanic
  private mirrorTimer = 0;
  private readonly MIRROR_DURATION = 2500;
  private mirrorCooldown = 0;
  private readonly MIRROR_COOLDOWN = 12000;
  private mirrorReflectDamage = 0;

  // Exposed window (after limb flail)
  private exposedTimer = 0;
  private readonly EXPOSED_DURATION = 2000;

  // Eye shielded state
  private eyeShielded = true;

  // Combat
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private isDead = false;
  private lastHitBySwingId = -1;

  // Action cooldown (between major attacks)
  private actionCooldown = 2000;

  // Visuals
  private bodyGfx: Phaser.GameObjects.Graphics | null = null;
  private eyeGfx: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'brokenEffigy');

    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    this.maxHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMass(4);

    this.scuttleDir = Math.random() > 0.5 ? 1 : -1;
    this.scuttleChangeTimer = this.randomScuttleInterval();

    this.bodyGfx = scene.add.graphics();
    this.eyeGfx = scene.add.graphics();
    this.beamGraphics = scene.add.graphics();
  }

  private randomScuttleInterval(): number {
    return Phaser.Math.Between(this.SCUTTLE_CHANGE_MIN, this.SCUTTLE_CHANGE_MAX);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateAI(player, delta);
    this.drawVisuals(player);
    this.updateSpriteVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.gazeCooldown > 0) this.gazeCooldown -= delta;
    if (this.flailCooldown > 0) this.flailCooldown -= delta;
    if (this.mirrorCooldown > 0) this.mirrorCooldown -= delta;
    if (this.actionCooldown > 0) this.actionCooldown -= delta;
  }

  private updateAI(player: Player, delta: number): void {
    if (!player || !player.active) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    const facing = dx > 0 ? 1 : -1;

    switch (this.aiState) {
      case 'scuttle': {
        // Erratic jerky movement
        this.jerkTimer -= delta;
        if (this.jerkTimer <= 0) {
          this.jerkTimer = this.JERK_INTERVAL;
          // Occasional vertical jerk
          if (body.blocked.down && Math.random() < 0.3) {
            body.setVelocityY(-120 - Math.random() * 80);
          }
        }

        this.scuttleChangeTimer -= delta;
        if (this.scuttleChangeTimer <= 0) {
          this.scuttleDir = (this.scuttleDir * -1) as 1 | -1;
          this.scuttleChangeTimer = this.randomScuttleInterval();
        }

        // Bias toward player
        const biasDir = dx > 0 ? 1 : -1;
        const moveDir = Math.random() < 0.7 ? biasDir : this.scuttleDir;
        body.setVelocityX(moveDir * this.scuttleSpeed);
        this.setFlipX(moveDir < 0);

        if (this.actionCooldown <= 0) {
          // Choose attack based on distance
          if (dist < 80 && this.flailCooldown <= 0) {
            this.aiState = 'limbFlail';
            this.flailTimer = this.FLAIL_DURATION;
            this.flailDamageDealt = false;
            this.eyeShielded = true;
            body.setVelocityX(0);
          } else if (dist < 300 && this.gazeCooldown <= 0) {
            this.aiState = 'soulGaze';
            this.gazeChargeTimer = this.GAZE_CHARGE_DURATION;
            this.gazeFireTimer = 0;
            body.setVelocityX(0);
          } else if (this.mirrorCooldown <= 0 && Math.random() < 0.15) {
            this.aiState = 'mirror';
            this.mirrorTimer = this.MIRROR_DURATION;
            this.mirrorReflectDamage = 0;
            body.setVelocityX(0);
          }
        }
        break;
      }

      case 'soulGaze': {
        body.setVelocityX(0);
        this.setFlipX(dx < 0);

        if (this.gazeChargeTimer > 0) {
          this.gazeChargeTimer -= delta;
          // Eye pulsing charge visual
        } else {
          // Firing beam
          if (this.gazeFireTimer === 0) {
            this.gazeFireTimer = this.GAZE_FIRE_DURATION;
          }
          this.gazeFireTimer -= delta;
          this.gazeDamageTickTimer -= delta;

          // Beam damage + slow effect
          if (this.gazeDamageTickTimer <= 0) {
            this.gazeDamageTickTimer = 400; // Tick every 400ms
            // Check if beam hits player
            const beamAngle = Math.atan2(player.y - this.y, player.x - this.x);
            const beamEndX = this.x + Math.cos(beamAngle) * 280;
            const beamEndY = this.y + Math.sin(beamAngle) * 280;

            // Simple line-to-rect collision
            const playerBounds = player.getBounds();
            const beamLine = new Phaser.Geom.Line(this.x, this.y, beamEndX, beamEndY);
            if (Phaser.Geom.Intersects.LineToRectangle(beamLine, playerBounds)) {
              gameState.damage(2);
              // Slow effect: reduce player velocity temporarily
              const playerBody = player.body as Phaser.Physics.Arcade.Body;
              playerBody.setVelocityX(playerBody.velocity.x * 0.4);
            }
          }

          if (this.gazeFireTimer <= 0) {
            this.gazeCooldown = this.GAZE_COOLDOWN;
            this.actionCooldown = 1500;
            this.aiState = 'scuttle';
          }
        }
        break;
      }

      case 'limbFlail': {
        this.flailTimer -= delta;
        body.setVelocityX(0);

        // Wide arc damage at peak of flail
        if (this.flailTimer < this.FLAIL_DURATION * 0.5 && !this.flailDamageDealt) {
          this.flailDamageDealt = true;
          // Wide damage zone
          if (dist < 120) {
            gameState.damage(2);
            const kb = dx > 0 ? -350 : 350;
            const playerBody = player.body as Phaser.Physics.Arcade.Body;
            playerBody.setVelocity(kb, -200);
          }
        }

        if (this.flailTimer <= 0) {
          this.flailCooldown = this.FLAIL_COOLDOWN;
          // After flail, eye is exposed!
          this.eyeShielded = false;
          this.aiState = 'exposed';
          this.exposedTimer = this.EXPOSED_DURATION;
        }
        break;
      }

      case 'exposed': {
        // Vulnerable window - eye is open
        this.exposedTimer -= delta;
        body.setVelocityX(0);

        // Slight trembling
        this.x += (Math.random() - 0.5) * 2;

        if (this.exposedTimer <= 0) {
          this.eyeShielded = true;
          this.actionCooldown = 1000;
          this.aiState = 'scuttle';
        }
        break;
      }

      case 'mirror': {
        this.mirrorTimer -= delta;
        body.setVelocityX(0);

        // Face the player during mirror
        this.setFlipX(dx < 0);

        if (this.mirrorTimer <= 0) {
          // Reflect accumulated damage
          if (this.mirrorReflectDamage > 0 && dist < 200) {
            gameState.damage(this.mirrorReflectDamage);
            // Visual burst
            this.scene.cameras.main.shake(200, 0.01);
          }
          this.mirrorCooldown = this.MIRROR_COOLDOWN;
          this.actionCooldown = 1500;
          this.aiState = 'scuttle';
        }
        break;
      }

      case 'hurt': {
        if (this.hitstunTimer <= 0) {
          this.actionCooldown = 800;
          this.aiState = 'scuttle';
        }
        break;
      }
    }
  }

  private drawVisuals(player: Player): void {
    if (!this.bodyGfx || !this.eyeGfx || !this.beamGraphics) return;
    this.bodyGfx.clear();
    this.eyeGfx.clear();
    this.beamGraphics.clear();

    const x = this.x;
    const y = this.y;

    // Main body - grotesque crawling mass
    this.bodyGfx.fillStyle(0x555555, 0.9);
    this.bodyGfx.fillEllipse(x, y, 70, 50); // Core body

    // Extra limb joints twitching
    const limbOffset = Math.sin(Date.now() * 0.01) * 5;
    this.bodyGfx.fillStyle(0x444444, 0.8);
    this.bodyGfx.fillEllipse(x - 30, y + 15 + limbOffset, 20, 30); // Left limb
    this.bodyGfx.fillEllipse(x + 30, y + 15 - limbOffset, 20, 30); // Right limb
    this.bodyGfx.fillEllipse(x - 20, y - 10 - limbOffset, 15, 25);
    this.bodyGfx.fillEllipse(x + 20, y - 10 + limbOffset, 15, 25);

    // Wire bindings
    this.bodyGfx.lineStyle(1, 0x886633, 0.6);
    this.bodyGfx.lineBetween(x - 25, y - 20, x + 25, y + 20);
    this.bodyGfx.lineBetween(x + 25, y - 20, x - 25, y + 20);
    this.bodyGfx.lineBetween(x - 30, y, x + 30, y);

    // Shattered mask face
    this.bodyGfx.fillStyle(0xccbbaa, 0.9);
    const headX = this.flipX ? x + 25 : x - 25;
    this.bodyGfx.fillEllipse(headX, y - 20, 22, 26);
    // Cracked lines on mask
    this.bodyGfx.lineStyle(1, 0x332222, 0.7);
    this.bodyGfx.lineBetween(headX - 5, y - 30, headX + 2, y - 10);
    this.bodyGfx.lineBetween(headX + 3, y - 28, headX - 4, y - 14);
    // Misaligned eye sockets
    this.bodyGfx.fillStyle(0x111111, 1);
    this.bodyGfx.fillCircle(headX - 4, y - 22, 3);
    this.bodyGfx.fillCircle(headX + 5, y - 18, 2.5);

    // THE CHEST EYE - the weak point
    const eyePulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
    if (this.eyeShielded) {
      // Limbs covering the eye
      this.eyeGfx.fillStyle(0x444444, 0.9);
      this.eyeGfx.fillEllipse(x, y, 25, 20);
      this.eyeGfx.fillStyle(0x333333, 0.8);
      this.eyeGfx.fillEllipse(x - 5, y, 12, 18);
      this.eyeGfx.fillEllipse(x + 5, y, 12, 18);
    } else {
      // Exposed eye
      this.eyeGfx.fillStyle(0xffeecc, eyePulse);
      this.eyeGfx.fillCircle(x, y, 12);
      this.eyeGfx.fillStyle(0x44ccaa, 1);
      this.eyeGfx.fillCircle(x, y, 7);
      this.eyeGfx.fillStyle(0x111111, 1);
      // Pupil tracks player
      const pDx = player.x - x;
      const pDy = player.y - y;
      const pAngle = Math.atan2(pDy, pDx);
      this.eyeGfx.fillCircle(x + Math.cos(pAngle) * 3, y + Math.sin(pAngle) * 3, 4);
    }

    // Mirror state: special visual
    if (this.aiState === 'mirror') {
      const mirrorPulse = Math.sin(Date.now() * 0.006) * 0.3 + 0.5;
      this.bodyGfx.fillStyle(0xffffff, mirrorPulse * 0.4);
      this.bodyGfx.fillEllipse(x, y, 80, 60);
      // Mask shifting effect
      this.bodyGfx.lineStyle(2, 0xeeddcc, mirrorPulse);
      this.bodyGfx.strokeCircle(x, y, 35 + Math.sin(Date.now() * 0.008) * 5);
    }

    // Soul-Gaze beam visual
    if (this.aiState === 'soulGaze') {
      if (this.gazeChargeTimer > 0) {
        // Charging: pulsing eye glow
        const chargePct = 1 - this.gazeChargeTimer / this.GAZE_CHARGE_DURATION;
        this.beamGraphics.fillStyle(0xaaff88, chargePct * 0.6);
        this.beamGraphics.fillCircle(x, y, 8 + chargePct * 12);
      } else {
        // Firing beam
        const beamAngle = Math.atan2(player.y - this.y, player.x - this.x);
        const beamLen = 280;
        const endX = x + Math.cos(beamAngle) * beamLen;
        const endY = y + Math.sin(beamAngle) * beamLen;

        // Core beam
        this.beamGraphics.lineStyle(6, 0x88ff44, 0.8);
        this.beamGraphics.lineBetween(x, y, endX, endY);
        // Outer glow
        this.beamGraphics.lineStyle(12, 0x88ff44, 0.2);
        this.beamGraphics.lineBetween(x, y, endX, endY);
        // Eye glow
        this.beamGraphics.fillStyle(0xccff88, 0.9);
        this.beamGraphics.fillCircle(x, y, 10);
      }
    }

    // Limb flail visual
    if (this.aiState === 'limbFlail') {
      const flailPct = 1 - this.flailTimer / this.FLAIL_DURATION;
      const flailAngle = flailPct * Math.PI * 4; // Rapid spinning
      for (let i = 0; i < 6; i++) {
        const angle = flailAngle + (i / 6) * Math.PI * 2;
        const limbLen = 40 + Math.sin(flailPct * Math.PI) * 20;
        const lx = x + Math.cos(angle) * limbLen;
        const ly = y + Math.sin(angle) * limbLen;
        this.bodyGfx.lineStyle(3, 0x666655, 0.8);
        this.bodyGfx.lineBetween(x, y, lx, ly);
        this.bodyGfx.fillStyle(0x888877, 0.9);
        this.bodyGfx.fillCircle(lx, ly, 4);
      }
    }

    // Exposed state: eye pulsing brightly
    if (this.aiState === 'exposed') {
      const pulseAlpha = Math.sin(Date.now() * 0.01) * 0.3 + 0.5;
      this.eyeGfx.fillStyle(0xffff88, pulseAlpha);
      this.eyeGfx.fillCircle(x, y, 16);
    }
  }

  private updateSpriteVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else if (this.aiState === 'mirror') {
      this.setTint(0xccddee);
      this.setAlpha(0.7);
    } else if (this.aiState === 'exposed') {
      this.setTint(0xffdd88);
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

    // Mirror state: absorb and reflect
    if (this.aiState === 'mirror') {
      this.mirrorReflectDamage += amount;
      // Visual feedback: spark
      const spark = this.scene.add.graphics();
      spark.fillStyle(0xeeeeff, 0.9);
      spark.fillCircle(this.x, this.y, 15);
      this.scene.tweens.add({
        targets: spark, alpha: 0, scaleX: 2, scaleY: 2, duration: 300,
        onComplete: () => spark.destroy()
      });
      return false;
    }

    // Eye must be exposed to take damage
    if (this.eyeShielded) {
      // Blocked: clang effect
      const spark = this.scene.add.graphics();
      spark.fillStyle(0x886644, 0.8);
      spark.fillCircle(this.x, this.y, 10);
      this.scene.tweens.add({
        targets: spark, alpha: 0, duration: 200,
        onComplete: () => spark.destroy()
      });
      return false;
    }

    // Take damage to the exposed eye
    this.currentHp -= amount;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;
    this.invulnTimer = this.cfg.invulnOnHitMs;

    if (this.currentHp <= 0) {
      this.die();
      return true;
    }

    // Brief stagger
    this.aiState = 'hurt';
    this.hitstunTimer = 300;
    const kb = fromX < this.x ? 1 : -1;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(kb * 100, -80);

    return true;
  }

  private die(): void {
    this.isDead = true;
    this.aiState = 'dead';
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    // Death visual: eye bursts
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const particle = this.scene.add.circle(
        this.x + Math.cos(angle) * 10,
        this.y + Math.sin(angle) * 10,
        Phaser.Math.Between(3, 8),
        Phaser.Math.RND.pick([0x88ff44, 0xffeecc, 0x555555, 0x886644]),
        0.9
      );
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * Phaser.Math.Between(40, 100),
        y: particle.y + Math.sin(angle) * Phaser.Math.Between(40, 100) - 30,
        alpha: 0, scale: 0,
        duration: Phaser.Math.Between(600, 1200),
        onComplete: () => particle.destroy()
      });
    }

    // Screen shake
    this.scene.cameras.main.shake(400, 0.015);

    // Drop shells
    const shells = Phaser.Math.Between(this.cfg.dropShells.min, this.cfg.dropShells.max);
    const pickup = new Pickup(this.scene, this.x, this.y - 10, 'shell', shells);
    const enemies = (this.scene as any).enemies;
    if (enemies) enemies.add(pickup);

    // Fade and destroy
    this.scene.tweens.add({
      targets: this,
      alpha: 0, y: this.y + 20,
      duration: 600,
      onComplete: () => {
        this.bodyGfx?.destroy();
        this.eyeGfx?.destroy();
        this.beamGraphics?.destroy();
        this.destroy();
      }
    });
  }

  getContactDamage(): number {
    if (this.aiState === 'limbFlail') return 3;
    return this.cfg.contactDamage;
  }

  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.maxHp; }
  isDying(): boolean { return this.isDead; }
  isInvulnerable(): boolean { return this.invulnTimer > 0 || this.aiState === 'mirror'; }
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
