/**
 * Main.js — Entry point for the Flip 7 client.
 * Handles landing page, modals, lobby, and chat.
 */

import { socketManager } from './socket.js';
import { initGameUI, showScreen, showToast } from './gameUI.js';
import { createPlayerAvatar } from './cardRenderer.js';

// ═══════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Connect to server
  socketManager.connect();

  // Init sub-modules
  initGameUI();

  // Bind UI
  bindLandingPage();
  bindModals();
  bindLobby();
  bindChat();
  bindSocketEvents();
});

// ═══════════════════════════════════════════
//  LANDING PAGE
// ═══════════════════════════════════════════

function bindLandingPage() {
  document.getElementById('btn-create-room').addEventListener('click', () => {
    openModal('modal-create');
  });

  document.getElementById('btn-join-room').addEventListener('click', () => {
    openModal('modal-join');
  });

  const btnRules = document.getElementById('btn-rules');
  if (btnRules) {
    btnRules.addEventListener('click', () => {
      openModal('modal-rules');
    });
  }
}

// ═══════════════════════════════════════════
//  MODALS
// ═══════════════════════════════════════════

function bindModals() {
  // Close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      closeModal(modal.id);
    });
  });

  // Click outside to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // ── Create Room Form ──
  const createForm = document.getElementById('form-create');

  // Segmented control
  document.querySelectorAll('#create-target .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#create-target .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Range inputs
  document.getElementById('create-timer').addEventListener('input', (e) => {
    document.getElementById('timer-value').textContent = e.target.value + 's';
  });
  document.getElementById('create-max').addEventListener('input', (e) => {
    document.getElementById('max-value').textContent = e.target.value;
  });

  createForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('create-name').value.trim();
    if (!name) {
      showToast('Please enter your name.', 'error');
      return;
    }

    const targetScore = parseInt(
      document.querySelector('#create-target .seg-btn.active')?.dataset.value || '200'
    );
    const turnTimer = parseInt(document.getElementById('create-timer').value);
    const maxPlayers = parseInt(document.getElementById('create-max').value);

    socketManager.emit('room:create', {
      playerName: name,
      settings: { targetScore, turnTimer, maxPlayers },
    });

    closeModal('modal-create');
  });

  // ── Join Room Form ──
  const joinForm = document.getElementById('form-join');

  // Auto-uppercase room code
  document.getElementById('join-code').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('join-name').value.trim();
    const code = document.getElementById('join-code').value.trim();

    if (!name) {
      showToast('Please enter your name.', 'error');
      return;
    }
    if (!code || code.length < 4) {
      showToast('Please enter a valid room code.', 'error');
      return;
    }

    socketManager.emit('room:join', {
      playerName: name,
      code: code,
    });

    closeModal('modal-join');
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('active');
}

// ═══════════════════════════════════════════
//  LOBBY
// ═══════════════════════════════════════════

let currentRoom = null;

function bindLobby() {
  // Leave button
  document.getElementById('btn-leave-lobby').addEventListener('click', () => {
    socketManager.emit('room:leave');
    localStorage.removeItem('flip7_roomCode');
    showScreen('landing-screen');
    currentRoom = null;
  });

  // Copy room code
  document.getElementById('btn-copy-code').addEventListener('click', () => {
    const code = document.getElementById('lobby-room-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
      showToast('Room code copied! 📋', 'success');
    }).catch(() => {
      showToast('Failed to copy. Code: ' + code, 'info');
    });
  });

  // Bot controls
  document.getElementById('btn-add-bot').addEventListener('click', () => {
    socketManager.emit('room:addBot');
  });
  document.getElementById('btn-remove-bot').addEventListener('click', () => {
    socketManager.emit('room:removeBot');
  });

  // Start game button
  document.getElementById('btn-start-game').addEventListener('click', () => {
    socketManager.emit('game:start');
  });
}

function updateLobby(room) {
  currentRoom = room;

  // Room code
  document.getElementById('lobby-room-code').textContent = room.code;

  // Settings
  document.getElementById('lobby-target').textContent = room.settings.targetScore + ' pts';
  document.getElementById('lobby-timer').textContent = room.settings.turnTimer + 's';
  document.getElementById('lobby-max').textContent = room.settings.maxPlayers;

  // Player count
  document.getElementById('lobby-player-count').textContent =
    `${room.players.length}/${room.settings.maxPlayers}`;

  // Start button
  updateStartButton(room);

  // Bot controls
  const botControls = document.getElementById('bot-controls');
  if (botControls) {
    if (room.hostId === socketManager.playerId) {
      botControls.style.display = 'flex';
      // Disable add bot if full
      document.getElementById('btn-add-bot').disabled = room.players.length >= room.settings.maxPlayers;
    } else {
      botControls.style.display = 'none';
    }
  }
}

