import { Deck, CardType, ActionName } from './Deck.js';
import { Player } from './Player.js';
import { Bot } from './Bot.js';
import { ActionResolver } from './ActionResolver.js';

/**
 * GameEngine manages the full lifecycle of a Flip 7 game:
 *   - Multiple rounds until a player reaches the target score
 *   - Turn-by-turn play with Hit / Stay decisions
 *   - Card resolution (number, modifier, action)
 *   - Scoring and winner determination
 *
 * IMPORTANT: The engine is fully self-contained. It handles:
 *   - Bot scheduling internally
 *   - Round transitions via internal timers
 *   - All state broadcasts via the emit callback
 *   Socket handlers should NOT set their own timers or extra emits.
 */
export class GameEngine {
  constructor(settings = {}, emit = () => {}) {
    this.targetScore = settings.targetScore || 200;
    this.turnTimer = settings.turnTimer || 30;
    this.emit = emit;

    this.deck = new Deck();
    this.players = [];
    this.bots = new Map();

    this.currentPlayerIndex = -1;
    this.roundNumber = 0;
    this.phase = 'waiting'; // 'waiting' | 'dealing' | 'playing' | 'roundEnd' | 'gameOver'
    this.turnTimerHandle = null;
    this.roundEndTimer = null;
    this.pendingAction = null;
    this.dealerIndex = -1;
  }

  // ═══════════════════════════════════════════
  //  PLAYER MANAGEMENT
  // ═══════════════════════════════════════════

  addPlayer(id, name) {
    if (this.players.find(p => p.id === id)) return;
    const player = new Player(id, name, false);
    this.players.push(player);
    return player;
  }

  addBots(count) {
    for (let i = 0; i < count; i++) {
      const bot = new Bot();
      const player = new Player(bot.id, bot.name, true);
      this.players.push(player);
      this.bots.set(bot.id, bot);
    }
  }

