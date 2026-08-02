import React, { useState } from 'react';
import { useGameState } from '../contexts/GameStateContext';

export const Lobby = () => {
  const { socket, room, error, myPlayerId } = useGameState();
  const [playerName, setPlayerName] = useState(localStorage.getItem('flip7_playerName') || '');
  const [joinCode, setJoinCode] = useState('');
  
  // Settings
  const [targetScore, setTargetScore] = useState(150);
  const [turnTimer, setTurnTimer] = useState(30);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    localStorage.setItem('flip7_playerName', playerName.trim());
    socket.emit('room:create', { 
      playerName: playerName.trim(), 
      settings: { targetScore, turnTimer } 
    });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!playerName.trim() || !joinCode.trim()) return;
    localStorage.setItem('flip7_playerName', playerName.trim());
    socket.emit('room:join', { roomId: joinCode.trim().toUpperCase(), playerName: playerName.trim() });
  };

  const handleStartGame = () => {
    socket.emit('game:start');
  };

  const handleAddBot = () => {
    socket.emit('room:addBot');
  };

  if (room) {
    // Inside a room lobby waiting for start
    const isHost = room.hostId === myPlayerId;
    return (
      <div className="lobby-container">
        <div className="lobby-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <h2 className="lobby-title">Room: <span id="room-code-display">{room.id}</span></h2>
              <p className="text-muted">Target Score: {room.settings.targetScore} | Turn Time: {room.settings.turnTimer}s</p>
            </div>
          </div>
          
          <div className="player-list">
            <h3>Players ({room.players.length}/8)</h3>
            <ul>
              {room.players.map(p => (
                <li key={p.id}>
                  {p.name} {p.id === room.hostId && '(Host)'} {p.isBot && '🤖'}
                </li>
              ))}
            </ul>
          </div>

          <div className="lobby-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            {isHost && (
              <>
                <button className="btn btn-primary" onClick={handleStartGame} disabled={room.players.length < 2}>Start Game</button>
                <button className="btn btn-secondary" onClick={handleAddBot} disabled={room.players.length >= 8}>Add Bot</button>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => socket.emit('room:leave')}>Leave Room</button>
          </div>
          {!isHost && <p className="text-muted" style={{ marginTop: '1rem', textAlign: 'center' }}>Waiting for host to start...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1 className="lobby-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>FLIP <span style={{ color: 'var(--accent-primary)' }}>7</span></h1>
        
        {error && <div className="toast toast-danger" style={{ position: 'relative', top: 0, left: 0, transform: 'none', marginBottom: '1rem', width: '100%' }}>{error}</div>}

        <div className="lobby-section">
          <input 
            type="text" 
            className="input-field" 
            placeholder="Your Name" 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value)} 
            maxLength={15}
          />
        </div>

        <div className="lobby-split">
          <div className="lobby-section">
            <h3>Create a Room</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Target Score ({targetScore})</label>
              <input type="range" min="50" max="300" step="50" value={targetScore} onChange={(e) => setTargetScore(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Turn Time ({turnTimer}s)</label>
              <input type="range" min="15" max="60" step="5" value={turnTimer} onChange={(e) => setTurnTimer(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreate} disabled={!playerName.trim()}>Create Room</button>
          </div>

          <div className="lobby-section">
            <h3>Join a Room</h3>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Room Code" 
              value={joinCode} 
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ marginBottom: '1rem' }}
            />
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleJoin} disabled={!playerName.trim() || !joinCode.trim()}>Join Room</button>
          </div>
        </div>
      </div>
    </div>
  );
};
