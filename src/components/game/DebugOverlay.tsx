import { useEffect, useState } from 'react';
import type { MovementDebugState } from '@/game/core/MovementConfig';

interface DebugOverlayProps {
  gameRef: Phaser.Game | null;
}

export const DebugOverlay = ({ gameRef }: DebugOverlayProps) => {
  const [visible, setVisible] = useState(false);
  const [debugState, setDebugState] = useState<MovementDebugState | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F1') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!visible || !gameRef) return;

    const interval = setInterval(() => {
      const scene = gameRef.scene.getScene('GameScene') as any;
      if (scene?.player) {
        setDebugState(scene.player.getDebugState());
      }
    }, 50); // 20fps update for overlay

    return () => clearInterval(interval);
  }, [visible, gameRef]);

  if (!visible || !debugState) return null;

  const getStateColor = (state: string) => {
    switch (state) {
      case 'grounded': return 'text-green-400';
      case 'airborne': return 'text-blue-400';
      case 'wallSlide': return 'text-yellow-400';
      case 'dash': return 'text-purple-400';
      case 'hitstun': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const TimerBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-background/50 rounded overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-75`}
          style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }}
        />
      </div>
      <span className="w-12 text-right font-mono">{value}ms</span>
    </div>
  );

  return (
    <div className="fixed top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 font-mono text-sm z-50 min-w-[280px] shadow-lg">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <span className="text-muted-foreground text-xs">Movement Debug [F1]</span>
        <span className={`font-bold uppercase ${getStateColor(debugState.state)}`}>
          {debugState.state}
        </span>
      </div>

      {/* Flags */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${debugState.isGrounded ? 'bg-green-500' : 'bg-muted'}`} />
          <span className="text-muted-foreground">Grounded</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${debugState.isTouchingWall ? 'bg-yellow-500' : 'bg-muted'}`} />
          <span className="text-muted-foreground">Wall ({debugState.wallDirection > 0 ? 'R' : debugState.wallDirection < 0 ? 'L' : '-'})</span>
        </div>
      </div>

      {/* Velocity */}
      <div className="mb-3 p-2 bg-background/30 rounded text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Velocity</span>
          <span>
            X: <span className="text-foreground">{debugState.velocityX}</span>
            {' '}
            Y: <span className="text-foreground">{debugState.velocityY}</span>
          </span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-muted-foreground">Facing</span>
          <span className="text-foreground">{debugState.facing > 0 ? 'Right →' : '← Left'}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-muted-foreground">Air Dashes</span>
          <span className="text-foreground">{debugState.airDashesUsed}</span>
        </div>
      </div>

      {/* Timers */}
      <div className="space-y-1.5">
        <TimerBar label="Coyote" value={debugState.coyoteTimer} max={100} color="bg-green-500" />
        <TimerBar label="Jump Buf" value={debugState.jumpBufferTimer} max={120} color="bg-blue-500" />
        <TimerBar label="Dash CD" value={debugState.dashCooldown} max={450} color="bg-purple-500" />
        <TimerBar label="Dash Buf" value={debugState.dashBufferTimer} max={100} color="bg-purple-400" />
        <TimerBar label="Wall Stick" value={debugState.wallStickTimer} max={80} color="bg-yellow-500" />
        <TimerBar label="WJ Lock" value={debugState.wallJumpLockout} max={150} color="bg-orange-500" />
      </div>

      <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground text-center">
        Press F1 to toggle
      </div>
    </div>
  );
};
