import { useEffect, useState } from 'react';
import gameState from '@/game/core/GameState';

interface GameHUDProps {
  hp: number;
  maxHp: number;
  shells: number;
}

export function GameHUD({ hp, maxHp, shells }: GameHUDProps) {
  const [soul, setSoul] = useState(gameState.getSoul());
  const [isFocusing, setIsFocusing] = useState(false);
  
  useEffect(() => {
    const unsubSoul = gameState.on('soulChange', (newSoul: number) => {
      setSoul(newSoul);
    });
    
    const unsubFocusStart = gameState.on('focusStart', () => {
      setIsFocusing(true);
    });
    
    const unsubFocusEnd = gameState.on('focusEnd', () => {
      setIsFocusing(false);
    });
    
    return () => {
      unsubSoul();
      unsubFocusStart();
      unsubFocusEnd();
    };
  }, []);
  
  const soulPercent = (soul / gameState.getMaxSoul()) * 100;
  const canHeal = soul >= gameState.getSoulCostHeal() && hp < maxHp;
  
  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
      {/* Left side - HP and Soul */}
      <div className="flex flex-col gap-2">
        {/* HP Pips */}
        <div className="flex gap-1">
          {Array.from({ length: maxHp }).map((_, i) => (
            <div key={i} className={`hp-pip ${i < hp ? 'hp-pip-filled' : 'hp-pip-empty'}`} />
          ))}
        </div>
        
        {/* Soul Vessel */}
        <div className="relative w-[100px] h-6">
          {/* Background */}
          <div className="absolute inset-0 bg-[#1a1e2a] rounded-full border border-[#3a4a5a] overflow-hidden">
            {/* Soul fill */}
            <div 
              className={`absolute inset-y-0 left-0 transition-all duration-200 ${
                canHeal ? 'bg-gradient-to-r from-white/90 to-white shadow-[0_0_10px_rgba(255,255,255,0.6)]' : 'bg-gradient-to-r from-[#88aacc] to-[#aaccee]'
              } ${isFocusing ? 'animate-pulse' : ''}`}
              style={{ width: `${soulPercent}%` }}
            />
            
            {/* Segment markers */}
            <div className="absolute inset-0 flex">
              <div className="flex-1 border-r border-[#3a4a5a]/50" />
              <div className="flex-1 border-r border-[#3a4a5a]/50" />
              <div className="flex-1" />
            </div>
          </div>
          
          {/* Glow when ready */}
          {canHeal && (
            <div className="absolute inset-0 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] pointer-events-none" />
          )}
        </div>
        
        {/* Focus indicator */}
        {isFocusing && (
          <div className="text-white/80 text-xs animate-pulse">
            Focusing...
          </div>
        )}
      </div>
      
      {/* Shell Counter */}
      <div className="shell-counter">
        <span className="text-2xl">◈</span>
        <span>{shells}</span>
      </div>
    </div>
  );
}
