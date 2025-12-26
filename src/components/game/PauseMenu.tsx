import { MutableRefObject } from 'react';
import gameState from '@/game/core/GameState';
import type { GameScene } from '@/game/scenes/GameScene';

interface Props { gameRef: MutableRefObject<Phaser.Game | null>; }

export function PauseMenu({ gameRef }: Props) {
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

  return (
    <div className="screen-overlay fade-in pointer-events-auto">
      <h2 className="font-title text-4xl text-foreground mb-8">PAUSED</h2>
      <div className="flex flex-col gap-3">
        <button onClick={resume} className="game-button-primary">Resume</button>
        <button onClick={restart} className="game-button">Restart Run</button>
        <button onClick={quit} className="game-button">Quit to Menu</button>
      </div>
    </div>
  );
}
