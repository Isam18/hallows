interface GreenDoorDialogProps {
  onYes: () => void;
  onNo: () => void;
}

export function GreenDoorDialog({ onYes, onNo }: GreenDoorDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-auto">
      <div className="text-center animate-scale-in max-w-md mx-4">
        {/* Decorative Frame */}
        <div className="border-2 border-primary/30 rounded-lg p-8 bg-background/90 backdrop-blur">
          {/* Door Icon */}
          <div className="text-6xl mb-4 text-primary/60">🚪</div>
          
          {/* Question */}
          <p className="text-foreground text-xl mb-2 font-title tracking-wide">
            The entrance to a new land.
          </p>
          <p className="text-primary text-lg mb-8">
            Do you wish to continue?
          </p>

          {/* Decorative Line */}
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent mx-auto mb-8" />

          {/* Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={onNo}
              className="px-8 py-3 bg-muted/30 border-2 border-muted rounded-lg text-foreground hover:bg-muted/50 hover:border-foreground/30 transition-all font-bold text-lg"
            >
              NO
            </button>
            <button
              onClick={onYes}
              className="px-8 py-3 bg-primary/20 border-2 border-primary rounded-lg text-primary hover:bg-primary/30 transition-all font-bold text-lg"
            >
              YES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
