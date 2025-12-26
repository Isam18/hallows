interface GameHUDProps {
  hp: number;
  maxHp: number;
  shells: number;
}

export function GameHUD({ hp, maxHp, shells }: GameHUDProps) {
  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
      {/* HP Pips */}
      <div className="flex gap-1">
        {Array.from({ length: maxHp }).map((_, i) => (
          <div key={i} className={`hp-pip ${i < hp ? 'hp-pip-filled' : 'hp-pip-empty'}`} />
        ))}
      </div>
      {/* Shell Counter */}
      <div className="shell-counter">
        <span className="text-2xl">◈</span>
        <span>{shells}</span>
      </div>
    </div>
  );
}
