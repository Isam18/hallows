import Phaser from 'phaser';
import { GAME_CONFIG } from './core/GameConfig';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

export function createGame(container: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
    parent: container,
    backgroundColor: '#0a0c12',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: GAME_CONFIG.gravity },
        debug: GAME_CONFIG.debug,
      },
    },
    scene: [BootScene, MenuScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      pixelArt: true,
      antialias: false,
    },
  };

  return new Phaser.Game(config);
}