  removePlayer(id) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx === -1) return;
    const player = this.players[idx];

    if (this.phase === 'playing' || this.phase === 'dealing') {
      player.connected = false;
      player.bust();
      if (this.currentPlayerIndex === idx) {
        this.postTurnCheck();
      }
    } else {
      this.players.splice(idx, 1);
      this.bots.delete(id);
    }
  }

  getPlayer(id) {
    return this.players.find(p => p.id === id);
  }

  get activePlayers() {
    return this.players.filter(p => p.isActive);
  }

  get currentPlayer() {
    if (this.currentPlayerIndex < 0 || this.currentPlayerIndex >= this.players.length) {
      return null;
    }
    return this.players[this.currentPlayerIndex];
  }

  // ═══════════════════════════════════════════
  //  GAME FLOW
  // ═══════════════════════════════════════════

  startGame() {
    const minPlayers = 3;
    if (this.players.length < minPlayers) {
      this.addBots(minPlayers - this.players.length);
    }
    this.roundNumber = 0;
    this.dealerIndex = 0;
    this.phase = 'playing';
    this.startNewRound();
  }

  startNewRound() {
    this.clearRoundEndTimer();
    this.clearTurnTimer();
    this.roundNumber++;
    this.deck.reset();

    // Reset ALL players for the new round
    for (const p of this.players) {
      p.resetRound();
    }

    // Rotate dealer
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

    this.phase = 'dealing';
    this.emit('round:start', {
      roundNumber: this.roundNumber,
      dealerIndex: this.dealerIndex,
    });

    // Deal one card to each player
    this.dealInitialCards();

    this.phase = 'playing';

    // First turn goes to player left of dealer
    this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;

    // Find first active player
    if (!this.currentPlayer?.isActive) {
      const found = this.findNextActivePlayer();
      if (!found) {
        // Everyone is already out (very unlikely but handle it)
        this.endRound();
        return;
      }
    }

    // Broadcast the fresh round state
    this.broadcastState();
    this.emitTurn();
    this.scheduleBotMove();
  }

  dealInitialCards() {
    for (let i = 0; i < this.players.length; i++) {
      const playerIdx = (this.dealerIndex + 1 + i) % this.players.length;
      const player = this.players[playerIdx];

      const card = this.deck.draw();
      if (!card) break;

      const result = this.resolveCardForPlayer(card, player);

      this.emit('game:cardDealt', {
        playerId: player.id,
        playerName: player.name,
        card,
        result,
        isInitialDeal: true,
      });
    }
  }

  // ═══════════════════════════════════════════
  //  TURN ACTIONS
  // ═══════════════════════════════════════════

  hit(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return { error: 'Player not found' };
    if (this.phase !== 'playing') return { error: 'Game not in playing phase' };
    if (this.currentPlayer?.id !== playerId) return { error: 'Not your turn' };
    if (!player.isActive) return { error: 'Player is not active' };

    this.clearTurnTimer();

    const card = this.deck.draw();
    if (!card) {
      player.stay();
      this.emit('game:forcedStay', { playerId, reason: 'Deck exhausted' });
      this.postTurnCheck();
      return { forcedStay: true };
    }

    // Action card needing target
    if (card.type === CardType.ACTION && ActionResolver.requiresTarget(card)) {
      const validTargets = ActionResolver.getValidTargets(player, this.players);

      if (player.isBot) {
        const bot = this.bots.get(player.id);
        const target = bot ? bot.chooseTarget(card, validTargets) : validTargets[0];
        return this.resolveAction(playerId, card, target?.id);
      }

      if (validTargets.length === 0) {
        const actionResult = ActionResolver.resolve(card, player, null, this);
        this.emitActionEvents(actionResult.events);
        this.postTurnCheck();
        return { card, actionFizzled: true };
      }

      this.pendingAction = { card, playerId };
      this.emit('game:actionChoice', {
        playerId,
        card,
        validTargets: validTargets.map(t => ({ id: t.id, name: t.name })),
      });
      return { card, awaitingTarget: true };
    }

    // Resolve card normally
    const result = this.resolveCardForPlayer(card, player);

    this.emit('game:cardDealt', {
      playerId: player.id,
      playerName: player.name,
      card,
      result,
      isInitialDeal: false,
    });

    if (result.busted) {
      this.emit('game:playerBusted', {
        playerId: player.id,
        playerName: player.name,
        card,
      });
      this.postTurnCheck();
      return { card, result };
    }

    if (result.flip7) {
      player.stay();
      this.emit('game:flip7', {
        playerId: player.id,
        playerName: player.name,
      });
      this.postTurnCheck();
      return { card, result };
    }

    // Successful hit — advance to next player
    this.postTurnCheck();
    return { card, result };
  }

  resolveAction(playerId, card, targetId) {
    const player = this.getPlayer(playerId);
    const target = targetId ? this.getPlayer(targetId) : null;
    const actionCard = card || this.pendingAction?.card;
    this.pendingAction = null;

    if (!actionCard) return { error: 'No pending action' };

    const actionResult = ActionResolver.resolve(actionCard, player, target, this);
    this.emitActionEvents(actionResult.events);

    if (actionResult.flip7) {
      if (target) target.stay();
      this.emit('game:flip7', {
        playerId: target?.id,
        playerName: target?.name,
      });
    }

    this.postTurnCheck();
    return { card: actionCard, actionResult };
  }

  stay(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) return { error: 'Player not found' };
    if (this.phase !== 'playing') return { error: 'Game not in playing phase' };
    if (this.currentPlayer?.id !== playerId) return { error: 'Not your turn' };
    if (!player.isActive) return { error: 'Player is not active' };

    if (player.hand.length === 0) {
      return { error: 'Cannot stay with no cards' };
    }

    this.clearTurnTimer();
    player.stay();

    this.emit('game:playerStayed', {
      playerId: player.id,
      playerName: player.name,
    });

    this.postTurnCheck();
    return { stayed: true };
  }

  // ═══════════════════════════════════════════
  //  CARD RESOLUTION
  // ═══════════════════════════════════════════

  resolveCardForPlayer(card, player) {
    if (card.type === CardType.NUMBER) {
      const { busted, flip7 } = player.addNumberCard(card);

      if (busted) {
        if (player.useSecondChance()) {
          this.deck.discard(card);
          player.hand.pop(); // Remove the bursting card from hand
          this.emit('game:secondChanceUsed', {
            playerId: player.id,
            playerName: player.name,
            card,
          });
          return { busted: false, flip7: false, secondChanceUsed: true, card };
        }
        player.bust();
        return { busted: true, flip7: false, secondChanceUsed: false, card };
      }

      return { busted: false, flip7, secondChanceUsed: false, card };
    }

    if (card.type === CardType.MODIFIER) {
      player.addModifier(card);
      return { busted: false, flip7: false, modifier: true, card };
    }

    if (card.type === CardType.ACTION) {
      if (card.action === ActionName.SECOND_CHANCE) {
        const result = ActionResolver.resolve(card, player, null, this);
        player.addModifier(card); // Keep in hand visually
        this.emitActionEvents(result.events);
        return { busted: false, flip7: false, action: true, card };
      }

      // During dealing phase, auto-resolve with random target
      if (this.phase === 'dealing') {
        const validTargets = ActionResolver.getValidTargets(player, this.players);
        const target = validTargets.length > 0
          ? validTargets[Math.floor(Math.random() * validTargets.length)]
          : null;
        const result = ActionResolver.resolve(card, player, target, this);
        this.emitActionEvents(result.events);
        return { busted: false, flip7: result.flip7, action: true, card };
      }

      return { busted: false, flip7: false, action: true, card };
    }

    return { busted: false, flip7: false, card };
  }

  // ═══════════════════════════════════════════
  //  TURN MANAGEMENT
  // ═══════════════════════════════════════════

  /**
   * After a player's action, check if round is over or advance turn.
   * This is THE central flow control — every action path ends here.
   */
  postTurnCheck() {
    if (this.isRoundOver()) {
      this.endRound();
      // endRound handles its own state broadcast
    } else {
      this.advanceTurn();
      this.broadcastState();
    }
  }

  /** Find and move to the next active player. Returns false if none. */
  findNextActivePlayer() {
    const startIdx = this.currentPlayerIndex;
    let attempts = 0;
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      attempts++;
      if (this.currentPlayer?.isActive) return true;
    } while (attempts <= this.players.length);
    return false;
  }

  advanceTurn() {
    this.clearTurnTimer();
    const found = this.findNextActivePlayer();
    if (!found) return; // no active players — round should end

    this.emitTurn();
    this.scheduleBotMove();
  }

  emitTurn() {
    const cp = this.currentPlayer;
    if (!cp) return;
    this.emit('game:turn', {
      playerId: cp.id,
      playerName: cp.name,
      isBot: cp.isBot,
      turnTimer: this.turnTimer,
    });
    this.startTurnTimer();
  }

  emitActionEvents(events) {
    for (const evt of events) {
      this.emit('game:action', evt);
    }
  }

  /** Broadcast the full game state to all clients. */
  broadcastState() {
    this.emit('game:state', this.getState());
  }

  // ═══════════════════════════════════════════
  //  ROUND / GAME END
  // ═══════════════════════════════════════════

  /** Round is over when every player has busted or stayed. */
  isRoundOver() {
    return this.players.length > 0 &&
           this.players.every(p => p.hasBusted || p.hasStayed);
  }

  endRound() {
    this.clearTurnTimer();
    this.phase = 'roundEnd';

    for (const p of this.players) {
      p.finalizeRound();
    }

    const roundScores = this.players.map(p => ({
      id: p.id,
      name: p.name,
      roundScore: p.roundScore,
      totalScore: p.totalScore,
      status: p.status === 'busted' ? 'busted' : 'scored',
    }));

    this.emit('game:roundEnd', {
      roundNumber: this.roundNumber,
      scores: roundScores,
    });

    // Check for winner
    const winner = this.getWinner();
    if (winner) {
      this.phase = 'gameOver';
      this.emit('game:over', {
        winnerId: winner.id,
        winnerName: winner.name,
        finalScores: this.players.map(p => ({
          id: p.id,
          name: p.name,
          totalScore: p.totalScore,
          roundHistory: p.roundHistory,
        })),
      });
      this.broadcastState();
      return;
    }

    // Broadcast roundEnd state, then auto-advance after 4s
    this.broadcastState();
    this.clearRoundEndTimer();
    this.roundEndTimer = setTimeout(() => {
      if (this.phase === 'roundEnd') {
        this.nextRound();
      }
    }, 4000);
  }

  nextRound() {
    if (this.phase === 'gameOver') return;
    this.clearRoundEndTimer();
    this.phase = 'playing';
    this.startNewRound();
  }

  clearRoundEndTimer() {
    if (this.roundEndTimer) {
      clearTimeout(this.roundEndTimer);
      this.roundEndTimer = null;
    }
  }

  getWinner() {
    return this.players.find(p => p.totalScore >= this.targetScore) || null;
  }

  isGameOver() {
    return this.phase === 'gameOver';
  }

  // ═══════════════════════════════════════════
  //  BOT SCHEDULING
  // ═══════════════════════════════════════════

  scheduleBotMove() {
    const cp = this.currentPlayer;
    if (!cp || !cp.isBot || !cp.isActive) return;

    const bot = this.bots.get(cp.id);
    if (!bot) return;

    const delay = bot.thinkingDelay;

    setTimeout(() => {
      if (this.phase !== 'playing') return;
      if (this.currentPlayer?.id !== cp.id) return;
      if (!cp.isActive) return;

      const decision = bot.decide(cp, this.deck, this.players);

      if (decision === 'hit') {
        this.hit(cp.id);
      } else {
        this.stay(cp.id);
      }
    }, delay);
  }

  // ═══════════════════════════════════════════
  //  TURN TIMER
  // ═══════════════════════════════════════════

  startTurnTimer() {
    if (!this.turnTimer || this.currentPlayer?.isBot) return;
    this.clearTurnTimer();

    this.turnTimerHandle = setTimeout(() => {
      const cp = this.currentPlayer;
      if (!cp || !cp.isActive) return;

      if (cp.hand.length === 0) {
        this.hit(cp.id);
      } else {
        this.stay(cp.id);
      }

      this.emit('game:timerExpired', {
        playerId: cp.id,
        playerName: cp.name,
      });
    }, this.turnTimer * 1000);
  }

  clearTurnTimer() {
    if (this.turnTimerHandle) {
      clearTimeout(this.turnTimerHandle);
      this.turnTimerHandle = null;
    }
  }

  // ═══════════════════════════════════════════
  //  STATE SERIALIZATION
  // ═══════════════════════════════════════════

  getState() {
    return {
      phase: this.phase,
      roundNumber: this.roundNumber,
      targetScore: this.targetScore,
      turnTimer: this.turnTimer,
      currentPlayerId: this.currentPlayer?.id || null,
      deckRemaining: this.deck.remaining,
      players: this.players.map(p => p.toPublicJSON()),
    };
  }
}
