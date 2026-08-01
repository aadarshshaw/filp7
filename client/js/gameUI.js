/**
 * Game UI — Renders the game state to the DOM.
 */

import { createCardElement, createCardBack, animateCardDeal, animateBust, animateStay, createConfetti, getPlayerColor } from './cardRenderer.js';
import { socketManager } from './socket.js';
import { initAudio, soundCardDeal, soundYourTurn, soundBust, soundStay, soundFlip7, soundRoundEnd, soundGameOver, soundClick, soundAction, soundSecondChance, soundShuffle } from './soundManager.js';

/** Cached game state */
let currentState = null;
let myPlayerId = null;
let timerInterval = null;
let timerDuration = 30;

/**
 * Initialize the Game UI module.
 */
export function initGameUI() {
  myPlayerId = socketManager.id;
  initAudio();

  // Button handlers
  document.getElementById('btn-hit').addEventListener('click', () => {
    soundClick();
    socketManager.emit('game:hit');
    disableActions();
  });

  document.getElementById('btn-stay').addEventListener('click', () => {
    soundClick();
    socketManager.emit('game:stay');
    disableActions();
  });

  document.getElementById('btn-toggle-scoreboard').addEventListener('click', () => {
    document.getElementById('scoreboard-panel').classList.toggle('open');
  });

  document.getElementById('btn-play-again')?.addEventListener('click', () => {
    socketManager.emit('game:playAgain');
  });

  document.getElementById('btn-back-lobby')?.addEventListener('click', () => {
    socketManager.emit('room:leave');
    showScreen('landing-screen');
  });

  // Socket events
  socketManager.on('game:started', (state) => {
    myPlayerId = socketManager.id;
    soundShuffle();
    showScreen('game-screen');
    renderState(state);
  });

  socketManager.on('game:state', (state) => {
    renderState(state);
  });

  socketManager.on('game:turn', (data) => {
    handleTurn(data);
    if (data.playerId === socketManager.id) {
      soundYourTurn();
    }
  });

  socketManager.on('game:cardDealt', (data) => {
    soundCardDeal();
    handleCardDealt(data);
  });

  socketManager.on('game:playerBusted', (data) => {
    soundBust();
    handleBust(data);
  });

  socketManager.on('game:playerStayed', (data) => {
    soundStay();
    handleStay(data);
  });

  socketManager.on('game:actionChoice', (data) => {
    showActionTargetModal(data);
  });

  socketManager.on('game:action', (data) => {
    soundAction();
    handleActionEvent(data);
  });

  socketManager.on('game:roundEnd', (data) => {
    soundRoundEnd();
    handleRoundEnd(data);
  });

  socketManager.on('game:over', (data) => {
    soundGameOver();
    handleGameOver(data);
  });

  socketManager.on('game:flip7', (data) => {
    soundFlip7();
    handleFlip7(data);
  });

  socketManager.on('game:secondChanceUsed', (data) => {
    soundSecondChance();
    showToast(`${data.playerName} used Second Chance! 🔄`, 'info');
  });

  socketManager.on('game:timerExpired', (data) => {
    if (data.playerId === myPlayerId) {
      showToast('Time\'s up! Auto-action taken.', 'info');
    }
  });

  socketManager.on('game:forcedStay', (data) => {
    if (data.playerId === myPlayerId) {
      showToast('Deck exhausted — you stay.', 'info');
    }
  });

  socketManager.on('round:start', (data) => {
    soundShuffle();
    hideOverlays();
  });

  socketManager.on('game:reset', () => {
    hideOverlays();
    showScreen('lobby-screen');
  });
}

/**
 * Render the full game state.
 */
function renderState(state) {
  currentState = state;
  myPlayerId = socketManager.id;

  // Ensure overlays are hidden during active gameplay
  if (state.phase === 'playing' || state.phase === 'dealing') {
    hideOverlays();
  }

  // Top bar
  document.getElementById('game-round-number').textContent = state.roundNumber;
  document.getElementById('game-target-score').textContent = state.targetScore;
  document.getElementById('game-deck-remaining').textContent = state.deckRemaining;
  timerDuration = state.turnTimer || 30;

  // My player
  const me = state.players.find(p => p.id === myPlayerId);
  const opponents = state.players.filter(p => p.id !== myPlayerId);

  // Render my hand
  renderMyHand(me);

  // Render opponents
  renderOpponents(opponents, state.currentPlayerId);

  // Render scoreboard
  renderScoreboard(state.players, state.targetScore);

  // Update player status bar
  updateStatusBar(me);

  // Show/hide action buttons
  if (state.currentPlayerId === myPlayerId && me?.status === 'active' && state.phase === 'playing') {
    enableActions(me);
  } else {
    disableActions();
  }

  // Update turn indicator
  updateTurnIndicator(state);
}

