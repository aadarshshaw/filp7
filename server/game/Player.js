import { CardType, ModifierKind } from './Deck.js';

/**
 * Represents a single player (human or bot) within a game round.
 */
export class Player {
  /**
   * @param {string} id        — unique socket id or bot id
   * @param {string} name      — display name
   * @param {boolean} isBot    — true for AI-controlled players
   */
  constructor(id, name, isBot = false) {
    this.id = id;
    this.name = name;
    this.isBot = isBot;
    this.isOffline = false;

    // ── Per-round state (reset each round) ──
    this.hand = [];           // number cards in front of the player
    this.modifiers = [];      // modifier cards collected
    this.actionCards = [];    // action cards held (to be played)
    this.roundScore = 0;
    this.status = 'active';   // 'active' | 'stayed' | 'busted'
    this.hasSecondChance = false; // whether they hold a Second Chance card

    // ── Persistent state (across rounds) ──
    this.totalScore = 0;
    this.roundHistory = [];   // array of per-round scores
    this.connected = true;    // tracks socket connection status
  }

  // ─────────────────────────────────────────────
  //  Card Management
  // ─────────────────────────────────────────────

  /** Check if this player already has a number card with value `n`. */
  hasNumber(n) {
    return this.hand.some(c => c.value === n);
  }

  /** Get the set of number values currently in hand. */
  get numberValues() {
    return new Set(this.hand.map(c => c.value));
  }

  /** Count of unique number cards in hand. */
  get uniqueNumberCount() {
    return this.hand.length; // hand only contains unique numbers (dupes = bust)
  }

  addNumberCard(card) {
    if (this.hasNumber(card.value)) {
      // ── BUST ──
      this.hand.push(card); // Let player see the card that busted them
      return { busted: true, flip7: false, card };
    }

    this.hand.push(card);

    // ── Check Flip 7 ──
    if (this.uniqueNumberCount >= 7) {
      return { busted: false, flip7: true, card };
    }

    return { busted: false, flip7: false, card };
  }

  /** Add a modifier card. */
  addModifier(card) {
    this.modifiers.push(card);
  }

  /** Mark the player as holding a Second Chance. */
  grantSecondChance() {
    this.hasSecondChance = true;
  }

  /** Use the Second Chance to survive a bust. Returns true if used. */
  useSecondChance() {
    if (this.hasSecondChance) {
      this.hasSecondChance = false;
      // Remove it from modifiers so it disappears visually when used
      const idx = this.modifiers.findIndex(m => m.action === 'second_chance');
      if (idx !== -1) {
        this.modifiers.splice(idx, 1);
      }
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────
  //  Status
  // ─────────────────────────────────────────────

  stay() {
    this.status = 'stayed';
  }

  freeze() {
    this.status = 'frozen';
  }

  bust() {
    this.status = 'busted';
    this.roundScore = 0;
  }

  get isActive() {
    return this.status === 'active';
  }

  get hasStayed() {
    return this.status === 'stayed' || this.status === 'frozen';
  }

  get hasBusted() {
    return this.status === 'busted';
  }

  // ─────────────────────────────────────────────
  //  Scoring
  // ─────────────────────────────────────────────

  /**
   * Calculate round score:
   *   1. Sum of number card values
   *   2. Apply x2 multiplier (doubles number sum only)
   *   3. Add flat modifiers (+2, +4, etc.)
   *   4. Add Flip 7 bonus (+15) if 7 unique numbers
   */
  calculateScore() {
    if (this.hasBusted) {
      this.roundScore = 0;
      return 0;
    }

    // 1. Sum number cards
    let numberSum = this.hand.reduce((sum, c) => sum + c.value, 0);

    // 2. Apply x2 multipliers
    const multiplierCount = this.modifiers.filter(
      m => m.kind === ModifierKind.MULTIPLY
    ).length;
    for (let i = 0; i < multiplierCount; i++) {
      numberSum *= 2;
    }

    // 3. Add flat modifiers
    const flatBonus = this.modifiers
      .filter(m => m.kind === ModifierKind.PLUS)
      .reduce((sum, m) => sum + m.value, 0);

    // 4. Flip 7 bonus
    const flip7Bonus = this.uniqueNumberCount >= 7 ? 15 : 0;

    this.roundScore = numberSum + flatBonus + flip7Bonus;
    return this.roundScore;
  }

  /** Finalize the round: calculate score, add to total, record history. */
  finalizeRound() {
    this.calculateScore();
    this.totalScore += this.roundScore;
    this.roundHistory.push(this.roundScore);
  }

  /** Reset per-round state for a new round. */
  resetRound() {
    this.hand = [];
    this.modifiers = [];
    this.actionCards = [];
    this.roundScore = 0;
    this.status = 'active';
    this.hasSecondChance = false;
  }

  // ─────────────────────────────────────────────
  //  Serialization (safe to send to clients)
  // ─────────────────────────────────────────────

  /** Full state for the player themselves. */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      isBot: this.isBot,
      hand: this.hand,
      modifiers: this.modifiers,
      roundScore: this.roundScore,
      totalScore: this.totalScore,
      status: this.status,
      uniqueNumberCount: this.uniqueNumberCount,
      hasSecondChance: this.hasSecondChance,
      roundHistory: this.roundHistory,
      connected: this.connected,
    };
  }

  /** Abbreviated state for other players to see. */
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      isBot: this.isBot,
      hand: this.hand,           // cards are face-up in Flip 7
      modifiers: this.modifiers,
      roundScore: this.roundScore,
      totalScore: this.totalScore,
      status: this.status,
      uniqueNumberCount: this.uniqueNumberCount,
      roundHistory: this.roundHistory,
      connected: this.connected,
    };
  }
}
