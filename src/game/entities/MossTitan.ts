import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Moss Titan AI States - Massive Moss Charger-style mini-boss
 * - hidden: Buried as a mossy mound, waiting for player
 * - emerging: Screaming and rising from ground
 * - idle: Watching player, deciding next action
 * - charging: High-speed rush across arena
 * - jumpWindup: Preparing to jump
 * - jumping: Arc through air toward player
 * - landing: Impact and recovery after jump
 * - burrowing: Digging underground to relocate
 * - burrowed: Underground and invulnerable, moving
 * - surfacing: Coming back up
 * - hurt: Stunned from taking damage
 * - dead: Death animation with bug escape
 */
type MossTitanAIState = 
  | 'hidden' 
  | 'emerging' 
  | 'idle' 
  | 'charging' 
  | 'jumpWindup' 
  | 'jumping' 
  | 'landing'
  | 'burrowing' 
  | 'burrowed' 
  | 'surfacing'
  | 'hurt' 
  | 'dead';

export class MossTitan extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: MossTitanAIState = 'hidden';
  private currentHp: number;
  private maxHp: number;
  
  // Arena bounds
  private arenaLeft: number;
  private arenaRight: number;
  
  // Movement
  private facingDir: 1 | -1 = 1;
  
  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private actionCooldown = 0;
  private stateTimer = 0;
  
  // Charge attack
  private readonly CHARGE_SPEED = 400;
  private readonly CHARGE_DAMAGE = 2;
  
  // Jump attack
  private jumpTargetX = 0;
  private jumpTargetY = 0;
  private readonly JUMP_HEIGHT = 300;
  private readonly JUMP_DAMAGE = 2;
  
  // Burrow
  private burrowTargetX = 0;
  private hitsBeforeRetreat = 0;
  private readonly HITS_TO_BURROW = 4;
  
  // State durations
  private readonly EMERGE_TIME = 1000;
  private readonly IDLE_TIME = 800;
  private readonly JUMP_WINDUP_TIME = 500;
  private readonly LANDING_TIME = 400;
  private readonly BURROW_TIME = 600;
  private readonly BURROWED_TIME = 1200;
  private readonly SURFACE_TIME = 500;
  private readonly ACTION_COOLDOWN = 1000;
  
  // Track if already dead
  private isDead = false;
  
  // Hit tracking
  private lastHitBySwingId = -1;
  
  // Visuals
  private moundSprite: Phaser.GameObjects.Ellipse | null = null;
  private bodyGraphics: Phaser.GameObjects.Container | null = null;
  private eyeGlow: Phaser.GameObjects.PointLight | null = null;
  private dirtParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig, arenaWidth: number = 800) {
    super(scene, x, y, 'mossTitan');
    
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    this.maxHp = this.cfg.hp;
    
    // Arena bounds
    this.arenaLeft = x - arenaWidth / 2 + 100;
    this.arenaRight = x + arenaWidth / 2 - 100;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Large hitbox
    this.setSize(this.cfg.width, this.cfg.height);
    this.setCollideWorldBounds(true);
    
    // Start hidden
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    
    // Create hidden mound visual
    this.createMoundVisual();
    
    this.facingDir = 1;
    this.hitsBeforeRetreat = this.HITS_TO_BURROW;
  }
  
  private createMoundVisual(): void {
    // Mossy mound showing when hidden
    this.moundSprite = this.scene.add.ellipse(
      this.x, 
      this.y + 20, 
      80, 
      30, 
      0x2d5a3d
    );
    this.moundSprite.setStrokeStyle(2, 0x1a3a25);
    
    // Add some moss texture dots
    for (let i = 0; i < 5; i++) {
      const dot = this.scene.add.circle(
        this.x + Phaser.Math.Between(-30, 30),
        this.y + 15 + Phaser.Math.Between(-5, 10),
        Phaser.Math.Between(3, 6),
        0x3d7a4d,
        0.7
      );
      dot.setData('isMoundDecor', true);
    }
  }
  
  private createBodyVisual(): void {
    // Massive moss body
    this.bodyGraphics = this.scene.add.container(this.x, this.y);
    
    // Main body - elongated
    const body = this.scene.add.ellipse(0, 0, this.cfg.width, this.cfg.height * 0.7, 0x2d5a3d);
    body.setStrokeStyle(3, 0x1a3a25);
    this.bodyGraphics.add(body);
    
    // Face area (darker)
    const face = this.scene.add.ellipse(this.cfg.width * 0.3, -5, 40, 35, 0x1a3a25);
    this.bodyGraphics.add(face);
    
    // Glowing orange eyes
    const leftEye = this.scene.add.circle(this.cfg.width * 0.25, -8, 5, 0xff6600);
    const rightEye = this.scene.add.circle(this.cfg.width * 0.35, -8, 5, 0xff6600);
    this.bodyGraphics.add(leftEye);
    this.bodyGraphics.add(rightEye);
    
    // Moss/leaf details
    for (let i = 0; i < 8; i++) {
      const leaf = this.scene.add.ellipse(
        Phaser.Math.Between(-this.cfg.width * 0.4, this.cfg.width * 0.4),
        Phaser.Math.Between(-this.cfg.height * 0.3, this.cfg.height * 0.3),
        Phaser.Math.Between(8, 15),
        Phaser.Math.Between(5, 10),
        0x3d7a4d,
        0.8
      );
      this.bodyGraphics.add(leaf);
    }
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;
    
    this.updateTimers(delta);
    this.updateAIState(player, delta);
    this.applyMovement(player);
    this.updateVisuals();
    this.updateBodyPosition();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.actionCooldown > 0) this.actionCooldown -= delta;
    if (this.stateTimer > 0) this.stateTimer -= delta;
  }
  
  private updateBodyPosition(): void {
    if (this.bodyGraphics) {
      this.bodyGraphics.setPosition(this.x, this.y);
      this.bodyGraphics.setScale(this.facingDir, 1);
    }
  }

  private updateAIState(player: Player, delta: number): void {
    // Handle hurt state
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        // Check if should burrow after taking hits
        if (this.hitsBeforeRetreat <= 0) {
          this.startBurrowing();
        } else {
          this.aiState = 'idle';
          this.stateTimer = this.IDLE_TIME;
        }
      }
      return;
    }
    
    if (this.aiState === 'dead') return;
    
    const dist = Math.abs(player.x - this.x);
    
    // HIDDEN STATE - waiting for player
    if (this.aiState === 'hidden') {
      if (dist < 100) {
        this.startEmerging();
      }
      return;
    }
    
    // EMERGING STATE
    if (this.aiState === 'emerging') {
      if (this.stateTimer <= 0) {
        this.completeEmerging();
      }
      return;
    }
    
    // IDLE STATE - choose next action
    if (this.aiState === 'idle') {
      if (this.stateTimer <= 0 && this.actionCooldown <= 0) {
        this.chooseNextAction(player, dist);
      }
      return;
    }
    
    // CHARGING STATE
    if (this.aiState === 'charging') {
      const body = this.body as Phaser.Physics.Arcade.Body;
      // Stop when hitting wall or reaching arena edge
      if (body.blocked.left || body.blocked.right ||
          this.x <= this.arenaLeft || this.x >= this.arenaRight) {
        this.endCharge();
      }
      return;
    }
    
    // JUMP WINDUP
    if (this.aiState === 'jumpWindup') {
      if (this.stateTimer <= 0) {
        this.executeJump(player);
      }
      return;
    }
    
    // JUMPING
    if (this.aiState === 'jumping') {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body.blocked.down || this.y > this.jumpTargetY) {
        this.startLanding();
      }
      return;
    }
    
    // LANDING
    if (this.aiState === 'landing') {
      if (this.stateTimer <= 0) {
        this.aiState = 'idle';
        this.stateTimer = this.IDLE_TIME;
        this.actionCooldown = this.ACTION_COOLDOWN;
      }
      return;
    }
    
    // BURROWING
    if (this.aiState === 'burrowing') {
      if (this.stateTimer <= 0) {
        this.enterBurrowed();
      }
      return;
    }
    
    // BURROWED - moving underground
    if (this.aiState === 'burrowed') {
      if (this.stateTimer <= 0) {
        this.startSurfacing();
      }
      return;
    }
    
    // SURFACING
    if (this.aiState === 'surfacing') {
      if (this.stateTimer <= 0) {
        this.completeSurfacing();
      }
      return;
    }
  }
  
  private startEmerging(): void {
    this.aiState = 'emerging';
    this.stateTimer = this.EMERGE_TIME;
    
    // Destroy mound
    if (this.moundSprite) {
      this.scene.tweens.add({
        targets: this.moundSprite,
        scaleX: 1.5,
        scaleY: 0,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.moundSprite?.destroy();
          this.moundSprite = null;
        }
      });
    }
    
    // Scream effect - screen shake
    this.scene.cameras.main.shake(500, 0.02);
    
    // Create body visual
    this.createBodyVisual();
    if (this.bodyGraphics) {
      this.bodyGraphics.setScale(0.3);
      this.bodyGraphics.setAlpha(0);
      this.scene.tweens.add({
        targets: this.bodyGraphics,
        scaleX: this.facingDir,
        scaleY: 1,
        alpha: 1,
        y: this.y,
        duration: this.EMERGE_TIME,
        ease: 'Back.easeOut'
      });
    }
    
    // Rising dirt particles
    this.createDirtBurst(20);
  }
  
  private completeEmerging(): void {
    this.aiState = 'idle';
    this.stateTimer = this.IDLE_TIME;
    
    // Enable physics
    this.setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    
    // Heavy thud
    this.scene.cameras.main.shake(200, 0.015);
  }
  
  private chooseNextAction(player: Player, dist: number): void {
    const rand = Math.random();
    
    // Face player
    this.facingDir = player.x > this.x ? 1 : -1;
    
    if (dist < 150 || rand < 0.6) {
      // Charge attack - most common
      this.startCharge(player);
    } else {
      // Jump attack for distant player
      this.startJumpWindup(player);
    }
  }
  
  private startCharge(player: Player): void {
    this.aiState = 'charging';
    this.facingDir = player.x > this.x ? 1 : -1;
    
    // Quick roar animation
    this.scene.cameras.main.shake(100, 0.01);
    
    // Start moving
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.facingDir * this.CHARGE_SPEED);
    
    // Create dirt trail during charge
    this.createDirtTrail();
  }
  
  private createDirtTrail(): void {
    if (this.aiState !== 'charging') return;
    
    // Create dirt particle behind
    const dirt = this.scene.add.circle(
      this.x - this.facingDir * 40,
      this.y + 25,
      Phaser.Math.Between(4, 8),
      0x8b7355,
      0.8
    );
    
    this.scene.tweens.add({
      targets: dirt,
      y: dirt.y - Phaser.Math.Between(20, 40),
      alpha: 0,
      scale: 0.3,
      duration: 300,
      onComplete: () => dirt.destroy()
    });
    
    // Continue trail while charging
    this.scene.time.delayedCall(50, () => this.createDirtTrail());
  }
  
  private endCharge(): void {
    this.aiState = 'idle';
    this.stateTimer = this.IDLE_TIME;
    this.actionCooldown = this.ACTION_COOLDOWN;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    
    // Impact dust
    this.createDirtBurst(8);
  }
  
  private startJumpWindup(player: Player): void {
    this.aiState = 'jumpWindup';
    this.stateTimer = this.JUMP_WINDUP_TIME;
    
    // Store target
    this.jumpTargetX = player.x;
    this.jumpTargetY = this.y;
    
    // Crouch animation
    if (this.bodyGraphics) {
      this.scene.tweens.add({
        targets: this.bodyGraphics,
        scaleY: 0.7,
        duration: this.JUMP_WINDUP_TIME,
        ease: 'Power2'
      });
    }
  }
  
  private executeJump(player: Player): void {
    this.aiState = 'jumping';
    
    // Update target to current player position
    this.jumpTargetX = player.x;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Calculate arc
    const distX = this.jumpTargetX - this.x;
    const timeToLand = 0.8; // seconds
    
    body.setVelocity(
      distX / timeToLand,
      -this.JUMP_HEIGHT
    );
    
    // Stretch animation
    if (this.bodyGraphics) {
      this.scene.tweens.add({
        targets: this.bodyGraphics,
        scaleY: 1.3,
        duration: 200,
        yoyo: true
      });
    }
    
    this.createDirtBurst(10);
  }
  
  private startLanding(): void {
    this.aiState = 'landing';
    this.stateTimer = this.LANDING_TIME;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    
    // Screen shake on impact
    this.scene.cameras.main.shake(300, 0.025);
    
    // Squash animation
    if (this.bodyGraphics) {
      this.scene.tweens.add({
        targets: this.bodyGraphics,
        scaleY: 0.6,
        duration: 100,
        yoyo: true,
        ease: 'Bounce'
      });
    }
    
    // Big dust burst
    this.createDirtBurst(15);
  }
  
  private startBurrowing(): void {
    this.aiState = 'burrowing';
    this.stateTimer = this.BURROW_TIME;
    this.hitsBeforeRetreat = this.HITS_TO_BURROW;
    
    // Choose opposite side of arena
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    
    this.burrowTargetX = this.x < (this.arenaLeft + this.arenaRight) / 2
      ? this.arenaRight - 50
      : this.arenaLeft + 50;
    
    // Sinking animation
    if (this.bodyGraphics) {
      this.scene.tweens.add({
        targets: this.bodyGraphics,
        y: this.y + 50,
        alpha: 0,
        scaleY: 0.5,
        duration: this.BURROW_TIME,
        ease: 'Power2'
      });
    }
    
    // Become invulnerable
    this.invulnTimer = this.BURROW_TIME + this.BURROWED_TIME + this.SURFACE_TIME;
    
    this.createDirtBurst(15);
  }
  
  private enterBurrowed(): void {
    this.aiState = 'burrowed';
    this.stateTimer = this.BURROWED_TIME;
    
    // Disable physics and hide
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    
    // Move to target position
    this.x = this.burrowTargetX;
  }
  
  private startSurfacing(): void {
    this.aiState = 'surfacing';
    this.stateTimer = this.SURFACE_TIME;
    
    // Enable physics
    this.setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    
    // Rising animation
    if (this.bodyGraphics) {
      this.bodyGraphics.setPosition(this.x, this.y + 50);
      this.bodyGraphics.setAlpha(0);
      this.bodyGraphics.setScale(this.facingDir, 0.5);
      this.scene.tweens.add({
        targets: this.bodyGraphics,
        y: this.y,
        alpha: 1,
        scaleY: 1,
        duration: this.SURFACE_TIME,
        ease: 'Back.easeOut'
      });
    }
    
    this.createDirtBurst(12);
    this.scene.cameras.main.shake(200, 0.01);
  }
  
  private completeSurfacing(): void {
    this.aiState = 'idle';
    this.stateTimer = this.IDLE_TIME;
    this.invulnTimer = 0;
    this.actionCooldown = this.ACTION_COOLDOWN;
  }
  
  private createDirtBurst(count: number): void {
    for (let i = 0; i < count; i++) {
      const dirt = this.scene.add.circle(
        this.x + Phaser.Math.Between(-40, 40),
        this.y + 20,
        Phaser.Math.Between(4, 10),
        Phaser.Math.RND.pick([0x8b7355, 0x6b5344, 0x3d5a3d]),
        0.9
      );
      
      const angle = Phaser.Math.Between(-150, -30) * Phaser.Math.DEG_TO_RAD;
      const speed = Phaser.Math.Between(80, 200);
      
      this.scene.tweens.add({
        targets: dirt,
        x: dirt.x + Math.cos(angle) * speed * 0.5,
        y: dirt.y + Math.sin(angle) * speed * 0.5,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(400, 700),
        ease: 'Power2',
        onComplete: () => dirt.destroy()
      });
    }
  }

  private applyMovement(player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    switch (this.aiState) {
      case 'hidden':
      case 'emerging':
      case 'idle':
      case 'jumpWindup':
      case 'landing':
      case 'burrowing':
      case 'burrowed':
      case 'surfacing':
      case 'dead':
        if (body.enable) body.setVelocityX(0);
        break;
        
      case 'charging':
        // Velocity already set in startCharge
        break;
        
      case 'jumping':
        // Gravity handles vertical, horizontal set in executeJump
        break;
        
      case 'hurt':
        if (body.enable) {
          body.setVelocityX(body.velocity.x * 0.9);
        }
        break;
    }
  }

  private updateVisuals(): void {
    if (this.hurtFlashTimer > 0) {
      if (this.bodyGraphics) {
        this.bodyGraphics.setAlpha(0.5);
      }
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0 && this.aiState !== 'burrowing' && this.aiState !== 'burrowed') {
      const flicker = Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.6;
      if (this.bodyGraphics) this.bodyGraphics.setAlpha(flicker);
    } else {
      this.clearTint();
      if (this.bodyGraphics && this.aiState !== 'burrowing' && this.aiState !== 'burrowed') {
        this.bodyGraphics.setAlpha(1);
      }
    }
  }

  /**
   * Take damage from player attack
   */
  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.aiState === 'hidden' || this.aiState === 'burrowed') return false;
    
    // Check invulnerability
    if (this.invulnTimer > 0) return false;
    
    // Check if already hit by this swing
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;
    
    // Apply damage
    this.currentHp -= amount;
    this.hitsBeforeRetreat--;
    
    // Enter hurt state
    this.aiState = 'hurt';
    this.hitstunTimer = this.cfg.hitstunMs;
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;
    
    // Apply knockback (reduced for big enemy)
    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.enable) {
      body.setVelocityX(knockDir * this.cfg.knockbackOnHit.x * 0.5);
    }
    
    // Check for death
    if (this.currentHp <= 0) {
      this.die();
    }
    
    return true;
  }

  private die(): void {
    if (this.isDead) return;
    
    this.isDead = true;
    this.aiState = 'dead';
    
    // Disable physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    
    // Big screen shake
    this.scene.cameras.main.shake(500, 0.03);
    
    // Moss explodes
    this.createMossExplosion();
    
    // Spawn escaped bug that runs away
    this.spawnEscapedBug();
    
    // Spawn large shell drops
    const dropCount = Phaser.Math.Between(
      this.cfg.dropShells.min,
      this.cfg.dropShells.max
    );
    
    for (let i = 0; i < dropCount; i++) {
      const offsetX = Phaser.Math.Between(-60, 60);
      const offsetY = Phaser.Math.Between(-30, 30);
      
      this.scene.time.delayedCall(i * 30, () => {
        const pickup = new Pickup(
          this.scene, 
          this.x + offsetX, 
          this.y + offsetY, 
          'shells', 
          1
        );
        
        const gameScene = this.scene as any;
        if (gameScene.getPickupsGroup) {
          gameScene.getPickupsGroup().add(pickup);
        }
        
        const pickupBody = pickup.body as Phaser.Physics.Arcade.Body;
        if (pickupBody) {
          pickupBody.setVelocity(
            Phaser.Math.Between(-100, 100),
            Phaser.Math.Between(-200, -100)
          );
          this.scene.time.delayedCall(400, () => {
            if (pickup.active && pickupBody) {
              pickupBody.setVelocity(0, 0);
              pickupBody.moves = false;
            }
          });
        }
      });
    }
    
    // Fade body graphics
    if (this.bodyGraphics) {
      this.scene.tweens.add({
        targets: this.bodyGraphics,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 0.3,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          this.bodyGraphics?.destroy();
          this.bodyGraphics = null;
        }
      });
    }
    
    // Destroy self after delay
    this.scene.time.delayedCall(1000, () => {
      this.destroy();
    });
  }
  
  private createMossExplosion(): void {
    // Big moss/leaf particles
    for (let i = 0; i < 30; i++) {
      const isLeaf = Math.random() > 0.5;
      const size = isLeaf ? Phaser.Math.Between(8, 15) : Phaser.Math.Between(4, 10);
      const color = Phaser.Math.RND.pick([0x2d5a3d, 0x3d7a4d, 0x4d8a5d, 0x1a3a25]);
      
      const particle = this.scene.add.ellipse(
        this.x + Phaser.Math.Between(-40, 40),
        this.y + Phaser.Math.Between(-30, 30),
        size,
        size * 0.6,
        color,
        1
      );
      
      const angle = Math.random() * Math.PI * 2;
      const distance = Phaser.Math.Between(80, 200);
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance - 50,
        alpha: 0,
        rotation: Phaser.Math.Between(-3, 3),
        duration: Phaser.Math.Between(600, 1000),
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
    
    // Central bright flash
    const flash = this.scene.add.circle(this.x, this.y, 40, 0x88ff88, 0.9);
    this.scene.tweens.add({
      targets: flash,
      radius: 100,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
  }
  
  private spawnEscapedBug(): void {
    // Small defenseless bug that runs away
    const bug = this.scene.add.ellipse(this.x, this.y, 15, 10, 0x554433);
    this.scene.physics.add.existing(bug);
    
    const bugBody = bug.body as Phaser.Physics.Arcade.Body;
    bugBody.setCollideWorldBounds(true);
    
    // Run away from center
    const runDir = this.x < (this.arenaLeft + this.arenaRight) / 2 ? -1 : 1;
    bugBody.setVelocity(runDir * 150, -100);
    
    // Destroy after running off
    this.scene.time.delayedCall(3000, () => {
      if (bug.active) bug.destroy();
    });
  }

  // Public getters
  getContactDamage(): number { 
    // Higher damage during attacks
    if (this.aiState === 'charging' || this.aiState === 'jumping') {
      return this.CHARGE_DAMAGE;
    }
    return this.cfg.contactDamage; 
  }
  
  getHitRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.cfg.width / 2, 
      this.y - this.cfg.height / 2, 
      this.cfg.width, 
      this.cfg.height
    );
  }
  
  isDying(): boolean { 
    return this.isDead; 
  }
  
  getAIState(): MossTitanAIState {
    return this.aiState;
  }
  
  getCurrentHp(): number {
    return this.currentHp;
  }
  
  getMaxHp(): number {
    return this.maxHp;
  }
  
  isInvulnerable(): boolean {
    return this.invulnTimer > 0 || this.aiState === 'hidden' || this.aiState === 'burrowed';
  }
  
  getDisplayName(): string {
    return this.cfg.displayName;
  }
  
  isHidden(): boolean {
    return this.aiState === 'hidden';
  }
}
