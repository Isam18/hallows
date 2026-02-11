import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Winged Commander - Boss-tier aerial enemy of the crimson insect tribe.
 * Highly aggressive: flash-dashes, aerial ground smashes, scythe whirlwind.
 * Equal in power to the Colony Vanguard.
 */
type CommanderAIState =
  | 'idle' | 'hover' | 'charge_windup' | 'charging'
  | 'dive_windup' | 'diving' | 'slam_recovery'
  | 'whirlwind' | 'hurt' | 'dead';

export class WingedCommander extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: CommanderAIState = 'idle';
  private currentHp: number;

  private spawnX: number;
  private spawnY: number;
  private facingDir: 1 | -1 = -1;

  // Timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private actionCooldown = 0;
  private stateTimer = 0;

  // Hover
  private hoverBaseY = 0;
  private hoverOffset = 0;
  private hoverTime = 0;

  // Charge
  private chargeDir = { x: 0, y: 0 };
  private chargeSpeed = 600;
  private chargeTimer = 0;

  // Dive
  private diveSpeed = 800;

  // Whirlwind
  private whirlwindRadius = 60;
  private whirlwindAngle = 0;
  private whirlwindDamageTimer = 0;

  // Scythe visuals
  private scytheGraphic: Phaser.GameObjects.Graphics | null = null;
  private scytheL_angle = 0;
  private scytheR_angle = 0;

  // Boss HP bar
  private hpBarBg: Phaser.GameObjects.Rectangle | null = null;
  private hpBarFill: Phaser.GameObjects.Rectangle | null = null;
  private nameText: Phaser.GameObjects.Text | null = null;

  // Aggro
  private aggroRange = 400;

  // State
  private isDead_ = false;
  private lastHitBySwingId = -1;
  private actionCount = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'wingedCommander');

    this.spawnX = x;
    this.spawnY = y;
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    this.hoverBaseY = y - 60;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);
    this.setScale(1.4);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    this.facingDir = -1;
    this.setFlipX(true);

    this.scytheGraphic = scene.add.graphics();
    this.scytheGraphic.setDepth(this.depth + 1);

    this.createBossHPBar();
  }

  private createBossHPBar(): void {
    const barWidth = 180;
    this.hpBarBg = this.scene.add.rectangle(this.x, this.y - 55, barWidth + 4, 10, 0x000000, 0.7);
    this.hpBarFill = this.scene.add.rectangle(this.x, this.y - 55, barWidth, 6, 0xcc2222);
    this.nameText = this.scene.add.text(this.x, this.y - 68, 'Winged Commander', {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#ff8866',
    }).setOrigin(0.5);

    this.hpBarBg.setDepth(999);
    this.hpBarFill.setDepth(1000);
    this.nameText.setDepth(1000);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead_) return;

    this.updateTimers(delta);
    this.updateAI(player, delta);
    this.updateActions(player, delta);
    this.updateVisuals();
    this.drawScythes();
    this.updateHPBar();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.actionCooldown > 0) this.actionCooldown -= delta;
    this.hoverTime += delta;
  }

  private updateAI(player: Player, delta: number): void {
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) this.aiState = 'hover';
      return;
    }
    if (this.aiState === 'dead') return;
    if (['charge_windup', 'charging', 'dive_windup', 'diving', 'slam_recovery', 'whirlwind'].includes(this.aiState)) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (dist < this.aggroRange) {
      this.facingDir = player.x < this.x ? -1 : 1;
      this.setFlipX(this.facingDir < 0);

      if (this.actionCooldown <= 0) {
        this.chooseAttack(player, dist);
      } else {
        this.aiState = 'hover';
        this.hoverToward(player, delta);
      }
    } else {
      this.aiState = 'idle';
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
    }
  }

  private chooseAttack(player: Player, dist: number): void {
    this.actionCount++;

    // Whirlwind every 4th action
    if (this.actionCount % 4 === 0 && dist < 120) {
      this.startWhirlwind();
      return;
    }

    // Above player? Dive
    if (this.y < player.y - 60 && Math.abs(this.x - player.x) < 100) {
      this.startDive();
      return;
    }

    // Otherwise charge
    this.startCharge(player);
  }

  private hoverToward(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const targetX = player.x + (this.facingDir * -80);
    const targetY = player.y - 80 + Math.sin(this.hoverTime * 0.003) * 20;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 5) {
      body.setVelocity((dx / len) * 120, (dy / len) * 120);
    } else {
      body.setVelocity(0, Math.sin(this.hoverTime * 0.003) * 30);
    }
  }

  // === OMNI-DIRECTIONAL CHARGE ===
  private startCharge(player: Player): void {
    this.aiState = 'charge_windup';
    this.stateTimer = 350; // Brief shimmer wind-up

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    // Calculate charge direction toward player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.chargeDir = { x: dx / len, y: dy / len };

    // Shimmer effect
    this.createShimmerEffect();
  }

  private createShimmerEffect(): void {
    for (let i = 0; i < 6; i++) {
      const spark = this.scene.add.circle(
        this.x + Phaser.Math.Between(-15, 15),
        this.y + Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(2, 5),
        0xffaa66, 0.8
      );
      this.scene.tweens.add({
        targets: spark,
        alpha: 0, scale: 0.2,
        x: spark.x + Phaser.Math.Between(-20, 20),
        y: spark.y + Phaser.Math.Between(-20, 20),
        duration: 300,
        onComplete: () => spark.destroy()
      });
    }
  }

  // === AERIAL GROUND SMASH ===
  private startDive(): void {
    this.aiState = 'dive_windup';
    this.stateTimer = 400;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, -100); // Brief rise before diving

    // Warning indicator
    const warning = this.scene.add.circle(this.x, this.y + 200, 20, 0xff2222, 0.3);
    this.scene.tweens.add({
      targets: warning,
      alpha: 0, scaleX: 3, scaleY: 0.3,
      duration: 400,
      onComplete: () => warning.destroy()
    });
  }

  // === SCYTHE WHIRLWIND ===
  private startWhirlwind(): void {
    this.aiState = 'whirlwind';
    this.stateTimer = 1200;
    this.whirlwindAngle = 0;
    this.whirlwindDamageTimer = 0;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }

  private updateActions(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Charge windup
    if (this.aiState === 'charge_windup') {
      this.stateTimer -= delta;
      // Vibrate during windup
      this.x += (Math.random() - 0.5) * 3;
      if (this.stateTimer <= 0) {
        this.aiState = 'charging';
        this.chargeTimer = 300;
        body.setVelocity(
          this.chargeDir.x * this.chargeSpeed,
          this.chargeDir.y * this.chargeSpeed
        );
      }
    }

    // Charging
    if (this.aiState === 'charging') {
      this.chargeTimer -= delta;

      // Check hit player
      const pb = player.getBounds();
      const mb = this.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(pb, mb)) {
        player.takeDamage(2, this.x);
      }

      // Hit wall — impact particles + screen shake
      if (body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down) {
        this.createImpactEffect();
        this.scene.cameras.main.shake(200, 0.012);
        this.aiState = 'hover';
        this.actionCooldown = 600;
        body.setVelocity(0, 0);
      }

      if (this.chargeTimer <= 0) {
        this.aiState = 'hover';
        this.actionCooldown = 500;
        body.setVelocity(0, 0);
      }
    }

    // Dive windup
    if (this.aiState === 'dive_windup') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.aiState = 'diving';
        body.setVelocity(0, this.diveSpeed);
        body.setAllowGravity(true);
      }
    }

    // Diving
    if (this.aiState === 'diving') {
      if (body.blocked.down || body.touching.down) {
        // SLAM!
        this.createGroundSmash(player);
        this.scene.cameras.main.shake(350, 0.02);
        this.aiState = 'slam_recovery';
        this.stateTimer = 500;
        body.setVelocity(0, 0);
        body.setAllowGravity(false);
      }
    }

    // Slam recovery
    if (this.aiState === 'slam_recovery') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        // Float back up
        this.aiState = 'hover';
        this.actionCooldown = 800;
        body.setVelocity(0, -200);
        this.scene.time.delayedCall(400, () => {
          if (this.active && !this.isDead_) {
            body.setVelocity(0, 0);
          }
        });
      }
    }

    // Whirlwind
    if (this.aiState === 'whirlwind') {
      this.stateTimer -= delta;
      this.whirlwindAngle += delta * 0.02;

      // Damage nearby player
      this.whirlwindDamageTimer -= delta;
      if (this.whirlwindDamageTimer <= 0) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (dist < this.whirlwindRadius + 20) {
          player.takeDamage(1, this.x);
        }
        this.whirlwindDamageTimer = 300;
      }

      if (this.stateTimer <= 0) {
        this.aiState = 'hover';
        this.actionCooldown = 1000;
      }
    }
  }

  private createImpactEffect(): void {
    // Red dust + bone shards
    for (let i = 0; i < 12; i++) {
      const isBone = i % 3 === 0;
      const color = isBone ? 0xe8dcc8 : (i % 2 === 0 ? 0x8a2222 : 0xcc4444);
      const size = isBone ? Phaser.Math.Between(3, 7) : Phaser.Math.Between(2, 5);

      const p = isBone
        ? this.scene.add.rectangle(
            this.x + Phaser.Math.Between(-10, 10),
            this.y + Phaser.Math.Between(-10, 10),
            size, size * 0.6, color
          )
        : this.scene.add.circle(
            this.x + Phaser.Math.Between(-10, 10),
            this.y + Phaser.Math.Between(-10, 10),
            size, color
          );

      const angle = (i / 12) * Math.PI * 2;
      const dist = Phaser.Math.Between(30, 80);
      this.scene.tweens.add({
        targets: p,
        x: (p as any).x + Math.cos(angle) * dist,
        y: (p as any).y + Math.sin(angle) * dist,
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(300, 600),
        ease: 'Power2',
        onComplete: () => p.destroy()
      });
    }
  }

  private createGroundSmash(player: Player): void {
    this.createImpactEffect();

    // Bone-spike shockwave traveling outward
    const spawnY = this.y + (this.cfg.height / 2);

    for (let dir = -1; dir <= 1; dir += 2) {
      for (let i = 0; i < 5; i++) {
        const delay = i * 80;
        const dist = 40 + i * 40;
        this.scene.time.delayedCall(delay, () => {
          if (!this.active) return;
          // Bone spike
          const spike = this.scene.add.triangle(
            this.x + dir * dist, spawnY,
            0, 0, -8, 20, 8, 20,
            0xe8dcc8
          );
          spike.setOrigin(0.5, 1);

          this.scene.tweens.add({
            targets: spike,
            scaleY: 1.5,
            alpha: 0,
            y: spike.y - 5,
            duration: 400,
            ease: 'Power2',
            onComplete: () => spike.destroy()
          });

          // Check player hit
          const px = player.x;
          if (Math.abs(px - (this.x + dir * dist)) < 25 && Math.abs(player.y - spawnY) < 40) {
            player.takeDamage(2, this.x);
          }
        });
      }
    }
  }

  private drawScythes(): void {
    if (!this.scytheGraphic || this.isDead_) return;
    this.scytheGraphic.clear();

    if (this.aiState === 'whirlwind') {
      // Spinning scythes
      const r = this.whirlwindRadius;
      for (let i = 0; i < 2; i++) {
        const a = this.whirlwindAngle + i * Math.PI;
        const ex = this.x + Math.cos(a) * r;
        const ey = this.y + Math.sin(a) * r;

        this.scytheGraphic.lineStyle(4, 0x4a3a2a);
        this.scytheGraphic.lineBetween(this.x, this.y, ex, ey);

        this.scytheGraphic.fillStyle(0xe8dcc8);
        this.scytheGraphic.fillCircle(ex, ey, 8);

        // Serrated edge
        this.scytheGraphic.fillStyle(0xd4c8b0);
        const ba = a + 0.8;
        this.scytheGraphic.fillTriangle(
          ex, ey,
          ex + Math.cos(ba) * 14, ey + Math.sin(ba) * 14,
          ex + Math.cos(ba + 0.4) * 10, ey + Math.sin(ba + 0.4) * 10
        );
      }

      // Whirlwind circle visual
      this.scytheGraphic.lineStyle(1, 0xffaa66, 0.3);
      this.scytheGraphic.strokeCircle(this.x, this.y, r);
    } else {
      // Resting dual scythes
      for (let side = -1; side <= 1; side += 2) {
        const cx = this.x + side * 18;
        const cy = this.y - 5;
        const baseAngle = side > 0
          ? (this.aiState === 'charge_windup' ? 0.3 : 0.8)
          : (this.aiState === 'charge_windup' ? Math.PI - 0.3 : Math.PI - 0.8);
        const len = 32;
        const ex = cx + Math.cos(baseAngle) * len;
        const ey = cy - Math.sin(baseAngle) * len;

        this.scytheGraphic.lineStyle(3, 0x4a3a2a);
        this.scytheGraphic.lineBetween(cx, cy, ex, ey);

        this.scytheGraphic.fillStyle(0xe8dcc8);
        this.scytheGraphic.fillCircle(ex, ey, 6);

        const ba = baseAngle + side * 0.6;
        this.scytheGraphic.fillStyle(0xd4c8b0);
        this.scytheGraphic.fillTriangle(
          ex, ey,
          ex + Math.cos(ba) * 12, ey - Math.sin(ba) * 12,
          ex + Math.cos(ba + 0.3) * 8, ey - Math.sin(ba + 0.3) * 8
        );
      }
    }
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTexture('wingedCommander_hurt');
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      this.setTexture('wingedCommander');
      this.setAlpha(1);
    }
  }

  private updateHPBar(): void {
    if (!this.hpBarBg || !this.hpBarFill || !this.nameText) return;
    const barWidth = 180;

    this.hpBarBg.setPosition(this.x, this.y - 55);
    this.hpBarFill.setPosition(this.x, this.y - 55);
    this.nameText.setPosition(this.x, this.y - 68);

    const ratio = this.currentHp / this.cfg.hp;
    this.hpBarFill.setSize(barWidth * ratio, 6);
    this.hpBarFill.setPosition(this.x - (barWidth * (1 - ratio)) / 2, this.y - 55);
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead_) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;

    // Whirlwind reduces damage
    if (this.aiState === 'whirlwind') {
      amount = Math.max(1, Math.floor(amount * 0.5));
      const spark = this.scene.add.circle(this.x, this.y - 10, 8, 0xffee88, 0.8);
      this.scene.tweens.add({
        targets: spark,
        alpha: 0, scale: 2,
        duration: 200,
        onComplete: () => spark.destroy()
      });
    }

    this.currentHp -= amount;
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;

    // Light knockback — hard to stagger
    if (this.aiState !== 'charging' && this.aiState !== 'diving') {
      this.aiState = 'hurt';
      this.hitstunTimer = this.cfg.hitstunMs * 0.4;
    }

    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(knockDir * 30, -15);

    if (this.currentHp <= 0) {
      this.die();
    }

    return true;
  }

  private die(): void {
    if (this.isDead_) return;
    this.isDead_ = true;
    this.aiState = 'dead';

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;

    if (this.scytheGraphic) { this.scytheGraphic.destroy(); this.scytheGraphic = null; }
    if (this.hpBarBg) { this.hpBarBg.destroy(); this.hpBarBg = null; }
    if (this.hpBarFill) { this.hpBarFill.destroy(); this.hpBarFill = null; }
    if (this.nameText) { this.nameText.destroy(); this.nameText = null; }

    // Dramatic death
    this.scene.cameras.main.shake(500, 0.02);
    this.createDeathParticles();

    const dropCount = Phaser.Math.Between(this.cfg.dropShells.min, this.cfg.dropShells.max);
    for (let i = 0; i < dropCount; i++) {
      const offsetX = Phaser.Math.Between(-30, 30);
      const offsetY = Phaser.Math.Between(-15, 15);
      const pickup = new Pickup(this.scene, this.x + offsetX, this.y + offsetY, 'shells', 1);
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) gameScene.getPickupsGroup().add(pickup);
      const pickupBody = pickup.body as Phaser.Physics.Arcade.Body;
      if (pickupBody) {
        pickupBody.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-180, -80));
        this.scene.time.delayedCall(300, () => {
          if (pickup.active && pickupBody) {
            pickupBody.setVelocity(0, 0);
            pickupBody.moves = false;
          }
        });
      }
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0, scaleX: 2, scaleY: 0.3,
      duration: 400,
      ease: 'Power2',
      onComplete: () => this.destroy()
    });
  }

  private createDeathParticles(): void {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const isBone = i % 4 === 0;
      const color = isBone ? 0xe8dcc8 : [0x8a2222, 0xcc4444, 0x1a1a1a, 0x333333][i % 4];
      const p = this.scene.add.circle(
        this.x + Phaser.Math.Between(-20, 20),
        this.y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(3, 9),
        color
      );
      const angle = (i / count) * Math.PI * 2;
      const dist = Phaser.Math.Between(50, 120);
      this.scene.tweens.add({
        targets: p,
        x: p.x + Math.cos(angle) * dist,
        y: p.y + Math.sin(angle) * dist,
        alpha: 0, scale: 0.2,
        duration: Phaser.Math.Between(350, 700),
        ease: 'Power2',
        onComplete: () => p.destroy()
      });
    }

    const flash = this.scene.add.circle(this.x, this.y, 50, 0xaa3333, 0.8);
    this.scene.tweens.add({
      targets: flash,
      radius: 80, alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy()
    });
  }

  destroy(fromScene?: boolean): void {
    if (this.scytheGraphic) { this.scytheGraphic.destroy(); this.scytheGraphic = null; }
    if (this.hpBarBg) { this.hpBarBg.destroy(); }
    if (this.hpBarFill) { this.hpBarFill.destroy(); }
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
  isDying(): boolean { return this.isDead_; }
  getAIState(): CommanderAIState { return this.aiState; }
  getCurrentHp(): number { return this.currentHp; }
  getMaxHp(): number { return this.cfg.hp; }
  isInvulnerable(): boolean { return this.invulnTimer > 0; }
  getDisplayName(): string { return 'Winged Commander'; }
}
