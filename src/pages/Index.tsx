import { useEffect, useRef, useState } from 'react';
import { createGame } from '@/game';
import gameState from '@/game/core/GameState';
import { GameHUD } from '@/components/game/GameHUD';
import { PauseMenu } from '@/components/game/PauseMenu';
import { DeathScreen } from '@/components/game/DeathScreen';
import { BenchScreen } from '@/components/game/BenchScreen';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import { DebugOverlay } from '@/components/game/DebugOverlay';
import { CombatDebugOverlay } from '@/components/game/CombatDebugOverlay';

const Index = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameLoaded, setGameLoaded] = useState(false);
  const [uiState, setUiState] = useState<string>('menu');
  const [playerData, setPlayerData] = useState(gameState.getPlayerData());

  useEffect(() => {
    if (gameContainer.current && !gameRef.current) {
      gameRef.current = createGame(gameContainer.current);
      setGameLoaded(true);

      // Listen for state changes
      const unsubState = gameState.on('stateChange', ({ newState }) => {
        setUiState(newState);
      });
      const unsubHp = gameState.on('hpChange', () => setPlayerData(gameState.getPlayerData()));
      const unsubShells = gameState.on('shellsChange', () => setPlayerData(gameState.getPlayerData()));

      return () => {
        unsubState();
        unsubHp();
        unsubShells();
        gameRef.current?.destroy(true);
        gameRef.current = null;
      };
    }
  }, []);

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {/* Game Canvas */}
      <div ref={gameContainer} className="absolute inset-0 flex items-center justify-center" />

      {/* Debug Overlays - F1 for movement, F2 for combat */}
      {gameLoaded && <DebugOverlay gameRef={gameRef.current} />}
      {gameLoaded && <CombatDebugOverlay gameRef={gameRef.current} />}

      {/* UI Overlay */}
      {gameLoaded && uiState !== 'menu' && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {(uiState === 'playing' || uiState === 'boss') && (
            <GameHUD hp={playerData.hp} maxHp={playerData.maxHp} shells={playerData.shells} />
          )}
          {uiState === 'paused' && <PauseMenu gameRef={gameRef} />}
          {uiState === 'death' && <DeathScreen gameRef={gameRef} />}
          {uiState === 'bench' && <BenchScreen gameRef={gameRef} />}
          {uiState === 'victory' && <VictoryScreen />}
        </div>
      )}
    </div>
  );
};

export default Index;
