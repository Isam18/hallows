import { MutableRefObject } from 'react';
import type { GameScene } from '@/game/scenes/GameScene';

interface Props { gameRef: MutableRefObject<Phaser.Game | null>; }

export function DeathScreen({ gameRef }: Props) {
  const respawn = () => {
    const scene = gameRef.current?.scene.getScene('GameScene') as GameScene;
    scene?.respawnPlayer();
  };

  return (
    <div className="screen-overlay fade-in pointer-events-auto">
      <h2 className="font-title text-4xl text-destructive mb-4">YOU HAVE FALLEN</h2>
      <p className="text-muted-foreground mb-8">Your shells remain where you fell...</p>
      <button onClick={respawn} className="game-button-primary">Rise Again</button>
    </div>
  );
}