/**
 * Render the current player's hand.
 */
function renderMyHand(player) {
  const handEl = document.getElementById('player-hand');
  const modEl = document.getElementById('player-modifiers');
  const handLabelEl = document.querySelector('.hand-label');
  
  handEl.innerHTML = '';
  modEl.innerHTML = '';

  if (!player) return;

  const totalCards = player.hand.length + player.modifiers.length;
  const uniqueCount = player.uniqueNumberCount || 0;
  
  if (handLabelEl) {
    handLabelEl.innerHTML = `Your Hand &nbsp;•&nbsp; <span style="color: var(--accent-primary); font-weight:700;">${totalCards} Card${totalCards !== 1 ? 's' : ''}</span> &nbsp;•&nbsp; <span style="color: var(--accent-gold); font-weight:700;">${uniqueCount}/7 Unique for Flip 7</span>`;
  }

  player.hand.forEach(card => {
    const cardEl = createCardElement(card, false);
    handEl.appendChild(cardEl);
  });

  player.modifiers.forEach(card => {
    const cardEl = createCardElement(card, false);
    modEl.appendChild(cardEl);
  });
}

/**
 * Render opponent panels.
 */
function renderOpponents(opponents, currentPlayerId) {
  const area = document.getElementById('opponents-area');
  area.innerHTML = '';

  opponents.forEach((opp, index) => {
    const panel = document.createElement('div');
    panel.className = 'opponent-panel';
    if (opp.id === currentPlayerId) panel.classList.add('active-turn', 'active-turn-pulse');
    if (opp.status === 'busted') panel.classList.add('busted');
    if (opp.status === 'stayed') panel.classList.add('stayed');

    // Status badge
    let statusClass = 'status-active';
    let statusText = 'Active';
    if (opp.status === 'busted') { statusClass = 'status-busted'; statusText = 'Busted'; }
    if (opp.status === 'stayed') { statusClass = 'status-stayed'; statusText = 'Stayed'; }

    // Calculate running hand score
    const handScore = opp.hand.reduce((s, c) => s + c.value, 0);
    const modScore = opp.modifiers.reduce((s, c) => s + (c.value || 0), 0);

    const avatarColor = getPlayerColor(index);

    // Build the panel header + score
    panel.innerHTML = `
      <div class="opponent-header">
        <div class="player-avatar" style="background: ${avatarColor}; width: 28px; height: 28px; font-size: 0.7rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #06091a; font-weight: 700;">
          ${opp.name.slice(0, 2).toUpperCase()}
        </div>
        <span class="opponent-name">${escapeHtml(opp.name)}</span>
        <span class="opponent-status ${statusClass}">${statusText}</span>
      </div>
      <div class="opponent-cards"></div>
      <div class="opponent-score">
        Hand: ${handScore}${modScore > 0 ? '+' + modScore : ''} | Total: <span class="opponent-total">${opp.totalScore}</span>
      </div>
    `;

    // Add mini cards using the renderer
    const cardsContainer = panel.querySelector('.opponent-cards');
    opp.hand.forEach(c => {
      cardsContainer.appendChild(createCardElement(c, true));
    });
    opp.modifiers.forEach(c => {
      cardsContainer.appendChild(createCardElement(c, true));
    });

    area.appendChild(panel);
  });
}

/**
 * Render the scoreboard panel.
 */
function renderScoreboard(players, targetScore) {
  const list = document.getElementById('scoreboard-list');
  list.innerHTML = '';

  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);

  sorted.forEach((p, i) => {
    const isMe = p.id === myPlayerId;
    const percent = Math.min(100, (p.totalScore / targetScore) * 100);

    const entry = document.createElement('div');
    entry.className = 'scoreboard-entry';
    entry.innerHTML = `
      <span class="scoreboard-rank ${i === 0 ? 'first' : ''}">${i === 0 ? '👑' : i + 1}</span>
      <div style="flex:1;">
        <div class="scoreboard-entry-name" style="${isMe ? 'color: var(--accent-primary);' : ''}">
          ${escapeHtml(p.name)}${isMe ? ' (You)' : ''}${p.isBot ? ' 🤖' : ''}
        </div>
        <div class="scoreboard-bar">
          <div class="scoreboard-bar-fill" style="width: ${percent}%"></div>
        </div>
      </div>
      <span class="scoreboard-entry-score">${p.totalScore}</span>
    `;
    list.appendChild(entry);
  });
}

