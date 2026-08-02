import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';

const GameStateContext = createContext(null);

export const useGameState = () => useContext(GameStateContext);

export const GameStateProvider = ({ children }) => {
  const socket = useSocket();
  const [gameState, setGameState] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [room, setRoom] = useState(null);
  const [view, setView] = useState('lobby'); // 'lobby' | 'game'
  const [error, setError] = useState(null);
  const [lastEvent, setLastEvent] = useState(null); // Useful for triggering specific animations like flash, deal, etc.

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = (data) => {
      setRoom(data.room);
      setMyPlayerId(data.myPlayerId);
      if (data.gameState) {
        setGameState(data.gameState);
      }
      setView(data.room.status === 'playing' ? 'game' : 'lobby');
      setError(null);
    };

    const handleGameState = (state) => {
      setGameState(state);
    };

    const handleError = (msg) => {
      setError(msg);
      // Automatically clear error after 3s
      setTimeout(() => setError(null), 3000);
    };

    const handleEvent = (type) => (data) => {
      setLastEvent({ type, data, timestamp: Date.now() });
    };

    // Subscriptions
    socket.on('room:update', handleRoomUpdate);
    socket.on('game:state', handleGameState);
    socket.on('error', handleError);

    // Event hooks for specific component triggers
    socket.on('game:turn', handleEvent('turn'));
    socket.on('game:cardDealt', handleEvent('cardDealt'));
    socket.on('game:playerBusted', handleEvent('playerBusted'));
    socket.on('game:playerStayed', handleEvent('playerStayed'));
    socket.on('game:flip7', handleEvent('flip7'));
    socket.on('game:roundEnd', handleEvent('roundEnd'));
    socket.on('game:over', handleEvent('gameOver'));
    socket.on('game:action', handleEvent('action'));
    socket.on('game:actionPrompt', handleEvent('actionPrompt'));

    // Try to auto-reconnect to an existing session
    const sid = sessionStorage.getItem('sessionId');
    const rid = sessionStorage.getItem('roomId');
    if (sid && rid) {
      socket.emit('room:reconnect', { sessionId: sid, roomId: rid });
    }

    return () => {
      socket.off('room:update', handleRoomUpdate);
      socket.off('game:state', handleGameState);
      socket.off('error', handleError);
      socket.off('game:turn');
      socket.off('game:cardDealt');
      socket.off('game:playerBusted');
      socket.off('game:playerStayed');
      socket.off('game:flip7');
      socket.off('game:roundEnd');
      socket.off('game:over');
      socket.off('game:action');
      socket.off('game:actionPrompt');
    };
  }, [socket]);

  return (
    <GameStateContext.Provider value={{
      socket,
      gameState,
      myPlayerId,
      room,
      view,
      setView,
      error,
      setError,
      lastEvent
    }}>
      {children}
    </GameStateContext.Provider>
  );
};
