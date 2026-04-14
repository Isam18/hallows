import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Ossuary Sentinel - Glass Cannon ambush unit for the Forgotten Warfield.
 * 
 * A grotesque hovering construct with a censer-like head-cage filled with
 * fused player-body trophies. Maintains medium distance, then unleashes a
 * devastating short-range bone shard shotgun blast (3 hearts per shard).
 * After firing, enters a 6-second vulnerable cooling period.
 */
type SentinelAIState = 'idle' | 'drift' | 'windup' | 'firing' | 'cooling' | 'hurt' | 'dead';

export class OssuarySentinel extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: SentinelAIState = 'idle';
  private currentHp: number;

  // Drift movement
  private driftAngle = Math.random() * Math.PI * 2;
  private readonly DRIFT_SPEED = 25;
  private readonly PREFERRED_RANGE = 140; // medium range
  private readonly AGGRO_RANGE = 250;

  // Windup
  private windupTimer = 0;
  private readonly WINDUP_DURATION = 1000; // 1 second telegraph

  // Firing
  private firingTimer = 0;
  private readonly FIRING_DURATION = 200;
  private hasFiredShards = false;

  // Cooling (vulnerable)
  private coolingTimer = 0;
  private readonly COOLING_DURATION = 6000; // 6 seconds

  // Combat
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private isDead = false;
  private lastHitBySwingId = -1;

  // Bone shard projectiles
  private boneShards: Phaser.GameObjects.Graphics[] = [];

  // Visual: trophy bodies glow
  private glowIntensity = 0;
  private trophyBodies: Phaser.GameObjects.Graphics | null = null;
  private censerHead: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config.spriteKey || 'ossuarySentinel');

    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);

    // Make it hover (no gravity)
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    // Draw the creature visuals
    this.createVisuals();
  }

  private createVisuals(): void {
    // Censer head-cage
    this.censerHead = this.scene.add.graphics();
    // Trophy bodies graphics layer
    this.trophyBodies = this.scene.add.graphics();
  }

  private drawVisuals(): void {
    if (!this.censerHead || !this.trophyBodies) return;

    const cx = this.x;
    const cy = this.y;

    // Clear previous frame
    this.censerHead.clear();
    this.trophyBodies.clear();

    // --- Main body: tattered vestments ---
    this.censerHead.lineStyle(2, 0x111111, 1);

    // Vestment body (maroon draped cloth)
    this.censerHead.fillStyle(0x5a1a1a, 0.9);
    this.censerHead.fillRect(cx - 14, cy - 5, 28, 30);
    // Burnt-orange tattered edges
    this.censerHead.fillStyle(0xcc6622, 0.7);
    this.censerHead.fillTriangle(cx - 14, cy + 25, cx - 20, cy + 35, cx - 8, cy + 30);
    this.censerHead.fillTriangle(cx + 14, cy + 25, cx + 20, cy + 35, cx + 8, cy + 30);
    this.censerHead.fillTriangle(cx - 4, cy + 25, cx, cy + 38, cx + 4, cy + 30);

    // --- Censer head-cage ---
    // Rusted metal cage structure
    this.censerHead.fillStyle(0x664422, 0.95);
    this.censerHead.fillRoundedRect(cx - 18, cy - 30, 36, 28, 4);
    // Metal bars
    this.censerHead.lineStyle(2, 0x553311, 1);
    this.censerHead.strokeRect(cx - 18, cy - 30, 36, 28);
    // Vertical bars
    for (let i = -12; i <= 12; i += 8) {
      this.censerHead.lineBetween(cx + i, cy - 30, cx + i, cy - 2);
    }
    // Horizontal bar
    this.censerHead.lineBetween(cx - 18, cy - 16, cx + 18, cy - 16);

    // Ornate top spike
    this.censerHead.fillStyle(0x553311, 1);
    this.censerHead.fillTriangle(cx - 6, cy - 30, cx, cy - 42, cx + 6, cy - 30);

    // --- Trophy bodies (pale, distorted player figures inside cage) ---
    const glowColor = this.aiState === 'cooling'
      ? 0x444444  // Grey during cooling
      : Phaser.Display.Color.GetColor(
          Math.floor(50 + this.glowIntensity * 80),
          Math.floor(180 + this.glowIntensity * 75),
          Math.floor(50 + this.glowIntensity * 30)
        );

    // Small pale bodies poking through bars
    this.trophyBodies.fillStyle(0xccbbaa, 0.8);
    // Body 1 - torso+head poking out left
    this.trophyBodies.fillCircle(cx - 10, cy - 22, 4);
    this.trophyBodies.fillRect(cx - 12, cy - 18, 5, 8);
    // Body 2 - arm reaching out right
    this.trophyBodies.fillCircle(cx + 8, cy - 20, 3);
    this.trophyBodies.fillRect(cx + 10, cy - 24, 3, 10);
    // Body 3 - face pressed against bars center
    this.trophyBodies.fillCircle(cx, cy - 12, 4);

    // Glowing energy conduits
    this.trophyBodies.lineStyle(1.5, glowColor, 0.6 + this.glowIntensity * 0.4);
    this.trophyBodies.lineBetween(cx - 10, cy - 14, cx - 5, cy - 6);
    this.trophyBodies.lineBetween(cx + 8, cy - 14, cx + 4, cy - 6);
    this.trophyBodies.lineBetween(cx, cy - 8, cx, cy - 2);

    // Glow circles on conduits
    this.trophyBodies.fillStyle(glowColor, 0.3 + this.glowIntensity * 0.5);
    this.trophyBodies.fillCircle(cx - 7, cy - 10, 3 + this.glowIntensity * 2);
    this.trophyBodies.fillCircle(cx + 6, cy - 10, 3 + this.glowIntensity * 2);

    // Metal spikes fusing bodies
    this.censerHead.lineStyle(1, 0x553311, 0.8);
    this.censerHead.lineBetween(cx - 14, cy - 24, cx - 8, cy - 20);
    this.censerHead.lineBetween(cx + 14, cy - 18, cx + 10, cy - 16);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.updateAI(player, delta);
    this.updateBoneShards(delta);
    this.drawVisuals();
    this.updateSpriteVisuals();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
  }

  private updateAI(player: Player, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.aiState) {
      case 'idle': {
        body.setVelocity(0, 0);
        if (dist < this.AGGRO_RANGE) {
          this.aiState = 'drift';
        }
        // Gentle bob
        this.y += Math.sin(Date.now() * 0.003) * 0.3;
        this.glowIntensity = 0.1;
        break;
      }

      case 'drift': {
        // Maintain medium range, drift slowly
        this.driftAngle += delta * 0.001;
        const dx = player.x - this.x;
        const dy = (player.y - 30) - this.y; // hover above player level
        const currentDist = Math.sqrt(dx * dx + dy * dy);

        let moveX = 0;
        let moveY = 0;

        if (currentDist < this.PREFERRED_RANGE * 0.7) {
          // Too close, drift away
          moveX = -dx / currentDist * this.DRIFT_SPEED * 1.5;
          moveY = -dy / currentDist * this.DRIFT_SPEED;
        } else if (currentDist > this.PREFERRED_RANGE * 1.3) {
          // Too far, drift closer
          moveX = dx / currentDist * this.DRIFT_SPEED;
          moveY = dy / currentDist * this.DRIFT_SPEED;
        } else {
          // Orbit around preferred range
          moveX = Math.cos(this.driftAngle) * this.DRIFT_SPEED * 0.5;
          moveY = Math.sin(this.driftAngle) * this.DRIFT_SPEED * 0.3;
        }

        body.setVelocity(moveX, moveY);
        this.setFlipX(player.x < this.x);
        this.glowIntensity = 0.2 + Math.sin(Date.now() * 0.004) * 0.1;

        // If player gets close enough, begin windup
        if (dist < this.PREFERRED_RANGE * 1.1) {
          this.aiState = 'windup';
          this.windupTimer = this.WINDUP_DURATION;
          body.setVelocity(0, 0);
        }
        break;
      }

      case 'windup': {
        this.windupTimer -= delta;
        body.setVelocity(0, 0);

        // Trophy bodies twitch and vibrate
        this.x += Math.sin(Date.now() * 0.08) * 1.5;
        this.y += Math.cos(Date.now() * 0.06) * 0.8;

        // Glow intensifies as windup progresses
        const windupProgress = 1 - (this.windupTimer / this.WINDUP_DURATION);
        this.glowIntensity = 0.3 + windupProgress * 0.7;

        // Emit leaf telegraph particles
        if (Math.random() < 0.3) {
          this.emitTelegraphLeaves();
        }

        this.setFlipX(player.x < this.x);

        if (this.windupTimer <= 0) {
          this.aiState = 'firing';
          this.firingTimer = this.FIRING_DURATION;
          this.hasFiredShards = false;
        }
        break;
      }

      case 'firing': {
        this.firingTimer -= delta;
        body.setVelocity(0, 0);

        if (!this.hasFiredShards) {
          this.fireOssuaryFlurry(player);
          this.hasFiredShards = true;
        }

        if (this.firingTimer <= 0) {
          this.aiState = 'cooling';
          this.coolingTimer = this.COOLING_DURATION;
          this.glowIntensity = 0;
        }
        break;
      }

      case 'cooling': {
        this.coolingTimer -= delta;
        body.setVelocity(0, 0);
        this.glowIntensity = 0;

        // Slight sag/droop during cooling
        this.y += Math.sin(Date.now() * 0.001) * 0.2;

        if (this.coolingTimer <= 0) {
          this.aiState = 'drift';
          this.glowIntensity = 0.2;
        }
        break;
      }

      case 'hurt': {
        if (this.hitstunTimer <= 0) {
          // Return to drift after hurt
          this.aiState = 'drift';
        }
        break;
      }

      case 'dead':
        body.setVelocity(0, 0);
        break;
    }
  }

  private fireOssuaryFlurry(player: Player): void {
    const shardCount = Phaser.Math.Between(8, 10);
    const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);

    // Shotgun spread: ~40 degree cone
    const spreadAngle = 0.35; // radians (~20 degrees each side)

    for (let i = 0; i < shardCount; i++) {
      const angle = baseAngle + (Math.random() * 2 - 1) * spreadAngle;
      const speed = Phaser.Math.Between(280, 380);

      const shard = this.scene.add.graphics();
      // Jagged bone shard shape
      const shardLen = Phaser.Math.Between(6, 10);
      const shardW = Phaser.Math.Between(2, 4);
      shard.fillStyle(0xddccaa, 0.9);
      shard.fillRect(-shardLen / 2, -shardW / 2, shardLen, shardW);
      // Dark edge
      shard.lineStyle(1, 0x443322, 0.8);
      shard.strokeRect(-shardLen / 2, -shardW / 2, shardLen, shardW);

      shard.setPosition(this.x, this.y - 15);
      shard.setRotation(angle);

      // Store velocity + lifetime data
      (shard as any)._vx = Math.cos(angle) * speed;
      (shard as any)._vy = Math.sin(angle) * speed;
      (shard as any)._life = 600; // ~1.5 dash-lengths travel time
      (shard as any)._damage = 3; // 3 hearts!

      this.boneShards.push(shard);
    }

    // Muzzle flash effect
    const flash = this.scene.add.circle(this.x, this.y - 15, 20, 0x66ff44, 0.6);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      onComplete: () => flash.destroy()
    });

    // Screen shake
    this.scene.cameras.main.shake(150, 0.005);
  }

  private updateBoneShards(delta: number): void {
    for (let i = this.boneShards.length - 1; i >= 0; i--) {
      const shard = this.boneShards[i];
      if (!shard.active) {
        this.boneShards.splice(i, 1);
        continue;
      }

      const vx = (shard as any)._vx;
      const vy = (shard as any)._vy;
      shard.x += vx * (delta / 1000);
      shard.y += vy * (delta / 1000);
      (shard as any)._life -= delta;

      // Fade as life decreases
      const lifeRatio = Math.max(0, (shard as any)._life / 600);
      shard.setAlpha(lifeRatio);

      if ((shard as any)._life <= 0) {
        shard.destroy();
        this.boneShards.splice(i, 1);
        continue;
      }

      // Check collision with player
      const gameScene = this.scene as any;
      if (gameScene.player && !gameScene.player.isDying()) {
        const px = gameScene.player.x;
        const py = gameScene.player.y;
        const dist = Phaser.Math.Distance.Between(shard.x, shard.y, px, py);
        if (dist < 18) {
          // Hit player for 3 hearts damage
          gameScene.player.takeDamage?.((shard as any)._damage, shard.x);
          shard.destroy();
          this.boneShards.splice(i, 1);
          // Impact effect
          const impact = this.scene.add.circle(shard.x, shard.y, 8, 0xddccaa, 0.7);
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

  private emitTelegraphLeaves(): void {
    const leafColors = [0xcc4400, 0xdd6611, 0xbb3300, 0x886633];
    const leaf = this.scene.add.ellipse(
      this.x + Phaser.Math.Between(-15, 15),
      this.y - 20 + Phaser.Math.Between(-5, 5),
      5, 3,
      Phaser.Math.RND.pick(leafColors), 0.7
    );
    leaf.setRotation(Math.random() * Math.PI);
    this.scene.tweens.add({
      targets: leaf,
      y: leaf.y + 30,
      x: leaf.x + Phaser.Math.Between(-15, 15),
      alpha: 0,
      rotation: leaf.rotation + 2,
      duration: 500,
      onComplete: () => leaf.destroy()
    });
  }

  private updateSpriteVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else if (this.aiState === 'windup') {
      const pulse = 0.7 + Math.sin(Date.now() * 0.015) * 0.3;
      this.setAlpha(pulse);
      this.setTint(0x66cc44);
    } else if (this.aiState === 'cooling') {
      this.setAlpha(0.6);
      this.setTint(0x666666);
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

    // Extra damage during cooling period
    const finalAmount = this.aiState === 'cooling' ? amount * 1.5 : amount;
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

    // Destroy trophy graphics
    this.censerHead?.destroy();
    this.trophyBodies?.destroy();

    // Destroy any remaining bone shards
    this.boneShards.forEach(s => s.destroy());
    this.boneShards = [];

    // Death explosion: bone fragments + green energy burst
    for (let i = 0; i < 25; i++) {
      const isBone = Math.random() > 0.4;
      const color = isBone ? 0xddccaa : 0x44cc33;
      const fragment = this.scene.add.ellipse(
        this.x + Phaser.Math.Between(-10, 10),
        this.y + Phaser.Math.Between(-20, 5),
        Phaser.Math.Between(3, 8), Phaser.Math.Between(2, 5),
        color, 0.8
      );
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 120);
      this.scene.tweens.add({
        targets: fragment,
        x: fragment.x + Math.cos(angle) * dist,
        y: fragment.y + Math.sin(angle) * dist,
        alpha: 0,
        rotation: Phaser.Math.Between(-4, 4),
        duration: 500 + Math.random() * 400,
        onComplete: () => fragment.destroy()
      });
    }

    // Green energy dissipation
    const energyBurst = this.scene.add.circle(this.x, this.y - 15, 25, 0x44cc33, 0.5);
    this.scene.tweens.add({
      targets: energyBurst,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 400,
      onComplete: () => energyBurst.destroy()
    });

    // Rusty dust cloud
    const dust = this.scene.add.circle(this.x, this.y, 20, 0x664422, 0.4);
    this.scene.tweens.add({
      targets: dust,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 500,
      onComplete: () => dust.destroy()
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
