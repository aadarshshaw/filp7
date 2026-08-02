import React, { useEffect, useState } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import clsx from 'clsx';

export const Overlays = () => {
  const { gameState, socket, room, lastEvent, error } = useGameState();
  const [toasts, setToasts] = useState([]);
  const [actionPrompt, setActionPrompt] = useState(null);

  useEffect(() => {
    if (error) {
      const id = Date.now();
      setToasts(prev => [...prev, { id, msg: error, type: 'danger' }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3400);
    }
  }, [error]);

  useEffect(() => {
    if (lastEvent?.type === 'actionPrompt') {
      setActionPrompt(lastEvent.data);
    }
  }, [lastEvent]);

  // Round End / Game Over
  const isRoundEnd = gameState?.phase === 'roundEnd';
  const isGameOver = gameState?.phase === 'gameOver';

  const roundSorted = isRoundEnd ? [...gameState.players].sort((a, b) => b.roundScore - a.roundScore) : [];
  const gameSorted = isGameOver ? [...gameState.players].sort((a, b) => b.totalScore - a.totalScore) : [];

  return (
    <>
      {/* Toasts */}
      <div id="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={clsx('toast', `toast-${t.type}`)}>{t.msg}</div>
        ))}
      </div>

      {/* Action Prompt */}
      {actionPrompt && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <h3>Use {actionPrompt.card.label}</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              {actionPrompt.card.action === 'freeze' ? 'Choose a player to freeze (force them to stay):' : 'Choose a player to flip 3 cards for:'}
            </p>
            <div className="target-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {actionPrompt.validTargets.map(t => (
                <button 
                  key={t.id} 
                  className="btn btn-primary" 
                  onClick={() => {
                    socket.emit('game:action', { targetId: t.id });
                    setActionPrompt(null);
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setActionPrompt(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Round End Overlay */}
      {isRoundEnd && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>Round Over!</h2>
            <div className="round-scores-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              {roundSorted.map(s => (
                <div key={s.id} className="round-score-entry" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <span>{s.name}</span>
                  <span>
                    <span style={{ color: s.status === 'busted' ? 'var(--accent-danger)' : 'var(--accent-success)', fontWeight: 'bold', marginRight: '8px' }}>
                      {s.status === 'busted' ? 'Busted!' : `+${s.roundScore}`}
                    </span>
                    <span style={{ opacity: 0.6 }}>(Total: {s.totalScore})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 2000 }}>
          <div className="modal" style={{ maxWidth: '600px' }}>
            <h1 style={{ fontSize: '3rem', color: 'var(--accent-gold)', marginBottom: '0.5rem', textAlign: 'center' }}>🏆 Game Over 🏆</h1>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>{gameSorted[0]?.name} wins!</h2>
            
            <div className="final-scores-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {gameSorted.map((s, i) => (
                <div key={s.id} className="final-score-entry" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: i === 0 ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: i === 0 ? '2px solid var(--accent-gold)' : 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: i === 0 ? 'bold' : 'normal' }}>
                    <span style={{ fontSize: '1.5rem' }}>{i === 0 ? '👑' : `#${i+1}`}</span>
                    <span style={{ fontSize: '1.2rem' }}>{s.name}</span>
                  </span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{s.totalScore}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
              <button className="btn btn-primary btn-lg" onClick={() => socket.emit('game:playAgain')}>Play Again</button>
              <button className="btn btn-ghost btn-lg" onClick={() => socket.emit('room:leave')}>Leave Room</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
