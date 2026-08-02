import { RoomManager } from '../rooms/RoomManager.js';

const roomManager = new RoomManager();

/**
 * Register Socket.IO event handlers.
 */
export function registerHandlers(io) {
  io.on('connection', (socket) => {
    socket.playerId = socket.handshake.auth?.playerId || socket.id;
    console.log(`[Socket] Connected: ${socket.id} (Player ID: ${socket.playerId})`);

    // ═══════════════════════════════════════
    //  ROOM MANAGEMENT
    // ═══════════════════════════════════════

    socket.on('room:create', (data) => {
      const { playerName, settings } = data;
      const room = roomManager.createRoom(socket.playerId, settings);

      socket.playerName = playerName;
      socket.roomCode = room.code;
      socket.join(room.code);
      room.addPlayer(socket.playerId, playerName);

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

      const result = room.addPlayer(socket.playerId, playerName);
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
    
    socket.on('room:rejoin', (data) => {
      const { roomCode } = data;
      const codeToUse = (roomCode || '').toUpperCase();
      const room = roomManager.getRoom(codeToUse);
      
      if (!room) return;
      
      if (room.hasPlayer(socket.playerId)) {
        console.log(`[Room] ${socket.playerId} rejoining ${codeToUse}`);
        
        socket.roomCode = codeToUse;
        socket.join(codeToUse);
        
        // Grab player name from lobby map
        const p = room.lobbyPlayers.get(socket.playerId);
        if (p) socket.playerName = p.name;
        
        room.handleReconnect(socket.playerId);
        
        socket.emit('room:joined', room.toJSON());
        io.to(codeToUse).emit('room:playerList', room.getPlayerList());
        
        if (room.status === 'playing' && room.engine) {
          socket.emit('game:started', room.engine.getState());
        } else if (room.status === 'finished' && room.engine) {
          socket.emit('game:started', room.engine.getState());
          socket.emit('game:over', room.engine.getGameOverData());
        }
      }
    });

    socket.on('room:addBot', () => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room || room.hostId !== socket.playerId) return;
      if (room.addBot()) {
        io.to(room.code).emit('room:playerList', room.getPlayerList());
      }
    });

    socket.on('room:removeBot', () => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room || room.hostId !== socket.playerId) return;
      if (room.removeBot()) {
        io.to(room.code).emit('room:playerList', room.getPlayerList());
      }
    });

    socket.on('room:leave', () => {
      leaveCurrentRoom(socket, io, true); // true = force remove
    });

    // ═══════════════════════════════════════
    //  GAME START
    // ═══════════════════════════════════════

    socket.on('game:start', (data, callback) => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room) return callback?.({ success: false, error: 'Room not found' });
      if (room.hostId !== socket.playerId) return callback?.({ success: false, error: 'Only host can start' });
      if (!room.canStart()) return callback?.({ success: false, error: 'Cannot start game' });

      const emitFn = (event, eventData) => {
        io.to(room.code).emit(event, eventData);
      };

      room.startGame(emitFn);
      console.log(`[Game] Started in room ${room.code}`);

      io.to(room.code).emit('game:started', room.engine.getState());
      callback?.({ success: true });
    });

    // ═══════════════════════════════════════
    //  GAMEPLAY — Engine handles all flow
    // ═══════════════════════════════════════

    socket.on('game:hit', () => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room || !room.engine) return;

      const result = room.engine.hit(socket.playerId);
      if (result.error) {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('game:stay', () => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room || !room.engine) return;

      const result = room.engine.stay(socket.playerId);
      if (result.error) {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('game:action', (data) => {
      const { targetId } = data;
      const room = roomManager.getRoom(socket.roomCode);
      if (!room || !room.engine) return;

      const result = room.engine.resolveAction(socket.playerId, null, targetId);
      if (result.error) {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('game:nextRound', () => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room || !room.engine) return;
      room.engine.nextRound();
    });

    socket.on('game:playAgain', () => {
      const room = roomManager.getRoom(socket.roomCode);
      if (!room) return;
      if (room.hostId !== socket.playerId) return;
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
      const msg = room.addChatMessage(socket.playerId, socket.playerName, text.trim());
      io.to(room.code).emit('chat:message', msg);
    });

    // ═══════════════════════════════════════
    //  DISCONNECT
    // ═══════════════════════════════════════

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id} (Player ID: ${socket.playerId})`);
      leaveCurrentRoom(socket, io, false);
    });
  });
}

/**
 * Remove a socket from its current room.
 */
function leaveCurrentRoom(socket, io, forceRemove = false) {
  if (!socket.roomCode) return;
  const room = roomManager.getRoom(socket.roomCode);
  if (!room) return;

  socket.leave(room.code);

  let newHostId = null;
  let isOfflineOnly = false;
  
  if (forceRemove) {
    const res = roomManager.removePlayer(socket.playerId);
    newHostId = res?.newHostId;
  } else {
    const res = room.handleDisconnect(socket.playerId);
    newHostId = res?.newHostId;
    isOfflineOnly = res?.isOffline;
  }

  if (isOfflineOnly) {
    io.to(room.code).emit('room:playerList', room.getPlayerList());
    if (room.engine) io.to(room.code).emit('game:state', room.engine.getState());
  } else {
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
  }

  socket.roomCode = null;
}

export { roomManager };
