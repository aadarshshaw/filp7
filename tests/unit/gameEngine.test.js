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
    
    // Ensure player has a normal card in hand to stay
    cp.hand = [{ value: 5, label: '5', isModifier: false }];

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
    
    // Force normal cards in hands so we know exactly how many are discarded
    engine.players[0].hand = [{ value: 5, label: '5', isModifier: false }];
    engine.players[0].modifiers = [];
    engine.players[1].hand = [{ value: 7, label: '7', isModifier: false }];
    engine.players[1].modifiers = [];
    
    const deckRemainingRound1 = engine.deck.remaining;
    expect(deckRemainingRound1).toBeLessThan(100);
    
    // Simulate end of round manually
    engine.startNewRound();
    
    // Discard pile should now contain the 2 cards from round 1
    expect(engine.deck.discardPile.length).toBe(2);
  });
});
