import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';
import gameState from '../core/GameState';

/**
 * Warfield Medic – Spectral support unit for the Autumn Warfield.
 *
 * - Hovers behind allies, healing them via visible green tethers.
 * - Fires weak Essence Bolts when no allies need healing.
 * - High priority target — forces players to push through front-line.
 */

type MedicState = 'idle' | 'healing' | 'attacking' | 'fleeing' | 'hurt' | 'dead';

export class WarfieldMedic extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: MedicState = 'idle';
  private currentHp: number;
  private maxHp: number;

  // Movement
  private facing: 1 | -1 = -1;
  private hoverOffset = 0;
  private readonly HOVER_SPEED = 30;
  private readonly SAFE_DISTANCE = 180; // tries to stay this far from player

  // Healing tether
  private tetherTarget: Phaser.Physics.Arcade.Sprite | null = null;
  private tetherGraphics: Phaser.GameObjects.Graphics | null = null;
  private readonly HEAL_RANGE = 250;
  private readonly HEAL_RATE = 3; // HP per second
  private healTickTimer = 0;
  private readonly HEAL_TICK_MS = 333; // heal every 333ms
  private tetherScanTimer = 0;
  private readonly TETHER_SCAN_INTERVAL = 500;

  // Essence Bolt (offensive)
  private boltCooldown = 0;
  private readonly BOLT_COOLDOWN = 2000;
  private bolts: Phaser.GameObjects.Graphics[] = [];

  // Invuln / hurt
  private invulnTimer = 0;
  private hurtTimer = 0;
  private isDead = false;
  private _isInvulnerable = false;
  private hurtFlashTimer = 0;

  // Core pulse visual
  private pulseTimer = 0;

  // Player ref
  private player: Player | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'warfieldMedic');
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    this.maxHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.cfg.width || 36, this.cfg.height || 52);
    body.setOffset(0, 0);
    body.setBounce(0, 0);
    body.setAllowGravity(false); // hovers
    body.setCollideWorldBounds(true);

    this.setDepth(5);
    this.setAlpha(0.85); // semi-transparent ghostly look

    this.tetherGraphics = scene.add.graphics();
    this.tetherGraphics.setDepth(4);
  }

  setPlayer(player: Player): void {
    this.player = player;
  }

  getHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.maxHp; }
  getIsDead(): boolean { return this.isDead; }

  takeDamage(amount: number, attackX?: number): void {
    if (this.isDead || this.isInvulnerable) return;

    this.currentHp -= amount;
    this.isInvulnerable = true;
    this.invulnTimer = this.cfg.invulnOnHitMs || 150;
    this.hurtFlashTimer = this.cfg.hurtFlashMs || 120;
    this.setTint(0xffffff);

    // Break tether on hit
    this.tetherTarget = null;

    // Knockback
    const kb = this.cfg.knockbackOnHit;
    if (kb && attackX !== undefined) {
      const dir = this.x > attackX ? 1 : -1;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(dir * (kb.x || 60), -(kb.y || 30));
    }

    if (this.currentHp <= 0) {
      this.die();
    } else {
      this.aiState = 'hurt';
      this.hurtTimer = 200;
    }
  }

  private die(): void {
    this.isDead = true;
    this.aiState = 'dead';
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    const shellCount = Phaser.Math.Between(
      this.cfg.dropShells?.min || 15,
      this.cfg.dropShells?.max || 30
    );
    for (let i = 0; i < Math.min(shellCount, 15); i++) {
      const shell = new Pickup(
        this.scene, this.x + Phaser.Math.Between(-20, 20),
        this.y - Phaser.Math.Between(5, 20), 'shell', 1
      );
      const pickups = (this.scene as any).pickups;
      if (pickups) pickups.add(shell);
    }

    this.tetherGraphics?.destroy();
    this.bolts.forEach(b => b.destroy());
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 400,
      onComplete: () => this.destroy(),
    });
  }

  update(time: number, delta: number): void {
    if (this.isDead) return;

    // Invuln timer
    if (this.invulnTimer > 0) {
      this.invulnTimer -= delta;
      if (this.invulnTimer <= 0) this.isInvulnerable = false;
    }

    // Hurt flash
    if (this.hurtFlashTimer > 0) {
      this.hurtFlashTimer -= delta;
      if (this.hurtFlashTimer <= 0) this.clearTint();
    }

    // Core pulse visual
    this.pulseTimer += delta;
    const pulse = 0.7 + 0.15 * Math.sin(this.pulseTimer / 300);
    this.setAlpha(pulse);

    // Hover bob
    this.hoverOffset += delta * 0.003;
    const bobY = Math.sin(this.hoverOffset) * 6;

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Bolt cooldown
    if (this.boltCooldown > 0) this.boltCooldown -= delta;

    // Update bolts
    this.updateBolts(delta);

    switch (this.aiState) {
      case 'idle':
        this.doIdle(body, delta, bobY);
        break;
      case 'healing':
        this.doHealing(body, delta, bobY);
        break;
      case 'attacking':
        this.doAttacking(body, delta, bobY);
        break;
      case 'fleeing':
        this.doFleeing(body, delta, bobY);
        break;
      case 'hurt':
        this.hurtTimer -= delta;
        body.setVelocityY(bobY * 10);
        if (this.hurtTimer <= 0) this.aiState = 'idle';
        break;
    }

    // Draw tether
    this.drawTether();
  }

  /* ── IDLE ── */
  private doIdle(body: Phaser.Physics.Arcade.Body, delta: number, bobY: number): void {
    body.setVelocityY(bobY * 10);
    body.setVelocityX(0);

    this.tetherScanTimer -= delta;
    if (this.tetherScanTimer <= 0) {
      this.tetherScanTimer = this.TETHER_SCAN_INTERVAL;
      this.scanForHealTarget();
    }

    if (this.tetherTarget) {
      this.aiState = 'healing';
      return;
    }

    // If player nearby and no heal target, attack
    if (this.player) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
      if (dist < 350) {
        this.aiState = 'attacking';
      }
    }
  }

  /* ── HEALING ── */
  private doHealing(body: Phaser.Physics.Arcade.Body, delta: number, bobY: number): void {
    if (!this.tetherTarget || !this.tetherTarget.active) {
      this.tetherTarget = null;
      this.aiState = 'idle';
      return;
    }

    // Check range
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.tetherTarget.x, this.tetherTarget.y);
    if (dist > this.HEAL_RANGE * 1.3) {
      this.tetherTarget = null;
      this.aiState = 'idle';
      return;
    }

    // Stay behind the tether target relative to player
    this.positionBehindAlly(body, bobY);

    // Heal tick
    this.healTickTimer -= delta;
    if (this.healTickTimer <= 0) {
      this.healTickTimer = this.HEAL_TICK_MS;
      const target = this.tetherTarget as any;
      if (typeof target.getHp === 'function' && typeof target.getMaxHp === 'function') {
        const hp = target.getHp();
        const maxHp = target.getMaxHp();
        if (hp < maxHp) {
          // Heal 1 HP per tick
          if (typeof target.currentHp !== 'undefined') {
            target.currentHp = Math.min(maxHp, hp + 1);
          }
        } else {
          // Fully healed, drop tether
          this.tetherTarget = null;
          this.aiState = 'idle';
        }
      }
    }

    // Re-scan periodically for better target
    this.tetherScanTimer -= delta;
    if (this.tetherScanTimer <= 0) {
      this.tetherScanTimer = this.TETHER_SCAN_INTERVAL;
      this.scanForHealTarget();
    }
  }

  /* ── ATTACKING ── */
  private doAttacking(body: Phaser.Physics.Arcade.Body, delta: number, bobY: number): void {
    if (!this.player) { this.aiState = 'idle'; return; }

    const dx = this.player.x - this.x;
    const dist = Math.abs(dx);
    this.facing = dx > 0 ? 1 : -1;
    this.setFlipX(this.facing < 0);

    // Maintain safe distance
    if (dist < this.SAFE_DISTANCE - 30) {
      body.setVelocityX(-this.facing * 50);
      this.aiState = 'fleeing';
      return;
    }

    body.setVelocityX(0);
    body.setVelocityY(bobY * 10);

    // Fire essence bolt
    if (this.boltCooldown <= 0) {
      this.fireEssenceBolt();
      this.boltCooldown = this.BOLT_COOLDOWN;
    }

    // Check if ally needs healing
    this.tetherScanTimer -= delta;
    if (this.tetherScanTimer <= 0) {
      this.tetherScanTimer = this.TETHER_SCAN_INTERVAL;
      this.scanForHealTarget();
      if (this.tetherTarget) {
        this.aiState = 'healing';
      }
    }

    if (dist > 400) this.aiState = 'idle';
  }

  /* ── FLEEING ── */
  private doFleeing(body: Phaser.Physics.Arcade.Body, delta: number, bobY: number): void {
    if (!this.player) { this.aiState = 'idle'; return; }

    const dx = this.player.x - this.x;
    const dist = Math.abs(dx);
    this.facing = dx > 0 ? 1 : -1;

    body.setVelocityX(-this.facing * 60);
    body.setVelocityY(bobY * 10);

    if (dist > this.SAFE_DISTANCE) {
      this.aiState = 'attacking';
    }
  }

  /* ── HELPERS ── */
  private scanForHealTarget(): void {
    const enemies = (this.scene as any).enemies;
    if (!enemies) return;

    let bestTarget: Phaser.Physics.Arcade.Sprite | null = null;
    let lowestHpRatio = 1;

    enemies.getChildren().forEach((e: any) => {
      if (e === this || !e.active || e.isDead || e.getIsDead?.()) return;
      if (typeof e.getHp !== 'function' || typeof e.getMaxHp !== 'function') return;

      const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (dist > this.HEAL_RANGE) return;

      const ratio = e.getHp() / e.getMaxHp();
      if (ratio < 1 && ratio < lowestHpRatio) {
        lowestHpRatio = ratio;
        bestTarget = e;
      }
    });

    if (bestTarget) {
      this.tetherTarget = bestTarget;
    }
  }

  private positionBehindAlly(body: Phaser.Physics.Arcade.Body, bobY: number): void {
    if (!this.tetherTarget || !this.player) return;

    // Stay on opposite side of ally from player
    const allyToPlayer = this.player.x - this.tetherTarget.x;
    const targetX = this.tetherTarget.x - Math.sign(allyToPlayer) * 100;
    const targetY = this.tetherTarget.y - 30;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    body.setVelocityX(Phaser.Math.Clamp(dx * 2, -50, 50));
    body.setVelocityY(Phaser.Math.Clamp(dy * 2, -40, 40) + bobY * 5);

    this.facing = this.player.x > this.x ? 1 : -1;
    this.setFlipX(this.facing < 0);
  }

  private drawTether(): void {
    if (!this.tetherGraphics) return;
    this.tetherGraphics.clear();

    if (!this.tetherTarget || !this.tetherTarget.active) return;

    // Pulsing green tether line
    const pulse = 0.5 + 0.3 * Math.sin(this.pulseTimer / 200);
    this.tetherGraphics.lineStyle(3, 0x44ff66, pulse);
    this.tetherGraphics.beginPath();
    this.tetherGraphics.moveTo(this.x, this.y);

    // Wavy tether
    const mx = (this.x + this.tetherTarget.x) / 2;
    const my = (this.y + this.tetherTarget.y) / 2 + Math.sin(this.pulseTimer / 150) * 8;
    this.tetherGraphics.lineTo(mx, my);
    this.tetherGraphics.lineTo(this.tetherTarget.x, this.tetherTarget.y);
    this.tetherGraphics.strokePath();

    // Glow at endpoints
    this.tetherGraphics.fillStyle(0x44ff66, 0.4 * pulse);
    this.tetherGraphics.fillCircle(this.x, this.y, 6);
    this.tetherGraphics.fillCircle(this.tetherTarget.x, this.tetherTarget.y, 5);
  }

  private fireEssenceBolt(): void {
    if (!this.player) return;

    const bolt = this.scene.add.graphics();
    bolt.setDepth(6);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
    const speed = 120;

    const boltData = {
      gfx: bolt,
      x: this.x,
      y: this.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 3000,
      damageDealt: false,
    };

    (bolt as any).__boltData = boltData;
    this.bolts.push(bolt);
  }

  private updateBolts(delta: number): void {
    const toRemove: number[] = [];

    this.bolts.forEach((bolt, i) => {
      const data = (bolt as any).__boltData;
      if (!data) { toRemove.push(i); return; }

      data.x += data.vx * (delta / 1000);
      data.y += data.vy * (delta / 1000);
      data.life -= delta;

      // Draw bolt
      bolt.clear();
      bolt.fillStyle(0x44ff66, 0.8);
      bolt.fillCircle(data.x, data.y, 5);
      bolt.fillStyle(0x88ffaa, 0.4);
      bolt.fillCircle(data.x, data.y, 8);

      // Check player hit
      if (!data.damageDealt && this.player) {
        const dist = Phaser.Math.Distance.Between(data.x, data.y, this.player.x, this.player.y);
        if (dist < 20) {
          const pObj = this.player as any;
          if (typeof pObj.takeDamage === 'function') {
            pObj.takeDamage(1);
          }
          data.damageDealt = true;
          data.life = 0;
        }
      }

      if (data.life <= 0) {
        toRemove.push(i);
      }
    });

    // Remove expired bolts (reverse order)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      this.bolts[idx]?.destroy();
      this.bolts.splice(idx, 1);
    }
  }
}
