import { useEffect, useState } from 'react';

interface CombatDebugState {
  playerAttacking: boolean;
  playerHitbox: { x: number; y: number; width: number; height: number } | null;
  enemies: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    state: string;
    hp: number;
    maxHp: number;
    invuln: boolean;
  }>;
}

interface CombatDebugOverlayProps {
  gameRef: Phaser.Game | null;
}

export const CombatDebugOverlay = ({ gameRef }: CombatDebugOverlayProps) => {
  const [visible, setVisible] = useState(false);
  const [debugState, setDebugState] = useState<CombatDebugState | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F2') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!visible || !gameRef) return;

    const interval = setInterval(() => {
      const scene = gameRef.scene.getScene('GameScene') as any;
      if (scene?.player) {
        const hitbox = scene.player.getAttackHitbox?.();
        const enemyData: CombatDebugState['enemies'] = [];
        
        scene.enemies?.getChildren().forEach((enemy: any, i: number) => {
          if (enemy.active) {
            enemyData.push({
              id: `enemy_${i}`,
              name: enemy.getDisplayName?.() || 'Unknown',
              x: Math.round(enemy.x),
              y: Math.round(enemy.y),
              state: enemy.getAIState?.() || 'unknown',
              hp: enemy.getCurrentHp?.() || 0,
              maxHp: enemy.getMaxHp?.() || 1,
              invuln: enemy.isInvulnerable?.() || false,
            });
          }
        });
        
        setDebugState({
          playerAttacking: scene.player.isAttacking || false,
          playerHitbox: hitbox ? {
            x: Math.round(hitbox.x),
            y: Math.round(hitbox.y),
            width: Math.round(hitbox.width),
            height: Math.round(hitbox.height),
          } : null,
          enemies: enemyData,
        });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [visible, gameRef]);

  if (!visible) return null;

  const getStateColor = (state: string) => {
    switch (state) {
      case 'patrol': return 'bg-green-500';
      case 'aggro': return 'bg-red-500';
      case 'hurt': return 'bg-yellow-500';
      case 'dead': return 'bg-muted';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 font-mono text-sm z-50 min-w-[260px] shadow-lg">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <span className="text-muted-foreground text-xs">Combat Debug [F2]</span>
        <span className={`text-xs px-2 py-0.5 rounded ${debugState?.playerAttacking ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'}`}>
          {debugState?.playerAttacking ? 'ATTACKING' : 'idle'}
        </span>
      </div>

      {/* Player Attack Hitbox */}
      {debugState?.playerHitbox && (
        <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-xs">
          <div className="text-red-400 font-bold mb-1">Attack Hitbox</div>
          <div className="grid grid-cols-2 gap-1 text-muted-foreground">
            <span>X: {debugState.playerHitbox.x}</span>
            <span>Y: {debugState.playerHitbox.y}</span>
            <span>W: {debugState.playerHitbox.width}</span>
            <span>H: {debugState.playerHitbox.height}</span>
          </div>
        </div>
      )}

      {/* Enemies */}
      <div className="text-xs text-muted-foreground mb-2">
        Enemies ({debugState?.enemies.length || 0})
      </div>
      
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {debugState?.enemies.map(enemy => (
          <div 
            key={enemy.id} 
            className={`p-2 bg-background/30 rounded border-l-2 ${enemy.invuln ? 'border-yellow-500' : 'border-transparent'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-foreground">{enemy.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded text-white ${getStateColor(enemy.state)}`}>
                {enemy.state}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                />
              </div>
              <span className="text-muted-foreground">{enemy.hp}/{enemy.maxHp}</span>
            </div>
            <div className="text-muted-foreground mt-1">
              Pos: ({enemy.x}, {enemy.y})
              {enemy.invuln && <span className="text-yellow-500 ml-2">INVULN</span>}
            </div>
          </div>
        ))}
        
        {(!debugState?.enemies || debugState.enemies.length === 0) && (
          <div className="text-muted-foreground text-center py-2">
            No enemies
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground text-center">
        Press F2 to toggle
      </div>
    </div>
  );
};
