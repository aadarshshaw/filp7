import React, { useState } from 'react';
import clsx from 'clsx';
import { useGameState } from '../contexts/GameStateContext';

export const Scoreboard = () => {
  const { gameState, myPlayerId } = useGameState();
  const [isOpen, setIsOpen] = useState(false);

  if (!gameState) return null;

  const sortedPlayers = [...gameState.players].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <>
      <button 
        className="btn btn-ghost btn-sm topbar-btn" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'fixed', top: 'var(--space-md)', right: 'var(--space-md)', zIndex: 100 }}
      >
        🏆
      </button>

      <div className={clsx('scoreboard-panel', { 'open': isOpen })}>
        <div className="scoreboard-header">
          <h3 className="scoreboard-title">Leaderboard</h3>
          <span className="scoreboard-target">Target: {gameState.targetScore}</span>
        </div>
        
        <div className="scoreboard-list">
          {sortedPlayers.map((p, i) => {
            const isMe = p.id === myPlayerId;
            const percent = Math.min(100, (p.totalScore / gameState.targetScore) * 100);
            const isActive = p.id === gameState.currentPlayerId;

            return (
              <div key={p.id} className={clsx('scoreboard-entry', { 'is-active': isActive, 'is-busted': p.status === 'busted' })}>
                <span className={clsx('scoreboard-rank', { 'first': i === 0 })}>{i === 0 ? '👑' : i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div className="scoreboard-entry-name" style={{ color: isMe ? 'var(--accent-primary)' : 'inherit' }}>
                    {p.name} {isMe && '(You)'} {p.isBot && '🤖'}
                    {p.status === 'stayed' && <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem' }}> [STAY]</span>}
                    {p.status === 'busted' && <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem' }}> [BUST]</span>}
                  </div>
                  <div className="scoreboard-bar">
                    <div className="scoreboard-bar-fill" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
                <span className="scoreboard-entry-score">{p.totalScore}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
