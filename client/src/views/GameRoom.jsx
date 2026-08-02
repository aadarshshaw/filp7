import React from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { HUD } from '../components/HUD';
import { CenterStage } from '../components/CenterStage';
import { MyHand } from '../components/MyHand';
import { OpponentHand } from '../components/OpponentHand';
import { Scoreboard } from '../components/Scoreboard';
import { Overlays } from '../components/Overlays';

export const GameRoom = () => {
  const { gameState, myPlayerId } = useGameState();

  if (!gameState) return <div className="loading-screen">Loading game state...</div>;

  const opponents = gameState.players.filter(p => p.id !== myPlayerId);

  return (
    <>
      <HUD />
      
      <main className="game-board">
        {/* Opponents Top Area */}
        <div className="opponents-container">
          {opponents.map(opp => (
            <OpponentHand key={opp.id} opponent={opp} />
          ))}
        </div>

        <CenterStage />

        <MyHand />
      </main>

      <Scoreboard />
      <Overlays />
    </>
  );
};
