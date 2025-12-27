import { useState, useEffect } from 'react';

interface ZoneTransitionProps {
  zoneName: string;
  onComplete: () => void;
}

export function ZoneTransition({ zoneName, onComplete }: ZoneTransitionProps) {
  const [phase, setPhase] = useState<'fadeIn' | 'title' | 'fadeOut'>('fadeIn');

  useEffect(() => {
    // Phase 1: Fade to black (already black from start)
    const fadeInTimer = setTimeout(() => {
      setPhase('title');
    }, 500);

    // Phase 2: Show title for 2 seconds
    const titleTimer = setTimeout(() => {
      setPhase('fadeOut');
    }, 2500);

    // Phase 3: Complete transition
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(titleTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 bg-black z-[100] flex items-center justify-center pointer-events-auto transition-opacity duration-700 ${
        phase === 'fadeOut' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Zone Title */}
      <div 
        className={`text-center transition-all duration-700 ${
          phase === 'title' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Decorative elements for Greenway */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-green-500" />
          <span className="text-green-400 text-2xl">🌿</span>
          <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-green-500" />
        </div>

        {/* Main Title */}
        <h1 
          className="font-title text-7xl md:text-9xl tracking-[0.3em] text-transparent bg-clip-text"
          style={{
            backgroundImage: 'linear-gradient(180deg, #6ec472 0%, #3d8b40 50%, #2a5c2c 100%)',
            textShadow: '0 0 40px rgba(110, 196, 114, 0.5), 0 0 80px rgba(110, 196, 114, 0.3)'
          }}
        >
          {zoneName}
        </h1>

        {/* Subtitle */}
        <p className="text-green-400/60 text-sm mt-6 tracking-[0.5em] uppercase">
          The Overgrown Path
        </p>

        {/* Bottom decoration */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
        </div>
      </div>
    </div>
  );
}
