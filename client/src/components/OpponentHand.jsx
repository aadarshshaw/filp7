import React from 'react';
import { Card } from './Card';
import clsx from 'clsx';
import { useGameState } from '../contexts/GameStateContext';

export const OpponentHand = ({ opponent }) => {
  const { gameState } = useGameState();
  const isActive = gameState.currentPlayerId === opponent.id;

  return (
    <div className={clsx('opponent-panel', { 'active-turn': isActive, 'busted': opponent.status === 'busted' })}>
      <div className="opponent-header">
        <div className="opponent-avatar">{opponent.name.charAt(0).toUpperCase()}</div>
        <div className="opponent-info">
          <span className="opponent-name">{opponent.name} {opponent.isBot && '🤖'}</span>
          <span className="opponent-stat">
            Score: <span className="opponent-stat-value">{opponent.roundScore || 0}</span>
          </span>
        </div>
      </div>

      {opponent.status === 'busted' && <div className="state-overlay bust-overlay">💥 BUSTED</div>}
      {opponent.status === 'stayed' && <div className="state-overlay stay-overlay">✓ STAYED</div>}
      {opponent.status === 'frozen' && <div className="state-overlay frozen-overlay">❄️ FROZEN</div>}
      {opponent.isOffline && <div className="state-overlay offline-overlay">🔌 OFFLINE</div>}

      <div className="opponent-hand">
        {opponent.hand.map((c, i) => (
          <div className="opponent-card-wrapper" key={c.id || i}>
            <Card card={c} />
          </div>
        ))}
      </div>
    </div>
  );
};
