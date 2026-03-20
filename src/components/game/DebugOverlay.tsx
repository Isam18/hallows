import { useEffect, useRef, useState } from 'react';
import type { MovementDebugState } from '@/game/core/MovementConfig';

interface DebugOverlayProps {
  gameRef: Phaser.Game | null;
}

export const DebugOverlay = ({ gameRef }: DebugOverlayProps) => {
  const [manualToggle, setManualToggle] = useState<boolean | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugState, setDebugState] = useState<MovementDebugState | null>(null);
  const prevDebugMode = useRef(false);

  // F1 manual override for movement overlay, A to toggle debug mode on/off
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F1') {
        e.preventDefault();
        setManualToggle(prev => {
          const currentlyVisible = prev !== null ? prev : prevDebugMode.current;
          return !currentlyVisible;
        });
      }
      if (e.code === 'KeyA' && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Only toggle if not typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        
        if (gameRef) {
          const current = gameRef.registry?.get('debugMode') ?? false;
          gameRef.registry.set('debugMode', !current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameRef]);

  // Poll debugMode from registry and player debug state
  useEffect(() => {
    if (!gameRef) return;

    const interval = setInterval(() => {
      const registryDebug = gameRef.registry?.get('debugMode') ?? false;
      
      // When debug mode changes, reset manual override
      if (registryDebug !== prevDebugMode.current) {
        prevDebugMode.current = registryDebug;
        setManualToggle(null);
      }
      setDebugMode(registryDebug);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scene = gameRef.scene.getScene('GameScene') as any;
      if (scene?.player) {
        setDebugState(scene.player.getDebugState());
      }
    }, 50);

    return () => clearInterval(interval);
  }, [gameRef]);

  const visible = manualToggle !== null ? manualToggle : debugMode;

  // Show the overlay as soon as it's toggled on.
  // (Teleport should still be usable even if the player/debugState isn't ready yet.)
  if (!visible) return null;

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

  const handleTeleport = (roomId: string) => {
    if (!gameRef) return;

    const sceneManager = gameRef.scene;
    const isGameSceneActive = sceneManager.isActive('GameScene');

    // If GameScene isn't running yet (e.g. user is still on MenuScene), start it directly
    // at the requested level so the button always does something.
    if (!isGameSceneActive) {
      console.log('[DebugOverlay] Starting GameScene at', roomId);
      sceneManager.start('GameScene', { levelId: roomId, spawnId: 'default', debugMode: true });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scene = sceneManager.getScene('GameScene') as any;
    console.log('[DebugOverlay] Teleporting to', roomId);
    scene?.teleportToLevel?.(roomId);
  };

  return (
    <div className="fixed top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 font-mono text-sm z-50 min-w-[280px] shadow-lg">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <span className="text-muted-foreground text-xs">Movement Debug [F1]</span>
        {debugState ? (
          <span className={`font-bold uppercase ${getStateColor(debugState.state)}`}>
            {debugState.state}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">waiting…</span>
        )}
      </div>

      {debugState ? (
        <>
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
        </>
      ) : (
        <div className="mb-3 p-2 bg-background/30 rounded text-xs text-muted-foreground">
          Start/enter gameplay so the player debug stats can populate.
        </div>
      )}

      {/* Teleport Section */}
      <div className="mt-3 pt-2 border-t border-border">
        <div className="text-xs font-semibold text-muted-foreground mb-2">Teleport</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => handleTeleport('chamberOfTheHunter')} className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded transition-colors font-bold">🩸 Chamber of the Hunter</button>
          <button onClick={() => handleTeleport('huntersMarch')} className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded transition-colors font-bold">⚔️ Hunter's March</button>
          <button onClick={() => handleTeleport('huntersMarchRoom2')} className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded transition-colors">HM Room 2</button>
          <button onClick={() => handleTeleport('huntersMarchRoom3')} className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded transition-colors">HM Room 3</button>
          <button onClick={() => handleTeleport('huntersMarchRoom4')} className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded transition-colors">HM Room 4</button>
          <button onClick={() => handleTeleport('huntersMarchRoom5')} className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded transition-colors font-bold">⚔️ HM Gauntlet</button>
          <button onClick={() => handleTeleport('huntersMarchRoom6')} className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded transition-colors font-bold">🏕️ HM Camp</button>
          <button onClick={() => handleTeleport('huntersMarchBenchRoom')} className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded transition-colors">🪑 HM Respite</button>
          <button onClick={() => handleTeleport('huntersMarchBossArena')} className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded transition-colors font-bold">👑 Colosseum</button>
          <button onClick={() => handleTeleport('chainRoomPostAntElder')} className="px-2 py-1 text-xs bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-600/30 rounded transition-colors">🍄 Post-Boss Chain</button>
          <button onClick={() => handleTeleport('mossTitanArena')} className="px-2 py-1 text-xs bg-orange-600/20 hover:bg-orange-600/40 border border-orange-600/30 rounded transition-colors">Moss Titan Arena</button>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground text-center">
        Press A to toggle debug · F1 for overlay
      </div>
    </div>
  );
};
