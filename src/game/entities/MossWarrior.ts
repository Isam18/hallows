import Phaser from 'phaser';
import { EnemyCombatConfig, DEFAULT_ENEMY_CONFIG } from '../core/CombatConfig';
import gameState from '../core/GameState';
import type { Player } from './Player';
import { Pickup } from './Pickup';

/**
 * Moss Warrior AI States
 * - camouflaged: Curled up as a bush, waiting for player to get close
 * - rising: Transforming from bush to warrior
 * - idle: In combat form, waiting
 * - aggro: Chasing the player
 * - shieldBlock: Blocking attacks with shield
 * - swordWindup: Preparing sword combo
 * - swordAttack: Executing sword strikes
 * - seedWindup: Preparing ranged attack
 * - seedAttack: Firing seed projectiles
 * - retreat: Backing away from player
 * - recovery: Cooling down after attack
 * - hurt: Stunned from damage
 * - dead: Death animation
 */
type MossWarriorAIState = 
  | 'camouflaged' 
  | 'rising' 
  | 'idle' 
  | 'aggro' 
  | 'shieldBlock'
  | 'swordWindup' 
  | 'swordAttack' 
  | 'seedWindup'
  | 'seedAttack'
  | 'retreat'
  | 'recovery' 
  | 'hurt' 
  | 'dead';

export class MossWarrior extends Phaser.Physics.Arcade.Sprite {
  private cfg: EnemyCombatConfig;
  private aiState: MossWarriorAIState = 'camouflaged';
  private currentHp: number;
  
  // Dual-state tracking
  private hasBecomeWarrior = false;
  private risingTimer = 0;
  private readonly RISING_TIME = 800;
  private readonly CAMOUFLAGE_AGGRO_RANGE = 80;
  
  // Movement
  private facingDir: 1 | -1 = 1;
  private turnCooldownTimer = 0;
  
  // Combat timers
  private hitstunTimer = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private attackCooldown = 0;
  private retreatTimer = 0;
  private blockedHitCount = 0;
  
  // Sword attack state
  private swordWindupTimer = 0;
  private swordAttackTimer = 0;
  private swordComboHit = 0;
  private readonly SWORD_WINDUP_TIME = 400;
  private readonly SWORD_ATTACK_TIME = 200;
  private readonly SWORD_COMBO_HITS = 2;
  private readonly SWORD_RANGE = 70;
  private readonly SWORD_DAMAGE = 2;
  
  // Seed attack state
  private seedWindupTimer = 0;
  private seedAttackTimer = 0;
  private seedsToFire = 0;
  private readonly SEED_WINDUP_TIME = 600;
  private readonly SEED_ATTACK_TIME = 150;
  private readonly SEED_RANGE = 250;
  private readonly SEED_DAMAGE = 1;
  
  // Shield mechanics
  private shieldBlockTimer = 0;
  private readonly SHIELD_BLOCK_TIME = 300;
  private isBlocking = false;
  
  // Recovery
  private recoveryTimer = 0;
  private readonly RECOVERY_TIME = 500;
  private readonly ATTACK_COOLDOWN = 1200;
  
  // Retreat behavior
  private readonly RETREAT_DISTANCE = 100;
  private readonly RETREAT_SPEED = 80;
  
  // Track if already dead
  private isDead = false;
  
  // Hit tracking
  private lastHitBySwingId = -1;
  
  // Attack hitbox
  private attackHitbox: Phaser.Geom.Rectangle | null = null;
  private hasDealtDamageThisAttack = false;
  
  // Projectiles group reference
  private projectiles: Phaser.Physics.Arcade.Group | null = null;
  
