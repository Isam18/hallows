import Phaser from 'phaser';
import { COLORS, EnemyConfig } from '../core/GameConfig';
import gameState from '../core/GameState';
import type { Player } from './Player';

type EnemyState = 'patrol' | 'aggro' | 'hurt' | 'dead';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyConfig;
  private currentState: EnemyState = 'patrol';
  private currentHp: number;
  private patrolDir: 1 | -1 = 1;
  private hurtTimer = 0;
  private dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyConfig) {
    super(scene, x, y, config.id);
    this.cfg = config;
    this.currentHp = config.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(config.width, config.height);
    this.setCollideWorldBounds(true);
    this.setTint(Phaser.Display.Color.HexStringToColor(config.color).color);
    this.patrolDir = Math.random() > 0.5 ? 1 : -1;
  }

  update(time: number, delta: number, player: Player): void {
    if (this.dead) return;
    if (this.currentState === 'hurt') {
      this.hurtTimer -= delta;
      if (this.hurtTimer <= 0) {
        this.currentState = 'patrol';
        this.setTint(Phaser.Display.Color.HexStringToColor(this.cfg.color).color);
      }
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist < this.cfg.aggroRange) this.currentState = 'aggro';
    else if (this.currentState === 'aggro' && dist > this.cfg.aggroRange * 1.5) this.currentState = 'patrol';

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.currentState === 'aggro') {
      const dir = player.x > this.x ? 1 : -1;
      body.setVelocityX(dir * this.cfg.aggroSpeed);
      this.setFlipX(dir < 0);
    } else {
      if (body.blocked.left) this.patrolDir = 1;
      else if (body.blocked.right) this.patrolDir = -1;
      body.setVelocityX(this.patrolDir * this.cfg.patrolSpeed);
      this.setFlipX(this.patrolDir < 0);
    }
  }

  takeDamage(amount: number, fromX: number): void {
    if (this.dead) return;
    this.currentHp -= amount;
    this.currentState = 'hurt';
    this.hurtTimer = 200;
    const dir = this.x > fromX ? 1 : -1;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(dir * 100, -50);
    this.setTint(0xffffff);
    if (this.currentHp <= 0) this.die();
  }

  private die(): void {
    this.dead = true;
    this.currentState = 'dead';
    gameState.addShells(this.cfg.dropAmount);
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 1.5, scaleY: 0.5, duration: 200,
      onComplete: () => this.destroy()
    });
  }

  getContactDamage(): number { return this.cfg.contactDamage; }
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - this.cfg.width/2, this.y - this.cfg.height/2, this.cfg.width, this.cfg.height);
  }
  isDying(): boolean { return this.dead; }
}
