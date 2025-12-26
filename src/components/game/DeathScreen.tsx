import { MutableRefObject, useEffect, useState } from 'react';
import type { GameScene } from '@/game/scenes/GameScene';
import gameState from '@/game/core/GameState';

interface Props { 
  gameRef: MutableRefObject<Phaser.Game | null>; 
}

export function DeathScreen({ gameRef }: Props) {
  const [droppedAmount, setDroppedAmount] = useState(0);
  const [showRespawnHint, setShowRespawnHint] = useState(false);

  useEffect(() => {
    // Get dropped shells amount
    const dropped = gameState.getDroppedShells();
    setDroppedAmount(dropped?.amount || 0);
    
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

  const lastBench = gameState.getLastBench();
  const hasDroppedShells = droppedAmount > 0;

  return (
    <div className="screen-overlay fade-in pointer-events-auto">
      <div className="max-w-md w-full mx-auto text-center">
        {/* Death Title */}
        <h2 className="font-title text-5xl text-destructive mb-4 animate-fade-in">
          YOU HAVE FALLEN
        </h2>
        
        {/* Dropped Shells Info */}
        {hasDroppedShells && (
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
        <p className="text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {lastBench 
            ? `Respawning at last bench...` 
            : 'Respawning at start...'}
        </p>
        
        {/* Respawn Button */}
        {showRespawnHint && (
          <div className="animate-fade-in">
            <button 
              onClick={respawn} 
              className="game-button-primary text-lg px-8 py-3 mb-4"
            >
              Rise Again
            </button>
            <p className="text-muted-foreground text-xs">
              Press SPACE or ENTER to continue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
