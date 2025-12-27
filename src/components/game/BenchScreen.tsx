import { MutableRefObject, useState, useEffect } from 'react';
import gameState from '@/game/core/GameState';
import type { GameScene } from '@/game/scenes/GameScene';
import type { BenchConfig } from '@/game/entities/Bench';
import charmsData from '@/game/data/charms.json';

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
  isOwned: boolean;
  price: number;
}

type TabType = 'equip' | 'shop';

export function BenchScreen({ gameRef }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('equip');
  const [charms, setCharms] = useState<CharmDisplay[]>([]);
  const [shopCharms, setShopCharms] = useState<CharmDisplay[]>([]);
  const [usedSlots, setUsedSlots] = useState(0);
  const [maxSlots, setMaxSlots] = useState(2);
  const [benchConfig, setBenchConfig] = useState<BenchConfig | null>(null);
  const [healAmount, setHealAmount] = useState(0);
  const [geo, setGeo] = useState(gameState.getPlayerData().shells);

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
    
    // Subscribe to geo changes
    const unsubShells = gameState.on('shellsChange', () => {
      setGeo(gameState.getPlayerData().shells);
      updateCharmDisplay();
    });
    
    return () => unsubShells();
  }, [gameRef]);

  const updateCharmDisplay = () => {
    const availableCharms = gameState.getAvailableCharms();
    const equipped = gameState.getEquippedCharms();
    const maxCharmSlots = gameState.getMaxCharmSlots();
    const ownedCharms = gameState.getOwnedCharms();
    const currentGeo = gameState.getPlayerData().shells;
    
    // Calculate used slots
    const used = equipped.reduce((total, id) => {
      const charm = availableCharms.find(c => c.id === id);
      return total + (charm?.slots || 0);
    }, 0);
    
    setUsedSlots(used);
    setMaxSlots(maxCharmSlots);
    
    // Equip tab - only show owned charms
    const ownedList: CharmDisplay[] = availableCharms
      .filter(charm => ownedCharms.includes(charm.id) || (charmsData.charms.find(c => c.id === charm.id)?.price === 0))
      .map(charm => {
        const isEquipped = equipped.includes(charm.id);
        const canEquip = isEquipped || (used + charm.slots <= maxCharmSlots);
        
        return {
          id: charm.id,
          name: charm.name,
          description: charm.description,
          slots: charm.slots,
          isEquipped,
          canEquip,
          isOwned: true,
          price: 0,
        };
      });
    
    setCharms(ownedList);
    
    // Get bench zone to determine which shop charms to show
    const scene = gameRef.current?.scene.getScene('GameScene') as GameScene;
    const config = scene?.getCurrentBenchConfig?.();
    const benchZone = (config as any)?.zone || 'crossroads';
    
    // Shop tab - show charms not yet owned based on zone
    const shopCharmsForZone = benchZone === 'greenway' 
      ? (charmsData as any).greenwayCharms || []
      : (charmsData as any).shopCharms || [];
    
    const shopList: CharmDisplay[] = (charmsData.charms as any[])
      .filter(charm => shopCharmsForZone.includes(charm.id) && !ownedCharms.includes(charm.id))
      .map(charm => ({
        id: charm.id,
        name: charm.name,
        description: charm.description,
        slots: charm.slots,
        isEquipped: false,
        canEquip: false,
        isOwned: false,
        price: charm.price,
      }));
    
    setShopCharms(shopList);
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

  const buyCharm = (id: string) => {
    if (gameState.buyCharm(id)) {
      updateCharmDisplay();
    }
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

  const hasShop = (benchConfig as any)?.hasShop || shopCharms.length > 0;

  return (
    <div className="screen-overlay fade-in pointer-events-auto">
      <div className="max-w-lg w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="font-title text-4xl text-foreground mb-2 tracking-wide">
            REST
          </h2>
          <p className="text-primary text-sm">
            {benchConfig?.displayName || 'Resting Bench'}
          </p>
        </div>

        {/* Health Restored Message */}
        {healAmount > 0 && (
          <div className="text-center mb-3 animate-fade-in">
            <span className="text-primary text-lg">
              ♥ Health Restored
            </span>
          </div>
        )}

        {/* Geo Display (for shop) */}
        {hasShop && (
          <div className="flex justify-center items-center gap-2 mb-3">
            <span className="text-yellow-400 text-lg">◆</span>
            <span className="text-yellow-400 font-bold">{geo}</span>
            <span className="text-muted-foreground text-sm">Geo</span>
          </div>
        )}

        {/* Tab Navigation */}
        {hasShop && (
          <div className="flex gap-2 mb-4 justify-center">
            <button
              onClick={() => setActiveTab('equip')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'equip'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              Equip Charms
            </button>
            <button
              onClick={() => setActiveTab('shop')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'shop'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              Shop {shopCharms.length > 0 && `(${shopCharms.length})`}
            </button>
          </div>
        )}

        {/* Charm Slots Indicator (Equip Tab) */}
        {activeTab === 'equip' && (
          <div className="flex justify-center items-center gap-2 mb-4">
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
        )}

        {/* Equip Tab Content */}
        {activeTab === 'equip' && (
          <div className="grid gap-2 mb-6 max-h-64 overflow-y-auto">
            {charms.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No charms owned yet. Visit a shop to purchase charms!
              </p>
            ) : (
              charms.map(charm => (
                <button
                  key={charm.id}
                  onClick={() => toggleCharm(charm.id)}
                  disabled={!charm.isEquipped && !charm.canEquip}
                  className={`
                    w-full p-3 rounded-lg border-2 text-left transition-all
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
              ))
            )}
          </div>
        )}

        {/* Shop Tab Content */}
        {activeTab === 'shop' && (
          <div className="grid gap-2 mb-6 max-h-64 overflow-y-auto">
            {shopCharms.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                All charms purchased! Check the Equip tab.
              </p>
            ) : (
              shopCharms.map(charm => {
                const canAfford = geo >= charm.price;
                return (
                  <button
                    key={charm.id}
                    onClick={() => buyCharm(charm.id)}
                    disabled={!canAfford}
                    className={`
                      w-full p-3 rounded-lg border-2 text-left transition-all
                      ${canAfford
                        ? 'bg-card/50 border-yellow-500/50 hover:border-yellow-500 hover:bg-card/80'
                        : 'bg-card/20 border-border/50 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-yellow-400 text-lg">◆</span>
                          <span className="font-bold text-foreground">{charm.name}</span>
                          <span className={`text-sm font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                            {charm.price} Geo
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm pl-6">
                          {charm.description}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        {Array.from({ length: charm.slots }).map((_, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 rounded-sm bg-muted-foreground/30"
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Enemy Respawn Notice */}
        {benchConfig?.enemyRespawnMode !== 'none' && (
          <p className="text-center text-muted-foreground text-xs mb-3">
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
        
        <p className="text-center text-muted-foreground text-xs mt-2">
          Press ESC to continue
        </p>
      </div>
    </div>
  );
}