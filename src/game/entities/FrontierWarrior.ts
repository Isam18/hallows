import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Frontier Warrior - Heavy melee tank from a crimson insect colony.
 * Marches toward player, attacks with heavy club swings.
 * Has a bone mask that must be broken before final HP can be depleted.
 */
type WarriorAIState = 'patrol' | 'march' | 'telegraph' | 'swing' | 'shove' | 'hurt' | 'dead';

export class FrontierWarrior extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: WarriorAIState = 'patrol';
  private currentHp: number;

  // Spawn
  private spawnX: number;
  private spawnY: number;

  // Movement
  private patrolDir: 1 | -1 = 1;
  private patrolTimer = 0;
  private patrolSwitchTime = 2000;
  private marchSpeed = 55;

  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;

  // Mask system - takes 3-4 hits to break mask, then 1-2 more to kill
  private maskHp: number = 4;
  private maskBroken: boolean = false;

  // Attack
  private telegraphTimer = 0;
  private telegraphDuration = 500;
  private swingTimer = 0;
  private swingDuration = 300;
  private swingCooldown = 0;
  private swingCooldownMax = 1200;
  private swingHitbox: Phaser.Geom.Rectangle | null = null;
  private swingDealt = false;

  // Shove (follow-up after hit)
  private shoveTimer = 0;
  private shoveDuration = 200;
  private didShove = false;

  // Club visual
  private clubGraphic: Phaser.GameObjects.Graphics | null = null;
  private clubAngle = 0;

  // Aggro
  private aggroRange = 180;
  private attackRange = 55;

  // State
  private isDead = false;
  private lastHitBySwingId = -1;
  private facingDir: 1 | -1 = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'frontierWarrior');

    this.spawnX = x;
    this.spawnY = y;
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);

    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
    this.facingDir = this.patrolDir;
    this.setFlipX(this.facingDir < 0);

    // Create club graphic
    this.clubGraphic = scene.add.graphics();
    this.clubGraphic.setDepth(this.depth + 1);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateAIState(player, delta);
    this.applyMovement(player, delta);
    this.updateSwing(player, delta);
    this.updateVisuals();
    this.drawClub();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.swingCooldown > 0) this.swingCooldown -= delta;
    if (this.patrolTimer > 0) this.patrolTimer -= delta;
  }

  private updateAIState(player: Player, delta: number): void {
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        this.aiState = 'march';
      }
      return;
    }
    if (this.aiState === 'dead') return;
    if (this.aiState === 'telegraph' || this.aiState === 'swing' || this.aiState === 'shove') return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist < this.aggroRange) {
      this.facingDir = player.x < this.x ? -1 : 1;
      this.setFlipX(this.facingDir < 0);

      if (dist < this.attackRange && this.swingCooldown <= 0) {
        this.startTelegraph();
      } else {
        this.aiState = 'march';
      }
    } else {
      this.aiState = 'patrol';
      if (this.patrolTimer <= 0) {
        this.patrolDir = (this.patrolDir * -1) as 1 | -1;
        this.patrolTimer = this.patrolSwitchTime;
        this.facingDir = this.patrolDir;
        this.setFlipX(this.facingDir < 0);
      }
    }
  }

  private startTelegraph(): void {
    this.aiState = 'telegraph';
    this.telegraphTimer = this.telegraphDuration;
    this.clubAngle = -30; // Raise club
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
  }

  private applyMovement(player: Player, delta: number): void {
    if (this.hitstunTimer > 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.aiState === 'patrol') {
      body.setVelocityX(this.patrolDir * this.cfg.moveSpeedPatrol);
    } else if (this.aiState === 'march') {
      body.setVelocityX(this.facingDir * this.marchSpeed);
    } else if (this.aiState === 'shove') {
      // Push toward player
      body.setVelocityX(this.facingDir * 120);
    } else if (this.aiState === 'telegraph' || this.aiState === 'swing') {
      body.setVelocityX(0);
    }
  }

  private updateSwing(player: Player, delta: number): void {
    if (this.aiState === 'telegraph') {
      this.telegraphTimer -= delta;
      // Raise club gradually
      this.clubAngle = -30 - (1 - this.telegraphTimer / this.telegraphDuration) * 30;
      
      if (this.telegraphTimer <= 0) {
        this.aiState = 'swing';
        this.swingTimer = this.swingDuration;
        this.swingDealt = false;
        this.clubAngle = 60; // Swing down
        
        // Create hitbox
        const hbX = this.x + this.facingDir * 30;
        const hbY = this.y - 10;
        this.swingHitbox = new Phaser.Geom.Rectangle(hbX - 25, hbY - 20, 50, 50);
      }
    }

    if (this.aiState === 'swing') {
      this.swingTimer -= delta;
      
      // Check hit
      if (!this.swingDealt && this.swingHitbox) {
        const playerBounds = player.getBounds();
        if (Phaser.Geom.Rectangle.Overlaps(this.swingHitbox, playerBounds)) {
          player.takeDamage(2, this.x);
          this.swingDealt = true;
          // Follow up with shove
          this.didShove = false;
        }
      }
      
      if (this.swingTimer <= 0) {
        this.swingHitbox = null;
        this.clubAngle = 0;
        this.swingCooldown = this.swingCooldownMax;
        
        if (this.swingDealt && !this.didShove) {
          this.aiState = 'shove';
          this.shoveTimer = this.shoveDuration;
          this.didShove = true;
        } else {
          this.aiState = 'march';
        }
      }
    }

    if (this.aiState === 'shove') {
      this.shoveTimer -= delta;
      if (this.shoveTimer <= 0) {
        this.aiState = 'march';
      }
    }
  }

  private drawClub(): void {
    if (!this.clubGraphic || this.isDead) return;
    this.clubGraphic.clear();

    const cx = this.x + this.facingDir * 12;
    const cy = this.y - 5;
    const angle = (this.facingDir < 0 ? Math.PI - this.clubAngle * Math.PI / 180 : this.clubAngle * Math.PI / 180);
    const len = 28;
    const endX = cx + Math.cos(angle) * len;
    const endY = cy - Math.sin(angle) * len;

    // Club handle
    this.clubGraphic.lineStyle(4, 0x4a3a2a);
    this.clubGraphic.lineBetween(cx, cy, endX, endY);

    // Club head - bone white jagged
    const headAngle = angle;
    this.clubGraphic.fillStyle(0xe8dcc8);
    this.clubGraphic.fillCircle(endX, endY, 7);
    
    // Jagged edge
    this.clubGraphic.fillStyle(0xd4c8b0);
    for (let i = 0; i < 3; i++) {
      const ja = headAngle + (i - 1) * 0.5;
      this.clubGraphic.fillTriangle(
        endX, endY,
        endX + Math.cos(ja) * 10, endY - Math.sin(ja) * 10,
        endX + Math.cos(ja + 0.3) * 8, endY - Math.sin(ja + 0.3) * 8
      );
    }
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTexture(this.maskBroken ? 'frontierWarrior_unmasked_hurt' : 'frontierWarrior_hurt');
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      this.setTexture(this.maskBroken ? 'frontierWarrior_unmasked' : 'frontierWarrior');
      this.setAlpha(1);
    }
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
      // Reduced knockback while masked (hard to stagger)
      this.aiState = 'hurt';
      this.hitstunTimer = this.cfg.hitstunMs * 0.5;
      this.invulnTimer = this.cfg.invulnOnHitMs;
      this.hurtFlashTimer = this.cfg.hurtFlashMs;

      const knockDir = this.x > fromX ? 1 : -1;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(
        knockDir * this.cfg.knockbackOnHit.x * 0.3,
        -this.cfg.knockbackOnHit.y * 0.3
      );
      return true;
    }

    // Mask broken - takes full damage and knockback
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

  private createMaskBreakEffect(): void {
    // White flash
    const flash = this.scene.add.circle(this.x, this.y - 10, 25, 0xffffff, 0.9);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => flash.destroy()
    });

    // Mask fragment particles
    for (let i = 0; i < 8; i++) {
      const frag = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-5, 5),
        this.y - 15 + Phaser.Math.Between(-5, 5),
        Phaser.Math.Between(4, 8),
        Phaser.Math.Between(3, 6),
        0xe8dcc8
      );
      const angle = (i / 8) * Math.PI * 2;
      this.scene.tweens.add({
        targets: frag,
        x: frag.x + Math.cos(angle) * Phaser.Math.Between(30, 60),
        y: frag.y + Math.sin(angle) * Phaser.Math.Between(20, 50) + 30,
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: Phaser.Math.Between(400, 700),
        ease: 'Power2',
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

    if (this.clubGraphic) {
      this.clubGraphic.destroy();
      this.clubGraphic = null;
    }

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
    const count = Phaser.Math.Between(12, 16);
    for (let i = 0; i < count; i++) {
      const color = i % 4 === 0 ? 0x8a2222 : i % 4 === 1 ? 0xcc4444 : i % 4 === 2 ? 0xe8dcc8 : 0x333333;
      const particle = this.scene.add.circle(
        this.x + Phaser.Math.Between(-12, 12),
        this.y + Phaser.Math.Between(-12, 12),
        Phaser.Math.Between(2, 6),
        color
      );
      const angle = (i / count) * Math.PI * 2;
      const dist = Phaser.Math.Between(30, 70);
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * dist,
        y: particle.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(250, 500),
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    const flash = this.scene.add.circle(this.x, this.y, 25, 0xaa3333, 0.7);
    this.scene.tweens.add({
      targets: flash,
      radius: 40,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
  }

  destroy(fromScene?: boolean): void {
    if (this.clubGraphic) {
      this.clubGraphic.destroy();
      this.clubGraphic = null;
    }
    super.destroy(fromScene);
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
  getAIState(): WarriorAIState { return this.aiState; }
  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.cfg.hp; }
  isMaskBroken(): boolean { return this.maskBroken; }
  isInvulnerable(): boolean { return this.invulnTimer > 0; }
  getDisplayName(): string { return this.cfg.displayName; }
}
