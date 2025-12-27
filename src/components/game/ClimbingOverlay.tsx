import { useEffect, useState } from 'react';

interface ClimbingOverlayProps {
  onComplete: () => void;
}

export function ClimbingOverlay({ onComplete }: ClimbingOverlayProps) {
  const [phase, setPhase] = useState<'climbing' | 'message'>('climbing');

  useEffect(() => {
    // Climbing animation phase
    const climbTimer = setTimeout(() => {
      setPhase('message');
    }, 2000);

    return () => clearTimeout(climbTimer);
  }, []);

  const handleContinue = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 pointer-events-auto">
      {phase === 'climbing' ? (
        <div className="text-center animate-fade-in">
          {/* Climbing Animation Visual */}
          <div className="relative w-16 h-64 mx-auto mb-8">
            {/* Chain */}
            <div className="absolute inset-x-0 top-0 bottom-0 w-4 mx-auto bg-gradient-to-b from-gray-600 to-gray-800 rounded-full">
              {/* Chain links */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 -translate-x-1/2 w-6 h-3 border-2 border-gray-500 rounded-full"
                  style={{ top: `${i * 20}px` }}
                />
              ))}
            </div>
            
            {/* Player climbing */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-8 h-12 bg-foreground/80 rounded animate-pulse"
              style={{
                animation: 'climbUp 2s ease-out forwards',
                bottom: '0%'
              }}
            />
          </div>
          
          <p className="text-foreground/60 text-lg">Climbing...</p>
        </div>
      ) : (
        <div className="text-center animate-fade-in max-w-lg mx-4">
          {/* Message Box */}
          <div className="bg-background/90 border-2 border-primary/50 rounded-lg p-8 shadow-2xl">
            <p className="text-foreground text-xl leading-relaxed mb-6">
              "You have conquered the Crossroads... for now."
            </p>
            <p className="text-foreground/60 text-sm mb-8">
              The chain leads upward into darkness. Perhaps one day, you will discover what lies above.
            </p>
            
            <button
              onClick={handleContinue}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/80 transition-all"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes climbUp {
          0% { bottom: 0%; opacity: 1; }
          100% { bottom: 80%; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
