import React, { useEffect, useState } from 'react';
import { useGameState } from '../contexts/GameStateContext';

export const HUD = () => {
  const { gameState, room } = useGameState();
  const [remaining, setRemaining] = useState(30);

  useEffect(() => {
    if (!gameState) return;
    setRemaining(gameState.turnTimer || 30);

    // Simple countdown
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.turnTimer, gameState?.currentPlayerId]);

  if (!gameState) return null;

  return (
    <div className="top-hud">
      <div className="room-info-pill">
        <span className="room-info-label">Room:</span>
        <span className="room-info-code" id="room-code-display">{room?.id}</span>
      </div>
      
      <div className="turn-timer-container">
        <div 
          className="turn-timer-bar timer-active" 
          style={{ '--timer-duration': `${gameState.turnTimer || 30}s` }}
          key={gameState.currentPlayerId} // Force reflow on turn change
        ></div>
        <div className="turn-timer-count" style={{
          display: 'inline-block',
          color: `hsl(${Math.max(0, Math.min(120, (remaining / (gameState.turnTimer || 30)) * 120))}, 80%, 50%)`
        }}>
          {remaining}s
        </div>
      </div>

      <div className="topbar-actions">
        {/* We can add buttons like Scoreboard toggle or Leave room here */}
      </div>
    </div>
  );
};
