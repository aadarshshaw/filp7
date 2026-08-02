import { GameEngine } from '../game/GameEngine.js';
import { Bot } from '../game/Bot.js';

/**
 * Represents a single game room / lobby.
 */
export class Room {
  /**
   * @param {string} code     — unique room code
   * @param {string} hostId   — socket id of the host
   * @param {object} settings — room configuration
   */
  constructor(code, hostId, settings = {}) {
    this.code = code;
    this.hostId = hostId;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    // Settings
    this.settings = {
      targetScore: settings.targetScore || 200,
      turnTimer: settings.turnTimer || 30,
      maxPlayers: Math.min(18, Math.max(3, settings.maxPlayers || 8)),
    };

    // Players and bots in lobby (before game starts)
    // Map of socketId → { id, name, isHost }
    this.lobbyPlayers = new Map();
    this.lobbyBots = new Map();

    // Game engine (created when game starts)
    this.engine = null;

    // Room status
    this.status = 'waiting'; // 'waiting' | 'playing' | 'finished'

    // Chat history (last 100 messages)
    this.chatHistory = [];
  }

  // ─────────────────────────────────────────
  //  LOBBY MANAGEMENT
  // ─────────────────────────────────────────

  /** Add a player to the lobby. */
  addPlayer(socketId, name) {
    if (this.playerCount >= this.settings.maxPlayers) {
      if (this.lobbyBots.size > 0) {
        this.removeBot();
      } else {
        return { error: 'Room is full' };
      }
    }
    if (this.status === 'playing') {
      return { error: 'Game already in progress' };
    }

    this.lobbyPlayers.set(socketId, {
      id: socketId,
      name: name,
      isHost: socketId === this.hostId,
    });
    this.touch();
    return { success: true };
  }

  /** Add a bot to the lobby. */
  addBot() {
    if (this.playerCount >= this.settings.maxPlayers) return false;
    const bot = new Bot();
    this.lobbyBots.set(bot.id, {
      id: bot.id,
      name: bot.name,
      isBot: true,
      joinedAt: Date.now(),
    });
    this.touch();
    return true;
  }

  /** Remove a bot from the lobby. */
  removeBot() {
    if (this.lobbyBots.size === 0) return false;
    // Remove the most recently added bot
    const lastBotId = Array.from(this.lobbyBots.keys()).pop();
    this.lobbyBots.delete(lastBotId);
    this.touch();
    return true;
  }

  /** Handle player disconnection (keep them if playing) */
  handleDisconnect(playerId) {
    if (this.status === 'playing' && this.engine) {
      const p = this.engine.players.find(p => p.id === playerId);
      if (p) {
        p.isOffline = true;
        const lp = this.lobbyPlayers.get(playerId);
        if (lp) lp.isOffline = true;
        this.touch();
        return { isOffline: true };
      }
    }
    return this.removePlayer(playerId);
  }

  /** Handle player reconnection */
  handleReconnect(playerId) {
    if (this.engine) {
      const p = this.engine.players.find(p => p.id === playerId);
      if (p) p.isOffline = false;
    }
    const lp = this.lobbyPlayers.get(playerId);
    if (lp) lp.isOffline = false;
    this.touch();
  }

  /** Remove a player from the lobby or game. */
  removePlayer(socketId) {
    this.lobbyPlayers.delete(socketId);

    // If game is running, remove from engine too
    if (this.engine) {
      this.engine.removePlayer(socketId);
    }

    // Promote new host if the host left
    if (socketId === this.hostId && this.lobbyPlayers.size > 0) {
      const newHostId = this.lobbyPlayers.keys().next().value;
      this.hostId = newHostId;
      const newHost = this.lobbyPlayers.get(newHostId);
      if (newHost) newHost.isHost = true;
      return { newHostId };
    }

    this.touch();
    return { newHostId: null };
  }

  /** Get all players (humans and bots) in lobby as an array. */
  getPlayerList() {
    const humans = Array.from(this.lobbyPlayers.values()).map(p => ({
      ...p,
      isHost: p.id === this.hostId
    }));
    const bots = Array.from(this.lobbyBots.values()).map(b => ({
      ...b,
      isHost: false
    }));
    return [...humans, ...bots];
  }

  /** Check if a player is in this room. */
  hasPlayer(socketId) {
    return this.lobbyPlayers.has(socketId);
  }

  /** Player count (lobby). */
  get playerCount() {
    return this.lobbyPlayers.size + this.lobbyBots.size;
  }

  /** Is the room empty? */
  get isEmpty() {
    return this.lobbyPlayers.size === 0;
  }

  /** Can the game start? (at least 1 human, bots fill to 3). */
  canStart() {
    return this.lobbyPlayers.size >= 1 && this.status === 'waiting';
  }

  // ─────────────────────────────────────────
  //  GAME LIFECYCLE
  // ─────────────────────────────────────────

  /** Start the game: create engine, add all lobby players, begin. */
  startGame(emitFn) {
    this.engine = new GameEngine(this.settings, emitFn);
    this.engine.hostId = this.hostId;

    // Add all lobby players to the engine
    for (const [socketId, info] of this.lobbyPlayers) {
      this.engine.addPlayer(socketId, info.name);
    }
    
    // Add all lobby bots to the engine
    for (const [botId, info] of this.lobbyBots) {
      this.engine.addSpecificBot(botId, info.name);
    }

    this.status = 'playing';
    this.touch();

    return this.engine.startGame();
  }

  /** Proceed to the next round. */
  nextRound() {
    if (!this.engine) return;
    if (this.engine.isGameOver()) {
      this.status = 'finished';
      return null;
    }
    return this.engine.nextRound();
  }

  /** Reset the room for a new game. */
  resetGame() {
    this.engine = null;
    this.status = 'waiting';
    this.touch();
  }

  // ─────────────────────────────────────────
  //  CHAT
  // ─────────────────────────────────────────

  addChatMessage(socketId, name, text) {
    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      senderId: socketId,
      senderName: name,
      text: text.slice(0, 200), // limit length
      timestamp: Date.now(),
    };
    this.chatHistory.push(msg);
    if (this.chatHistory.length > 100) {
      this.chatHistory.shift();
    }
    this.touch();
    return msg;
  }

  // ─────────────────────────────────────────
  //  UTILITY
  // ─────────────────────────────────────────

  touch() {
    this.lastActivity = Date.now();
  }

  /** Serialize for clients. */
  toJSON() {
    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      settings: this.settings,
      players: this.getPlayerList(),
      playerCount: this.playerCount,
      gameState: this.engine ? this.engine.getState() : null,
    };
  }
}
