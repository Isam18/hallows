import { MutableRefObject } from 'react';
import gameState from '@/game/core/GameState';
import type { GameScene } from '@/game/scenes/GameScene';

interface Props { gameRef: MutableRefObject<Phaser.Game | null>; }

export function BenchScreen({ gameRef }: Props) {
  const charms = gameState.getAvailableCharms();
  const equipped = gameState.getEquippedCharms();

  const toggleCharm = (id: string) => {
    if (equipped.includes(id)) gameState.unequipCharm(id);
    else gameState.equipCharm(id);
  };
  const leave = () => {
    const scene = gameRef.current?.scene.getScene('GameScene') as GameScene;
    scene?.resumeFromBench();
  };

  return (
    <div className="screen-overlay fade-in pointer-events-auto">
      <h2 className="font-title text-3xl text-foreground mb-2">REST</h2>
      <p className="text-muted-foreground mb-6">Health restored. Equip charms below.</p>
      <div className="flex gap-4 mb-8">
        {charms.map(c => (
          <button key={c.id} onClick={() => toggleCharm(c.id)}
            className={`charm-slot flex-col text-xs ${equipped.includes(c.id) ? 'charm-slot-equipped' : ''}`}>
            <span className="text-lg">◆</span>
            <span>{c.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
      <button onClick={leave} className="game-button-primary">Continue</button>
    </div>
  );
}
