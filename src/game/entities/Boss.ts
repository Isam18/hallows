import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';
import bossData from '../data/boss.json';
import type { Player } from './Player';
import type { GameScene } from '../scenes/GameScene';

type BossState = 'idle' | 'charge' | 'slam' | 'spikeBurst' | 'hurt' | 'dead';
const CFG = bossData.elderGrub;

export class Boss extends Phaser.Physics.Arcade.Sprite {
  private gameScene: GameScene;
  private bossHp: number;
  private bossMaxHp: number;
  private bossPhase: 1 | 2 = 1;
  private bossState: BossState = 'idle';
  private stateTimer = 0;
  private cooldown = 0;
  private chargeDir = 1;
  private dead = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'elderGrub');
    this.gameScene = scene;
    this.bossMaxHp = CFG.maxHp;
    this.bossHp = this.bossMaxHp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(CFG.width, CFG.height);
    this.setCollideWorldBounds(true);
    this.setTint(COLORS.boss);
    this.setScale(1.5);
    this.cooldown = 1500;
  }

  update(time: number, delta: number, player: Player): void {
    if (this.dead) return;
    this.stateTimer += delta;
    this.cooldown -= delta;
    this.chargeDir = player.x > this.x ? 1 : -1;
    this.setFlipX(this.chargeDir < 0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const phaseCfg = this.bossPhase === 1 ? CFG.phase1 : CFG.phase2;

    switch (this.bossState) {
      case 'idle':
        body.setVelocityX(0);
        if (this.cooldown <= 0) {
          const patterns = phaseCfg.patterns;
          this.bossState = patterns[Math.floor(Math.random() * patterns.length)] as BossState;
          this.stateTimer = 0;
        }
        break;
      case 'charge':
        body.setVelocityX(this.chargeDir * phaseCfg.chargeSpeed);
        if (body.blocked.left || body.blocked.right || this.stateTimer > 1500) {
          this.bossState = 'idle';
          this.cooldown = phaseCfg.patternCooldown;
          if (body.blocked.left || body.blocked.right) this.scene.cameras.main.shake(100, 0.01);
        }
        break;
      case 'slam':
        if (this.stateTimer < phaseCfg.slamDelay) {
          this.setTint(0xffaaaa);
          body.setVelocityY(-50);
        } else {
          this.setTint(COLORS.boss);
          body.setVelocityY(400);
          if (body.blocked.down) {
            this.scene.cameras.main.shake(150, 0.02);
            this.bossState = 'idle';
            this.cooldown = phaseCfg.patternCooldown;
          }
        }
        break;
      case 'spikeBurst':
        if (this.bossPhase === 1) { this.bossState = 'idle'; break; }
        if (this.stateTimer > 1000) { this.bossState = 'idle'; this.cooldown = phaseCfg.patternCooldown; }
        break;
      case 'hurt':
        if (this.stateTimer > 300) { this.bossState = 'idle'; this.cooldown = 500; }
        break;
    }
  }

  takeDamage(amount: number, fromX: number): void {
    if (this.dead || this.bossState === 'hurt') return;
    this.bossHp -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => { if (!this.dead) this.setTint(COLORS.boss); });
    if (this.bossPhase === 1 && this.bossHp <= this.bossMaxHp * CFG.phase2.trigger) this.bossPhase = 2;
    if (this.bossHp <= 0) this.die();
    else { this.bossState = 'hurt'; this.stateTimer = 0; }
  }

  private die(): void {
    this.dead = true;
    this.bossState = 'dead';
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 2, scaleY: 0.5, duration: 1000,
      onComplete: () => { this.gameScene.handleBossDefeated(); this.destroy(); }
    });
  }

  getHp(): number { return this.bossHp; }
  getMaxHp(): number { return this.bossMaxHp; }
  getName(): string { return CFG.name; }
  isDying(): boolean { return this.dead; }
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - CFG.width/2, this.y - CFG.height/2, CFG.width, CFG.height);
  }
}
