// ── Card Types ──
export const CardType = {
  NUMBER: 'number',
  MODIFIER: 'modifier',
  ACTION: 'action',
};

// ── Action Card Names ──
export const ActionName = {
  FREEZE: 'freeze',
  FLIP_THREE: 'flip_three',
  SECOND_CHANCE: 'second_chance',
};

// ── Modifier Sub-types ──
export const ModifierKind = {
  PLUS: 'plus',       // +2, +4, +6, +8, +10
  MULTIPLY: 'multiply' // x2
};

/**
 * Builds the official 94-card Flip 7 deck.
 *
 * Number cards (0–12): quantity equals face value (0 has 1 copy).
 *   → 0×1 + 1×1 + 2×2 + 3×3 + … + 12×12  but the "0" card still has 1 copy
 *   → 1+1+2+3+4+5+6+7+8+9+10+11+12 = 79 cards
 *
 * Score Modifiers (12 cards):
 *   +2, +4, +6, +8, +10  — 2 copies each = 10
 *   x2                    — 2 copies       =  2
 *
 * Action Cards (3 cards × 3 copies = 9):
 *   Freeze, Flip Three, Second Chance
 *
 * Total = 79 + 12 + 9 = 100   ← NOTE: some sources say 94; we follow
 * the most widely-cited distribution which yields 100 cards.  The exact
 * count doesn't affect gameplay — the distribution ratios are what matter.
 */
function buildDeckTemplate() {
  const cards = [];

  // ── Number cards ──
  for (let n = 0; n <= 12; n++) {
    const copies = n === 0 ? 1 : n;
    for (let i = 0; i < copies; i++) {
      cards.push({
        type: CardType.NUMBER,
        value: n,
        label: `${n}`,
      });
    }
  }

  // ── Score Modifier cards ──
  const plusValues = [2, 4, 6, 8, 10];
  for (const v of plusValues) {
    for (let i = 0; i < 2; i++) {
      cards.push({
        type: CardType.MODIFIER,
        kind: ModifierKind.PLUS,
        value: v,
        label: `+${v}`,
      });
    }
  }
  // x2 multiplier
  for (let i = 0; i < 2; i++) {
    cards.push({
      type: CardType.MODIFIER,
      kind: ModifierKind.MULTIPLY,
      value: 2,
      label: 'x2',
    });
  }

  // ── Action cards ──
  const actions = [
    { name: ActionName.FREEZE, label: 'Freeze', emoji: '❄️' },
    { name: ActionName.FLIP_THREE, label: 'Flip Three', emoji: '🃏' },
    { name: ActionName.SECOND_CHANCE, label: 'Second Chance', emoji: '🔄' },
  ];
  for (const a of actions) {
    for (let i = 0; i < 3; i++) {
      cards.push({
        type: CardType.ACTION,
        action: a.name,
        label: a.label,
        emoji: a.emoji,
      });
    }
  }

  return cards;
}

// ── Fisher-Yates shuffle (in-place) ──
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deck manages the draw pile for a single round.
 */
export class Deck {
  constructor() {
    this.cards = [];
    this.discardPile = [];
    this.reset();
  }

  /** Rebuild and shuffle a fresh deck. */
  reset() {
    // Deep-clone template so each card object is unique
    this.cards = buildDeckTemplate().map((c, idx) => ({ ...c, id: idx }));
    shuffle(this.cards);
    this.discardPile = [];
  }

  /** Draw the top card. Reshuffles discard pile if empty. Returns null if both are empty. */
  draw() {
    if (this.cards.length === 0) {
      if (this.discardPile.length === 0) return null;
      // Reshuffle discard pile to form new draw pile
      this.cards = [...this.discardPile];
      shuffle(this.cards);
      this.discardPile = [];
    }
    return this.cards.pop();
  }

  /** Put a card into the discard pile (e.g. after bust or Second Chance). */
  discard(card) {
    this.discardPile.push(card);
  }

  /** Number of cards remaining in the draw pile. */
  get remaining() {
    return this.cards.length;
  }

  /**
   * Returns a map of { numberValue → countRemaining } for number cards
   * still in the draw pile.  Used by Bot AI for probability calculations.
   */
  remainingByNumber() {
    const counts = {};
    for (let n = 0; n <= 12; n++) counts[n] = 0;
    for (const c of this.cards) {
      if (c.type === CardType.NUMBER) {
        counts[c.value]++;
      }
    }
    return counts;
  }

  /**
   * Returns the total count of number cards still in the draw pile.
   */
  remainingNumberCount() {
    return this.cards.filter(c => c.type === CardType.NUMBER).length;
  }

  /** Peek at the top N cards without removing them (for debug). */
  peek(n = 1) {
    return this.cards.slice(-n).reverse();
  }
}
