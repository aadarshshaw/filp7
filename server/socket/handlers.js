import { RoomManager } from '../rooms/RoomManager.js';

const roomManager = new RoomManager();

/**
 * Register Socket.IO event handlers.
 *
 * IMPORTANT: The GameEngine is fully self-contained.
 * It handles round transitions, bot scheduling, and state broadcasts
 * via its emit callback. Socket handlers should NOT set extra timers
 * or duplicate state emissions.
 */
export function registerHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ═══════════════════════════════════════
    //  ROOM MANAGEMENT
    // ═══════════════════════════════════════

    socket.on('room:create', (data) => {
      const { playerName, settings } = data;
      const room = roomManager.createRoom(socket.id, settings);

      socket.playerName = playerName;
      socket.roomCode = room.code;
      socket.join(room.code);
      room.addPlayer(socket.id, playerName);

      console.log(`[Room] Created: ${room.code} by ${playerName}`);

      socket.emit('room:created', room.toJSON());
    });

    socket.on('room:join', (data) => {
      const { playerName, code: joinCode, roomCode } = data;
      const codeToUse = (joinCode || roomCode || '').toUpperCase();

      if (!codeToUse) {
        return socket.emit('error', { message: 'Invalid room code' });
      }

      const room = roomManager.getRoom(codeToUse);
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      const result = room.addPlayer(socket.id, playerName);
      if (result.error) {
        return socket.emit('error', { message: result.error });
      }

      socket.playerName = playerName;
      socket.roomCode = codeToUse;
      socket.join(codeToUse);

      console.log(`[Room] ${playerName} joined ${codeToUse}`);

      io.to(codeToUse).emit('room:playerList', room.getPlayerList());
      io.to(codeToUse).emit('chat:message', {
        id: Date.now().toString(36),
        senderName: 'System',
        text: `${playerName} joined the room!`,
        timestamp: Date.now(),
        isSystem: true,
      });

      socket.emit('room:joined', room.toJSON());
    });

    // ═══════════════════════════════════════
    //  GAME START
    // ═══════════════════════════════════════

    socket.on('game:start', (data, callback) => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room) return callback?.({ success: false, error: 'Room not found' });
      if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Only host can start' });
      if (!room.canStart()) return callback?.({ success: false, error: 'Cannot start game' });

      // Create the emit function that broadcasts to the room
      const emitFn = (event, eventData) => {
        io.to(room.code).emit(event, eventData);
      };

      room.startGame(emitFn);
      console.log(`[Game] Started in room ${room.code}`);

      // Send initial state to all players
      io.to(room.code).emit('game:started', room.engine.getState());
      callback?.({ success: true });
    });

    // ═══════════════════════════════════════
    //  GAMEPLAY — Engine handles all flow
    // ═══════════════════════════════════════

    socket.on('game:hit', () => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room || !room.engine) return;

      const result = room.engine.hit(socket.id);
      if (result.error) {
        socket.emit('error', { message: result.error });
      }
      // Engine handles all state broadcasts and round transitions
    });

    socket.on('game:stay', () => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room || !room.engine) return;

      const result = room.engine.stay(socket.id);
      if (result.error) {
        socket.emit('error', { message: result.error });
      }
      // Engine handles all state broadcasts and round transitions
    });

    socket.on('game:action', (data) => {
      const { targetId } = data;
      const room = roomManager.getRoom(socket.roomCode);
      if (!room || !room.engine) return;

      const result = room.engine.resolveAction(socket.id, null, targetId);
      if (result.error) {
        socket.emit('error', { message: result.error });
      }
      // Engine handles all state broadcasts and round transitions
    });

    socket.on('game:nextRound', () => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room || !room.engine) return;
      room.engine.nextRound();
    });

    socket.on('game:playAgain', () => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room) return;
      if (room.hostId !== socket.id) return;
      room.resetGame();
      io.to(room.code).emit('game:reset', room.toJSON());
    });

    // ═══════════════════════════════════════
    //  CHAT
    // ═══════════════════════════════════════

    socket.on('chat:message', (data) => {
      const { text } = data;
      if (!text || text.trim().length === 0) return;
      const room = roomManager.getRoom(socket.roomCode);
      if (!room) return;
      const msg = room.addChatMessage(socket.id, socket.playerName, text.trim());
      io.to(room.code).emit('chat:message', msg);
    });

    // ═══════════════════════════════════════
    //  DISCONNECT
    // ═══════════════════════════════════════

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      leaveCurrentRoom(socket, io);
    });
  });
}

/**
 * Remove a socket from its current room.
 */
function leaveCurrentRoom(socket, io) {
  if (!socket.roomCode) return;

  const { room, newHostId } = roomManager.removePlayer(socket.id);

  if (room) {
    socket.leave(room.code);

    io.to(room.code).emit('room:playerList', room.getPlayerList());
    io.to(room.code).emit('chat:message', {
      id: Date.now().toString(36),
      senderName: 'System',
      text: `${socket.playerName || 'A player'} left the room.`,
      timestamp: Date.now(),
      isSystem: true,
    });

    if (newHostId) {
      io.to(room.code).emit('room:newHost', { hostId: newHostId });
    }

    // Engine removePlayer handles game state updates internally
  } else {
    socket.leave(socket.roomCode);
  }

  socket.roomCode = null;
}

export { roomManager };
