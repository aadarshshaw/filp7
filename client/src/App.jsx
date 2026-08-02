import React from 'react';
import { SocketProvider } from './contexts/SocketContext';
import { GameStateProvider, useGameState } from './contexts/GameStateContext';
import { Lobby } from './views/Lobby';
import { GameRoom } from './views/GameRoom';

const MainApp = () => {
  const { view } = useGameState();
  return view === 'lobby' ? <Lobby /> : <GameRoom />;
};

function App() {
  return (
    <SocketProvider>
      <GameStateProvider>
        <MainApp />
      </GameStateProvider>
    </SocketProvider>
  );
}

export default App;
