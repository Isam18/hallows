import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Warfield Reaper - Aerial zone-controller for the Forgotten Warfield.
 *
 * A lean, legless scavenger construct with vibrating bronze wing-appendages
 * and a hollow mask. Throws boomeranging saw-blade discs in parabolic arcs.
 * Return trip tracks the Reaper at double speed, punishing stationary players.
 * After throwing both blades, enters a 4s defenseless re-arming state.
 */
type ReaperAIState = 'idle' | 'orbit' | 'throwing' | 'rearming' | 'hurt' | 'dead';

interface BladeDisc {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  returning: boolean;
  life: number;
  speed: number;
  travelDist: number;
  maxTravel: number;
  startX: number;
  startY: number;
}

export class WarfieldReaper extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: ReaperAIState = 'idle';
  private currentHp: number;

  // Orbit
  private orbitAngle = Math.random() * Math.PI * 2;
  private readonly ORBIT_SPEED = 0.8; // radians per second
  private readonly HOVER_HEIGHT = 120;
  private readonly ORBIT_RADIUS = 200;

  // Throwing
  private bladesThrown = 0;
  private throwCooldown = 0;
  private readonly THROW_INTERVAL = 1200; // ms between throws

  // Re-arming
  private rearmTimer = 0;
  private readonly REARM_DURATION = 4000;

  // Combat
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private isDead = false;
  private lastHitBySwingId = -1;

  // Active blade discs
  private bladeDiscs: BladeDisc[] = [];

  // Visual elements
  private bodyGfx: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'warfieldReaper');

    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    this.bodyGfx = this.scene.add.graphics();
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateAI(player, delta);
    this.updateBladeDiscs(delta);
    this.drawVisuals();
    this.updateSpriteVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.throwCooldown > 0) this.throwCooldown -= delta;
  }

  private updateAI(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.aiState) {
      case 'idle': {
        body.setVelocity(0, 0);
        if (dist < 350) {
          this.aiState = 'orbit';
        }
        this.y += Math.sin(Date.now() * 0.003) * 0.3;
        break;
      }

      case 'orbit': {
        // Orbit away from player, preferring opposite side of arena
        this.orbitAngle += this.ORBIT_SPEED * (delta / 1000);

        // Try to stay on opposite side of player
        const arenaCenter = this.scene.physics.world.bounds.width / 2;
        const targetX = player.x > arenaCenter
          ? Math.max(100, player.x - this.ORBIT_RADIUS)
          : Math.min(this.scene.physics.world.bounds.width - 100, player.x + this.ORBIT_RADIUS);
        const targetY = Math.max(80, player.y - this.HOVER_HEIGHT + Math.sin(this.orbitAngle) * 40);

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const moveSpeed = 60;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 5) {
          body.setVelocity((dx / d) * moveSpeed, (dy / d) * moveSpeed);
        } else {
          body.setVelocity(Math.cos(this.orbitAngle) * 30, Math.sin(this.orbitAngle) * 15);
        }

        this.setFlipX(player.x < this.x);

        // Throw blades when in range
        if (dist < 300 && this.throwCooldown <= 0 && this.bladesThrown < 2) {
          this.aiState = 'throwing';
        }
        break;
      }

      case 'throwing': {
        body.setVelocity(0, 0);
        if (this.throwCooldown <= 0) {
          this.throwBladeDisc(player);
          this.bladesThrown++;
          this.throwCooldown = this.THROW_INTERVAL;

          if (this.bladesThrown >= 2) {
            // Both blades thrown, enter rearming
            this.aiState = 'rearming';
            this.rearmTimer = this.REARM_DURATION;
          } else {
            this.aiState = 'orbit';
          }
        }
        break;
      }

      case 'rearming': {
        this.rearmTimer -= delta;
        // Spin in place, defenseless
        body.setVelocity(0, Math.sin(Date.now() * 0.005) * 10);
        
        if (this.rearmTimer <= 0) {
          this.bladesThrown = 0;
          this.aiState = 'orbit';
        }
        break;
      }

      case 'hurt': {
        if (this.hitstunTimer <= 0) {
          this.aiState = 'orbit';
        }
        break;
      }

      case 'dead':
        body.setVelocity(0, 0);
        break;
    }
  }

  private throwBladeDisc(player: Player): void {
    const gfx = this.scene.add.graphics();

    // Parabolic arc toward player - slow outbound
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const outSpeed = 140; // Slow initial speed

    const blade: BladeDisc = {
      gfx,
      x: this.x,
      y: this.y,
      vx: Math.cos(angle) * outSpeed,
      vy: Math.sin(angle) * outSpeed - 60, // Arc upward slightly
      returning: false,
      life: 4000,
      speed: outSpeed,
      travelDist: 0,
      maxTravel: 220, // distance before boomerang
      startX: this.x,
      startY: this.y,
    };

    this.bladeDiscs.push(blade);
  }

  private updateBladeDiscs(delta: number): void {
    const dt = delta / 1000;

    for (let i = this.bladeDiscs.length - 1; i >= 0; i--) {
      const blade = this.bladeDiscs[i];
      blade.life -= delta;

      if (blade.life <= 0 || !blade.gfx.active) {
        blade.gfx.destroy();
        this.bladeDiscs.splice(i, 1);
        continue;
      }

      if (!blade.returning) {
        // Outbound: slow parabolic arc
        blade.x += blade.vx * dt;
        blade.y += blade.vy * dt;
        blade.vy += 80 * dt; // gravity arc

        blade.travelDist += Math.sqrt((blade.vx * dt) ** 2 + (blade.vy * dt) ** 2);

        // Check if hit wall or max travel
        if (blade.travelDist >= blade.maxTravel ||
            blade.x < 10 || blade.x > this.scene.physics.world.bounds.width - 10) {
          blade.returning = true;
        }
      } else {
        // Return: track the Reaper at double speed
        const returnSpeed = blade.speed * 2.5;
        const dx = this.x - blade.x;
        const dy = this.y - blade.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < 20) {
          // Blade caught, destroy
          blade.gfx.destroy();
          this.bladeDiscs.splice(i, 1);
          continue;
        }

        blade.vx = (dx / d) * returnSpeed;
        blade.vy = (dy / d) * returnSpeed;
        blade.x += blade.vx * dt;
        blade.y += blade.vy * dt;
      }

      // Draw the blade
      blade.gfx.clear();
      const rot = Date.now() * 0.015;
      blade.gfx.setPosition(blade.x, blade.y);
      blade.gfx.setRotation(rot);
      // Saw blade: circle with jagged teeth
      blade.gfx.fillStyle(0x886644, 0.9);
      blade.gfx.fillCircle(0, 0, 8);
      blade.gfx.fillStyle(0x664422, 1);
      for (let t = 0; t < 6; t++) {
        const a = (t / 6) * Math.PI * 2;
        blade.gfx.fillTriangle(
          Math.cos(a) * 6, Math.sin(a) * 6,
          Math.cos(a + 0.3) * 12, Math.sin(a + 0.3) * 12,
          Math.cos(a - 0.3) * 12, Math.sin(a - 0.3) * 12
        );
      }
      // Center rivet
      blade.gfx.fillStyle(0x443322, 1);
      blade.gfx.fillCircle(0, 0, 3);

      // Trail effect
      const trail = this.scene.add.circle(blade.x, blade.y, 4, 0x886644, 0.3);
      this.scene.tweens.add({
        targets: trail,
        alpha: 0, scale: 0.2,
        duration: 200,
        onComplete: () => trail.destroy()
      });

      // Collision with player
      const gameScene = this.scene as any;
      if (gameScene.player && gameScene.player.active) {
        const px = gameScene.player.x;
        const py = gameScene.player.y;
        const dist = Phaser.Math.Distance.Between(blade.x, blade.y, px, py);
        if (dist < 20) {
          gameScene.player.takeDamage?.(2, blade.x);
          // Don't destroy on hit - blade continues
          // Brief impact flash
          const impact = this.scene.add.circle(blade.x, blade.y, 10, 0xcc8844, 0.6);
          this.scene.tweens.add({
            targets: impact,
            alpha: 0, scaleX: 2, scaleY: 2,
            duration: 150,
            onComplete: () => impact.destroy()
          });
        }
      }
    }
  }

  private drawVisuals(): void {
    if (!this.bodyGfx) return;
    this.bodyGfx.clear();

    const cx = this.x;
    const cy = this.y;

    // --- Wing appendages (4 vibrating wings) ---
    const wingColor = 0x886644;
    const wingGlow = this.aiState === 'rearming' ? 0xcc8844 : 0x997755;
    const wingVibrate = this.aiState === 'rearming' ? 3 : 1;

    for (let side = -1; side <= 1; side += 2) {
      for (let pair = 0; pair < 2; pair++) {
        const baseY = cy - 8 + pair * 12;
        const wingLen = 18 + pair * 4;
        const vibX = Math.sin(Date.now() * 0.02 + pair * 2 + side) * wingVibrate;
        const vibY = Math.cos(Date.now() * 0.015 + pair) * wingVibrate * 0.5;

        this.bodyGfx.lineStyle(2, wingColor, 0.8);
        this.bodyGfx.lineBetween(cx, baseY, cx + side * wingLen + vibX, baseY - 5 + vibY);
        // Wing membrane
        this.bodyGfx.fillStyle(wingGlow, 0.3);
        this.bodyGfx.fillTriangle(
          cx, baseY,
          cx + side * wingLen + vibX, baseY - 5 + vibY,
          cx + side * (wingLen - 6) + vibX, baseY + 4 + vibY
        );
      }
    }

    // --- Body: lightweight bronze plating ---
    this.bodyGfx.fillStyle(0x775533, 0.9);
    this.bodyGfx.fillRect(cx - 10, cy - 14, 20, 24);
    // Tattered maroon fabric drapes
    this.bodyGfx.fillStyle(0x5a1a1a, 0.7);
    this.bodyGfx.fillTriangle(cx - 10, cy + 10, cx - 15, cy + 22, cx - 4, cy + 14);
    this.bodyGfx.fillTriangle(cx + 10, cy + 10, cx + 15, cy + 22, cx + 4, cy + 14);
    this.bodyGfx.fillTriangle(cx - 2, cy + 10, cx, cy + 25, cx + 2, cy + 14);

    // Dusty brown plating lines
    this.bodyGfx.lineStyle(1, 0x554422, 0.6);
    this.bodyGfx.lineBetween(cx - 10, cy - 5, cx + 10, cy - 5);
    this.bodyGfx.lineBetween(cx - 10, cy + 3, cx + 10, cy + 3);

    // --- Hollow bronze mask head ---
    this.bodyGfx.fillStyle(0x886644, 0.95);
    this.bodyGfx.fillRoundedRect(cx - 8, cy - 26, 16, 14, 3);
    // Mask edge
    this.bodyGfx.lineStyle(1.5, 0x553311, 1);
    this.bodyGfx.strokeRoundedRect(cx - 8, cy - 26, 16, 14, 3);
    // Single glowing aperture
    const apertureGlow = this.aiState === 'rearming' ? 0xcc6633 : 0xffaa44;
    this.bodyGfx.fillStyle(apertureGlow, 0.9);
    this.bodyGfx.fillCircle(cx, cy - 19, 3);
    // Aperture glow halo
    this.bodyGfx.fillStyle(apertureGlow, 0.2);
    this.bodyGfx.fillCircle(cx, cy - 19, 6);

    // --- Spindly hands with blade-discs (only if not rearming and blades not thrown) ---
    if (this.bladesThrown < 2 && this.aiState !== 'rearming') {
      // Arms
      this.bodyGfx.lineStyle(1.5, 0x664422, 0.8);
      this.bodyGfx.lineBetween(cx - 10, cy - 2, cx - 22, cy + 6);
      this.bodyGfx.lineBetween(cx + 10, cy - 2, cx + 22, cy + 6);
      // Mini blade-discs in hands
      for (const side of [-1, 1]) {
        const hx = cx + side * 22;
        const hy = cy + 6;
        this.bodyGfx.fillStyle(0x886644, 0.8);
        this.bodyGfx.fillCircle(hx, hy, 5);
        this.bodyGfx.lineStyle(1, 0x553311, 0.7);
        for (let t = 0; t < 4; t++) {
          const a = (t / 4) * Math.PI * 2 + Date.now() * 0.01;
          this.bodyGfx.lineBetween(hx, hy, hx + Math.cos(a) * 7, hy + Math.sin(a) * 7);
        }
      }
    } else if (this.aiState === 'rearming') {
      // Rapid spinning energy generation effect
      const spinAngle = Date.now() * 0.02;
      for (let i = 0; i < 4; i++) {
        const a = spinAngle + (i / 4) * Math.PI * 2;
        const ex = cx + Math.cos(a) * 16;
        const ey = cy + Math.sin(a) * 10;
        this.bodyGfx.fillStyle(0xcc8844, 0.4);
        this.bodyGfx.fillCircle(ex, ey, 3);
      }
    }
  }

  private updateSpriteVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else if (this.aiState === 'rearming') {
      this.setAlpha(0.6);
      this.setTint(0xcc8844);
    } else {
      this.clearTint();
      this.setAlpha(0.85);
    }
  }

  getContactDamage(): number {
    return this.cfg.contactDamage;
  }

  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;

    // Extra damage during rearming
    const finalAmount = this.aiState === 'rearming' ? amount * 1.5 : amount;
    this.currentHp -= finalAmount;

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
      const pickup = new Pickup(this.scene, this.x + Phaser.Math.Between(-25, 25), this.y + Phaser.Math.Between(-10, 10), 'shells', 1);
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) gameScene.getPickupsGroup().add(pickup);
      const pb = pickup.body as Phaser.Physics.Arcade.Body;
      if (pb) {
        pb.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-140, -60));
        this.scene.time.delayedCall(200, () => {
          if (pickup.active && pb) { pb.setVelocity(0, 0); pb.moves = false; }
        });
      }
    }

    // Destroy visuals
    this.bodyGfx?.destroy();
    this.bladeDiscs.forEach(b => b.gfx.destroy());
    this.bladeDiscs = [];

    // Death: bronze plating fragments + fabric shreds
    for (let i = 0; i < 20; i++) {
      const isMetal = Math.random() > 0.4;
      const color = isMetal ? 0x886644 : 0x5a1a1a;
      const frag = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-8, 8),
        this.y + Phaser.Math.Between(-15, 5),
        Phaser.Math.Between(3, 7), Phaser.Math.Between(2, 5),
        color, 0.8
      );
      frag.setRotation(Math.random() * Math.PI * 2);
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(30, 100);
      this.scene.tweens.add({
        targets: frag,
        x: frag.x + Math.cos(angle) * dist,
        y: frag.y + Math.sin(angle) * dist + 20,
        alpha: 0,
        rotation: frag.rotation + Phaser.Math.Between(-4, 4),
        duration: 500 + Math.random() * 400,
        onComplete: () => frag.destroy()
      });
    }

    // Bronze energy burst from mask
    const burst = this.scene.add.circle(this.x, this.y - 19, 15, 0xffaa44, 0.5);
    this.scene.tweens.add({
      targets: burst,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 400,
      onComplete: () => burst.destroy()
    });

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
