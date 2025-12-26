// Global game state management
import { PlayerData, GameState, CharmData } from './GameConfig';
import charmsData from '../data/charms.json';

class GameStateManager {
  private state: GameState = 'menu';
  private playerData: PlayerData = {
    hp: 5,
    maxHp: 5,
    shells: 0,
    equippedCharms: [],
    lastBench: null,
    droppedShells: null,
  };
  
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private debugMode = false;
  
  // State getters
  getState(): GameState {
    return this.state;
  }
  
  getPlayerData(): PlayerData {
    return { ...this.playerData };
  }
  
  isDebugMode(): boolean {
    return this.debugMode;
  }
  
  // State setters
  setState(newState: GameState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('stateChange', { oldState, newState });
  }
  
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.emit('debugModeChange', enabled);
  }
  
  // Player data operations
  setHp(hp: number): void {
    const clampedHp = Math.max(0, Math.min(hp, this.playerData.maxHp));
    this.playerData.hp = clampedHp;
    this.emit('hpChange', clampedHp);
    
    if (clampedHp <= 0) {
      this.handleDeath();
    }
  }
  
  damage(amount: number): void {
    this.setHp(this.playerData.hp - amount);
    this.emit('playerDamaged', amount);
  }
  
  heal(amount: number): void {
    this.setHp(this.playerData.hp + amount);
    this.emit('playerHealed', amount);
  }
  
  fullHeal(): void {
    this.setHp(this.playerData.maxHp);
  }
  
  addShells(amount: number): void {
    this.playerData.shells += amount;
    this.emit('shellsChange', this.playerData.shells);
  }
  
  setShells(amount: number): void {
    this.playerData.shells = amount;
    this.emit('shellsChange', this.playerData.shells);
  }
  
  // Bench/checkpoint
  setLastBench(levelId: string, spawnId: string): void {
    this.playerData.lastBench = { levelId, spawnId };
    this.fullHeal();
    this.emit('benchActivated', this.playerData.lastBench);
  }
  
  getLastBench(): { levelId: string; spawnId: string } | null {
    return this.playerData.lastBench;
  }
  
  // Death/recovery
  handleDeath(): void {
    // Drop shells at death location (set by game scene)
    this.setState('death');
    this.emit('playerDied', null);
  }
  
  dropShells(levelId: string, x: number, y: number): void {
    if (this.playerData.shells > 0) {
      this.playerData.droppedShells = {
        levelId,
        x,
        y,
        amount: this.playerData.shells,
      };
      this.playerData.shells = 0;
      this.emit('shellsDropped', this.playerData.droppedShells);
    }
  }
  
  recoverShells(): number {
    if (this.playerData.droppedShells) {
      const amount = this.playerData.droppedShells.amount;
      this.addShells(amount);
      this.playerData.droppedShells = null;
      this.emit('shellsRecovered', amount);
      return amount;
    }
    return 0;
  }
  
  getDroppedShells(): PlayerData['droppedShells'] {
    return this.playerData.droppedShells;
  }
  
  // Charms
  getEquippedCharms(): string[] {
    return [...this.playerData.equippedCharms];
  }
  
  getAvailableCharms(): CharmData[] {
    return charmsData.charms;
  }
  
  getMaxCharmSlots(): number {
    return charmsData.maxSlots;
  }
  
  equipCharm(charmId: string): boolean {
    const charm = charmsData.charms.find(c => c.id === charmId);
    if (!charm) return false;
    
    const currentSlots = this.getUsedSlots();
    if (currentSlots + charm.slots > charmsData.maxSlots) return false;
    
    if (!this.playerData.equippedCharms.includes(charmId)) {
      this.playerData.equippedCharms.push(charmId);
      this.applyCharmEffects();
      this.emit('charmEquipped', charmId);
      return true;
    }
    return false;
  }
  
  unequipCharm(charmId: string): boolean {
    const index = this.playerData.equippedCharms.indexOf(charmId);
    if (index !== -1) {
      this.playerData.equippedCharms.splice(index, 1);
      this.applyCharmEffects();
      this.emit('charmUnequipped', charmId);
      return true;
    }
    return false;
  }
  
  private getUsedSlots(): number {
    return this.playerData.equippedCharms.reduce((total, id) => {
      const charm = charmsData.charms.find(c => c.id === id);
      return total + (charm?.slots || 0);
    }, 0);
  }
  
  private applyCharmEffects(): void {
    // Reset to base values
    let maxHp = 5;
    
    // Apply charm effects
    for (const charmId of this.playerData.equippedCharms) {
      const charm = charmsData.charms.find(c => c.id === charmId);
      if (charm?.effect.type === 'maxHpMod') {
        maxHp += charm.effect.value;
      }
    }
    
    this.playerData.maxHp = maxHp;
    if (this.playerData.hp > maxHp) {
      this.playerData.hp = maxHp;
    }
    
    this.emit('charmsApplied', this.playerData.equippedCharms);
  }
  
  getCharmModifier(type: string): number {
    let modifier = type === 'damageMod' ? 0 : 1;
    
    for (const charmId of this.playerData.equippedCharms) {
      const charm = charmsData.charms.find(c => c.id === charmId);
      if (charm?.effect.type === type) {
        if (type === 'damageMod') {
          modifier += charm.effect.value;
        } else {
          modifier *= charm.effect.value;
        }
      }
    }
    
    return modifier;
  }
  
  // Reset for new run
  resetRun(): void {
    this.playerData = {
      hp: 5,
      maxHp: 5,
      shells: 0,
      equippedCharms: [],
      lastBench: null,
      droppedShells: null,
    };
    this.emit('runReset', null);
  }
  
  // Event system
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
  
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

export const gameState = new GameStateManager();
export default gameState;
