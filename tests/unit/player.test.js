import { Player } from '../../server/game/Player.js';
import { CardType, ModifierKind } from '../../server/game/Deck.js';

describe('Player', () => {
  let player;

  beforeEach(() => {
    player = new Player('test-id', 'Test Player', false);
  });

  test('should initialize correctly', () => {
    expect(player.id).toBe('test-id');
    expect(player.name).toBe('Test Player');
    expect(player.isBot).toBe(false);
    expect(player.hand).toEqual([]);
    expect(player.modifiers).toEqual([]);
    expect(player.status).toBe('active');
  });

  test('should add a number card to the hand', () => {
    const card = { type: CardType.NUMBER, value: 5, label: '5' };
    player.addNumberCard(card);
    expect(player.hand.length).toBe(1);
    expect(player.hand[0]).toEqual(card);
  });

  test('should add a modifier card', () => {
    const card = { type: CardType.MODIFIER, kind: ModifierKind.PLUS, value: 3, label: '+3' };
    player.addModifier(card);
    expect(player.modifiers.length).toBe(1);
    expect(player.modifiers[0]).toEqual(card);
  });

  test('should correctly calculate score with no modifiers', () => {
    player.addNumberCard({ type: CardType.NUMBER, value: 5, label: '5' });
    player.addNumberCard({ type: CardType.NUMBER, value: 2, label: '2' });
    expect(player.calculateScore()).toBe(7);
  });

  test('should correctly calculate score with + and x modifiers', () => {
    player.addNumberCard({ type: CardType.NUMBER, value: 5, label: '5' });
    player.addNumberCard({ type: CardType.NUMBER, value: 2, label: '2' });
    player.addModifier({ type: CardType.MODIFIER, kind: ModifierKind.PLUS, value: 3, label: '+3' });
    player.addModifier({ type: CardType.MODIFIER, kind: ModifierKind.MULTIPLY, value: 2, label: 'x2' });
    
    // According to GameEngine logic, multiply usually applies to the hand sum, then flat bonuses are added.
    // 7 * 2 = 14; 14 + 3 = 17.
    expect(player.calculateScore()).toBe(17);
  });

  test('should identify busted state', () => {
    player.addNumberCard({ type: CardType.NUMBER, value: 5, label: '5' });
    const result = player.addNumberCard({ type: CardType.NUMBER, value: 5, label: '5' });
    
    expect(result.busted).toBe(true);
  });

  test('should handle second chance correctly', () => {
    player.hasSecondChance = true;
    player.addModifier({ action: 'second_chance', label: 'Second Chance' });
    
    const used = player.useSecondChance();
    expect(used).toBe(true);
    expect(player.hasSecondChance).toBe(false);
    expect(player.modifiers.length).toBe(0); // Should be removed from modifiers
  });

  test('should handle status transitions', () => {
    player.stay();
    expect(player.status).toBe('stayed');
    
    player.freeze();
    expect(player.status).toBe('frozen');
    expect(player.hasStayed).toBe(true); // Frozen counts as stayed for turn progression
  });
});
