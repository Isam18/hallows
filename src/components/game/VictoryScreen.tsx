interface VictoryScreenProps {
  onContinue?: () => void;
}

export function VictoryScreen({ onContinue }: VictoryScreenProps) {
  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    }
  };

  return (
    <div className="screen-overlay fade-in pointer-events-auto">
      <h2 className="font-title text-4xl text-accent mb-2">FALSE CHAMPION</h2>
      <h3 className="font-title text-2xl text-primary mb-4">DEFEATED</h3>
      <p className="text-foreground/70 mb-8">The arena falls silent...</p>
      <button onClick={handleContinue} className="game-button-primary">
        CONTINUE
      </button>
    </div>
  );
}
