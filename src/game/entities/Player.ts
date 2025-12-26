import Phaser from 'phaser';
import { PLAYER_CONFIG, COLORS } from '../core/GameConfig';
import gameState from '../core/GameState';
import inputManager from '../core/InputManager';
import type { GameScene } from '../scenes/GameScene';

type PlayerState = 'idle' | 'running' | 'jumping' | 'falling' | 'dashing' | 'wallSliding' | 'attacking';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private gameScene: GameScene;
  private playerState: PlayerState = 'idle';
  private facing: 1 | -1 = 1;
  private isGrounded = false;
  private isTouchingWall = false;
  private wallDirection: 1 | -1 = 1;
  private canJump = true;
  private coyoteTime = 0;
  private jumpBufferTime = 0;
  private isDashing = false;
  private dashTime = 0;
  private dashCooldown = 0;
  private dashDirection: 1 | -1 = 1;
  private isAttacking = false;
  private attackTime = 0;
  private attackCooldown = 0;
  private attackHitbox: Phaser.Geom.Rectangle | null = null;
  private slashSprite: Phaser.GameObjects.Sprite | null = null;
  private invulnerable = false;
  private invulnerabilityTime = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'player');
    this.gameScene = scene;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(PLAYER_CONFIG.width, PLAYER_CONFIG.height);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setMaxVelocityY(600);
    this.setTint(COLORS.player);
  }

  update(time: number, delta: number): void {
    this.updateGroundedState();
    this.updateTimers(delta);
    if (this.isDashing) return;
    this.handleMovement();
    this.handleJump();
    this.handleDash();
    this.handleAttack(delta);
    this.updatePlayerState();
  }

  private updateGroundedState(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const wasGrounded = this.isGrounded;
    this.isGrounded = body.blocked.down || body.touching.down;
    if (!wasGrounded && this.isGrounded) {
      this.canJump = true;
      this.coyoteTime = 100;
    }
    this.isTouchingWall = body.blocked.left || body.blocked.right;
    if (body.blocked.left) this.wallDirection = -1;
    if (body.blocked.right) this.wallDirection = 1;
  }

  private updateTimers(delta: number): void {
    if (!this.isGrounded && this.coyoteTime > 0) this.coyoteTime -= delta;
    if (this.jumpBufferTime > 0) this.jumpBufferTime -= delta;
    if (this.dashCooldown > 0) this.dashCooldown -= delta;
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    if (this.invulnerable) {
      this.invulnerabilityTime -= delta;
      if (this.invulnerabilityTime <= 0) {
        this.invulnerable = false;
        this.setAlpha(1);
      }
    }
    if (this.isDashing) {
      this.dashTime -= delta;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(this.dashDirection * PLAYER_CONFIG.dashSpeed, 0);
      if (this.dashTime <= 0) {
        this.isDashing = false;
        this.setAlpha(1);
      }
    }
  }

  private handleMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const horizontal = inputManager.getHorizontal();
    body.setVelocityX(horizontal * PLAYER_CONFIG.moveSpeed);
    if (horizontal !== 0) {
      this.facing = horizontal as 1 | -1;
      this.setFlipX(horizontal < 0);
    }
    if (this.isTouchingWall && !this.isGrounded && body.velocity.y > 0) {
      body.setVelocityY(PLAYER_CONFIG.wallSlideSpeed);
    }
  }

  private handleJump(): void {
    if (inputManager.justPressed('jump')) {
      if (this.isGrounded || this.coyoteTime > 0) {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityY(-PLAYER_CONFIG.jumpForce);
        this.canJump = false;
        this.coyoteTime = 0;
      } else if (this.isTouchingWall && !this.isGrounded) {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const dir = -this.wallDirection;
        body.setVelocity(dir * PLAYER_CONFIG.wallJumpForce.x, -PLAYER_CONFIG.wallJumpForce.y);
        this.facing = dir as 1 | -1;
        this.setFlipX(dir < 0);
      }
    }
  }

  private handleDash(): void {
    if (inputManager.justPressed('dash') && this.dashCooldown <= 0) {
      this.isDashing = true;
      this.dashTime = PLAYER_CONFIG.dashDuration;
      this.dashCooldown = PLAYER_CONFIG.dashCooldown * gameState.getCharmModifier('dashCooldownMod');
      this.dashDirection = this.facing;
      this.setAlpha(0.7);
      this.setInvulnerable(PLAYER_CONFIG.dashDuration);
    }
  }

  private handleAttack(delta: number): void {
    if (this.isAttacking) {
      this.attackTime -= delta;
      if (this.slashSprite) {
        this.slashSprite.x = this.x + this.facing * PLAYER_CONFIG.attackRange;
        this.slashSprite.y = this.y;
        this.slashSprite.setAlpha(this.attackTime / PLAYER_CONFIG.attackDuration * 0.8);
      }
      if (this.attackTime <= 0) {
        this.isAttacking = false;
        this.slashSprite?.destroy();
        this.slashSprite = null;
      }
    }
    if (inputManager.justPressed('attack') && this.attackCooldown <= 0 && !this.isAttacking) {
      this.isAttacking = true;
      this.attackTime = PLAYER_CONFIG.attackDuration;
      this.attackCooldown = PLAYER_CONFIG.attackCooldown;
      const offsetX = this.facing * PLAYER_CONFIG.attackRange;
      this.attackHitbox = new Phaser.Geom.Rectangle(
        this.x + offsetX - PLAYER_CONFIG.attackRange / 2,
        this.y - PLAYER_CONFIG.height / 2,
        PLAYER_CONFIG.attackRange,
        PLAYER_CONFIG.height
      );
      this.slashSprite = this.scene.add.sprite(this.x + offsetX, this.y, 'slash');
      this.slashSprite.setFlipX(this.facing < 0);
      this.slashSprite.setTint(COLORS.playerOutline);
      this.gameScene.checkAttackHit(this.attackHitbox);
    }
  }

  takeDamage(amount: number, fromX: number): void {
    if (this.invulnerable) return;
    gameState.damage(amount);
    const knockbackDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(knockbackDir * PLAYER_CONFIG.knockbackForce, -PLAYER_CONFIG.knockbackForce * 0.5);
    this.setTint(COLORS.damage);
    this.scene.time.delayedCall(100, () => this.setTint(COLORS.player));
    this.setInvulnerable(PLAYER_CONFIG.invulnerabilityDuration);
    if (gameState.getPlayerData().hp <= 0) this.gameScene.handlePlayerDeath();
  }

  private setInvulnerable(duration: number): void {
    this.invulnerable = true;
    this.invulnerabilityTime = duration;
  }

  isInvulnerable(): boolean { return this.invulnerable; }
  handleWallCollision(wall: Phaser.GameObjects.Rectangle): void {
    this.wallDirection = wall.x < this.x ? -1 : 1;
  }

  private updatePlayerState(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.isAttacking) this.playerState = 'attacking';
    else if (this.isDashing) this.playerState = 'dashing';
    else if (this.isTouchingWall && !this.isGrounded && body.velocity.y > 0) this.playerState = 'wallSliding';
    else if (!this.isGrounded) this.playerState = body.velocity.y < 0 ? 'jumping' : 'falling';
    else if (Math.abs(body.velocity.x) > 10) this.playerState = 'running';
    else this.playerState = 'idle';
  }

  getPlayerState(): PlayerState { return this.playerState; }
  getFacing(): 1 | -1 { return this.facing; }
  getVelocity(): { x: number; y: number } {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return { x: body.velocity.x, y: body.velocity.y };
  }
  isOnGround(): boolean { return this.isGrounded; }
}
