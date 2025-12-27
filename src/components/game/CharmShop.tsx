import { useState, useEffect } from 'react';
import gameState from '@/game/core/GameState';

interface CharmItem {
  id: string;
  name: string;
  description: string;
  price: number;
  slots: number;
}

interface CharmShopProps {
  onClose: () => void;
}

export function CharmShop({ onClose }: CharmShopProps) {
  const [geo, setGeo] = useState(gameState.getPlayerData().shells);
  const [ownedCharms, setOwnedCharms] = useState<string[]>(gameState.getOwnedCharms());
  const [shopCharms, setShopCharms] = useState<CharmItem[]>([]);

  useEffect(() => {
    // Get shop charms
    const charms = gameState.getShopCharms().map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      price: (c as any).price || 0,
      slots: c.slots,
    }));
    setShopCharms(charms);

    // Listen for changes
    const unsubShells = gameState.on('shellsChange', (shells) => setGeo(shells));
    const unsubPurchase = gameState.on('charmPurchased', () => {
      setOwnedCharms(gameState.getOwnedCharms());
    });

    return () => {
      unsubShells();
      unsubPurchase();
    };
  }, []);

  const handleBuy = (charmId: string) => {
    if (gameState.buyCharm(charmId)) {
      setOwnedCharms(gameState.getOwnedCharms());
      setGeo(gameState.getPlayerData().shells);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-background/95 border-2 border-primary/50 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="font-title text-2xl text-primary mb-1">CHARM SHOP</h2>
          <p className="text-foreground/60 text-sm">Purchase powerful abilities</p>
        </div>

        {/* Geo Balance */}
        <div className="flex items-center justify-center gap-2 mb-6 bg-muted/30 rounded-lg py-2">
          <span className="text-yellow-400 text-lg">◆</span>
          <span className="text-foreground font-bold text-xl">{geo}</span>
          <span className="text-foreground/60 text-sm">Geo</span>
        </div>

        {/* Charm List */}
        <div className="space-y-3 mb-6">
          {shopCharms.map((charm) => {
            const owned = ownedCharms.includes(charm.id);
            const canAfford = geo >= charm.price;

            return (
              <div
                key={charm.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  owned
                    ? 'bg-primary/20 border-primary/50'
                    : canAfford
                    ? 'bg-muted/20 border-muted hover:border-primary/50'
                    : 'bg-muted/10 border-muted/30 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-foreground">{charm.name}</h3>
                    <p className="text-sm text-foreground/60">{charm.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-400">
                      <span>◆</span>
                      <span className="font-bold">{charm.price}</span>
                    </div>
                    <span className="text-xs text-foreground/40">{charm.slots} slot{charm.slots > 1 ? 's' : ''}</span>
                  </div>
                </div>
                
                {owned ? (
                  <div className="text-center py-1 text-primary font-bold text-sm">
                    ✓ OWNED
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(charm.id)}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded font-bold text-sm transition-all ${
                      canAfford
                        ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                        : 'bg-muted/30 text-foreground/30 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'PURCHASE' : 'NOT ENOUGH GEO'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-muted/30 border border-muted rounded-lg text-foreground hover:bg-muted/50 transition-all font-bold"
        >
          CLOSE SHOP
        </button>
      </div>
    </div>
  );
}
