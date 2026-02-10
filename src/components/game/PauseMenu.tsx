import { MutableRefObject } from 'react';
import gameState from '@/game/core/GameState';
import type { GameScene } from '@/game/scenes/GameScene';

interface Props { gameRef: MutableRefObject<Phaser.Game | null>; }

export function PauseMenu({ gameRef }: Props) {
  const debugMode = gameRef.current?.registry?.get('debugMode') ?? false;

  const resume = () => {
    const scene = gameRef.current?.scene.getScene('GameScene') as GameScene;
    scene?.resumeFromPause();
  };
  const restart = () => {
    gameState.resetRun();
    gameRef.current?.scene.stop('GameScene');
    gameRef.current?.scene.start('GameScene', { levelId: 'fadingTown', spawnId: 'default' });
  };
  const quit = () => {
    gameRef.current?.scene.stop('GameScene');
    gameRef.current?.scene.start('MenuScene');
  };

  const handleTeleport = (roomId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scene = gameRef.current?.scene.getScene('GameScene') as any;
    scene?.teleportToLevel?.(roomId);
  };

  return (
    <div className="screen-overlay fade-in pointer-events-auto">
      <h2 className="font-title text-4xl text-foreground mb-8">PAUSED</h2>
      <div className="flex flex-col gap-3">
        <button onClick={resume} className="game-button-primary">Resume</button>
        <button onClick={restart} className="game-button">Restart Run</button>
        <button onClick={quit} className="game-button">Quit to Menu</button>
      </div>

      {debugMode && (
        <div className="mt-6 pt-4 border-t border-border/50">
          <h3 className="text-sm font-mono text-muted-foreground mb-3">DEBUG TELEPORT</h3>
          <div className="grid grid-cols-2 gap-1.5 max-w-md">
            <button onClick={() => handleTeleport('medullaRoom1')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 1: Rib-Gate</button>
            <button onClick={() => handleTeleport('medullaRoom3')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 3: Marrow-Tap</button>
            <button onClick={() => handleTeleport('medullaRoom5')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 5: Vent</button>
            <button onClick={() => handleTeleport('medullaRoom7')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 7: Ossuary Gate</button>
            <button onClick={() => handleTeleport('medullaRoom8')} className="px-2 py-1 text-xs bg-accent/20 hover:bg-accent/40 border border-accent/30 rounded transition-colors">Room 8: Tyrant</button>
            <button onClick={() => handleTeleport('medullaRoom11')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 11: Incubation</button>
            <button onClick={() => handleTeleport('medullaRoom14')} className="px-2 py-1 text-xs bg-accent/20 hover:bg-accent/40 border border-accent/30 rounded transition-colors">Room 14: Rematch</button>
            <button onClick={() => handleTeleport('medullaRoom17')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 17: Ribs</button>
            <button onClick={() => handleTeleport('medullaRoom20')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 20: Sniping</button>
            <button onClick={() => handleTeleport('medullaRoom23')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 23: Trinity</button>
            <button onClick={() => handleTeleport('medullaRoom25')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 25: Stomach</button>
            <button onClick={() => handleTeleport('medullaRoom27')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 27: Teeth</button>
            <button onClick={() => handleTeleport('medullaRoom29')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors">Room 29: Lip</button>
            <button onClick={() => handleTeleport('medullaRoom31')} className="px-2 py-1 text-xs bg-accent/20 hover:bg-accent/40 border border-accent/30 rounded transition-colors">Room 31: Final</button>
            <button onClick={() => handleTeleport('medullaRoom32')} className="px-2 py-1 text-xs bg-accent/20 hover:bg-accent/40 border border-accent/30 rounded transition-colors">Room 32: Boss</button>
            <button onClick={() => handleTeleport('skullRavagerArena')} className="px-2 py-1 text-xs bg-destructive/20 hover:bg-destructive/40 border border-destructive/30 rounded transition-colors font-bold">⚔️ Burning Mauler</button>
            <button onClick={() => handleTeleport('mossTitanArena')} className="px-2 py-1 text-xs bg-accent/20 hover:bg-accent/40 border border-accent/30 rounded transition-colors">Moss Titan Arena</button>
          </div>
        </div>
      )}
    </div>
  );
}
