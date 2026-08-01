import { Room } from './Room.js';

// Characters for room code generation (uppercase + digits, no ambiguous chars)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/**
 * Manages all active game rooms.
 */
export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();

    // Cleanup stale rooms every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 5 * 60 * 1000);
  }

  // ─────────────────────────────────────────
  //  ROOM CREATION
  // ─────────────────────────────────────────

  /**
   * Generate a unique room code.
   */
  generateCode() {
    let code;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 100);

    return code;
  }

  /**
   * Create a new room.
   * @param {string} hostSocketId
   * @param {string} hostName
   * @param {object} settings
   * @returns {Room}
   */
  createRoom(hostSocketId, hostName, settings = {}) {
    const code = this.generateCode();
    const room = new Room(code, hostSocketId, settings);
    room.addPlayer(hostSocketId, hostName);
    this.rooms.set(code, room);
    return room;
  }

  // ─────────────────────────────────────────
  //  ROOM ACCESS
  // ─────────────────────────────────────────

  /**
   * Get a room by code.
   * @param {string} code
   * @returns {Room|null}
   */
  getRoom(code) {
    return this.rooms.get(code?.toUpperCase()) || null;
  }

  /**
   * Find the room a player is currently in.
   * @param {string} socketId
   * @returns {Room|null}
   */
  findPlayerRoom(socketId) {
    for (const room of this.rooms.values()) {
      if (room.hasPlayer(socketId)) return room;
    }
    return null;
  }

  // ─────────────────────────────────────────
  //  ROOM OPERATIONS
  // ─────────────────────────────────────────

  /**
   * Join an existing room.
   * @param {string} code
   * @param {string} socketId
   * @param {string} playerName
   * @returns {{ room: Room, error?: string }}
   */
  joinRoom(code, socketId, playerName) {
    const room = this.getRoom(code);

    if (!room) {
      return { error: 'Room not found. Check the code and try again.' };
    }
    if (room.status === 'playing') {
      return { error: 'Game already in progress. Wait for the next game.' };
    }
    if (room.playerCount >= room.settings.maxPlayers) {
      return { error: 'Room is full.' };
    }

    const result = room.addPlayer(socketId, playerName);
    if (result.error) {
      return { error: result.error };
    }

    return { room };
  }

  /**
   * Remove a player from their room.
   * Cleans up the room if it becomes empty.
   * @param {string} socketId
   * @returns {{ room: Room|null, newHostId: string|null }}
   */
  removePlayer(socketId) {
    const room = this.findPlayerRoom(socketId);
    if (!room) return { room: null, newHostId: null };

    const { newHostId } = room.removePlayer(socketId);

    // Clean up empty rooms
    if (room.isEmpty) {
      this.rooms.delete(room.code);
      return { room: null, newHostId: null };
    }

    return { room, newHostId };
  }

  // ─────────────────────────────────────────
  //  CLEANUP
  // ─────────────────────────────────────────

  /**
   * Remove rooms that have been inactive for > 30 minutes.
   */
  cleanupStaleRooms() {
    const staleThreshold = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > staleThreshold) {
        console.log(`[RoomManager] Cleaning up stale room: ${code}`);
        this.rooms.delete(code);
      }
    }
  }

  /**
   * Get stats for monitoring.
   */
  getStats() {
    return {
      totalRooms: this.rooms.size,
      waitingRooms: [...this.rooms.values()].filter(r => r.status === 'waiting').length,
      playingRooms: [...this.rooms.values()].filter(r => r.status === 'playing').length,
      totalPlayers: [...this.rooms.values()].reduce((sum, r) => sum + r.playerCount, 0),
    };
  }

  /** Shutdown: clear cleanup interval. */
  shutdown() {
    clearInterval(this.cleanupInterval);
  }
}
