import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';
import gameState from '../core/GameState';

/**
 * Arboreal War-Goliath – Hulking bark-armoured brute fused by sap-tendrils.
 *
 * - Slow, unstoppable, immune to knockback.
 * - Sap-Slam: AOE shockwave on ground pound.
 * - Tackle-Charge: Charges if player heals or stays far away too long.
 * - Sap-Knot vulnerability: striking glowing sap-knots staggers it.
 */

type GoliathState = 'patrol' | 'pursue' | 'sapSlam' | 'slamAOE' | 'charge' | 'staggered' | 'hurt' | 'dead';

export class ArborealWarGoliath extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: GoliathState = 'patrol';
  private currentHp: number;
  private maxHp: number;

  // Movement
  private facing: 1 | -1 = -1;
  private footstepTimer = 0;
  private readonly FOOTSTEP_INTERVAL = 700;

  // Sap-Slam attack
  private slamWindup = 0;
  private readonly SLAM_WINDUP = 800;
  private slamAoeTimer = 0;
  private readonly SLAM_AOE_DURATION = 350;
  private slamDamageDealt = false;
  private slamCooldown = 0;
  private readonly SLAM_COOLDOWN = 3000;
  private slamAoeGraphics: Phaser.GameObjects.Graphics | null = null;

  // Tackle-Charge
  private playerDistantTimer = 0;
  private readonly CHARGE_TRIGGER_MS = 2500;
  private chargeTimer = 0;
  private readonly CHARGE_DURATION = 1200;
  private readonly CHARGE_SPEED = 350;
  private chargeDamageDealt = false;
  private chargeCooldown = 0;
  private readonly CHARGE_COOLDOWN = 5000;

  // Stagger
  private staggerTimer = 0;
  private readonly STAGGER_DURATION = 1500;
  private sapKnotHits = 0;
  private readonly SAP_KNOT_THRESHOLD = 3; // hits to trigger stagger

  // Invuln / hurt
  private invulnTimer = 0;
  private hurtTimer = 0;
  private isDead = false;
  private _isInvulnerable = false;
  private hurtFlashTimer = 0;

  // Player ref
  private player: Player | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'arborealWarGoliath');
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    this.maxHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.cfg.width || 65, this.cfg.height || 60);
    body.setOffset(0, 0);
    body.setBounce(0, 0);
    body.setMass(10);
    body.setMaxVelocityX(this.CHARGE_SPEED);
    body.setCollideWorldBounds(true);

    this.setDepth(5);
    this.slamAoeGraphics = scene.add.graphics();
    this.slamAoeGraphics.setDepth(4);
  }

  setPlayer(player: Player): void {
    this.player = player;
  }

  getHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.maxHp; }
  getIsDead(): boolean { return this.isDead; }
  isInvulnerable(): boolean { return this._isInvulnerable; }

  takeDamage(amount: number, attackX?: number): void {
    if (this.isDead || this._isInvulnerable) return;

    // Sap-knot vulnerability: accumulate hits, stagger at threshold
    this.sapKnotHits++;
    if (this.sapKnotHits >= this.SAP_KNOT_THRESHOLD) {
      this.sapKnotHits = 0;
      this.aiState = 'staggered';
      this.staggerTimer = this.STAGGER_DURATION;
      this.setVelocity(0, 0);
      // Take bonus damage when staggered
      amount = Math.ceil(amount * 1.5);
    }

    this.currentHp -= amount;
    this._isInvulnerable = true;
    this.invulnTimer = this.cfg.invulnOnHitMs || 200;
    this.hurtFlashTimer = this.cfg.hurtFlashMs || 100;
    this.setTint(0xffffff);

    // No knockback — immune
    if (this.currentHp <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
    this.aiState = 'dead';
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    // Drop shells
    const shellCount = Phaser.Math.Between(
      this.cfg.dropShells?.min || 50,
      this.cfg.dropShells?.max || 90
    );
    for (let i = 0; i < Math.min(shellCount, 20); i++) {
      const shell = new Pickup(
        this.scene, this.x + Phaser.Math.Between(-30, 30),
        this.y - Phaser.Math.Between(5, 25), 'shell', 1
      );
      const pickups = (this.scene as any).pickups;
      if (pickups) pickups.add(shell);
    }

    this.slamAoeGraphics?.destroy();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500,
      onComplete: () => this.destroy(),
    });
  }

  update(time: number, delta: number): void {
    if (this.isDead) return;

    // Invuln timer
    if (this.invulnTimer > 0) {
      this.invulnTimer -= delta;
      if (this.invulnTimer <= 0) this._isInvulnerable = false;
    }

    // Hurt flash
    if (this.hurtFlashTimer > 0) {
      this.hurtFlashTimer -= delta;
      if (this.hurtFlashTimer <= 0) this.clearTint();
    }

    // Cooldowns
    if (this.slamCooldown > 0) this.slamCooldown -= delta;
    if (this.chargeCooldown > 0) this.chargeCooldown -= delta;

    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.aiState) {
      case 'patrol':
        this.doPatrol(body, delta);
        break;
      case 'pursue':
        this.doPursue(body, delta);
        break;
      case 'sapSlam':
        this.doSapSlam(body, delta);
        break;
      case 'slamAOE':
        this.doSlamAOE(body, delta);
        break;
      case 'charge':
        this.doCharge(body, delta);
        break;
      case 'staggered':
        this.doStagger(body, delta);
        break;
      case 'hurt':
        this.hurtTimer -= delta;
        if (this.hurtTimer <= 0) this.aiState = 'pursue';
        break;
    }
  }

  /* ── PATROL ── */
  private doPatrol(body: Phaser.Physics.Arcade.Body, delta: number): void {
    body.setVelocityX(this.facing * 25);
    this.setFlipX(this.facing < 0);
    this.doFootstep(delta);

    if (!this.player) return;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    if (dist < (this.cfg.aggroRangePx || 300)) {
      this.aiState = 'pursue';
    }
  }

  /* ── PURSUE ── */
  private doPursue(body: Phaser.Physics.Arcade.Body, delta: number): void {
    if (!this.player) { this.aiState = 'patrol'; return; }
    const dx = this.player.x - this.x;
    const dist = Math.abs(dx);
    this.facing = dx > 0 ? 1 : -1;
    this.setFlipX(this.facing < 0);

    body.setVelocityX(this.facing * 45);
    this.doFootstep(delta);

    // Slam if close
    if (dist < 90 && this.slamCooldown <= 0) {
      this.aiState = 'sapSlam';
      this.slamWindup = this.SLAM_WINDUP;
      body.setVelocityX(0);
      return;
    }

    // Track distant timer for charge
    if (dist > 200) {
      this.playerDistantTimer += delta;
      if (this.playerDistantTimer >= this.CHARGE_TRIGGER_MS && this.chargeCooldown <= 0) {
        this.playerDistantTimer = 0;
        this.aiState = 'charge';
        this.chargeTimer = this.CHARGE_DURATION;
        this.chargeDamageDealt = false;
        return;
      }
    } else {
      this.playerDistantTimer = 0;
    }

    // De-aggro
    if (dist > (this.cfg.deaggroRangePx || 500)) {
      this.aiState = 'patrol';
    }
  }

  /* ── SAP-SLAM ── */
  private doSapSlam(body: Phaser.Physics.Arcade.Body, delta: number): void {
    body.setVelocityX(0);
    this.slamWindup -= delta;

    // Visual telegraph: pulse tint
    const progress = 1 - (this.slamWindup / this.SLAM_WINDUP);
    if (Math.floor(progress * 8) % 2 === 0) {
      this.setTint(0xff4444);
    } else {
      this.clearTint();
    }

    if (this.slamWindup <= 0) {
      this.clearTint();
      this.aiState = 'slamAOE';
      this.slamAoeTimer = this.SLAM_AOE_DURATION;
      this.slamDamageDealt = false;
      this.slamCooldown = this.SLAM_COOLDOWN;
      // Screen shake
      this.scene.cameras.main.shake(200, 0.008);
    }
  }

  /* ── SLAM AOE ── */
  private doSlamAOE(body: Phaser.Physics.Arcade.Body, delta: number): void {
    body.setVelocityX(0);
    this.slamAoeTimer -= delta;

    // Draw AOE shockwave ring
    const aoeDist = 120;
    if (this.slamAoeGraphics) {
      this.slamAoeGraphics.clear();
      const progress = 1 - (this.slamAoeTimer / this.SLAM_AOE_DURATION);
      const radius = aoeDist * progress;
      this.slamAoeGraphics.lineStyle(4, 0xcc3300, 0.7 * (1 - progress));
      this.slamAoeGraphics.strokeCircle(this.x, this.y + 20, radius);
      this.slamAoeGraphics.fillStyle(0x882200, 0.2 * (1 - progress));
      this.slamAoeGraphics.fillCircle(this.x, this.y + 20, radius * 0.6);
    }

    // Deal damage once
    if (!this.slamDamageDealt && this.player) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
      if (dist < aoeDist) {
        const pObj = this.player as any;
        if (typeof pObj.takeDamage === 'function') {
          pObj.takeDamage(2);
        }
        // Knockback
        const kb = this.player.x > this.x ? 250 : -250;
        (this.player.body as Phaser.Physics.Arcade.Body)?.setVelocity(kb, -150);
        this.slamDamageDealt = true;
      }
    }

    if (this.slamAoeTimer <= 0) {
      if (this.slamAoeGraphics) this.slamAoeGraphics.clear();
      this.aiState = 'pursue';
    }
  }

  /* ── CHARGE ── */
  private doCharge(body: Phaser.Physics.Arcade.Body, delta: number): void {
    body.setVelocityX(this.facing * this.CHARGE_SPEED);
    this.chargeTimer -= delta;

    // Screen shake while charging
    if (Math.floor(this.chargeTimer / 100) % 2 === 0) {
      this.scene.cameras.main.shake(50, 0.003);
    }

    // Damage on contact
    if (!this.chargeDamageDealt && this.player) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
      if (dist < 50) {
        const pObj = this.player as any;
        if (typeof pObj.takeDamage === 'function') {
          pObj.takeDamage(2);
        }
        const kb = this.player.x > this.x ? 300 : -300;
        (this.player.body as Phaser.Physics.Arcade.Body)?.setVelocity(kb, -180);
        this.chargeDamageDealt = true;
      }
    }

    if (this.chargeTimer <= 0) {
      body.setVelocityX(0);
      this.chargeCooldown = this.CHARGE_COOLDOWN;
      this.aiState = 'pursue';
    }
  }

  /* ── STAGGER ── */
  private doStagger(body: Phaser.Physics.Arcade.Body, delta: number): void {
    body.setVelocityX(0);
    this.staggerTimer -= delta;

    // Flash sap-knot glow (red/orange)
    if (Math.floor(this.staggerTimer / 120) % 2 === 0) {
      this.setTint(0xff6600);
    } else {
      this.setTint(0xcc4400);
    }

    if (this.staggerTimer <= 0) {
      this.clearTint();
      this.aiState = 'pursue';
    }
  }

  /* ── FOOTSTEPS ── */
  private doFootstep(delta: number): void {
    this.footstepTimer += delta;
    if (this.footstepTimer >= this.FOOTSTEP_INTERVAL) {
      this.footstepTimer = 0;
      this.scene.cameras.main.shake(80, 0.002);
    }
  }
}
