import { useEffect, useState } from 'react';

interface EndlessHUDProps {
  gameRef: Phaser.Game | null;
}

export const EndlessHUD = ({ gameRef }: EndlessHUDProps) => {
  const [killCount, setKillCount] = useState(0);
  const [waveNum, setWaveNum] = useState(1);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!gameRef) return;

    const interval = setInterval(() => {
      const endless = gameRef.registry?.get('endlessMode');
      if (endless) {
        setIsActive(true);
        setKillCount(gameRef.registry?.get('endlessKills') ?? 0);
        setWaveNum(gameRef.registry?.get('endlessWave') ?? 1);
      } else {
        setIsActive(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameRef]);

  if (!isActive) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-sm border border-red-900/60 rounded-lg px-8 py-3 text-center shadow-lg shadow-red-900/20">
        <div className="text-red-400/70 text-xs font-mono uppercase tracking-widest mb-1">
          Endless Deads — Wave {waveNum}
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl font-bold text-red-100 font-mono tabular-nums">
            {killCount}
          </span>
          <span className="text-red-400/60 text-sm">
            slain
          </span>
        </div>
      </div>
    </div>
  );
};
