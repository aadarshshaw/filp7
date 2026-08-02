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
  myPlayerId = socketManager.playerId;
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
    myPlayerId = socketManager.playerId;
    soundShuffle();
    showScreen('game-screen');
    renderState(state);
  });

  socketManager.on('game:state', (state) => {
    renderState(state);
  });

  socketManager.on('game:turn', (data) => {
    handleTurn(data);
    if (data.playerId === socketManager.playerId) {
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
  myPlayerId = socketManager.playerId;

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
  
  // Get round score from server state
  const totalCurrentScore = player.roundScore || 0;

  // Update DOM with rolling numbers
  const totalScoreEl = document.getElementById('status-total-score');
  const uniqueCountEl = document.getElementById('status-unique-count');
  const roundScoreEl = document.getElementById('status-round-score');

  if (totalScoreEl && totalScoreEl.innerText !== String(player.totalScore)) {
    animateValue(totalScoreEl, parseInt(totalScoreEl.innerText) || 0, player.totalScore || 0, 400);
  } else if (totalScoreEl) {
    totalScoreEl.innerText = player.totalScore || 0;
  }

  if (uniqueCountEl) uniqueCountEl.innerText = `${uniqueCount}/7`;

  if (roundScoreEl && roundScoreEl.innerText !== String(totalCurrentScore)) {
    animateValue(roundScoreEl, parseInt(roundScoreEl.innerText) || 0, totalCurrentScore, 400);
  } else if (roundScoreEl) {
    roundScoreEl.innerText = totalCurrentScore;
  }

  // Add state overlays to my panel
  const myPanel = document.getElementById('my-player-panel');
  if (myPanel) {
    // Remove old overlays/classes
    myPanel.classList.remove('busted', 'stayed');
    const oldOverlay = myPanel.querySelector('.state-overlay');
    if (oldOverlay) oldOverlay.remove();

    if (player.status === 'busted') {
      myPanel.classList.add('busted');
      const overlay = document.createElement('div');
      overlay.className = 'state-overlay bust-overlay';
      overlay.textContent = '💥 BUSTED';
      myPanel.appendChild(overlay);
    } else if (player.status === 'stayed') {
      myPanel.classList.add('stayed');
      const overlay = document.createElement('div');
      overlay.className = 'state-overlay stay-overlay';
      overlay.textContent = '✓ STAYED';
      myPanel.appendChild(overlay);
    } else if (player.isFrozen) {
      const overlay = document.createElement('div');
      overlay.className = 'state-overlay';
      overlay.style.color = '#3b82f6';
      overlay.style.borderColor = '#3b82f6';
      overlay.textContent = '❄️ FROZEN';
      myPanel.appendChild(overlay);
    }
  }

  // Apply fan rotation to cards
  player.hand.forEach(card => {
    const cardEl = createCardElement(card, false);
    handEl.appendChild(cardEl);
  });

  // Apply fan rotation to cards
  const cards = handEl.querySelectorAll('.card');
  const numCards = cards.length;
  if (numCards > 1) {
    const maxAngle = Math.min(numCards * 3, 18); // Max spread of 18 degrees
    cards.forEach((cardEl, i) => {
      const angle = -maxAngle / 2 + (maxAngle / (numCards - 1)) * i;
      cardEl.style.transform = `rotate(${angle}deg)`;
    });
  }

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

  const numOpp = opponents.length;
  const centerIndex = (numOpp - 1) / 2;

  opponents.forEach((opp, index) => {
    const panel = document.createElement('div');
    panel.className = 'opponent-panel';

    if (opp.id === currentPlayerId) panel.classList.add('active-turn');
    if (opp.status === 'busted') panel.classList.add('busted');
    if (opp.status === 'stayed') panel.classList.add('stayed');

    // Calculate running hand score
    // Get round score from server state
    const totalCurrentScore = opp.roundScore || 0;
    const cardsCount = opp.hand.length + opp.modifiers.length;

    const avatarColor = getPlayerColor(index);
    let stateOverlay = '';
    if (opp.status === 'busted') stateOverlay = '<div class="state-overlay bust-overlay">💥 BUSTED</div>';
    else if (opp.status === 'stayed') stateOverlay = '<div class="state-overlay stay-overlay">✓ STAYED</div>';
    else if (opp.isFrozen) stateOverlay = '<div class="state-overlay" style="color:#3b82f6; border-color:#3b82f6;">❄️ FROZEN</div>';
    else if (opp.isOffline) stateOverlay = '<div class="state-overlay offline-overlay">🔌 OFFLINE</div>';

    panel.innerHTML = `
      ${stateOverlay}
      <div class="opponent-header">
        <div class="opponent-avatar" style="background: ${avatarColor};" title="${escapeHtml(opp.name)}">
          ${opp.name.slice(0, 2).toUpperCase()}
        </div>
        <span class="opponent-name">${escapeHtml(opp.name)}</span>
      </div>
      <div class="opponent-stats-grid">
        <div class="opponent-stat">
          <span class="opponent-stat-label">Score</span>
          <span class="opponent-stat-value">${totalCurrentScore}</span>
        </div>
        <div class="opponent-stat">
          <span class="opponent-stat-label">Cards</span>
          <span class="opponent-stat-value">${cardsCount}</span>
        </div>
      </div>
      <div class="opponent-cards"></div>
    `;

    const cardsContainer = panel.querySelector('.opponent-cards');
    
    opp.hand.forEach(card => {
      const cardEl = createCardElement(card, true);
      cardEl.className = 'card-sm';
      cardsContainer.appendChild(cardEl);
    });

    opp.modifiers.forEach(card => {
      const cardEl = createCardElement(card, true);
      cardEl.className = 'card-sm';
      cardsContainer.appendChild(cardEl);
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
  
  const elRoundScore = document.getElementById('status-round-score');
  const elUnique = document.getElementById('status-unique-count');
  const elTotal = document.getElementById('status-total-score');
  
  if (elUnique) {
    elUnique.textContent = `${player.uniqueNumberCount || 0}/7`;
  }
  if (elTotal) {
    elTotal.textContent = player.totalScore || 0;
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
    turnText.textContent = '★ YOUR TURN ★';
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
    showSplash('💥 BUSTED', '#ef4444');
  }

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
  if (data.playerId === myPlayerId) {
    showSplash('🏆 FLIP 7!', '#f59e0b');
  }
  createConfetti(80);
}

/**
 * Handle action card events.
 */
function handleActionEvent(data) {
  switch (data.type) {
    case 'action:freeze':
      showToast(`❄️ ${data.drawerName} froze ${data.targetName}!`, 'info');
      if (data.targetId === myPlayerId) {
        showSplash('❄️ FROZEN', '#3b82f6');
      }
      break;
    case 'action:flip_three:start':
      showToast(`🃏 ${data.drawerName} used Flip Three on ${data.targetName}!`, 'info');
      if (data.targetId === myPlayerId) {
        showSplash('🃏 FLIP 3', '#f59e0b');
      }
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
  btns.style.visibility = 'visible';

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
  btns.style.visibility = 'hidden';
}

/**
 * Start the turn timer.
 */
function startTurnTimer(duration) {
  clearTurnTimer();

  const bar = document.getElementById('turn-timer-bar');
  if (bar) {
    bar.classList.add('timer-active');
    bar.style.setProperty('--timer-duration', `${duration}s`);
    // Force reflow
    bar.offsetHeight;
  }

  const countEl = document.getElementById('turn-timer-count');
  if (countEl) {
    countEl.style.display = 'inline-block';
    countEl.textContent = ` • ${duration}s`;
    countEl.style.color = 'var(--accent-primary)';
    countEl.classList.remove('pulse-text');
  }

  let remaining = duration;
  timerInterval = setInterval(() => {
    remaining--;
    if (countEl) {
      countEl.textContent = ` • ${remaining}s`;
      if (remaining <= 5) {
        countEl.style.color = 'var(--accent-danger)';
        countEl.classList.add('pulse-text');
      } else if (remaining <= 10) {
        countEl.style.color = 'var(--accent-gold)';
        countEl.classList.remove('pulse-text');
      } else {
        countEl.style.color = 'var(--accent-primary)';
      }
    }
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
  if (countEl) {
    countEl.style.display = 'none';
    countEl.classList.remove('pulse-text');
  }
}

/**
 * Animate a number counting up.
 */
export function animateValue(obj, start, end, duration) {
  if (obj.dataset.animId) {
    window.cancelAnimationFrame(parseInt(obj.dataset.animId));
  }
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      obj.dataset.animId = window.requestAnimationFrame(step);
    } else {
      delete obj.dataset.animId;
    }
  };
  obj.dataset.animId = window.requestAnimationFrame(step);
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
 * Show central splash animation text.
 */
export function showSplash(text, color) {
  const splashEl = document.getElementById('game-splash');
  if (!splashEl) return;
  
  // Reset animation
  splashEl.classList.remove('animate');
  void splashEl.offsetWidth; // Trigger reflow
  
  splashEl.textContent = text;
  if (color) {
    splashEl.style.color = color;
  }
  
  splashEl.classList.add('animate');
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
