import { GameEngine } from '../../server/game/GameEngine.js';

describe('GameEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  test('should initialize with correct default state', () => {
    const state = engine.getState();
    expect(state.phase).toBe('waiting');
    expect(state.players).toEqual([]);
    expect(state.roundNumber).toBe(0);
    expect(state.targetScore).toBe(200);
  });

  test('should add a player successfully', () => {
    const player = engine.addPlayer('socket-id-1', 'Player 1');
    expect(player).toBeDefined();
    expect(player.id).toBe('socket-id-1');
    expect(engine.players.length).toBe(1);
  });

  test('should remove a player successfully', () => {
    engine.addPlayer('socket-id-1', 'Player 1');
    engine.removePlayer('socket-id-1');
    expect(engine.players.length).toBe(0);
  });

  test('should allow a player to hit and stay in playing phase', () => {
    engine.addPlayer('p1', 'Player 1');
    engine.addPlayer('p2', 'Player 2');
    engine.startNewRound();
    
    expect(engine.phase).toBe('playing');
    const cp = engine.currentPlayer;
    expect(cp).toBeDefined();

    // The player should be able to stay
    const stayResult = engine.stay(cp.id);
    expect(stayResult).toBeDefined();
    expect(cp.hasStayed).toBe(true);
  });

  test('should persist deck across rounds and discard played cards', () => {
    engine.addPlayer('p1', 'Player 1');
    engine.addPlayer('p2', 'Player 2');
    
    // First round
    engine.startNewRound();
    const deckRemainingRound1 = engine.deck.remaining;
    expect(deckRemainingRound1).toBeLessThan(100);
    
    // Simulate end of round manually by calling startNewRound again
    // (This triggers the card collection logic in GameEngine)
    engine.startNewRound();
    
    // The deck should NOT reset to 100
    // It should be deckRemainingRound1 - 2 (since 2 cards were dealt for round 2)
    const deckRemainingRound2 = engine.deck.remaining;
    expect(deckRemainingRound2).toBe(deckRemainingRound1 - 2);
    
    // Discard pile should now contain the 2 cards from round 1
    expect(engine.deck.discardPile.length).toBe(2);
  });
});
