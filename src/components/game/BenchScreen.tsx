import { MutableRefObject, useState, useEffect } from 'react';
import gameState from '@/game/core/GameState';
import type { GameScene } from '@/game/scenes/GameScene';
import type { BenchConfig } from '@/game/entities/Bench';

interface Props { 
  gameRef: MutableRefObject<Phaser.Game | null>;
}

interface CharmDisplay {
  id: string;
  name: string;
  description: string;
  slots: number;
  isEquipped: boolean;
  canEquip: boolean;
}

export function BenchScreen({ gameRef }: Props) {
  const [charms, setCharms] = useState<CharmDisplay[]>([]);
  const [usedSlots, setUsedSlots] = useState(0);
  const [maxSlots, setMaxSlots] = useState(2);
  const [benchConfig, setBenchConfig] = useState<BenchConfig | null>(null);
  const [healAmount, setHealAmount] = useState(0);

  // Initialize state
  useEffect(() => {
    updateCharmDisplay();
    
    // Get bench config from scene
    const scene = gameRef.current?.scene.getScene('GameScene') as GameScene;
    if (scene?.getCurrentBenchConfig) {
      const config = scene.getCurrentBenchConfig();
      setBenchConfig(config);
    }
    
    // Calculate heal amount for display
    const playerData = gameState.getPlayerData();
    setHealAmount(playerData.maxHp - playerData.hp);
  }, [gameRef]);

  const updateCharmDisplay = () => {
    const availableCharms = gameState.getAvailableCharms();
    const equipped = gameState.getEquippedCharms();
    const maxCharmSlots = gameState.getMaxCharmSlots();
    
    // Calculate used slots
    const used = equipped.reduce((total, id) => {
      const charm = availableCharms.find(c => c.id === id);
      return total + (charm?.slots || 0);
    }, 0);
    
    setUsedSlots(used);
    setMaxSlots(maxCharmSlots);
    
    // Build charm display list
    const displayList: CharmDisplay[] = availableCharms.map(charm => {
      const isEquipped = equipped.includes(charm.id);
      const canEquip = isEquipped || (used + charm.slots <= maxCharmSlots);
      
      return {
        id: charm.id,
        name: charm.name,
        description: charm.description,
        slots: charm.slots,
        isEquipped,
        canEquip,
      };
    });
    
    setCharms(displayList);
  };

  const toggleCharm = (id: string) => {
    const charm = charms.find(c => c.id === id);
    if (!charm) return;
    
    if (charm.isEquipped) {
      gameState.unequipCharm(id);
    } else if (charm.canEquip) {
      gameState.equipCharm(id);
    }
    
    updateCharmDisplay();
  };

  const leave = () => {
    const scene = gameRef.current?.scene.getScene('GameScene') as GameScene;
    scene?.resumeFromBench();
  };

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        leave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="screen-overlay fade-in pointer-events-auto">
      <div className="max-w-md w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="font-title text-4xl text-foreground mb-2 tracking-wide">
            REST
          </h2>
          <p className="text-primary text-sm">
            {benchConfig?.displayName || 'Resting Bench'}
          </p>
        </div>

        {/* Health Restored Message */}
        {healAmount > 0 && (
          <div className="text-center mb-4 animate-fade-in">
            <span className="text-primary text-lg">
              ♥ Health Restored
            </span>
          </div>
        )}

        {/* Charm Slots Indicator */}
        <div className="flex justify-center items-center gap-2 mb-6">
          <span className="text-muted-foreground text-sm">Charm Slots:</span>
          <div className="flex gap-1">
            {Array.from({ length: maxSlots }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded border-2 transition-colors ${
                  i < usedSlots
                    ? 'bg-primary border-primary'
                    : 'bg-transparent border-muted-foreground/50'
                }`}
              />
            ))}
          </div>
          <span className="text-muted-foreground text-sm">
            {usedSlots}/{maxSlots}
          </span>
        </div>

        {/* Charm Grid */}
        <div className="grid gap-3 mb-8">
          {charms.map(charm => (
            <button
              key={charm.id}
              onClick={() => toggleCharm(charm.id)}
              disabled={!charm.isEquipped && !charm.canEquip}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${charm.isEquipped
                  ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20'
                  : charm.canEquip
                    ? 'bg-card/50 border-border hover:border-primary/50 hover:bg-card/80'
                    : 'bg-card/20 border-border/50 opacity-50 cursor-not-allowed'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary text-lg">◆</span>
                    <span className="font-bold text-foreground">{charm.name}</span>
                    {charm.isEquipped && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        EQUIPPED
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm pl-6">
                    {charm.description}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  {Array.from({ length: charm.slots }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-sm ${
                        charm.isEquipped ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Enemy Respawn Notice */}
        {benchConfig?.enemyRespawnMode !== 'none' && (
          <p className="text-center text-muted-foreground text-xs mb-4">
            ⚠ Enemies will respawn when you leave
          </p>
        )}

        {/* Continue Button */}
        <button
          onClick={leave}
          className="w-full game-button-primary text-lg py-3"
        >
          Continue
        </button>
        
        <p className="text-center text-muted-foreground text-xs mt-3">
          Press ESC to continue
        </p>
      </div>
    </div>
  );
}
