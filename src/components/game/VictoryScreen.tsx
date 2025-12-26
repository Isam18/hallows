export function VictoryScreen() {
  const restart = () => window.location.reload();
  return (
    <div className="screen-overlay fade-in pointer-events-auto">
      <h2 className="font-title text-4xl text-accent mb-4">VICTORY</h2>
      <p className="text-foreground mb-8">The Elder Grub has been defeated.</p>
      <button onClick={restart} className="game-button-primary">Play Again</button>
    </div>
  );
}
