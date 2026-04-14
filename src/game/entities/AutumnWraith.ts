import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';
import gameState from '../core/GameState';

/**
 * Autumn Wraith - High-speed harassment unit for the Forgotten Warfield.
 * Uses stutter-step "blink" teleport-dashes, rapid rust-blade strikes (2 hearts),
 * tight 250ms telegraph window. Blinks behind/above player after attacking.
 * Low HP - glass cannon that rewards precise counter-attacks.
 */
type WraithAIState = 'idle' | 'stalk' | 'telegraph' | 'lunge' | 'reposition' | 'hurt' | 'dead';

export class AutumnWraith extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: WraithAIState = 'idle';
  private currentHp: number;

  // Blink movement
  private blinkCooldown = 0;
  private readonly BLINK_COOLDOWN = 1200;
  private stalkTimer = 0;
  private readonly STALK_DURATION = 800;

  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;

  // Telegraph & lunge
  private telegraphTimer = 0;
  private readonly TELEGRAPH_DURATION = 250; // Tight window - 1/4 second
  private lungeDir: { x: number; y: number } = { x: 0, y: 0 };
  private lungeTimer = 0;
  private readonly LUNGE_DURATION = 200;
  private readonly LUNGE_SPEED = 650;

  // Reposition after attack
  private repositionTimer = 0;
  private readonly REPOSITION_DURATION = 300;

  // State
  private isDead = false;
  private lastHitBySwingId = -1;

  // Visual effects
  private leafParticles: Phaser.GameObjects.Graphics[] = [];
  private afterImages: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'autumnWraith');

    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);

    // Start idle, then begin stalking
    this.stalkTimer = 500 + Math.random() * 500;
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
    if (this.blinkCooldown > 0) this.blinkCooldown -= delta;
  }

  private updateAI(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.aiState) {
      case 'idle': {
        body.setVelocityX(0);
        this.stalkTimer -= delta;
        
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (dist < this.cfg.aggroRangePx && this.stalkTimer <= 0) {
          this.aiState = 'stalk';
          this.stalkTimer = this.STALK_DURATION;
        }
        
        // Face player
        this.setFlipX(player.x < this.x);
        break;
      }

      case 'stalk': {
        this.stalkTimer -= delta;
        body.setVelocityX(0);
        
        // Face player
        this.setFlipX(player.x < this.x);
        
        // Ambient leaf particles while stalking
        if (Math.random() < 0.1) {
          this.emitLeafParticle();
        }
        
        // Flicker/phase effect while stalking
        this.setAlpha(0.6 + Math.sin(Date.now() * 0.01) * 0.3);
        
        if (this.stalkTimer <= 0) {
          // Blink close to player then telegraph
          this.blinkToPlayer(player);
          this.aiState = 'telegraph';
          this.telegraphTimer = this.TELEGRAPH_DURATION;
        }
        break;
      }

      case 'telegraph': {
        body.setVelocityX(0);
        this.telegraphTimer -= delta;
        
        // Emit falling leaves as telegraph
        if (Math.random() < 0.5) {
          this.emitLeafParticle();
        }
        
        // Slight vibration
        this.x += Math.sin(Date.now() * 0.05) * 1;
        
        // Calculate lunge direction to player
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.lungeDir = { x: Math.cos(angle), y: Math.sin(angle) * 0.3 };
        this.setFlipX(player.x < this.x);
        
        if (this.telegraphTimer <= 0) {
          this.aiState = 'lunge';
          this.lungeTimer = this.LUNGE_DURATION;
          // Leave afterimage at current position
          this.createAfterImage();
        }
        break;
      }

      case 'lunge': {
        this.lungeTimer -= delta;
        body.setVelocity(
          this.lungeDir.x * this.LUNGE_SPEED,
          this.lungeDir.y * this.LUNGE_SPEED
        );
        
        // Speed trail
        if (Math.random() < 0.5) {
          this.createAfterImage();
        }

        if (this.lungeTimer <= 0 || body.blocked.left || body.blocked.right) {
          // After attack, blink to reposition
          this.aiState = 'reposition';
          this.repositionTimer = this.REPOSITION_DURATION;
          body.setVelocity(0, 0);
          this.blinkAwayFromPlayer(player);
        }
        break;
      }

      case 'reposition': {
        this.repositionTimer -= delta;
        body.setVelocityX(0);
        
        if (this.repositionTimer <= 0) {
          this.aiState = 'stalk';
          this.stalkTimer = this.STALK_DURATION + Phaser.Math.Between(-200, 400);
          this.blinkCooldown = this.BLINK_COOLDOWN;
        }
        break;
      }

      case 'hurt': {
        if (this.hitstunTimer <= 0) {
          this.aiState = 'stalk';
          this.stalkTimer = 400;
        }
        break;
      }

      case 'dead':
        body.setVelocityX(0);
        break;
    }
  }

  private blinkToPlayer(player: Player): void {
    // Teleport to a position near the player
    const offsetX = (Math.random() > 0.5 ? 1 : -1) * Phaser.Math.Between(50, 80);
    const targetX = Phaser.Math.Clamp(player.x + offsetX, 30, this.scene.physics.world.bounds.width - 30);
    const targetY = player.y;
    
    this.createBlinkEffect(this.x, this.y);
    this.setPosition(targetX, targetY);
    this.createBlinkEffect(targetX, targetY);
  }

  private blinkAwayFromPlayer(player: Player): void {
    // Blink behind or above the player
    const behindOrAbove = Math.random() > 0.4;
    let targetX: number, targetY: number;
    
    if (behindOrAbove) {
      // Behind player
      const dir = player.x > this.x ? -1 : 1;
      targetX = Phaser.Math.Clamp(player.x + dir * Phaser.Math.Between(100, 160), 30, this.scene.physics.world.bounds.width - 30);
      targetY = player.y;
    } else {
      // Above player
      targetX = player.x + Phaser.Math.Between(-60, 60);
      targetY = Math.max(50, player.y - Phaser.Math.Between(80, 140));
    }
    
    this.createBlinkEffect(this.x, this.y);
    this.setPosition(targetX, targetY);
    this.createBlinkEffect(targetX, targetY);
  }

  private createBlinkEffect(x: number, y: number): void {
    // Burst of autumn leaves at blink origin/destination
    for (let i = 0; i < 6; i++) {
      const leafColors = [0xcc4400, 0xdd6611, 0xee8822, 0xbb3300, 0x996633];
      const leaf = this.scene.add.ellipse(
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(-15, 15),
        5, 3,
        Phaser.Math.RND.pick(leafColors), 0.8
      );
      leaf.setRotation(Math.random() * Math.PI * 2);
      this.scene.tweens.add({
        targets: leaf,
        x: leaf.x + Phaser.Math.Between(-40, 40),
        y: leaf.y + Phaser.Math.Between(-30, 30),
        alpha: 0,
        rotation: leaf.rotation + Phaser.Math.Between(-2, 2),
        duration: 400,
        onComplete: () => leaf.destroy()
      });
    }
    
    // Dark smoke puff
    const smoke = this.scene.add.circle(x, y, 15, 0x332211, 0.5);
    this.scene.tweens.add({
      targets: smoke,
      scaleX: 2.5, scaleY: 2.5, alpha: 0,
      duration: 300,
      onComplete: () => smoke.destroy()
    });
  }

  private createAfterImage(): void {
    const ghost = this.scene.add.rectangle(this.x, this.y, this.cfg.width, this.cfg.height, 0x884422, 0.4);
    ghost.setFlipX(this.flipX);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 200,
      onComplete: () => ghost.destroy()
    });
  }

  private emitLeafParticle(): void {
    const leafColors = [0xcc4400, 0xdd6611, 0xbb3300, 0x996633];
    const leaf = this.scene.add.ellipse(
      this.x + Phaser.Math.Between(-12, 12),
      this.y + Phaser.Math.Between(-15, 5),
      4, 3,
      Phaser.Math.RND.pick(leafColors), 0.7
    );
    leaf.setRotation(Math.random() * Math.PI);
    this.scene.tweens.add({
      targets: leaf,
      y: leaf.y + 25,
      x: leaf.x + Phaser.Math.Between(-10, 10),
      alpha: 0,
      rotation: leaf.rotation + 1,
      duration: 600,
      onComplete: () => leaf.destroy()
    });
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else if (this.aiState === 'telegraph') {
      // Rust-orange pulsing
      this.setTint(0xcc6633);
      const pulse = 0.7 + Math.sin(Date.now() * 0.02) * 0.3;
      this.setAlpha(pulse);
    } else if (this.aiState === 'lunge') {
      this.setTint(0xff4422);
      this.setAlpha(1);
    } else if (this.aiState === 'stalk') {
      // Already handled in stalk state
    } else {
      this.clearTint();
      this.setAlpha(1);
    }
  }

  getContactDamage(): number {
    // 2 hearts during lunge (Rust-Blade Strike), 1 otherwise
    return this.aiState === 'lunge' ? 2 : this.cfg.contactDamage;
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

    // Death: disintegrate into autumn leaves
    for (let i = 0; i < 20; i++) {
      const leafColors = [0xcc4400, 0xdd6611, 0xee8822, 0xbb3300, 0x884422];
      const leaf = this.scene.add.ellipse(
        this.x + Phaser.Math.Between(-15, 15),
        this.y + Phaser.Math.Between(-20, 10),
        Phaser.Math.Between(4, 8), Phaser.Math.Between(3, 6),
        Phaser.Math.RND.pick(leafColors), 0.8
      );
      leaf.setRotation(Math.random() * Math.PI * 2);
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 100);
      this.scene.tweens.add({
        targets: leaf,
        x: leaf.x + Math.cos(angle) * dist,
        y: leaf.y + Math.sin(angle) * dist + 20,
        alpha: 0,
        rotation: leaf.rotation + Phaser.Math.Between(-4, 4),
        duration: 600 + Math.random() * 400,
        onComplete: () => leaf.destroy()
      });
    }

    // Rust dust cloud
    const dust = this.scene.add.circle(this.x, this.y, 20, 0x885533, 0.4);
    this.scene.tweens.add({
      targets: dust,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 500,
      onComplete: () => dust.destroy()
    });

    // Fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
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
