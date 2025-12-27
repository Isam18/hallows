import Phaser from 'phaser';
import { EnemyCombatConfig } from '../core/CombatConfig';
import { Vengefly } from '../entities/Vengefly';
import { Aspid } from '../entities/Aspid';
import enemiesData from '../data/enemies.json';

export interface FlyingSpawnPoint {
  x: number;
  y: number;
  forceType?: 'vengefly' | 'aspid'; // Optional override
}

/**
 * FlyingEnemySpawner - Reusable component that spawns either Vengefly or Aspid
 * based on weighted random selection.
 * 
 * Spawn chances:
 * - Vengefly: 75%
 * - Aspid: 25%
 */
export class FlyingEnemySpawner {
  private scene: Phaser.Scene;
  private enemyGroup: Phaser.Physics.Arcade.Group;
  
  // Spawn weights
  private static readonly VENGEFLY_CHANCE = 0.75;
  private static readonly ASPID_CHANCE = 0.25;

  constructor(scene: Phaser.Scene, enemyGroup: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.enemyGroup = enemyGroup;
  }

  /**
   * Spawn a flying enemy at the given position.
   * Rolls random to determine Vengefly (75%) or Aspid (25%)
   */
  spawnAt(x: number, y: number, forceType?: 'vengefly' | 'aspid'): Vengefly | Aspid {
    const enemyType = forceType || this.rollEnemyType();
    
    if (enemyType === 'aspid') {
      return this.spawnAspid(x, y);
    } else {
      return this.spawnVengefly(x, y);
    }
  }

  /**
   * Spawn multiple flying enemies from an array of spawn points
   */
  spawnFromPoints(spawnPoints: FlyingSpawnPoint[]): (Vengefly | Aspid)[] {
    const spawned: (Vengefly | Aspid)[] = [];
    
    for (const point of spawnPoints) {
      const enemy = this.spawnAt(point.x, point.y, point.forceType);
      spawned.push(enemy);
    }
    
    return spawned;
  }

  /**
   * Roll random to determine enemy type
   */
  private rollEnemyType(): 'vengefly' | 'aspid' {
    const roll = Math.random();
    
    if (roll < FlyingEnemySpawner.ASPID_CHANCE) {
      return 'aspid';
    }
    return 'vengefly';
  }

  private spawnVengefly(x: number, y: number): Vengefly {
    const config = (enemiesData as Record<string, EnemyCombatConfig>)['vengefly'];
    const vengefly = new Vengefly(this.scene, x, y, config);
    this.enemyGroup.add(vengefly);
    return vengefly;
  }

  private spawnAspid(x: number, y: number): Aspid {
    const config = (enemiesData as Record<string, EnemyCombatConfig>)['aspid'];
    const aspid = new Aspid(this.scene, x, y, config);
    this.enemyGroup.add(aspid);
    return aspid;
  }

  /**
   * Get the spawn chance percentages for display/debug
   */
  static getSpawnChances(): { vengefly: number; aspid: number } {
    return {
      vengefly: FlyingEnemySpawner.VENGEFLY_CHANCE * 100,
      aspid: FlyingEnemySpawner.ASPID_CHANCE * 100,
    };
  }
}
