import { useState, useEffect } from 'react';

interface ZoneTransitionProps {
  zoneName: string;
  onComplete: () => void;
}

export function ZoneTransition({ zoneName, onComplete }: ZoneTransitionProps) {
  const [phase, setPhase] = useState<'fadeIn' | 'title' | 'fadeOut'>('fadeIn');
  
  // Check if this is Medulla transition
  const isMedulla = zoneName.includes('MEDULLA');
  const mainTitle = isMedulla ? 'THE MEDULLA' : zoneName;
  const subtitle = isMedulla ? 'The burnt lands' : 'The Overgrown Path';

  useEffect(() => {
    // Phase 1: Fade to black (already black from start)
    const fadeInTimer = setTimeout(() => {
      setPhase('title');
    }, 500);

    // Phase 2: Show title for 2.5 seconds
    const titleTimer = setTimeout(() => {
      setPhase('fadeOut');
    }, 3000);

    // Phase 3: Complete transition
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3700);

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
      {isMedulla ? (
        // FIERY MEDULLA TRANSITION
        <div 
          className={`text-center transition-all duration-700 relative ${
            phase === 'title' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Fiery glow effect */}
          <div 
            className="absolute inset-0 blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(circle, #ff4400 0%, #ff6600 30%, transparent 70%)',
            }}
          />

          {/* Lava drips effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${5 + i * 8}%`,
                  top: '0',
                  width: '4px',
                  height: '8px',
                  background: 'linear-gradient(to bottom, #ff6600, #ff4400)',
                  borderRadius: '0 0 4px 4px',
                  opacity: 0.7,
                  animation: `lavaDripZone ${1.5 + i * 0.2}s ease-in infinite`,
                }}
              />
            ))}
          </div>

          {/* Main Fiery Title */}
          <h1 
            className="relative z-10 font-title text-6xl md:text-8xl lg:text-9xl tracking-[0.2em] text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(180deg, #ff6600 0%, #ff4400 30%, #cc3300 60%, #992200 100%)',
              textShadow: '0 0 30px rgba(255, 102, 0, 0.8), 0 0 60px rgba(255, 68, 0, 0.6), 0 0 90px rgba(204, 51, 0, 0.4)',
            }}
          >
            {mainTitle}
          </h1>

          {/* Lava dripping from letters */}
          <div className="relative z-10 flex justify-center gap-1 mt-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-b from-orange-500 to-red-600 rounded-full"
                style={{
                  animation: `letterDrip ${1 + i * 0.15}s ease-in infinite`,
                }}
              />
            ))}
          </div>

          {/* Subtitle */}
          <p className="relative z-10 text-orange-400/70 text-xl md:text-2xl mt-8 tracking-[0.3em] uppercase font-medium">
            {subtitle}
          </p>

          {/* Fiery bottom glow */}
          <div 
            className="relative z-10 mt-12 mx-auto blur-xl opacity-40"
            style={{
              width: '300px',
              height: '60px',
              background: 'radial-gradient(ellipse, #ff6600 0%, transparent 70%)',
            }}
          />
        </div>
      ) : (
        // GREENWAY TRANSITION
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
      )}
    </div>
  );
}

// Add global styles for animations
if (typeof document !== 'undefined') {
  const styleId = 'zone-transition-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes lavaDripZone {
        0% {
          transform: translateY(-10px);
          opacity: 0;
        }
        10% {
          opacity: 0.7;
        }
        100% {
          transform: translateY(400px);
          opacity: 0;
          height: 20px;
        }
      }

      @keyframes letterDrip {
        0% {
          transform: translateY(0);
          height: 10px;
          opacity: 0.8;
        }
        50% {
          opacity: 0.6;
          height: 40px;
        }
        100% {
          transform: translateY(30px);
          opacity: 0;
          height: 15px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
