import React from 'react';
import { Card } from './Card';
import clsx from 'clsx';
import { useGameState } from '../contexts/GameStateContext';

export const MyHand = () => {
  const { gameState, myPlayerId, socket } = useGameState();
  const player = gameState?.players.find(p => p.id === myPlayerId);

  if (!player) return null;

  const isActive = gameState.currentPlayerId === myPlayerId && player.status === 'active' && gameState.phase === 'playing';

  const handleAction = (action) => {
    socket.emit('game:action', { action });
  };

  return (
    <div className="player-area-container">
      <div className={clsx('player-panel', { 'active-turn': isActive, 'busted': player.status === 'busted' })}>
        <div className="player-info-header">
          <div className="player-avatar">You</div>
          <div className="player-stats">
            <span className="player-name">{player.name}</span>
            <div className="player-score-row">
              <span className="score-label">Score</span>
              <span className="score-value">{player.roundScore || 0}</span>
            </div>
          </div>
        </div>

        {player.status === 'busted' && <div className="state-overlay bust-overlay">💥 BUSTED</div>}
        {player.status === 'stayed' && <div className="state-overlay stay-overlay">✓ STAYED</div>}
        {player.status === 'frozen' && <div className="state-overlay frozen-overlay">❄️ FROZEN</div>}

        <div className="player-cards-section">
          <div className="hand-label">Your Hand ({player.hand.length + player.modifiers.length})</div>
          
          <div className="player-modifiers">
            {player.modifiers.map((m, i) => (
              <span key={`mod-${i}`} className={clsx('modifier-tag', m.value < 0 ? 'negative' : 'positive')}>
                {m.label}
              </span>
            ))}
          </div>

          <div className="player-hand">
            {player.hand.map((c, i) => (
              <Card key={c.id || i} card={c} />
            ))}
          </div>
        </div>
      </div>

      <div className="action-bar" style={{ display: isActive ? 'flex' : 'none' }}>
        <button className="btn btn-action btn-hit" onClick={() => handleAction('hit')}>HIT</button>
        <button className="btn btn-action btn-stay" onClick={() => handleAction('stay')}>STAY</button>
      </div>
    </div>
  );
};
