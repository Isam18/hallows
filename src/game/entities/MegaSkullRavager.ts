import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyCombatConfig } from '../core/CombatConfig';
import { Player } from './Player';

/**
 * MegaSkullRavager - Huge skull boss with big horns, jumping, and projectile attacks.
 * Turns orange before firing a large projectile from its mouth.
 */
export class MegaSkullRavager extends Enemy {
  private visualElements: Phaser.GameObjects.GameObject[] = [];
  private attackState: 'idle' | 'windup' | 'charging' | 'jumping' | 'projectileWindup' | 'projectileFire' | 'cooldown' = 'idle';
  private attackTimer = 0;
  private jumpCount = 0;
  private projectiles: Phaser.GameObjects.Group;
  private attackCycle = 0; // tracks which attack pattern to use next

  // Key visual refs for tinting during projectile windup
  private skullMain!: Phaser.GameObjects.Ellipse;
  private jaw!: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, config);
    this.projectiles = scene.add.group();
    this.createVisuals();
  }

  private createVisuals(): void {
    // === Main skull body - HUGE ===
    this.skullMain = this.scene.add.ellipse(0, 0, 110, 90, 0x6a6464);
    this.skullMain.setStrokeStyle(5, 0x1a1a1a);
    this.skullMain.setDepth(this.depth + 2);
    this.visualElements.push(this.skullMain);

    // === Big horns (left) ===
    const leftHorn = this.scene.add.polygon(0, 0, [
      -30, -20,
      -50, -70,
      -42, -75,
      -22, -30,
    ], 0x8a7a6a);
    leftHorn.setStrokeStyle(3, 0x1a1a1a);
    leftHorn.setDepth(this.depth + 3);
    this.visualElements.push(leftHorn);

    // Horn branch left
    const leftHornBranch = this.scene.add.polygon(0, 0, [
      -44, -55,
      -68, -62,
      -64, -68,
      -40, -60,
    ], 0x8a7a6a);
    leftHornBranch.setStrokeStyle(2, 0x1a1a1a);
    leftHornBranch.setDepth(this.depth + 3);
    this.visualElements.push(leftHornBranch);

    // === Big horns (right) ===
    const rightHorn = this.scene.add.polygon(0, 0, [
      30, -20,
      50, -70,
      42, -75,
      22, -30,
    ], 0x8a7a6a);
    rightHorn.setStrokeStyle(3, 0x1a1a1a);
    rightHorn.setDepth(this.depth + 3);
    this.visualElements.push(rightHorn);

    // Horn branch right
    const rightHornBranch = this.scene.add.polygon(0, 0, [
      44, -55,
      68, -62,
      64, -68,
      40, -60,
    ], 0x8a7a6a);
    rightHornBranch.setStrokeStyle(2, 0x1a1a1a);
    rightHornBranch.setDepth(this.depth + 3);
    this.visualElements.push(rightHornBranch);

    // Left eye socket
    const leftEye = this.scene.add.ellipse(-20, -8, 22, 28, 0x1a1a1a);
    leftEye.setDepth(this.depth + 3);
    this.visualElements.push(leftEye);

    // Right eye socket
    const rightEye = this.scene.add.ellipse(20, -8, 22, 28, 0x1a1a1a);
    rightEye.setDepth(this.depth + 3);
    this.visualElements.push(rightEye);

    // Eye glows
    const leftGlow = this.scene.add.ellipse(-20, -8, 8, 10, 0xff4400, 0.6);
    leftGlow.setDepth(this.depth + 4);
    this.visualElements.push(leftGlow);

    const rightGlow = this.scene.add.ellipse(20, -8, 8, 10, 0xff4400, 0.6);
    rightGlow.setDepth(this.depth + 4);
    this.visualElements.push(rightGlow);

    // Wide jaw
    this.jaw = this.scene.add.ellipse(0, 30, 60, 22, 0x5a5454);
    this.jaw.setStrokeStyle(4, 0x1a1a1a);
    this.jaw.setDepth(this.depth + 2);
    this.visualElements.push(this.jaw);

    // Row of sharp teeth
    for (let i = 0; i < 9; i++) {
      const toothX = -20 + i * 5;
      const tooth = this.scene.add.triangle(0, 0, -3, 0, 0, 10, 3, 0, 0xd0c8c8);
      tooth.setStrokeStyle(1, 0x1a1a1a);
      tooth.setPosition(toothX, 24);
      tooth.setDepth(this.depth + 4);
      this.visualElements.push(tooth);
    }

    // Wing-like claw appendages
    const leftWing = this.scene.add.polygon(0, 0, [
      -40, 8,
      -75, -10,
      -80, 12,
      -68, 35,
      -42, 30
    ], 0x4a4444);
    leftWing.setStrokeStyle(3, 0x1a1a1a);
    leftWing.setDepth(this.depth + 1);
    this.visualElements.push(leftWing);

    const rightWing = this.scene.add.polygon(0, 0, [
      40, 8,
      75, -10,
      80, 12,
      68, 35,
      42, 30
    ], 0x4a4444);
    rightWing.setStrokeStyle(3, 0x1a1a1a);
    rightWing.setDepth(this.depth + 1);
    this.visualElements.push(rightWing);

    // Feet
    const leftFoot = this.scene.add.ellipse(-28, 44, 22, 12, 0x3a3434);
    leftFoot.setStrokeStyle(2, 0x1a1a1a);
    leftFoot.setDepth(this.depth + 1);
    this.visualElements.push(leftFoot);

    const rightFoot = this.scene.add.ellipse(28, 44, 22, 12, 0x3a3434);
    rightFoot.setStrokeStyle(2, 0x1a1a1a);
    rightFoot.setDepth(this.depth + 1);
    this.visualElements.push(rightFoot);

    this.setAlpha(0);
  }

  update(time: number, delta: number, player: any): void {
    super.update(time, delta, player);
    this.updateAttackBehavior(delta, player);
    this.updateVisualPositions();
    this.updateProjectiles(player);
  }

  private updateAttackBehavior(delta: number, player: Player): void {
    if (this.isDying() || this.isInvulnerable()) return;

    this.attackTimer -= delta;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.attackState) {
      case 'idle':
        if (dist < 400 && this.attackTimer <= 0) {
          // Cycle: jump → projectile → charge → projectile → repeat
          const pattern = this.attackCycle % 5;
          this.attackCycle++;
          if (pattern === 0 || pattern === 3) {
            this.startJumpAttack(player);
          } else if (pattern === 1 || pattern === 4) {
            this.startProjectileAttack(player);
          } else {
            this.startCharge(player);
          }
        }
        break;

      case 'windup':
        if (this.attackTimer <= 0) {
          this.attackState = 'charging';
          this.attackTimer = 700;
          const chargeDir = player.x > this.x ? 1 : -1;
          body.setVelocityX(chargeDir * 400);
          this.flipX = chargeDir < 0;
        }
        break;

      case 'charging':
        if (this.attackTimer <= 0 || body.blocked.left || body.blocked.right) {
          body.setVelocityX(0);
          // Screen shake on wall hit
          if (body.blocked.left || body.blocked.right) {
            this.scene.cameras.main.shake(200, 0.03);
          }
          this.attackState = 'cooldown';
          this.attackTimer = 1200;
        }
        break;

      case 'jumping':
        if (body.blocked.down && body.velocity.y >= 0) {
          this.createGroundPound();
          this.jumpCount++;
          if (this.jumpCount >= 3) {
            this.attackState = 'cooldown';
            this.attackTimer = 1500;
            this.jumpCount = 0;
          } else {
            this.scene.time.delayedCall(250, () => {
              if (this.active && this.attackState === 'jumping') {
                this.performJump(player);
              }
            });
          }
        }
        break;

      case 'projectileWindup':
        // Turn orange during windup
        this.setOrangeTint(true);
        if (this.attackTimer <= 0) {
          this.fireProjectile(player);
          this.attackState = 'projectileFire';
          this.attackTimer = 400;
        }
        break;

      case 'projectileFire':
        if (this.attackTimer <= 0) {
          this.setOrangeTint(false);
          this.attackState = 'cooldown';
          this.attackTimer = 1800;
        }
        break;

      case 'cooldown':
        this.setOrangeTint(false);
        if (this.attackTimer <= 0) {
          this.attackState = 'idle';
        }
        break;
    }
  }

  private startCharge(player: Player): void {
    this.attackState = 'windup';
    this.attackTimer = 400;
    this.flipX = player.x < this.x;
  }

  private startJumpAttack(player: Player): void {
    this.attackState = 'jumping';
    this.jumpCount = 0;
    this.performJump(player);
  }

  private performJump(player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dirToPlayer = player.x > this.x ? 1 : -1;
    body.setVelocityY(-500);
    body.setVelocityX(dirToPlayer * 200);
    this.flipX = dirToPlayer < 0;
  }

  private createGroundPound(): void {
    this.scene.cameras.main.shake(200, 0.035);
    const shockwave = this.scene.add.ellipse(this.x, this.y + 50, 30, 14, 0x6a4444, 0.8);
    shockwave.setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: shockwave,
      scaleX: 10,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      onComplete: () => shockwave.destroy()
    });
  }

  private startProjectileAttack(player: Player): void {
    this.attackState = 'projectileWindup';
    this.attackTimer = 800; // time spent turning orange
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    this.flipX = player.x < this.x;
  }

  private setOrangeTint(on: boolean): void {
    if (on) {
      this.skullMain.setFillStyle(0xff6600);
      this.jaw.setFillStyle(0xff5500);
    } else {
      this.skullMain.setFillStyle(0x6a6464);
      this.jaw.setFillStyle(0x5a5454);
    }
  }

  private fireProjectile(player: Player): void {
    // Big projectile from the mouth
    const flipMult = this.flipX ? -1 : 1;
    const projX = this.x + 10 * flipMult;
    const projY = this.y + 22;

    const projectile = this.scene.add.circle(projX, projY, 14, 0xff6600);
    projectile.setStrokeStyle(3, 0xff2200);
    this.scene.physics.add.existing(projectile);

    const projBody = projectile.body as Phaser.Physics.Arcade.Body;
    projBody.setAllowGravity(false);
    projBody.setCircle(14);

    // Aim at player
    const angle = Phaser.Math.Angle.Between(projX, projY, player.x, player.y);
    const speed = 280;
    projBody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    // Glow effect
    const glow = this.scene.add.circle(projX, projY, 22, 0xff8800, 0.3);
    this.scene.physics.add.existing(glow);
    const glowBody = glow.body as Phaser.Physics.Arcade.Body;
    glowBody.setAllowGravity(false);
    glowBody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    (projectile as any).glow = glow;
    (projectile as any).lifetime = 0;
    (projectile as any).isProjectile = true;

    this.projectiles.add(projectile);
    this.projectiles.add(glow);

    // Screen shake on fire
    this.scene.cameras.main.shake(100, 0.015);

    // Muzzle flash
    const flash = this.scene.add.circle(projX, projY, 20, 0xffaa00, 0.8);
    flash.setDepth(this.depth + 5);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      onComplete: () => flash.destroy()
    });
  }

  private updateProjectiles(player: Player): void {
    const playerBounds = player.getBounds();

    this.projectiles.getChildren().forEach((proj: any) => {
      if (!proj.active) return;
      if (!proj.isProjectile) return; // skip glow

      proj.lifetime += 16;

      const projBounds = proj.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(projBounds, playerBounds)) {
        player.takeDamage(2, proj.x);
        this.destroyProjectile(proj);
        return;
      }

      if (proj.lifetime > 4000 || proj.y > 800 || proj.y < -200 || proj.x > 1400 || proj.x < -200) {
        this.destroyProjectile(proj);
      }
    });
  }

  private destroyProjectile(projectile: any): void {
    const glow = projectile.glow;
    if (glow) glow.destroy();
    projectile.destroy();
  }

  private updateVisualPositions(): void {
    const flipMult = this.flipX ? -1 : 1;

    // Element indices:
    // 0: skullMain, 1: leftHorn, 2: leftHornBranch, 3: rightHorn, 4: rightHornBranch,
    // 5: leftEye, 6: rightEye, 7: leftGlow, 8: rightGlow, 9: jaw,
    // 10-18: teeth (9 total), 19: leftWing, 20: rightWing, 21: leftFoot, 22: rightFoot

    const posMap: { idx: number; x: number; y: number }[] = [
      { idx: 0, x: 0, y: -10 },      // skull
      { idx: 1, x: -36, y: -45 },    // left horn
      { idx: 2, x: -52, y: -58 },    // left horn branch
      { idx: 3, x: 36, y: -45 },     // right horn
      { idx: 4, x: 52, y: -58 },     // right horn branch
      { idx: 5, x: -20, y: -18 },    // left eye
      { idx: 6, x: 20, y: -18 },     // right eye
      { idx: 7, x: -20, y: -18 },    // left glow
      { idx: 8, x: 20, y: -18 },     // right glow
      { idx: 9, x: 0, y: 16 },       // jaw
    ];

    for (const p of posMap) {
      const el = this.visualElements[p.idx] as any;
      if (el) el.setPosition(this.x + p.x * flipMult, this.y + p.y);
    }

    // Teeth (9 teeth, indices 10-18)
    for (let i = 0; i < 9; i++) {
      const tooth = this.visualElements[10 + i] as any;
      if (tooth) {
        tooth.setPosition(
          this.x + (-20 + i * 5) * flipMult,
          this.y + 8
        );
      }
    }

    // Wings (19, 20)
    const lw = this.visualElements[19] as any;
    const rw = this.visualElements[20] as any;
    if (lw) lw.setPosition(this.x + -58 * flipMult, this.y + 10);
    if (rw) rw.setPosition(this.x + 58 * flipMult, this.y + 10);

    // Feet (21, 22)
    const lf = this.visualElements[21] as any;
    const rf = this.visualElements[22] as any;
    if (lf) lf.setPosition(this.x + -28 * flipMult, this.y + 36);
    if (rf) rf.setPosition(this.x + 28 * flipMult, this.y + 36);
  }

  destroy(fromScene?: boolean): void {
    this.projectiles.getChildren().forEach((p) => p.destroy());
    this.projectiles.clear(true, true);
    this.visualElements.forEach(el => el.destroy());
    this.visualElements = [];
    super.destroy(fromScene);
  }
}
