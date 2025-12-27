interface ToBeContinuedProps {
  onMainMenu: () => void;
  onStay: () => void;
}

export function ToBeContinued({ onMainMenu, onStay }: ToBeContinuedProps) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 pointer-events-auto">
      <div className="text-center animate-fade-in">
        {/* Main Title */}
        <h1 className="font-title text-6xl md:text-8xl text-foreground mb-4 tracking-widest">
          TO BE
        </h1>
        <h1 className="font-title text-6xl md:text-8xl text-primary mb-8 tracking-widest">
          CONTINUED...
        </h1>
        
        {/* Subtitle */}
        <p className="text-foreground/60 text-lg mb-12 max-w-md mx-auto">
          You have conquered the Crossroads... for now.
          <br />
          <span className="text-primary/80">More challenges await beyond this door.</span>
        </p>

        {/* Decorative Line */}
        <div className="w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-12" />

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onStay}
            className="px-8 py-3 bg-muted/30 border-2 border-muted rounded-lg text-foreground hover:bg-muted/50 hover:border-primary/50 transition-all font-bold"
          >
            RETURN TO SHOP
          </button>
          <button
            onClick={onMainMenu}
            className="px-8 py-3 bg-primary/20 border-2 border-primary rounded-lg text-primary hover:bg-primary/30 transition-all font-bold"
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