/**
 * Update the player status bar.
 */
function updateStatusBar(player) {
  if (!player) return;
  document.getElementById('status-name').textContent = player.name;
  
  const statusScore = document.querySelector('.status-score');
  if (statusScore) {
    const cardCount = (player.hand ? player.hand.length : 0) + (player.modifiers ? player.modifiers.length : 0);
    const uniqueCount = player.uniqueNumberCount || 0;
    statusScore.innerHTML = `🎴 <b>${cardCount} Cards</b> (${uniqueCount}/7 Unique) &nbsp;|&nbsp; Round: <span id="status-round-score">${player.roundScore || 0}</span> &nbsp;|&nbsp; Total: <span id="status-total-score">${player.totalScore}</span>`;
  }

  const indicator = document.getElementById('status-indicator');
  if (indicator) {
    indicator.className = 'status-indicator ' + player.status;
    indicator.textContent = player.status.charAt(0).toUpperCase() + player.status.slice(1);
  }
}

/**
 * Update the turn indicator text.
 */
function updateTurnIndicator(state) {
  const turnText = document.getElementById('turn-text');

  if (state.phase === 'roundEnd') {
    turnText.textContent = 'Round Complete!';
    turnText.className = 'turn-text';
    return;
  }

  if (state.phase === 'gameOver') {
    turnText.textContent = 'Game Over!';
    turnText.className = 'turn-text';
    return;
  }

  if (state.currentPlayerId === myPlayerId) {
    turnText.textContent = '🎯 Your Turn!';
    turnText.className = 'turn-text your-turn';
  } else {
    const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);
    turnText.textContent = `${currentPlayer?.name || 'Someone'}'s turn...`;
    turnText.className = 'turn-text';
  }
}

/**
 * Handle turn notification.
 */
function handleTurn(data) {
  if (data.playerId === myPlayerId) {
    startTurnTimer(data.turnTimer);
  }
}

/**
 * Handle card dealt event.
 */
function handleCardDealt(data) {
  // Flash the last drawn card in center
  const lastDrawnArea = document.getElementById('last-drawn-area');
  lastDrawnArea.innerHTML = '';
  const cardEl = createCardElement(data.card, false);
  animateCardDeal(cardEl);
  lastDrawnArea.appendChild(cardEl);

  // Clear after delay
  setTimeout(() => {
    if (lastDrawnArea.contains(cardEl)) {
      cardEl.style.opacity = '0.5';
    }
  }, 2000);
}

/**
 * Handle bust event.
 */
function handleBust(data) {
  showToast(`${data.playerName} busted! 💥`, 'error');

  if (data.playerId === myPlayerId) {
    const handEl = document.getElementById('player-hand');
    animateBust(handEl);
  }
}

/**
 * Handle stay event.
 */
function handleStay(data) {
  if (data.playerId === myPlayerId) {
    const handEl = document.getElementById('player-hand');
    animateStay(handEl);
  }
}

/**
 * Handle Flip 7 event.
 */
function handleFlip7(data) {
  showToast(`🎉 ${data.playerName} got Flip 7! +15 bonus!`, 'success');
  createConfetti(80);
}

/**
 * Handle action card events.
 */
function handleActionEvent(data) {
  switch (data.type) {
    case 'action:freeze':
      showToast(`❄️ ${data.drawerName} froze ${data.targetName}!`, 'info');
      break;
    case 'action:flip_three:start':
      showToast(`🃏 ${data.drawerName} used Flip Three on ${data.targetName}!`, 'info');
      break;
    case 'action:second_chance':
      showToast(`🔄 ${data.drawerName} got Second Chance!`, 'info');
      break;
  }
}

/**
 * Show action card target selection modal.
 */
function showActionTargetModal(data) {
  const modal = document.getElementById('modal-action-target');
  const title = document.getElementById('action-target-title');
  const desc = document.getElementById('action-card-desc');
  const list = document.getElementById('target-list');

  title.textContent = `Use ${data.card.label}`;
  desc.textContent = data.card.action === 'freeze'
    ? 'Choose a player to freeze (force them to stay):'
    : 'Choose a player to flip 3 cards for:';

  list.innerHTML = '';
  data.validTargets.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'target-btn';
    btn.textContent = t.name;
    btn.addEventListener('click', () => {
      socketManager.emit('game:action', { targetId: t.id });
      modal.style.display = 'none';
    });
    list.appendChild(btn);
  });

  modal.style.display = 'flex';
}

