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

          {/* Big fiery THE MEDULLA text */}
          <div className="relative z-10 mb-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-widest bg-gradient-to-b from-orange-400 via-orange-500 to-red-600 bg-clip-text text-transparent drop-shadow-lg animate-pulse">
              THE MEDULLA
            </h1>
          </div>

          {/* Lava dripping lines */}
          <div className="relative z-10 flex justify-center gap-2 mb-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-8 bg-gradient-to-b from-orange-400 to-red-600 rounded-full"
                style={{
                  animation: `lavaDripText 2s ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Subtitle */}
          <p className="relative z-10 text-orange-300 text-2xl mb-8 font-title tracking-wide italic drop-shadow-md">
            the burnt lands
          </p>

          {/* Decorative Line */}
          <div className="relative z-10 w-48 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent mx-auto mb-8" />

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

      <style jsx>{`
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
      `}</style>
    </div>
  );
}
