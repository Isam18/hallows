/**
 * DEATH SYSTEM CONFIGURATION
 * ==========================
 * Centralized config for death workflow behavior.
 */

import deathData from '../data/death.json';

export interface DeathConfig {
  dropCurrencyOnDeath: boolean;
  dropMode: 'marker' | 'shade';
  dropPercent: number;
  minDrop: number;
  persistAcrossTransitions: boolean;
  onSecondDeathWhileUnreclaimed: 'replace' | 'stack' | 'discardNew';
  respawnInvulnMs: number;
  respawnGraceNoInputMs: number;
  reclaimRadiusPx: number;
  deathAnimDurationMs: number;
  markerVisual: {
    bobAmplitude: number;
    bobPeriodMs: number;
    pulseScale: number;
    pulsePeriodMs: number;
  };
  shadeEnemyTypeId: string;
}

export const DEATH_CONFIG: DeathConfig = deathData as DeathConfig;

/**
 * Death drop record - stored in run state
 */
export interface DeathDropRecord {
  dropId: string;
  amount: number;
  levelId: string;
  roomId: string;
  x: number;
  y: number;
  createdAt: number;
}

/**
 * Generate unique drop ID
 */
export function generateDropId(): string {
  return `drop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate drop amount based on config
 */
export function calculateDropAmount(currentShells: number): number {
  const { dropPercent, minDrop } = DEATH_CONFIG;
  const calculated = Math.floor(currentShells * dropPercent);
  return Math.max(minDrop, Math.min(calculated, currentShells));
}
