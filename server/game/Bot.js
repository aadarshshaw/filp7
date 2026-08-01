import { ActionResolver } from './ActionResolver.js';
import { ActionName } from './Deck.js';

// ── Fun bot names ──
const BOT_FIRST = [
  'Lucky', 'Blaze', 'Shadow', 'Ace', 'Jinx', 'Nova', 'Frost', 'Storm',
  'Rogue', 'Spark', 'Mystic', 'Drift', 'Echo', 'Viper', 'Zephyr', 'Neon',
  'Pixel', 'Comet', 'Flux', 'Glitch',
];

const BOT_LAST = [
  'McFlip', 'von Risk', 'the Bold', 'Jr.', 'Bot', 'AI', '3000',
  'Prime', 'Zero', 'X', 'Omega', 'the Lucky', 'Gambler', 'Dealer',
];

let botCounter = 0;

/**
 * Generates a unique fun bot name.
 */
function generateBotName() {
  const first = BOT_FIRST[Math.floor(Math.random() * BOT_FIRST.length)];
  const last = BOT_LAST[Math.floor(Math.random() * BOT_LAST.length)];
  botCounter++;
  return `${first} ${last}`;
}

/**
 * Bot personality types affect risk tolerance.
 */
const Personality = {
  CONSERVATIVE: 'conservative', // stays at lower bust risk
  BALANCED: 'balanced',         // moderate risk
  AGGRESSIVE: 'aggressive',     // pushes luck further
};

/**
 * AI Bot for Flip 7.
 *
 * Uses probability-based decision making:
 *  - Calculates P(bust) based on cards already in hand vs. remaining deck
 *  - Adjusts risk threshold based on personality + game position
 */
export class Bot {
  /**
   * @param {string} [personality] — 'conservative' | 'balanced' | 'aggressive'
   */
  constructor(personality) {
    this.id = `bot_${botCounter}_${Date.now()}`;
    this.name = generateBotName();
    this.personality = personality || Bot.randomPersonality();
  }

  static randomPersonality() {
    const all = Object.values(Personality);
    return all[Math.floor(Math.random() * all.length)];
  }

  /**
   * Decide whether to HIT or STAY.
   *
   * @param {Player}  player     — this bot's Player instance
   * @param {Deck}    deck       — the current deck
   * @param {Player[]} allPlayers — all players in the game
   * @returns {'hit' | 'stay'}
   */
  decide(player, deck, allPlayers) {
    // Must hit if fewer than 3 cards (press luck early)
    if (player.hand.length <= 2) return 'hit';

    // Calculate bust probability
    const bustProb = this.calculateBustProbability(player, deck);

    // Determine risk threshold based on personality + position
    const threshold = this.getRiskThreshold(player, allPlayers);

    // Add a small random factor for unpredictability (±5%)
    const jitter = (Math.random() - 0.5) * 0.10;
    const adjustedThreshold = Math.max(0.1, Math.min(0.9, threshold + jitter));

    if (bustProb >= adjustedThreshold) {
      return 'stay';
    }

    // Also consider staying if we have a good score
    if (player.hand.length >= 5 && bustProb > 0.3) {
      return 'stay';
    }

    return 'hit';
  }

  /**
   * Calculate probability of busting on the next draw.
   *
   * P(bust) = (number cards in deck that match a value in hand) / (total cards remaining)
   */
  calculateBustProbability(player, deck) {
    const remaining = deck.remaining;
    if (remaining === 0) return 1;

    const remainingByNumber = deck.remainingByNumber();
    let dangerCards = 0;

    // Count how many cards in the deck would cause a bust
    for (const value of player.numberValues) {
      dangerCards += (remainingByNumber[value] || 0);
    }

    return dangerCards / remaining;
  }

  /**
   * Get the bust-risk threshold at which the bot should stay.
   * Lower threshold = more conservative (stays earlier).
   */
  getRiskThreshold(player, allPlayers) {
    let base;
    switch (this.personality) {
      case Personality.CONSERVATIVE:
        base = 0.35;
        break;
      case Personality.AGGRESSIVE:
        base = 0.55;
        break;
      case Personality.BALANCED:
      default:
        base = 0.45;
        break;
    }

    // Adjust based on position — play riskier when behind
    const maxScore = Math.max(...allPlayers.map(p => p.totalScore));
    const scoreDiff = maxScore - player.totalScore;

    if (scoreDiff > 50) {
      base += 0.10;  // way behind — take more risks
    } else if (scoreDiff > 20) {
      base += 0.05;
    } else if (player.totalScore >= maxScore && player.totalScore > 0) {
      base -= 0.05;  // in the lead — play safer
    }

    // If close to Flip 7, be more aggressive
    if (player.uniqueNumberCount >= 5) {
      base += 0.10;
    }

    // Second chance in hand — can afford more risk
    if (player.hasSecondChance) {
      base += 0.15;
    }

    return Math.max(0.15, Math.min(0.80, base));
  }

  /**
   * Choose a target for an action card (Freeze / Flip Three).
   * Strategy:
   *  - Freeze: target the player with the best hand (most cards / highest score)
   *  - Flip Three: target the player with the most cards (highest bust risk)
   */
  chooseTarget(actionCard, validTargets) {
    if (validTargets.length === 0) return null;

    if (actionCard.action === ActionName.FREEZE) {
      // Freeze the player with the highest current hand value
      return validTargets.reduce((best, p) => {
        const bestScore = best.hand.reduce((s, c) => s + c.value, 0);
        const pScore = p.hand.reduce((s, c) => s + c.value, 0);
        return pScore > bestScore ? p : best;
      });
    }

    if (actionCard.action === ActionName.FLIP_THREE) {
      // Flip Three on the player with the most cards (highest bust probability)
      return validTargets.reduce((best, p) => {
        return p.hand.length > best.hand.length ? p : best;
      });
    }

    // Default: random target
    return validTargets[Math.floor(Math.random() * validTargets.length)];
  }

  /**
   * Fast thinking delay (ms) so bots play quickly.
   */
  get thinkingDelay() {
    const base = 150;
    const variance = 150;
    return base + Math.floor(Math.random() * variance);
  }
}