  // Visual elements
  private bushSprite: Phaser.GameObjects.Sprite | null = null;
  private shieldSprite: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyCombatConfig) {
    super(scene, x, y, 'mossWarrior_bush');
    
    this.cfg = { ...DEFAULT_ENEMY_CONFIG, ...config };
    this.currentHp = this.cfg.hp;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Start with bush size
    this.setSize(40, 30);
    this.setCollideWorldBounds(true);
    
    // Create projectiles group
    this.projectiles = scene.physics.add.group({
      defaultKey: 'seedProjectile',
      maxSize: 10
    });
    
    this.facingDir = Math.random() > 0.5 ? 1 : -1;
    
    // Create shield visual (hidden initially)
    this.shieldSprite = scene.add.rectangle(0, 0, 15, 50, 0x556655, 0.8);
    this.shieldSprite.setVisible(false);
    this.shieldSprite.setDepth(this.depth + 1);
  }

  update(time: number, delta: number, player: Player): void {
    if (this.isDead) return;
    
    this.updateTimers(delta);
    this.updateAIState(player);
    this.applyMovement(player);
    this.updateVisuals(player);
    this.updateProjectiles(player);
    this.checkAttackHit(player);
    this.updateShieldPosition();
  }

  private updateTimers(delta: number): void {
    if (this.hitstunTimer > 0) this.hitstunTimer -= delta;
    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= delta;
    if (this.turnCooldownTimer > 0) this.turnCooldownTimer -= delta;
    if (this.risingTimer > 0) this.risingTimer -= delta;
    if (this.swordWindupTimer > 0) this.swordWindupTimer -= delta;
    if (this.swordAttackTimer > 0) this.swordAttackTimer -= delta;
    if (this.seedWindupTimer > 0) this.seedWindupTimer -= delta;
    if (this.seedAttackTimer > 0) this.seedAttackTimer -= delta;
    if (this.shieldBlockTimer > 0) this.shieldBlockTimer -= delta;
    if (this.recoveryTimer > 0) this.recoveryTimer -= delta;
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    if (this.retreatTimer > 0) this.retreatTimer -= delta;
  }

  private updateAIState(player: Player): void {
    // Handle hurt state
    if (this.aiState === 'hurt') {
      if (this.hitstunTimer <= 0) {
        this.aiState = 'aggro';
      }
      return;
    }
    
    if (this.aiState === 'dead') return;
    
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    
    // CAMOUFLAGED STATE - waiting as bush
    if (this.aiState === 'camouflaged') {
      if (dist < this.CAMOUFLAGE_AGGRO_RANGE) {
        this.startRising();
      }
      return;
    }
    
    // RISING STATE - transforming
    if (this.aiState === 'rising') {
      if (this.risingTimer <= 0) {
        this.completeRising();
      }
      return;
    }
    
    // SHIELD BLOCK
    if (this.aiState === 'shieldBlock') {
      if (this.shieldBlockTimer <= 0) {
        this.aiState = 'aggro';
        this.isBlocking = false;
      }
      return;
    }
    
    // SWORD ATTACK STATES
    if (this.aiState === 'swordWindup') {
      if (this.swordWindupTimer <= 0) {
        this.startSwordStrike();
      }
      return;
    }
    
    if (this.aiState === 'swordAttack') {
      if (this.swordAttackTimer <= 0) {
        this.swordComboHit++;
        if (this.swordComboHit < this.SWORD_COMBO_HITS) {
          // Continue combo
          this.swordWindupTimer = this.SWORD_WINDUP_TIME * 0.5;
          this.aiState = 'swordWindup';
        } else {
          this.endAttack();
        }
        this.attackHitbox = null;
      }
      return;
    }
    
    // SEED ATTACK STATES
    if (this.aiState === 'seedWindup') {
      if (this.seedWindupTimer <= 0) {
        this.fireSeed(player);
      }
      return;
    }
    
    if (this.aiState === 'seedAttack') {
      if (this.seedAttackTimer <= 0) {
        this.seedsToFire--;
        if (this.seedsToFire > 0) {
          this.seedAttackTimer = this.SEED_ATTACK_TIME;
          this.fireSeed(player);
        } else {
          this.endAttack();
        }
      }
      return;
    }
    
    // RETREAT STATE
    if (this.aiState === 'retreat') {
      if (this.retreatTimer <= 0) {
        // Counter-attack after retreat
        if (dist < this.SWORD_RANGE) {
          this.startSwordAttack();
        } else {
          this.aiState = 'aggro';
        }
      }
      return;
    }
    
    // RECOVERY STATE
    if (this.aiState === 'recovery') {
      if (this.recoveryTimer <= 0) {
        this.aiState = 'aggro';
        this.attackCooldown = this.ATTACK_COOLDOWN;
      }
      return;
    }
    
    // AGGRO LOGIC - decide next action
    if (this.attackCooldown <= 0) {
      // Check if should retreat (shield has blocked too many hits)
      if (this.blockedHitCount >= 3) {
        this.startRetreat();
        this.blockedHitCount = 0;
        return;
      }
      
      // Choose attack based on distance
      if (dist < this.SWORD_RANGE) {
        this.startSwordAttack();
      } else if (dist > this.SWORD_RANGE && dist < this.SEED_RANGE) {
        this.startSeedAttack();
      }
    }
  }

  private startRising(): void {
    this.aiState = 'rising';
    this.risingTimer = this.RISING_TIME;
    
    // Screen shake for dramatic effect
    this.scene.cameras.main.shake(200, 0.01);
    
    // Rising animation
    this.scene.tweens.add({
      targets: this,
      scaleY: 2,
      y: this.y - 30,
      duration: this.RISING_TIME,
      ease: 'Back.easeOut'
    });
  }

  private completeRising(): void {
    this.hasBecomeWarrior = true;
    this.aiState = 'aggro';
    
    // Switch to warrior sprite and hitbox
    this.setTexture('mossWarrior');
    this.setSize(this.cfg.width, this.cfg.height);
    
    // Show shield
    if (this.shieldSprite) {
      this.shieldSprite.setVisible(true);
    }
    
    // Heavy thud effect
    this.scene.cameras.main.shake(150, 0.015);
  }

  private startSwordAttack(): void {
    this.aiState = 'swordWindup';
    this.swordWindupTimer = this.SWORD_WINDUP_TIME;
    this.swordComboHit = 0;
    this.hasDealtDamageThisAttack = false;
  }

  private startSwordStrike(): void {
    this.aiState = 'swordAttack';
    this.swordAttackTimer = this.SWORD_ATTACK_TIME;
    this.hasDealtDamageThisAttack = false;
    this.createSwordHitbox();
    
    // Visual swing effect
    this.scene.cameras.main.shake(100, 0.008);
  }

  private createSwordHitbox(): void {
    const offsetX = this.facingDir * 50;
    this.attackHitbox = new Phaser.Geom.Rectangle(
      this.x + offsetX - 40,
      this.y - 30,
      80,
      60
    );
  }

  private startSeedAttack(): void {
    this.aiState = 'seedWindup';
    this.seedWindupTimer = this.SEED_WINDUP_TIME;
    this.seedsToFire = Phaser.Math.Between(1, 3);
  }

  private fireSeed(player: Player): void {
    this.aiState = 'seedAttack';
    this.seedAttackTimer = this.SEED_ATTACK_TIME;
    
    // Create seed projectile
    const seed = this.scene.add.circle(this.x, this.y - 20, 8, 0x66aa44);
    this.scene.physics.add.existing(seed);
    
    const seedBody = seed.body as Phaser.Physics.Arcade.Body;
    seedBody.setCircle(8);
    
    // Arc trajectory toward player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const speed = 200;
    seedBody.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 100 // Arc upward
    );
    seedBody.setGravityY(300);
    
    // Store player reference and damage on seed
    (seed as any).damage = this.SEED_DAMAGE;
    (seed as any).hasHit = false;
    
    // Add to projectiles group
    if (this.projectiles) {
      this.projectiles.add(seed);
    }
    
    // Destroy after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      if (seed.active) seed.destroy();
    });
  }

  private updateProjectiles(player: Player): void {
    if (!this.projectiles) return;
    
    this.projectiles.getChildren().forEach((proj: any) => {
      if (!proj.active || proj.hasHit) return;
      
      // Check collision with player
      const playerBounds = player.getBounds();
      const projBounds = proj.getBounds();
      
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, projBounds)) {
        if (!player.isInvulnerable()) {
          player.takeDamage(proj.damage || 1, proj.x);
          proj.hasHit = true;
          
          // Burst effect
          this.scene.tweens.add({
            targets: proj,
            scale: 2,
            alpha: 0,
            duration: 150,
            onComplete: () => proj.destroy()
          });
        }
      }
    });
  }

  private startRetreat(): void {
    this.aiState = 'retreat';
    this.retreatTimer = 500;
  }

  private endAttack(): void {
    this.aiState = 'recovery';
    this.recoveryTimer = this.RECOVERY_TIME;
    this.attackHitbox = null;
  }

  private checkAttackHit(player: Player): void {
    if (this.aiState !== 'swordAttack' || !this.attackHitbox || this.hasDealtDamageThisAttack) return;
    
    const playerBounds = player.getBounds();
    if (Phaser.Geom.Rectangle.Overlaps(this.attackHitbox, playerBounds)) {
      if (!player.isInvulnerable()) {
        player.takeDamage(this.SWORD_DAMAGE, this.x);
        this.hasDealtDamageThisAttack = true;
        this.scene.cameras.main.shake(200, 0.02);
      }
    }
  }

  private applyMovement(player: Player): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    switch (this.aiState) {
      case 'camouflaged':
      case 'rising':
      case 'swordWindup':
      case 'swordAttack':
      case 'seedWindup':
      case 'seedAttack':
      case 'shieldBlock':
      case 'recovery':
      case 'hurt':
      case 'dead':
        body.setVelocityX(0);
        break;
        
      case 'retreat':
        // Move away from player
        const awayDir = player.x > this.x ? -1 : 1;
        body.setVelocityX(awayDir * this.RETREAT_SPEED);
        this.facingDir = -awayDir as 1 | -1; // Still face player
        break;
        
      case 'aggro':
      case 'idle':
        this.applyAggroMovement(body, player);
        break;
    }
  }

  private applyAggroMovement(body: Phaser.Physics.Arcade.Body, player: Player): void {
    const dist = Math.abs(player.x - this.x);
    
    // Don't move if in attack range
    if (dist < this.SWORD_RANGE * 0.8) {
      body.setVelocityX(0);
      this.facingDir = player.x > this.x ? 1 : -1;
      return;
    }
    
    const dir = player.x > this.x ? 1 : -1;
    this.facingDir = dir;
    
    if ((dir === -1 && body.blocked.left) || (dir === 1 && body.blocked.right)) {
      body.setVelocityX(0);
    } else {
      body.setVelocityX(dir * this.cfg.moveSpeedAggro);
    }
    
    this.setFlipX(dir < 0);
  }

  private updateShieldPosition(): void {
    if (!this.shieldSprite || !this.hasBecomeWarrior) return;
    
    const shieldOffsetX = this.facingDir * 25;
    this.shieldSprite.setPosition(this.x + shieldOffsetX, this.y);
    this.shieldSprite.setVisible(this.hasBecomeWarrior && !this.isDead);
    
    // Shield color based on blocking state
    if (this.isBlocking) {
      this.shieldSprite.setFillStyle(0x88aa88, 1);
    } else {
      this.shieldSprite.setFillStyle(0x556655, 0.8);
    }
  }

  private updateVisuals(player: Player): void {
    // Hurt flash
    if (this.hurtFlashTimer > 0) {
      this.setTint(0xffffff);
    } else if (this.invulnTimer > 0) {
      this.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.5);
    } else {
      this.setAlpha(1);
    }
    
    // State-based tinting
    if (this.aiState === 'rising') {
      this.setTint(0x88ff88);
    } else if (this.aiState === 'swordWindup') {
      this.setTint(0xffcc88);
    } else if (this.aiState === 'swordAttack') {
      this.setTint(0xff8866);
    } else if (this.aiState === 'seedWindup' || this.aiState === 'seedAttack') {
      this.setTint(0x88ffaa);
    } else if (this.aiState === 'shieldBlock') {
      this.setTint(0xaaaaff);
    } else if (this.hurtFlashTimer <= 0) {
      this.clearTint();
    }
    
    // Flip based on facing
    this.setFlipX(this.facingDir < 0);
  }

  /**
   * Called when player attacks this enemy
   * Returns true if damage was dealt, false if blocked
   */
  takeDamage(amount: number, fromX: number, swingId: number = -1): boolean {
    if (this.isDead) return false;
    if (this.invulnTimer > 0) return false;
    if (swingId !== -1 && swingId === this.lastHitBySwingId) return false;
    this.lastHitBySwingId = swingId;
    
    // SHIELD BLOCK CHECK
    // Block if:
    // 1. We're in warrior form
    // 2. Attack is from the front (same direction we're facing)
    // 3. We're not in an attack wind-up
    const attackFromFront = (fromX > this.x && this.facingDir > 0) || 
                            (fromX < this.x && this.facingDir < 0);
    const canBlock = this.hasBecomeWarrior && 
                     attackFromFront && 
                     this.aiState !== 'swordWindup' && 
                     this.aiState !== 'seedWindup' &&
                     this.aiState !== 'hurt';
    
    if (canBlock) {
      // BLOCKED!
      this.isBlocking = true;
      this.shieldBlockTimer = this.SHIELD_BLOCK_TIME;
      this.blockedHitCount++;
      
      // Block feedback - sparks and sound placeholder
      this.createBlockSparks(fromX);
      
      // Push back slightly
      const knockDir = this.x > fromX ? 1 : -1;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(knockDir * 30);
      
      // Brief shield block state
      if (this.aiState !== 'shieldBlock') {
        this.aiState = 'shieldBlock';
      }
      
      return false; // No damage dealt
    }
    
    // DAMAGE TAKEN
    this.currentHp -= amount;
    this.isBlocking = false;
    
    this.aiState = 'hurt';
    this.hitstunTimer = this.cfg.hitstunMs * 0.3; // Very resistant
    this.invulnTimer = this.cfg.invulnOnHitMs;
    this.hurtFlashTimer = this.cfg.hurtFlashMs;
    
    // Minimal knockback
    const knockDir = this.x > fromX ? 1 : -1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      knockDir * this.cfg.knockbackOnHit.x * 0.15,
      -this.cfg.knockbackOnHit.y * 0.15
    );
    
    if (this.currentHp <= 0) {
      this.die();
    }
    
    return true;
  }

  private createBlockSparks(fromX: number): void {
    const sparkX = this.x + this.facingDir * 25;
    const sparkY = this.y - 10;
    
    // Create spark particles
    for (let i = 0; i < 5; i++) {
      const spark = this.scene.add.circle(
        sparkX + Phaser.Math.Between(-10, 10),
        sparkY + Phaser.Math.Between(-10, 10),
        3,
        0xffff88
      );
      spark.setDepth(100);
      
      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        x: spark.x + Phaser.Math.Between(-30, 30),
        y: spark.y + Phaser.Math.Between(-20, 20),
        scale: 0.2,
        duration: 200,
        onComplete: () => spark.destroy()
      });
    }
    
    // Shield flash
    if (this.shieldSprite) {
      this.scene.tweens.add({
        targets: this.shieldSprite,
        fillColor: 0xffffff,
        duration: 50,
        yoyo: true
      });
    }
  }

  private die(): void {
    if (this.isDead) return;
    
    this.isDead = true;
    this.aiState = 'dead';
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    
    // Hide shield
    if (this.shieldSprite) {
      this.shieldSprite.setVisible(false);
    }
    
    // Large geo burst - between Husk Guard and Boss
    const dropCount = Phaser.Math.Between(
      this.cfg.dropShells.min,
      this.cfg.dropShells.max
    );
    
    for (let i = 0; i < dropCount; i++) {
      const offsetX = Phaser.Math.Between(-50, 50);
      const offsetY = Phaser.Math.Between(-30, 30);
      
      const pickup = new Pickup(
        this.scene, 
        this.x + offsetX, 
        this.y + offsetY, 
        'shells', 
        3 // Worth more geo per shell
      );
      
      const gameScene = this.scene as any;
      if (gameScene.getPickupsGroup) {
        gameScene.getPickupsGroup().add(pickup);
      }
      
      const pickupBody = pickup.body as Phaser.Physics.Arcade.Body;
      if (pickupBody) {
        pickupBody.setVelocity(
          Phaser.Math.Between(-120, 120),
          Phaser.Math.Between(-200, -100)
        );
        this.scene.time.delayedCall(400, () => {
          if (pickup.active && pickupBody) {
            pickupBody.setVelocity(0, 0);
            pickupBody.moves = false;
          }
        });
      }
    }
    
    // Heavy screen shake
    this.scene.cameras.main.shake(400, 0.02);
    
    // Death animation - heavy fall with leaves
    this.createDeathLeaves();
    
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 0.3,
      y: this.y + 30,
      rotation: this.facingDir * 0.3,
      duration: 600,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  private createDeathLeaves(): void {
    // Scatter leaves on death
    for (let i = 0; i < 12; i++) {
      const leaf = this.scene.add.ellipse(
        this.x + Phaser.Math.Between(-20, 20),
        this.y + Phaser.Math.Between(-30, 0),
        8, 5,
        Phaser.Math.Between(0, 1) > 0.5 ? 0x6ec472 : 0x5a9a5a
      );
      leaf.setDepth(50);
      
      this.scene.tweens.add({
        targets: leaf,
        x: leaf.x + Phaser.Math.Between(-80, 80),
        y: leaf.y + Phaser.Math.Between(50, 120),
        rotation: Phaser.Math.Between(-3, 3),
        alpha: 0,
        duration: 800 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => leaf.destroy()
      });
    }
  }

  // Public getters
  getContactDamage(): number { 
    return this.hasBecomeWarrior ? this.cfg.contactDamage : 0; 
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
  
  getAIState(): MossWarriorAIState {
    return this.aiState;
  }
  
  getCurrentHp(): number {
    return this.currentHp;
  }
  
  getMaxHp(): number {
    return this.cfg.hp;
  }
  
  isInvulnerable(): boolean {
    return this.invulnTimer > 0;
  }
  
  getDisplayName(): string {
    return this.cfg.displayName;
  }
  
  isCamouflaged(): boolean {
    return this.aiState === 'camouflaged';
  }
  
  isWarriorForm(): boolean {
    return this.hasBecomeWarrior;
  }
}
