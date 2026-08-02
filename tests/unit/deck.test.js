import { Deck, CardType } from '../../server/game/Deck.js';

describe('Deck', () => {
  let deck;

  beforeEach(() => {
    deck = new Deck();
  });

  test('should initialize with 100 cards', () => {
    expect(deck.remaining).toBe(100);
    expect(deck.discardPile.length).toBe(0);
  });

  test('should draw cards correctly and reduce remaining', () => {
    const card = deck.draw();
    expect(card).toBeDefined();
    expect(deck.remaining).toBe(99);
  });

  test('should allow discarding cards to the discard pile', () => {
    const card = deck.draw();
    deck.discard(card);
    expect(deck.discardPile.length).toBe(1);
    expect(deck.discardPile[0].id).toBe(card.id);
  });

  test('should reshuffle discard pile when deck is empty', () => {
    // Draw all 100 cards
    const drawnCards = [];
    for (let i = 0; i < 100; i++) {
      drawnCards.push(deck.draw());
    }

    expect(deck.remaining).toBe(0);
    expect(deck.draw()).toBeNull(); // Empty discard pile, should return null

    // Discard 10 cards
    for (let i = 0; i < 10; i++) {
      deck.discard(drawnCards[i]);
    }
    
    expect(deck.discardPile.length).toBe(10);

    // Now drawing should trigger a reshuffle of the 10 discarded cards
    const newCard = deck.draw();
    expect(newCard).toBeDefined();
    expect(deck.discardPile.length).toBe(0);
    expect(deck.remaining).toBe(9); // 10 cards were reshuffled, 1 was drawn
  });
});
