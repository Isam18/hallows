// Stub for audio system - to be implemented
export interface SoundConfig {
  key: string;
  volume?: number;
  loop?: boolean;
}

class AudioManager {
  private musicVolume = 0.5;
  private sfxVolume = 0.7;
  private muted = false;
  
  // Stubs for future implementation
  playMusic(key: string, fadeIn = true): void {
    console.log(`[Audio] Play music: ${key}, fadeIn: ${fadeIn}`);
  }
  
  stopMusic(fadeOut = true): void {
    console.log(`[Audio] Stop music, fadeOut: ${fadeOut}`);
  }
  
  playSfx(key: string, volume = 1): void {
    console.log(`[Audio] Play SFX: ${key}, volume: ${volume}`);
  }
  
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
  }
  
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }
  
  setMuted(muted: boolean): void {
    this.muted = muted;
  }
  
  isMuted(): boolean {
    return this.muted;
  }
}

export const audioManager = new AudioManager();
export default audioManager;
