// Stub for save/load system
import { PlayerData } from './GameConfig';

interface SaveData {
  playerData: PlayerData;
  unlockedCharms: string[];
  defeatedBosses: string[];
  discoveredAreas: string[];
  timestamp: number;
}

class SaveManager {
  private readonly SAVE_KEY = 'hallow_nest_save';
  
  save(data: Partial<SaveData>): boolean {
    try {
      const existing = this.load();
      const saveData: SaveData = {
        playerData: data.playerData || existing?.playerData || {
          hp: 5,
          maxHp: 5,
          shells: 0,
          equippedCharms: [],
          lastBench: null,
          droppedShells: null,
        },
        unlockedCharms: data.unlockedCharms || existing?.unlockedCharms || [],
        defeatedBosses: data.defeatedBosses || existing?.defeatedBosses || [],
        discoveredAreas: data.discoveredAreas || existing?.discoveredAreas || [],
        timestamp: Date.now(),
      };
      
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
      console.log('[Save] Game saved');
      return true;
    } catch (e) {
      console.error('[Save] Failed to save:', e);
      return false;
    }
  }
  
  load(): SaveData | null {
    try {
      const data = localStorage.getItem(this.SAVE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('[Save] Failed to load:', e);
    }
    return null;
  }
  
  hasSave(): boolean {
    return this.load() !== null;
  }
  
  deleteSave(): void {
    localStorage.removeItem(this.SAVE_KEY);
    console.log('[Save] Save deleted');
  }
}

export const saveManager = new SaveManager();
export default saveManager;
