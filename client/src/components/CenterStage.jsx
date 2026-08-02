import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { useGameState } from '../contexts/GameStateContext';

export const CenterStage = () => {
  const { gameState, lastEvent } = useGameState();
  const [flippedCard, setFlippedCard] = useState(null);

  useEffect(() => {
    if (lastEvent?.type === 'cardDealt' || lastEvent?.type === 'action') {
      const card = lastEvent.data.card || lastEvent.data.actionResult?.card;
      setFlippedCard(card);
      const timer = setTimeout(() => setFlippedCard(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [lastEvent]);

  if (!gameState) return null;

  return (
    <div className="center-stage">
      <div className="deck-area">
        <div className="deck-pile">
          {/* Decorative stack of cards */}
          <div className="card-back" style={{ position: 'absolute', top: '4px', left: '4px' }}></div>
          <div className="card-back" style={{ position: 'absolute', top: '2px', left: '2px' }}></div>
          <div className="card-back" style={{ position: 'relative', zIndex: 2 }}>
            <span className="deck-count">{gameState.deckRemaining}</span>
          </div>
        </div>
      </div>
      <div className="last-drawn-area" id="last-drawn-area">
        {flippedCard ? (
          <div className="card-deal-anim">
            <Card card={flippedCard} />
          </div>
        ) : (
          <div className="placeholder-card"></div>
        )}
      </div>
    </div>
  );
};
