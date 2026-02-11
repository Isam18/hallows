import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Colony Vanguard - Mini-boss of the crimson insect tribe.
 * Phase 1: Armored with wide scythe sweeps, unstaggerable.
 * Phase 2 (Enraged): Faster, gains leaping slam + shockwave.
 * Command Shout: Buffs nearby allies' speed.
 * Defensive Stance: Plants scythe to block.
 */
type VanguardAIState = 'idle' | 'march' | 'telegraph' | 'sweep' | 'leapUp' | 'leapSlam' | 'shout' | 'defensiveStance' | 'hurt' | 'dead';

export class ColonyVanguard extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: VanguardAIState = 'idle';
  private currentHp: number;

  // Spawn
  private spawnX: number;
  private spawnY: number;

  // Movement
  private facingDir: 1 | -1 = -1;
  private marchSpeed = 40;
  private enragedMarchSpeed = 70;

  // Phase system
  private armorHp: number = 12; // Armor bar - must break before staggering
  private armorBroken = false;
  private enraged = false;

  // Timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private actionCooldown = 0;
  private idleTimer = 0;

  // Sweep attack (Phase 1 & 2)
  private sweepTimer = 0;
  private sweepDuration = 500;
  private telegraphTimer = 0;
  private telegraphDuration = 900;
  private sweepHitbox: Phaser.Geom.Rectangle | null = null;
  private sweepDealt = false;

  // Leap Slam (Phase 2 only)
  private leapTimer = 0;
  private leapTarget = { x: 0, y: 0 };
  private leapPhase: 'rising' | 'hanging' | 'falling' = 'rising';
  private leapHangTimer = 0;

  // Shout
  private shoutTimer = 0;
  private shoutCooldown = 0;
  private shoutCooldownMax = 8000;

  // Defensive stance
  private defenseTimer = 0;

  // Scythe visual
  private scytheGraphic: Phaser.GameObjects.Graphics | null = null;
  private scytheAngle = 0;

  // Aggro
  private aggroRange = 300;
  private attackRange = 80;

  // State
  private isDead = false;
  private lastHitBySwingId = -1;

  // Boss HP bar
  private hpBarBg: Phaser.GameObjects.Rectangle | null = null;
  private hpBarFill: Phaser.GameObjects.Rectangle | null = null;
  private armorBarFill: Phaser.GameObjects.Rectangle | null = null;
  private nameText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'colonyVanguard');

    this.spawnX = x;
    this.spawnY = y;
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);
    this.setScale(1.2);

    this.facingDir = -1;
    this.setFlipX(true);

    this.scytheGraphic = scene.add.graphics();
    this.scytheGraphic.setDepth(this.depth + 1);

    this.createBossHPBar();
  }

  private createBossHPBar(): void {
    const barWidth = 160;
    const barHeight = 6;
    // HP bar follows the vanguard
    this.hpBarBg = this.scene.add.rectangle(this.x, this.y - 50, barWidth + 4, barHeight + 4, 0x000000, 0.7);
    this.hpBarFill = this.scene.add.rectangle(this.x, this.y - 50, barWidth, barHeight, 0xcc2222);
    this.armorBarFill = this.scene.add.rectangle(this.x, this.y - 44, barWidth, 3, 0xe8dcc8);
    this.nameText = this.scene.add.text(this.x, this.y - 60, 'Colony Vanguard', {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#e8dcc8',
    }).setOrigin(0.5);

    this.hpBarBg.setDepth(999);
    this.hpBarFill.setDepth(1000);
    this.armorBarFill.setDepth(1000);
    this.nameText.setDepth(1000);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateAI(player, delta);
    this.applyMovement(player, delta);
    this.updateAttacks(player, delta);
    this.updateVisuals();
    this.drawScythe();
    this.updateHPBar();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.actionCooldown > 0) this.actionCooldown -= delta;
    if (this.shoutCooldown > 0) this.shoutCooldown -= delta;
    if (this.idleTimer > 0) this.idleTimer -= delta;
  }

  private updateAI(player: Player, delta: number): void {
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) this.aiState = 'march';
      return;
    }
    if (this.aiState === 'dead') return;
    if (['telegraph', 'sweep', 'leapUp', 'leapSlam', 'shout', 'defensiveStance'].includes(this.aiState)) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist < this.aggroRange) {
      this.facingDir = player.x < this.x ? -1 : 1;
      this.setFlipX(this.facingDir < 0);

      if (this.actionCooldown <= 0) {
        // Command shout occasionally
        if (this.shoutCooldown <= 0 && Math.random() < 0.15) {
          this.startShout();
          return;
        }

        // Phase 2: Leap slam
        if (this.enraged && dist > 120 && Math.random() < 0.4) {
          this.startLeap(player);
          return;
        }

        // Defensive stance occasionally
        if (Math.random() < 0.08) {
          this.startDefensiveStance();
          return;
        }

        if (dist < this.attackRange) {
          this.startTelegraph();
        } else {
          this.aiState = 'march';
        }
      } else {
        this.aiState = 'march';
      }
    } else {
      this.aiState = 'idle';
    }
  }

  private startTelegraph(): void {
    this.aiState = 'telegraph';
    this.telegraphTimer = this.enraged ? this.telegraphDuration * 0.6 : this.telegraphDuration;
    this.scytheAngle = -40;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
  }

  private startLeap(player: Player): void {
    this.aiState = 'leapUp';
    this.leapTarget = { x: player.x, y: player.y };
    this.leapPhase = 'rising';
    this.leapTimer = 400;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, -450);
    body.setAllowGravity(false);
    this.actionCooldown = 2000;
  }

  private startShout(): void {
    this.aiState = 'shout';
    this.shoutTimer = 600;
    this.shoutCooldown = this.shoutCooldownMax;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    // Screen shake
    this.scene.cameras.main.shake(300, 0.005);

    // Visual ripple
    const ripple = this.scene.add.circle(this.x, this.y, 10, 0xff4444, 0.3);
    this.scene.tweens.add({
      targets: ripple,
      radius: 200,
      alpha: 0,
      duration: 500,
      onComplete: () => ripple.destroy()
    });

    // Buff nearby allies (find FrontierWarrior/Scout instances)
    const gameScene = this.scene as any;
    if (gameScene.enemies) {
      gameScene.enemies.getChildren().forEach((enemy: any) => {
        if (enemy !== this && enemy.active && !enemy.isDying?.()) {
          const d = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
          if (d < 250) {
            // Brief speed buff visual
            const glow = this.scene.add.circle(enemy.x, enemy.y, 15, 0xff6644, 0.4);
            this.scene.tweens.add({
              targets: glow,
              alpha: 0, scale: 2,
              duration: 400,
              onComplete: () => glow.destroy()
            });
          }
        }
      });
    }
  }

  private startDefensiveStance(): void {
    this.aiState = 'defensiveStance';
    this.defenseTimer = 1500;
    this.scytheAngle = -90; // Scythe planted
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
  }

  private applyMovement(player: Player, delta: number): void {
    if (this.hitstunTimer > 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.aiState === 'march') {
      const speed = this.enraged ? this.enragedMarchSpeed : this.marchSpeed;
      body.setVelocityX(this.facingDir * speed);
    } else if (this.aiState === 'idle') {
      body.setVelocityX(0);
    }
  }

  private updateAttacks(player: Player, delta: number): void {
    // Telegraph
    if (this.aiState === 'telegraph') {
      this.telegraphTimer -= delta;
      this.scytheAngle = -40 - (1 - this.telegraphTimer / (this.enraged ? this.telegraphDuration * 0.6 : this.telegraphDuration)) * 40;
      if (this.telegraphTimer <= 0) {
        this.aiState = 'sweep';
        this.sweepTimer = this.sweepDuration;
        this.sweepDealt = false;
        this.scytheAngle = 80;

        // Wide hitbox covering 40% of arena
        const sweepWidth = this.scene.scale.width * 0.4;
        const hbX = this.facingDir > 0 ? this.x : this.x - sweepWidth;
        this.sweepHitbox = new Phaser.Geom.Rectangle(hbX, this.y - 40, sweepWidth, 70);
      }
    }

    // Sweep
    if (this.aiState === 'sweep') {
      this.sweepTimer -= delta;
      if (!this.sweepDealt && this.sweepHitbox) {
        const pb = player.getBounds();
        if (Phaser.Geom.Rectangle.Overlaps(this.sweepHitbox, pb)) {
          player.takeDamage(2, this.x);
          this.sweepDealt = true;
        }
      }
      if (this.sweepTimer <= 0) {
        this.sweepHitbox = null;
        this.scytheAngle = 0;
        this.actionCooldown = this.enraged ? 800 : 1400;
        this.aiState = 'march';
      }
    }

    // Leap
    if (this.aiState === 'leapUp') {
      this.leapTimer -= delta;
      if (this.leapTimer <= 0) {
        if (this.leapPhase === 'rising') {
          this.leapPhase = 'hanging';
          this.leapHangTimer = 500;
          const body = this.body as Phaser.Physics.Arcade.Body;
          body.setVelocity(0, 0);
          // Re-target player
          this.leapTarget = { x: player.x, y: player.y };
        }
      }
    }

    if (this.aiState === 'leapUp' && this.leapPhase === 'hanging') {
      this.leapHangTimer -= delta;
      if (this.leapHangTimer <= 0) {
        this.aiState = 'leapSlam';
        const body = this.body as Phaser.Physics.Arcade.Body;
        const dx = this.leapTarget.x - this.x;
        body.setVelocity(dx * 0.8, 700);
        body.setAllowGravity(true);
        this.leapTimer = 1000;
      }
    }

    if (this.aiState === 'leapSlam') {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body.blocked.down || body.touching.down) {
        // Landing - create shockwave
        this.createShockwave(player);
        this.scene.cameras.main.shake(200, 0.01);
        this.aiState = 'march';
        this.actionCooldown = 1200;
      }
      this.leapTimer -= delta;
      if (this.leapTimer <= 0) {
        body.setAllowGravity(true);
        this.aiState = 'march';
      }
    }

    // Shout
    if (this.aiState === 'shout') {
      this.shoutTimer -= delta;
      if (this.shoutTimer <= 0) {
        this.aiState = 'march';
        this.actionCooldown = 800;
      }
    }

    // Defensive stance
    if (this.aiState === 'defensiveStance') {
      this.defenseTimer -= delta;
      if (this.defenseTimer <= 0) {
        this.scytheAngle = 0;
        this.aiState = 'march';
        this.actionCooldown = 600;
      }
    }
  }

  private createShockwave(player: Player): void {
    // Left shockwave
    const leftWave = this.scene.add.rectangle(this.x - 30, this.y + 10, 60, 20, 0xff4444, 0.5);
    this.scene.tweens.add({
      targets: leftWave,
      x: leftWave.x - 80,
      scaleX: 2,
      alpha: 0,
      duration: 400,
      onComplete: () => leftWave.destroy()
    });

    // Right shockwave
    const rightWave = this.scene.add.rectangle(this.x + 30, this.y + 10, 60, 20, 0xff4444, 0.5);
    this.scene.tweens.add({
      targets: rightWave,
      x: rightWave.x + 80,
      scaleX: 2,
      alpha: 0,
      duration: 400,
      onComplete: () => rightWave.destroy()
    });

    // Hit player if close
    const dist = Math.abs(player.x - this.x);
    if (dist < 120 && Math.abs(player.y - this.y) < 60) {
      player.takeDamage(2, this.x);
    }
  }

  private drawScythe(): void {
    if (!this.scytheGraphic || this.isDead) return;
    this.scytheGraphic.clear();

    const cx = this.x + this.facingDir * 20;
    const cy = this.y - 10;
    const angle = this.facingDir < 0
      ? Math.PI - this.scytheAngle * Math.PI / 180
      : this.scytheAngle * Math.PI / 180;
    const len = 45;
    const endX = cx + Math.cos(angle) * len;
    const endY = cy - Math.sin(angle) * len;

    // Handle
    this.scytheGraphic.lineStyle(5, 0x4a3a2a);
    this.scytheGraphic.lineBetween(cx, cy, endX, endY);

    // Scythe blade - large curved bone
    const bladeAngle = angle + (this.facingDir > 0 ? 0.5 : -0.5);
    const bladeLen = 30;
    const bx = endX + Math.cos(bladeAngle) * bladeLen;
    const by = endY - Math.sin(bladeAngle) * bladeLen;

    this.scytheGraphic.fillStyle(0xe8dcc8);
    this.scytheGraphic.beginPath();
    this.scytheGraphic.moveTo(endX, endY);
    this.scytheGraphic.lineTo(bx, by);
    this.scytheGraphic.lineTo(endX + Math.cos(bladeAngle + 0.3) * (bladeLen * 0.8), endY - Math.sin(bladeAngle + 0.3) * (bladeLen * 0.8));
    this.scytheGraphic.closePath();
    this.scytheGraphic.fillPath();

    // Serrated teeth
    this.scytheGraphic.fillStyle(0xd4c8b0);
    for (let i = 0; i < 4; i++) {
      const t = (i + 1) / 5;
      const tx = endX + (bx - endX) * t;
      const ty = endY + (by - endY) * t;
      const toothAngle = bladeAngle + Math.PI / 2;
      this.scytheGraphic.fillTriangle(
        tx, ty,
        tx + Math.cos(toothAngle) * 6, ty - Math.sin(toothAngle) * 6,
        tx + Math.cos(bladeAngle) * 4, ty - Math.sin(bladeAngle) * 4
      );
    }
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTexture(this.armorBroken ? 'colonyVanguard_cracked_hurt' : 'colonyVanguard_hurt');
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      this.setTexture(this.armorBroken ? 'colonyVanguard_cracked' : 'colonyVanguard');
      this.setAlpha(1);
    }
  }

  private updateHPBar(): void {
    if (!this.hpBarBg || !this.hpBarFill || !this.armorBarFill || !this.nameText) return;
    const barWidth = 160;

    this.hpBarBg.setPosition(this.x, this.y - 55);
    this.hpBarFill.setPosition(this.x, this.y - 55);
    this.armorBarFill.setPosition(this.x, this.y - 49);
    this.nameText.setPosition(this.x, this.y - 65);

    // HP bar
    const hpRatio = this.currentHp / this.cfg.hp;
    this.hpBarFill.setSize(barWidth * hpRatio, 6);
    this.hpBarFill.setPosition(this.x - (barWidth * (1 - hpRatio)) / 2, this.y - 55);

    // Armor bar
    if (!this.armorBroken) {
      const armorRatio = this.armorHp / 12;
      this.armorBarFill.setSize(barWidth * armorRatio, 3);
      this.armorBarFill.setPosition(this.x - (barWidth * (1 - armorRatio)) / 2, this.y - 49);
      this.armorBarFill.setVisible(true);
    } else {
      this.armorBarFill.setVisible(false);
    }
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;

    // Defensive stance - reduced damage
    if (this.aiState === 'defensiveStance') {
      amount = Math.max(1, Math.floor(amount * 0.3));
      // Deflect visual
      const spark = this.scene.add.circle(this.x, this.y - 10, 8, 0xffee88, 0.8);
      this.scene.tweens.add({
        targets: spark,
        alpha: 0, scale: 2,
        duration: 200,
        onComplete: () => spark.destroy()
      });
    }

    if (!this.armorBroken) {
      this.armorHp -= amount;
      this.invulnTimer = 100;
      this.hurtFlashTimer = this.cfg.hurtFlashMs;

      if (this.armorHp <= 0) {
        this.armorBroken = true;
        this.enraged = true;
        this.createArmorBreakEffect();
      }

      // Cannot be staggered while armored
      const knockDir = this.x > fromX ? 1 : -1;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(knockDir * 15, -5); // Tiny nudge
      return true;
    }

    // Armor broken - takes real damage
    this.currentHp -= amount;
    this.aiState = 'hurt';
    this.hitstunTimer = this.cfg.hitstunMs * 0.6; // Still hard to stagger
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;

    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x * 0.4,
      -this.cfg.knockbackOnHit.y * 0.4
    );

    if (this.currentHp <= 0) {
      this.die();
    }

    return true;
  }

  private createArmorBreakEffect(): void {
    // Big dramatic flash
    const flash = this.scene.add.circle(this.x, this.y, 50, 0xffffff, 0.9);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0, scale: 3,
      duration: 400,
      onComplete: () => flash.destroy()
    });

    this.scene.cameras.main.shake(400, 0.015);

    // Mask fragments
    for (let i = 0; i < 16; i++) {
      const frag = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-10, 10),
        this.y - 20 + Phaser.Math.Between(-10, 10),
        Phaser.Math.Between(5, 12),
        Phaser.Math.Between(4, 8),
        i % 2 === 0 ? 0xe8dcc8 : 0xd4c8b0
      );
      const angle = (i / 16) * Math.PI * 2;
      this.scene.tweens.add({
        targets: frag,
        x: frag.x + Math.cos(angle) * Phaser.Math.Between(40, 90),
        y: frag.y + Math.sin(angle) * Phaser.Math.Between(30, 70) + 20,
        angle: Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: Phaser.Math.Between(500, 900),
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

    if (this.scytheGraphic) { this.scytheGraphic.destroy(); this.scytheGraphic = null; }
    if (this.hpBarBg) { this.hpBarBg.destroy(); this.hpBarBg = null; }
    if (this.hpBarFill) { this.hpBarFill.destroy(); this.hpBarFill = null; }
    if (this.armorBarFill) { this.armorBarFill.destroy(); this.armorBarFill = null; }
    if (this.nameText) { this.nameText.destroy(); this.nameText = null; }

    this.createDeathParticles();

    // Drop shells
    const dropCount = Phaser.Math.Between(this.cfg.dropShells.min, this.cfg.dropShells.max);
    for (let i = 0; i < dropCount; i++) {
      const offsetX = Phaser.Math.Between(-30, 30);
      const offsetY = Phaser.Math.Between(-15, 15);
      const pickup = new Pickup(this.scene, this.x + offsetX, this.y + offsetY, 'shells', 1);
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) gameScene.getPickupsGroup().add(pickup);
      const pickupBody = pickup.body as Phaser.Physics.Arcade.Body;
      if (pickupBody) {
        pickupBody.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-150, -80));
        this.scene.time.delayedCall(250, () => {
          if (pickup.active && pickupBody) {
            pickupBody.setVelocity(0, 0);
            pickupBody.moves = false;
          }
        });
      }
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0, scaleX: 1.8, scaleY: 0.4,
      duration: 300,
      ease: 'Power2',
      onComplete: () => this.destroy()
    });
  }

  private createDeathParticles(): void {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const color = [0x8a2222, 0xcc4444, 0xe8dcc8, 0x1a1a1a, 0x333333][i % 5];
      const p = this.scene.add.circle(
        this.x + Phaser.Math.Between(-20, 20),
        this.y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(3, 8),
        color
      );
      const angle = (i / count) * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 100);
      this.scene.tweens.add({
        targets: p,
        x: p.x + Math.cos(angle) * dist,
        y: p.y + Math.sin(angle) * dist,
        alpha: 0, scale: 0.2,
        duration: Phaser.Math.Between(300, 600),
        ease: 'Power2',
        onComplete: () => p.destroy()
      });
    }

    const flash = this.scene.add.circle(this.x, this.y, 40, 0xaa3333, 0.8);
    this.scene.tweens.add({
      targets: flash,
      radius: 60, alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy()
    });
  }

  destroy(fromScene?: boolean): void {
    if (this.scytheGraphic) { this.scytheGraphic.destroy(); this.scytheGraphic = null; }
    if (this.hpBarBg) { this.hpBarBg.destroy(); }
    if (this.hpBarFill) { this.hpBarFill.destroy(); }
    if (this.armorBarFill) { this.armorBarFill.destroy(); }
    if (this.nameText) { this.nameText.destroy(); }
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
  getAIState(): VanguardAIState { return this.aiState; }
  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.cfg.hp; }
  isArmorBroken(): boolean { return this.armorBroken; }
  isInvulnerable(): boolean { return this.invulnTimer > 0; }
  getDisplayName(): string { return 'Colony Vanguard'; }
}
