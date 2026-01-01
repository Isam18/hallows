interface TheMedullaDialogProps {
  onYes: () => void;
  onNo: () => void;
}

export function TheMedullaDialog({ onYes, onNo }: TheMedullaDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-auto">
      <div className="text-center max-w-lg mx-4">
        {/* Decorative Frame with fiery border */}
        <div className="border-4 border-orange-600 rounded-lg p-8 bg-gradient-to-b from-orange-950/95 to-black/95 backdrop-blur relative overflow-hidden">
          
          {/* Lava dripping effect - animated drips */}
          <div className="absolute top-0 left-0 right-0 h-full pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 bg-gradient-to-b from-orange-500 to-red-600 rounded-full opacity-60"
                style={{
                  left: `${10 + i * 18}%`,
                  top: '0',
                  height: '20px',
                  animation: `lavaDrip 1.5s ${i * 0.3}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Fiery glow effect */}
          <div className="absolute inset-0 bg-orange-500/5 pointer-events-none" />

          {/* Warning message */}
          <div className="relative z-10 mb-6">
            <p className="text-orange-200 text-xl md:text-2xl leading-relaxed font-medium drop-shadow-md">
              The door seems hot. Whatever is on the other side must be dangerous.
            </p>
            <p className="text-orange-300 text-2xl mt-4 font-bold tracking-wide">
              Would you still proceed?
            </p>
          </div>

          {/* Decorative Line */}
          <div className="relative z-10 w-48 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent mx-auto mb-6" />

          {/* Small THE MEDULLA label */}
          <div className="relative z-10 mb-6">
            <p className="text-orange-400 text-lg italic tracking-widest">
              THE MEDULLA
            </p>
          </div>

          {/* Buttons */}
          <div className="relative z-10 flex gap-4 justify-center">
            <button
              onClick={onNo}
              className="px-8 py-3 bg-orange-950/30 border-2 border-orange-800/50 rounded-lg text-orange-200 hover:bg-orange-900/50 hover:border-orange-700 transition-all font-bold text-lg"
            >
              NO
            </button>
            <button
              onClick={onYes}
              className="px-8 py-3 bg-orange-600/20 border-2 border-orange-500 rounded-lg text-orange-400 hover:bg-orange-600/40 hover:border-orange-400 transition-all font-bold text-lg shadow-lg shadow-orange-900/20"
            >
              YES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add global styles for animations
if (typeof document !== 'undefined') {
  const styleId = 'medulla-dialog-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes lavaDrip {
        0% {
          transform: translateY(-10px);
          opacity: 0.6;
          height: 20px;
        }
        50% {
          opacity: 0.8;
          height: 40px;
        }
        100% {
          transform: translateY(400px);
          opacity: 0;
          height: 20px;
        }
      }

      @keyframes lavaDripText {
        0% {
          transform: translateY(0);
          opacity: 0.8;
        }
        100% {
          transform: translateY(15px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
