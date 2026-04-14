import { useState, useEffect } from 'react';

interface GlacialTitanVictoryDialogProps {
  onYes: () => void;
  onNo: () => void;
}

export function GlacialTitanVictoryDialog({ onYes, onNo }: GlacialTitanVictoryDialogProps) {
  const [phase, setPhase] = useState<'shake' | 'whiteout' | 'question' | 'answer'>('shake');
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  const [shakeIntensity, setShakeIntensity] = useState(0);

  useEffect(() => {
    // Phase 1: Screen shake with icicle collapse (2s)
    setShakeIntensity(1);
    const t1 = setTimeout(() => setShakeIntensity(3), 500);
    const t2 = setTimeout(() => setShakeIntensity(6), 1000);
    const t3 = setTimeout(() => {
      setPhase('whiteout');
      setShakeIntensity(0);
    }, 2000);
    // Phase 2: White screen fade in (1s)
    const t4 = setTimeout(() => setPhase('question'), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const handleAnswer = (choice: 'yes' | 'no') => {
    setAnswer(choice);
    setPhase('answer');
    setTimeout(() => {
      if (choice === 'yes') onYes();
      else onNo();
    }, 2000);
  };

  const shakeStyle = shakeIntensity > 0 ? {
    animation: `titanShake ${0.1 / shakeIntensity}s infinite alternate`,
  } : {};

  return (
    <div 
      className="fixed inset-0 z-[200] pointer-events-auto"
      style={shakeStyle}
    >
      {/* Icicle collapse overlay during shake phase */}
      {phase === 'shake' && (
        <div className="absolute inset-0 bg-black">
          {/* Falling icicles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${3 + i * 5}%`,
                top: '-20px',
                width: '8px',
                height: `${40 + i * 8}px`,
                background: 'linear-gradient(to bottom, #88ddff, #44aaff, #2266aa)',
                clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                animation: `icicleFall ${0.8 + Math.random() * 1.2}s ease-in forwards`,
                animationDelay: `${0.2 + Math.random() * 1.5}s`,
                opacity: 0,
              }}
            />
          ))}
          {/* Crack lines */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`crack-${i}`}
              className="absolute bg-gradient-to-b from-cyan-300/60 to-transparent"
              style={{
                left: `${10 + i * 12}%`,
                top: '0',
                width: '2px',
                height: `${100 + i * 30}px`,
                transform: `rotate(${-15 + i * 5}deg)`,
                animation: `crackAppear 0.3s ease-out forwards`,
                animationDelay: `${0.5 + i * 0.15}s`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* White screen transition */}
      {(phase === 'whiteout' || phase === 'question' || phase === 'answer') && (
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${
            phase === 'whiteout' ? 'bg-white opacity-0' : 'bg-white opacity-100'
          }`}
          style={phase !== 'whiteout' ? {} : { animation: 'whiteFlash 1s ease-in forwards' }}
        >
          {phase === 'question' && (
            <div className="text-center animate-fade-in">
              <p className="text-black/80 text-4xl md:text-5xl font-serif tracking-wider mb-16">
                Do you wish to continue?
              </p>
              <div className="flex gap-12 justify-center">
                <button
                  onClick={() => handleAnswer('yes')}
                  className="text-black/60 hover:text-black text-2xl font-serif tracking-widest uppercase transition-colors duration-300 px-8 py-4"
                >
                  Yes
                </button>
                <button
                  onClick={() => handleAnswer('no')}
                  className="text-black/60 hover:text-black text-2xl font-serif tracking-widest uppercase transition-colors duration-300 px-8 py-4"
                >
                  No
                </button>
              </div>
            </div>
          )}

          {phase === 'answer' && (
            <div className="text-center animate-fade-in">
              <p className="text-black/70 text-5xl md:text-6xl font-serif italic tracking-wider">
                So be it.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inject keyframes
if (typeof document !== 'undefined') {
  const styleId = 'glacial-titan-victory-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes titanShake {
        0% { transform: translate(-3px, -2px); }
        25% { transform: translate(3px, 1px); }
        50% { transform: translate(-2px, 3px); }
        75% { transform: translate(2px, -1px); }
        100% { transform: translate(-1px, 2px); }
      }
      @keyframes icicleFall {
        0% { transform: translateY(0); opacity: 0.9; }
        100% { transform: translateY(110vh); opacity: 0.3; }
      }
      @keyframes crackAppear {
        0% { opacity: 0; height: 0; }
        100% { opacity: 0.6; height: inherit; }
      }
      @keyframes whiteFlash {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      @keyframes fade-in {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fade-in 0.8s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }
}
