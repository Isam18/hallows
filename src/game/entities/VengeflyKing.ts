import Phaser from 'phaser';
import { Vengefly } from './Vengefly';
import type { EnemyCombatConfig } from '../core/CombatConfig';
import enemiesData from '../data/enemies.json';

/**
 * Vengefly King - giant boss vengefly.
 * - 20 HP
 * - Larger sprite (scale ~3)
 * - Periodically summons up to 3 normal vengeflies
 */
export class VengeflyKing extends Vengefly {
  private summonTimer = 4500;
  private maxSummons = 3;
  private summons: Vengefly[] = [];
  public readonly isVengeflyKing = true;

  constructor(scene: Phaser.Scene, x: number, y: number, baseConfig: EnemyCombatConfig) {
    const cfg: EnemyCombatConfig = {
      ...baseConfig,
      hp: 20,
      contactDamage: 2,
      moveSpeedAggro: 95,
      moveSpeedPatrol: 35,
      aggroRangePx: 600,
      deaggroRangePx: 1200,
      width: 60,
      height: 50,
      displayName: 'Vengefly King',
      dropShells: { min: 30, max: 50 },
    } as EnemyCombatConfig;
    super(scene, x, y, cfg);

    // Bigger boss size
    this.setScale(3, 3);
    this.setTint(0xff8833);
  }

  update(time: number, delta: number, player: any): void {
    super.update(time, delta, player);
    if (this.isDying()) return;

    // Parent class overwrites scale each frame for wing flap — reapply big king size.
    const flap = this.scaleY / 1; // preserve sine-flap on Y
    this.setScale(3, 3 * (0.9 + (flap - 0.9)));

    // Tick summon timer
    this.summonTimer -= delta;
    if (this.summonTimer <= 0) {
      this.summonTimer = 6000;
      this.trySummon();
    }
  }

  private trySummon(): void {
    // Prune dead summons
    this.summons = this.summons.filter((s) => s && s.active && !s.isDying());
    const slots = this.maxSummons - this.summons.length;
    if (slots <= 0) return;

    const scene: any = this.scene;
    const cfg = (enemiesData as Record<string, EnemyCombatConfig>)['vengefly'];
    if (!cfg || !scene.spawnEndlessEnemy) return;

    // Flash king to telegraph summon
    this.setTint(0xffffaa);
    this.scene.time.delayedCall(150, () => { if (this.active) this.setTint(0xff8833); });

    for (let i = 0; i < slots; i++) {
      const offsetX = Phaser.Math.Between(-60, 60);
      const offsetY = Phaser.Math.Between(-30, 10);
      scene.spawnEndlessEnemy('vengefly', this.x + offsetX, this.y + offsetY, cfg);
      // Track newest enemy as our summon
      const group = scene.enemies?.getChildren?.() ?? [];
      const last = group[group.length - 1];
      if (last instanceof Vengefly) this.summons.push(last);
    }
  }
}