function updatePlayerList(players) {
  const list = document.getElementById('lobby-player-list');
  list.innerHTML = '';

  players.forEach((p, index) => {
    const li = document.createElement('li');
    li.className = 'player-item';

    const avatar = createPlayerAvatar(p.name, index);
    li.appendChild(avatar);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = p.name;
    li.appendChild(nameSpan);

    if (p.isHost) {
      const badge = document.createElement('span');
      badge.className = 'player-badge badge-host';
      badge.textContent = '👑 Host';
      li.appendChild(badge);
    }
    
    if (p.isBot) {
      const badge = document.createElement('span');
      badge.className = 'player-badge badge-host';
      badge.style.background = '#6366f1';
      badge.textContent = '🤖 Bot';
      li.appendChild(badge);
    }

    if (p.id === socketManager.playerId) {
      const badge = document.createElement('span');
      badge.className = 'player-badge badge-you';
      badge.textContent = 'You';
      li.appendChild(badge);
    }

    list.appendChild(li);
  });

  // Update player count
  if (currentRoom) {
    document.getElementById('lobby-player-count').textContent =
      `${players.length}/${currentRoom.settings.maxPlayers}`;
    currentRoom.players = players;
    updateStartButton(currentRoom);
  }
}

function updateStartButton(room) {
  const btn = document.getElementById('btn-start-game');
  const isHost = room.hostId === socketManager.playerId;
  const hasMinPlayers = room.players.length >= 3;

  if (!isHost) {
    btn.disabled = true;
    btn.textContent = 'Waiting for host to start...';
  } else if (!hasMinPlayers) {
    btn.disabled = true;
    btn.textContent = 'Need at least 3 players (add bots)';
  } else {
    btn.disabled = false;
    btn.textContent = 'Start Game';
  }
}

// ═══════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════

function bindChat() {
  const form = document.getElementById('form-chat');
  const input = document.getElementById('chat-input');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    socketManager.emit('chat:message', { text });
    input.value = '';
  });
}

function addChatMessage(msg) {
  const container = document.getElementById('lobby-chat-messages');
  const div = document.createElement('div');

  if (msg.isSystem) {
    div.className = 'chat-msg system';
    div.textContent = msg.text;
  } else {
    div.className = 'chat-msg';
    div.innerHTML = `<span class="chat-msg-sender">${escapeHtml(msg.senderName)}: </span><span class="chat-msg-text">${escapeHtml(msg.text)}</span>`;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ═══════════════════════════════════════════
//  SOCKET EVENTS
// ═══════════════════════════════════════════

function bindSocketEvents() {
  // Room created
  socketManager.on('room:created', (room) => {
    localStorage.setItem('flip7_roomCode', room.code);
    updateLobby(room);
    updatePlayerList(room.players);
    showScreen('lobby-screen');
    showToast('Room created! Share the code.', 'success');
  });

  // Room joined
  socketManager.on('room:joined', (room) => {
    localStorage.setItem('flip7_roomCode', room.code);
    updateLobby(room);
    updatePlayerList(room.players);
    showScreen('lobby-screen');
    showToast('Joined the room!', 'success');
  });

  // Player list update
  socketManager.on('room:playerList', (players) => {
    updatePlayerList(players);
  });

  // New host
  socketManager.on('room:newHost', (data) => {
    if (currentRoom) {
      currentRoom.hostId = data.hostId;
      updateStartButton(currentRoom);
    }
    if (data.hostId === socketManager.playerId) {
      showToast('You are now the host! 👑', 'info');
    }
  });

  // Chat message
  socketManager.on('chat:message', (msg) => {
    addChatMessage(msg);
  });

  // Errors
  socketManager.on('error', (data) => {
    showToast(data.message, 'error');
  });

  // Connection changes
  socketManager.onConnectionChange((status) => {
    if (status === 'disconnected') {
      showToast('Connection lost. Attempting to reconnect...', 'error');
    } else if (status === 'reconnected') {
      showToast('Reconnected!', 'success');
    }
  });
}

// ═══════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