/**
 * Handle round end.
 */
function handleRoundEnd(data) {
  clearTurnTimer();

  const overlay = document.getElementById('round-end-overlay');
  const scoresEl = document.getElementById('round-scores');
  scoresEl.innerHTML = '';

  const sorted = [...data.scores].sort((a, b) => b.roundScore - a.roundScore);

  sorted.forEach(s => {
    const entry = document.createElement('div');
    entry.className = 'round-score-entry';
    entry.innerHTML = `
      <span class="round-score-name">${escapeHtml(s.name)}${s.id === myPlayerId ? ' (You)' : ''}</span>
      <span>
        <span class="round-score-value ${s.status}">${s.status === 'busted' ? 'Busted!' : '+' + s.roundScore}</span>
        <span class="round-score-total">(Total: ${s.totalScore})</span>
      </span>
    `;
    scoresEl.appendChild(entry);
  });

  overlay.style.display = 'flex';

  // Auto-hide after 4.5s (server sends new round at 5s)
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 4500);
}

/**
 * Handle game over.
 */
function handleGameOver(data) {
  clearTurnTimer();

  const overlay = document.getElementById('game-over-overlay');
  const winnerNameEl = document.getElementById('winner-name');
  const scoresEl = document.getElementById('final-scores');

  winnerNameEl.textContent = data.winnerName + (data.winnerId === myPlayerId ? ' (You!)' : '');

  scoresEl.innerHTML = '';
  const sorted = [...data.finalScores].sort((a, b) => b.totalScore - a.totalScore);

  sorted.forEach((s, i) => {
    const entry = document.createElement('div');
    entry.className = 'final-score-entry' + (i === 0 ? ' winner' : '');
    entry.innerHTML = `
      <span class="final-score-rank ${i === 0 ? 'first' : ''}">${i === 0 ? '🏆' : '#' + (i + 1)}</span>
      <span class="final-score-name">${escapeHtml(s.name)}${s.id === myPlayerId ? ' (You)' : ''}</span>
      <span class="final-score-value">${s.totalScore}</span>
    `;
    scoresEl.appendChild(entry);
  });

  overlay.style.display = 'flex';

  // Winner celebration
  if (data.winnerId === myPlayerId) {
    createConfetti(100);
  } else {
    createConfetti(40);
  }
}

/**
 * Enable action buttons.
 */
function enableActions(player) {
  const btns = document.getElementById('action-buttons');
  btns.style.display = 'flex';

  const hitBtn = document.getElementById('btn-hit');
  const stayBtn = document.getElementById('btn-stay');
  hitBtn.disabled = false;

  // Can't stay with no cards
  stayBtn.disabled = player.hand.length === 0;
}

/**
 * Disable action buttons.
 */
function disableActions() {
  const btns = document.getElementById('action-buttons');
  btns.style.display = 'none';
}

/**
 * Start the turn timer.
 */
function startTurnTimer(duration) {
  clearTurnTimer();

  const bar = document.getElementById('turn-timer-bar');
  bar.classList.add('timer-active');
  bar.style.setProperty('--timer-duration', `${duration}s`);

  const countEl = document.getElementById('turn-timer-count');
  if (countEl) {
    countEl.style.display = 'inline-block';
    countEl.textContent = `(${duration}s)`;
  }

  // Force reflow
  bar.offsetHeight;

  bar.querySelector?.(':after')?.style?.transitionDuration;

  let remaining = duration;
  timerInterval = setInterval(() => {
    remaining--;
    if (countEl) countEl.textContent = `(${remaining}s)`;
    if (remaining <= 0) {
      clearTurnTimer();
    }
  }, 1000);
}

/**
 * Clear the turn timer.
 */
function clearTurnTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const bar = document.getElementById('turn-timer-bar');
  if (bar) bar.classList.remove('timer-active');
  
  const countEl = document.getElementById('turn-timer-count');
  if (countEl) countEl.style.display = 'none';
}

/**
 * Hide all overlays.
 */
function hideOverlays() {
  document.getElementById('round-end-overlay').style.display = 'none';
  document.getElementById('game-over-overlay').style.display = 'none';
  document.getElementById('modal-action-target').style.display = 'none';
}

/**
 * Switch visible screen.
 */
export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    target.classList.add('screen-enter');
    setTimeout(() => target.classList.remove('screen-enter'), 300);
  }
}

/**
 * Show a toast notification.
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
