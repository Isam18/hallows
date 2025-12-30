import { useEffect, useRef, useState, useCallback } from 'react';
import { createGame } from '@/game';
import gameState from '@/game/core/GameState';
import { GameHUD } from '@/components/game/GameHUD';
import { PauseMenu } from '@/components/game/PauseMenu';
import { DeathScreen } from '@/components/game/DeathScreen';
import { BenchScreen } from '@/components/game/BenchScreen';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import { DebugOverlay } from '@/components/game/DebugOverlay';
import { CombatDebugOverlay } from '@/components/game/CombatDebugOverlay';
import { CharmShop } from '@/components/game/CharmShop';
import { ClimbingOverlay } from '@/components/game/ClimbingOverlay';
import { ToBeContinued } from '@/components/game/ToBeContinued';
import { GreenDoorDialog } from '@/components/game/GreenDoorDialog';
import { TheMedullaDialog } from '@/components/game/TheMedullaDialog';
import { ZoneTransition } from '@/components/game/ZoneTransition';

const Index = () => {
  const gameContainer = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameLoaded, setGameLoaded] = useState(false);
  const [uiState, setUiState] = useState<string>('menu');
  const [playerData, setPlayerData] = useState(gameState.getPlayerData());
  const [soul, setSoul] = useState(gameState.getSoul());
  
  // Additional UI states
  const [showShop, setShowShop] = useState(false);
  const [showClimbing, setShowClimbing] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const [showGreenwayDialog, setShowGreenwayDialog] = useState(false);
  const [showTheMedullaDialog, setShowTheMedullaDialog] = useState(false);
  const [showZoneTransition, setShowZoneTransition] = useState(false);
  const [transitionZone, setTransitionZone] = useState('');

  // Handle victory continue - transition to chain room
  const handleVictoryContinue = useCallback(() => {
    gameState.setBossDefeated(true);
    gameState.setState('playing');
    
    // Get the game scene and transition to chain room
    const gameScene = gameRef.current?.scene.getScene('GameScene') as any;
    if (gameScene) {
      gameScene.transitionToLevel?.('chainRoom', 'fromBoss');
    }
  }, []);

  // Handle shop close
  const handleShopClose = useCallback(() => {
    setShowShop(false);
    gameState.setState('playing');
  }, []);

  // Handle climbing complete
  const handleClimbingComplete = useCallback(() => {
    setShowClimbing(false);
    gameState.setState('playing');
  }, []);

  // Handle ending - return to shop or main menu
  const handleEndingStay = useCallback(() => {
    setShowEnding(false);
    gameState.setState('playing');
  }, []);

  const handleEndingMainMenu = useCallback(() => {
    setShowEnding(false);
    gameState.resetRun();
    gameRef.current?.scene.stop('GameScene');
    gameRef.current?.scene.start('MenuScene');
  }, []);

  // Handle Greenway door dialog
  const handleGreenwayDialogNo = useCallback(() => {
    setShowGreenwayDialog(false);
    gameState.setState('playing');
  }, []);

  const handleGreenwayDialogYes = useCallback(() => {
    setShowGreenwayDialog(false);
    setTransitionZone('GREENWAY');
    setShowZoneTransition(true);
  }, []);

  // Handle zone transition complete
  const handleZoneTransitionComplete = useCallback(() => {
    setShowZoneTransition(false);
    gameState.setState('playing');
    
    // Get the game scene and transition to greenway
    const gameScene = gameRef.current?.scene.getScene('GameScene') as any;
    if (gameScene) {
      gameScene.transitionToGreenway?.();
    }
  }, []);

  // Handle The Medulla door dialog
  const handleTheMedullaDialogNo = useCallback(() => {
    setShowTheMedullaDialog(false);
    gameState.setState('playing');
  }, []);

  const handleTheMedullaDialogYes = useCallback(() => {
    setShowTheMedullaDialog(false);
    setTransitionZone('THE MEDULLA');
    setShowZoneTransition(true);
  }, []);

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
      const unsubSoul = gameState.on('soulChange', (newSoul: number) => setSoul(newSoul));

      // Poll for UI events from game scene
      const pollInterval = setInterval(() => {
        const lastEvent = gameRef.current?.registry.get('lastUIEvent');
        if (lastEvent) {
          const { event, timestamp } = lastEvent;
          
          // Only process recent events (within 100ms)
          if (Date.now() - timestamp < 100) {
            if (event === 'openShop') {
              setShowShop(true);
              gameState.setState('bench'); // Pause gameplay
            } else if (event === 'climbChain') {
              setShowClimbing(true);
              gameState.setState('bench');
            } else if (event === 'showEnding') {
              setShowEnding(true);
              gameState.setState('bench');
            } else if (event === 'showGreenwayDialog') {
              setShowGreenwayDialog(true);
              gameState.setState('bench');
            } else if (event === 'showTheMedullaDialog') {
              setShowTheMedullaDialog(true);
              gameState.setState('bench');
            }
            // Clear the event
            gameRef.current?.registry.set('lastUIEvent', null);
          }
        }
      }, 50);

      return () => {
        unsubState();
        unsubHp();
        unsubShells();
        unsubSoul();
        clearInterval(pollInterval);
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
          {uiState === 'bench' && !showShop && !showClimbing && !showEnding && !showGreenwayDialog && !showTheMedullaDialog && <BenchScreen gameRef={gameRef} />}
          {uiState === 'victory' && <VictoryScreen onContinue={handleVictoryContinue} />}
        </div>
      )}

      {/* Special UI Overlays */}
      {showShop && <CharmShop onClose={handleShopClose} />}
      {showClimbing && <ClimbingOverlay onComplete={handleClimbingComplete} />}
      {showEnding && <ToBeContinued onMainMenu={handleEndingMainMenu} onStay={handleEndingStay} />}
      {showGreenwayDialog && <GreenDoorDialog onYes={handleGreenwayDialogYes} onNo={handleGreenwayDialogNo} />}
      {showTheMedullaDialog && <TheMedullaDialog onYes={handleTheMedullaDialogYes} onNo={handleTheMedullaDialogNo} />}
      {showZoneTransition && <ZoneTransition zoneName={transitionZone} onComplete={handleZoneTransitionComplete} />}
    </div>
  );
};

export default Index;
