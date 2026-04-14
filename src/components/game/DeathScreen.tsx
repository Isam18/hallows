import { MutableRefObject, useEffect, useState } from 'react';
import type { GameScene } from '@/game/scenes/GameScene';
import gameState from '@/game/core/GameState';

interface Props { 
  gameRef: MutableRefObject<Phaser.Game | null>; 
}

export function DeathScreen({ gameRef }: Props) {
  const [droppedAmount, setDroppedAmount] = useState(0);
  const [showRespawnHint, setShowRespawnHint] = useState(false);
  const [isEndless, setIsEndless] = useState(false);
  const [endlessKills, setEndlessKills] = useState(0);
  const [endlessWave, setEndlessWave] = useState(0);

  useEffect(() => {
    // Get dropped shells amount
    const dropped = gameState.getDroppedShells();
    setDroppedAmount(dropped?.amount || 0);

    // Check endless mode
    const endless = gameRef.current?.registry?.get('endlessMode');
    if (endless) {
      setIsEndless(true);
      setEndlessKills(gameRef.current?.registry?.get('endlessFinalkills') ?? 0);
      setEndlessWave(gameRef.current?.registry?.get('endlessFinalWave') ?? 1);
    }
    
    // Show respawn hint after delay
    const timer = setTimeout(() => setShowRespawnHint(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard respawn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showRespawnHint && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) {
        e.preventDefault();
        respawn();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRespawnHint]);

  const respawn = () => {
    const scene = gameRef.current?.scene.getScene('GameScene') as GameScene;
    scene?.respawnPlayer();
  };

  const giveUp = () => {
    // Clear endless mode
    gameRef.current?.registry?.set('endlessMode', false);
    gameState.resetRun();
    gameRef.current?.scene.stop('GameScene');
    gameRef.current?.scene.start('MenuScene');
  };

  const lastBench = gameState.getLastBench();
  const hasDroppedShells = droppedAmount > 0;

  return (
    <div className="screen-overlay fade-in pointer-events-auto">
      <div className="max-w-md w-full mx-auto text-center">
        {/* Death Title */}
        <h2 className="font-title text-5xl text-destructive mb-4 animate-fade-in">
          {isEndless ? 'SLAUGHTER ENDED' : 'YOU HAVE FALLEN'}
        </h2>

        {/* Endless Stats */}
        {isEndless && (
          <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="inline-flex flex-col items-center gap-2 bg-black/60 border border-red-900/50 rounded-lg px-8 py-4">
              <span className="text-6xl font-bold text-red-100 font-mono">{endlessKills}</span>
              <span className="text-red-400/70 text-sm uppercase tracking-widest">enemies slain</span>
              <span className="text-red-400/50 text-xs">Wave {endlessWave}</span>
            </div>
          </div>
        )}
        
        {/* Dropped Shells Info (normal mode only) */}
        {!isEndless && hasDroppedShells && (
          <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="inline-flex items-center gap-2 bg-card/50 border border-border rounded-lg px-4 py-2">
              <span className="text-primary text-2xl">◆</span>
              <span className="text-foreground">
                <span className="font-bold">{droppedAmount}</span> Shells dropped
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-2">
              Return to reclaim your lost shells
            </p>
          </div>
        )}
        
        {/* Respawn Location */}
        {!isEndless && (
          <p className="text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {lastBench 
              ? `Respawning at last bench...` 
              : 'Respawning at start...'}
          </p>
        )}
        
        {/* Respawn Button */}
        {showRespawnHint && (
          <div className="animate-fade-in space-y-4">
            <div>
              <button 
                onClick={respawn} 
                className="game-button-primary text-lg px-8 py-3 mb-2"
              >
                {isEndless ? 'Try Again' : 'Rise Again'}
              </button>
              <p className="text-muted-foreground text-xs">
                Press SPACE or ENTER to continue
              </p>
            </div>
            <div>
              <button 
                onClick={giveUp} 
                className="text-muted-foreground hover:text-destructive text-sm underline transition-colors"
              >
                {isEndless ? 'Back to Menu' : 'Give Up (Lose All Progress)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
