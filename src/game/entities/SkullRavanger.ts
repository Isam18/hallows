import Phaser from 'phaser';
import { Boss } from './Boss';

export class SkullRavanger extends Boss {
  private attackState = 'idle';
  private attackCooldown = 3000;
  private lastAttackTime = 0;
  private attackWindupTime = 0;
  private jumpVelocity = -400;
  private chargeSpeed = 350; // Faster than player sprint
  private chargeDuration = 800;
  private chargeWindupDuration = 500;
  private debrisRocks: Phaser.GameObjects.Rectangle[] = [];
  private debrisActive = false;
  private multipleJumpCount = 0;
  private maxMultipleJumps = 5;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    // Skull Ravanger stats - 10x husk health
    this.maxHp = 50; // Assuming husk has 5 HP
    this.hp = this.maxHp;
    this.contactDamage = 2;
  }
  
  getName(): string {
    return 'SKULL RAVAGER';
  }
  
  getNameColor(): string {
    return '#ff4422';
  }
  
  getSubtitle(): string {
    return '~ Tyrant of the Molten Pits ~';
  }
  
  protected createVisuals(): void {
    // Massive skull body
    const skullBody = this.scene.add.ellipse(0, -15, 70, 60, 0xd0b8a8);
    skullBody.setDepth(2);
    this.add(skullBody);
    
    // Menacing eye sockets
    const leftEye = this.scene.add.ellipse(-18, -20, 20, 24, 0x1a1010);
    leftEye.setDepth(3);
    this.add(leftEye);
    
    const rightEye = this.scene.add.ellipse(18, -20, 20, 24, 0x1a1010);
    rightEye.setDepth(3);
    this.add(rightEye);
    
    // Fierce glowing orange-red pupils
    const leftPupil = this.scene.add.circle(-18, -20, 7, 0xff4400);
    leftPupil.setDepth(4);
    this.add(leftPupil);
    
    const rightPupil = this.scene.add.circle(18, -20, 7, 0xff4400);
    rightPupil.setDepth(4);
    this.add(rightPupil);
    
    // Pupil glow
    const leftGlow = this.scene.add.circle(-18, -20, 10, 0xff6622, 0.6);
    leftGlow.setDepth(4);
    this.add(leftGlow);
    
    const rightGlow = this.scene.add.circle(18, -20, 10, 0xff6622, 0.6);
    rightGlow.setDepth(4);
    this.add(rightGlow);
    
    // Massive lower jaw
    const jaw = this.scene.add.ellipse(0, 15, 55, 30, 0xc8a898);
    jaw.setDepth(2);
    this.add(jaw);
    
    // Rows of sharp teeth
    for (let i = 0; i < 10; i++) {
      const toothX = -22 + i * 5;
      const tooth = this.scene.add.triangle(
        toothX, 18,
        toothX - 3, 28,
        toothX + 3, 28,
        0xffffff
      );
      tooth.setDepth(3);
      this.add(tooth);
    }
    
    // Large crown/horns
    const horn1 = this.scene.add.triangle(
      -8, -35,
      -20, -50,
      0, -50,
      0xc8a898
    );
    horn1.setDepth(2);
    this.add(horn1);
    
    const horn2 = this.scene.add.triangle(
      8, -35,
      0, -50,
      20, -50,
      0xc8a898
    );
    horn2.setDepth(2);
    this.add(horn2);
    
    // Armored body segments below
    const bodyArmor = this.scene.add.rectangle(0, 45, 50, 40, 0xb8a088);
    bodyArmor.setDepth(1);
    this.add(bodyArmor);
    
    // Powerful legs
    const leftLeg = this.scene.add.rectangle(-20, 75, 12, 30, 0xa08070);
    leftLeg.setDepth(1);
    this.add(leftLeg);
    
    const rightLeg = this.scene.add.rectangle(20, 75, 12, 30, 0xa08070);
    rightLeg.setDepth(1);
    this.add(rightLeg);
  }
  
  protected updateBehavior(time: number, delta: number, player: Phaser.GameObjects.Sprite): void {
    if (this.isDying() || this.isInvulnerable()) return;
    
    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const directionToPlayer = player.x > this.x ? 1 : -1;
    
    // Face player
    this.setFacing(directionToPlayer === 1 ? 'right' : 'left');
    
    switch (this.attackState) {
      case 'idle':
        this.updateIdleBehavior(time, distanceToPlayer);
        break;
      case 'charge':
        this.updateChargeBehavior(delta, player);
        break;
      case 'jumpAttack':
        this.updateJumpAttackBehavior(delta, player);
        break;
      case 'multipleJumps':
        this.updateMultipleJumpsBehavior(delta, player);
        break;
      case 'cooldown':
        this.updateCooldownBehavior(time);
        break;
    }
    
    // Update falling debris
    this.updateDebris(delta);
  }
  
  private updateIdleBehavior(time: number, distanceToPlayer: number): void {
    const canAttack = time - this.lastAttackTime > this.attackCooldown;
    
    if (canAttack && distanceToPlayer < 400) {
      // Choose random attack
      const attackRoll = Math.random();
      
      if (attackRoll < 0.4) {
        this.startCharge();
      } else if (attackRoll < 0.7) {
        this.startJumpAttack();
      } else {
        this.startMultipleJumps();
      }
    }
  }
  
  private startCharge(): void {
    this.attackState = 'charge';
    this.attackWindupTime = this.scene.time.now;
    this.lastAttackTime = this.scene.time.now;
  }
  
  private updateChargeBehavior(delta: number, player: Phaser.GameObjects.Sprite): void {
    const currentTime = this.scene.time.now;
    const timeSinceWindup = currentTime - this.attackWindupTime;
    
    if (timeSinceWindup < this.chargeWindupDuration) {
      // Windup - face player direction
      const directionToPlayer = player.x > this.x ? 1 : -1;
      this.setFacing(directionToPlayer === 1 ? 'right' : 'left');
      this.setVelocityX(0);
    } else if (timeSinceWindup < this.chargeWindupDuration + this.chargeDuration) {
      // Charge phase - faster than player sprint
      const chargeDir = this.facing === 'left' ? -1 : 1;
      this.setVelocityX(chargeDir * this.chargeSpeed);
    } else {
      // End charge
      this.attackState = 'cooldown';
      this.setVelocityX(0);
      this.scene.time.delayedCall(500, () => {
        this.attackState = 'idle';
      });
    }
  }
  
  private startJumpAttack(): void {
    this.attackState = 'jumpAttack';
    this.attackWindupTime = this.scene.time.now;
    this.lastAttackTime = this.scene.time.now;
    this.debrisActive = false;
  }
  
  private updateJumpAttackBehavior(delta: number, player: Phaser.GameObjects.Sprite): void {
    const currentTime = this.scene.time.now;
    const timeSinceWindup = currentTime - this.attackWindupTime;
    
    if (timeSinceWindup < 300) {
      // Windup
      this.setVelocityX(0);
    } else if (!this.body!.touching.down && timeSinceWindup < 500) {
      // Jump towards player
      const directionToPlayer = player.x > this.x ? 1 : -1;
      this.setVelocityX(directionToPlayer * 200);
      this.setVelocityY(this.jumpVelocity);
    } else if (this.body!.touching.down && timeSinceWindup < 1200) {
      // Landed - spawn debris from above
      if (!this.debrisActive) {
        this.spawnDebris(this.x, this.y - 50, 8);
        this.debrisActive = true;
      }
      this.setVelocityX(0);
    } else {
      // Attack finished
      this.attackState = 'cooldown';
      this.scene.time.delayedCall(800, () => {
        this.attackState = 'idle';
      });
    }
  }
  
  private startMultipleJumps(): void {
    this.attackState = 'multipleJumps';
    this.attackWindupTime = this.scene.time.now;
    this.multipleJumpCount = 0;
    this.lastAttackTime = this.scene.time.now;
    this.debrisActive = false;
  }
  
  private updateMultipleJumpsBehavior(delta: number, player: Phaser.GameObjects.Sprite): void {
    const currentTime = this.scene.time.now;
    const timeSinceWindup = currentTime - this.attackWindupTime;
    
    if (timeSinceWindup < 400 && this.multipleJumpCount === 0) {
      // Initial windup
      this.setVelocityX(0);
    } else if (this.multipleJumpCount < this.maxMultipleJumps && this.body!.touching.down) {
      // Perform jump
      this.multipleJumpCount++;
      this.setVelocityY(this.jumpVelocity * 0.8);
      
      // Spawn debris warning (ground crumbling)
      this.scene.time.delayedCall(200, () => {
        this.spawnDebris(this.x + Phaser.Math.Between(-100, 100), this.y - 100, 3);
      });
    } else if (timeSinceWindup > 3000) {
      // Attack sequence finished
      this.attackState = 'cooldown';
      this.scene.time.delayedCall(800, () => {
        this.attackState = 'idle';
      });
    }
  }
  
  private updateCooldownBehavior(time: number): void {
    // Cooldown phase - stay idle
    this.setVelocityX(0);
  }
  
  private spawnDebris(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const offsetX = Phaser.Math.Between(-80, 80);
      const rock = this.scene.add.rectangle(
        x + offsetX,
        y,
        15 + Phaser.Math.Between(0, 15),
        15 + Phaser.Math.Between(0, 15),
        0x4a3030
      );
      rock.setDepth(5);
      this.debrisRocks.push(rock);
      
      // Animate falling
      this.scene.tweens.add({
        targets: rock,
        y: y + 300,
        duration: 600 + Phaser.Math.Between(0, 300),
        ease: 'Quad.easeIn',
        onComplete: () => {
          rock.destroy();
          this.debrisRocks = this.debrisRocks.filter(r => r !== rock);
        }
      });
    }
  }
  
  private updateDebris(delta: number): void {
    // Check collision with player
    const player = this.scene.registry.get('player');
    if (!player) return;
    
    this.debrisRocks.forEach(rock => {
      const distance = Phaser.Math.Distance.Between(
        rock.x, rock.y,
        player.x, player.y
      );
      
      if (distance < 40 && !player.isInvulnerable()) {
        player.takeDamage(2, rock.x);
        rock.destroy();
        this.debrisRocks = this.debrisRocks.filter(r => r !== rock);
      }
    });
  }
}
