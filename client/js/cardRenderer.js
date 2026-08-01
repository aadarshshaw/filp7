/**
 * Card Renderer — creates authentic, crisp, physical card DOM elements.
 */

const AVATAR_COLORS = [
  '#10b981', '#8b5cf6', '#3b82f6', '#ef4444', '#f59e0b',
  '#06b6d4', '#ec4899', '#84cc16', '#a855f7', '#d97706',
];

// Color coding for number card headers by value range
function getNumberHeaderColor(value) {
  if (value <= 3) return '#0f766e'; // Teal
  if (value <= 7) return '#1d4ed8'; // Blue
  return '#4338ca';               // Indigo
}

/**
 * Create a card DOM element.
 * @param {object} card — card data object
 * @param {boolean} mini — if true, renders a compact mini card for opponents
 * @returns {HTMLElement}
 */
export function createCardElement(card, mini = false) {
  const el = document.createElement('div');

  if (mini) {
    return createMiniCard(card, el);
  }

  el.className = 'card';
  el.dataset.cardId = card.id ?? '';

  if (card.type === 'number') {
    return createNumberCard(card, el);
  } else if (card.type === 'modifier') {
    return createModifierCard(card, el);
  } else if (card.type === 'action') {
    return createActionCard(card, el);
  }

  return createCardBackElement(el);
}

/**
 * Full-size crisp number card.
 */
function createNumberCard(card, el) {
  el.classList.add('card-number');
  const headerBg = getNumberHeaderColor(card.value);

  el.innerHTML = `
    <div class="card-header-band" style="background: ${headerBg};">
      <span class="card-header-title">NUMBER</span>
      <span class="card-header-val">${card.value}</span>
    </div>
    <div class="card-corner card-corner-top">
      <span class="card-corner-val">${card.value}</span>
    </div>
    <div class="card-center">
      <span class="card-center-val">${card.value}</span>
    </div>
    <div class="card-corner card-corner-bottom">
      <span class="card-corner-val">${card.value}</span>
    </div>
  `;

  el.dataset.value = card.value;
  return el;
}

/**
 * Modifier card (+2, +4, +6, +8, +10, x2).
 */
function createModifierCard(card, el) {
  el.classList.add('card-modifier');

  el.innerHTML = `
    <div class="card-header-band mod-header">
      <span class="card-header-title">MODIFIER</span>
      <span class="card-header-val">${card.label}</span>
    </div>
    <div class="card-corner card-corner-top">
      <span class="card-corner-val">${card.label}</span>
    </div>
    <div class="card-center">
      <span class="card-center-mod-val">${card.label}</span>
    </div>
    <div class="card-corner card-corner-bottom">
      <span class="card-corner-val">${card.label}</span>
    </div>
  `;

  el.dataset.value = card.label;
  return el;
}

/**
 * Action card (Freeze, Flip Three, Second Chance).
 */
function createActionCard(card, el) {
  el.classList.add('card-action');

  const descriptions = {
    freeze: 'Target player must STAY immediately.',
    flip_three: 'Target player draws 3 cards.',
    second_chance: 'Saves you from 1 BUST.',
  };
  const desc = descriptions[card.action] || '';

  el.innerHTML = `
    <div class="card-header-band action-header">
      <span class="card-header-title">ACTION</span>
    </div>
    <div class="card-center card-action-center">
      <span class="card-action-emoji">${card.emoji || '⚡'}</span>
      <span class="card-action-title">${card.label}</span>
      <span class="card-action-text">${desc}</span>
    </div>
  `;

  el.dataset.action = card.action;
  return el;
}

/**
 * Card back element.
 */
function createCardBackElement(el) {
  el.classList.add('card-back');
  el.innerHTML = `
    <div class="card-back-pattern">
      <div class="card-back-frame">
        <span class="card-back-text">FLIP<br><span style="color: #f59e0b; font-size: 1.3em;">7</span></span>
      </div>
    </div>
  `;
  return el;
}

/**
 * Mini card for opponent panels — crisp and readable.
 */
function createMiniCard(card, el) {
  el.className = 'card-mini';
  el.dataset.cardId = card.id ?? '';

  if (card.type === 'number') {
    const headerBg = getNumberHeaderColor(card.value);
    el.classList.add('mini-number');
    el.style.borderLeft = `3px solid ${headerBg}`;
    el.innerHTML = `<span class="mini-val">${card.value}</span>`;
    el.dataset.value = card.value;
  } else if (card.type === 'modifier') {
    el.classList.add('mini-modifier');
    el.innerHTML = `<span class="mini-val">${card.label}</span>`;
    el.dataset.value = card.label;
  } else if (card.type === 'action') {
    el.classList.add('mini-action');
    el.innerHTML = `<span class="mini-val">${card.emoji || '⚡'}</span>`;
    el.dataset.action = card.action;
  }

  return el;
}

/**
 * Create a card-back element (for deck pile).
 */
export function createCardBack(mini = false) {
  const el = document.createElement('div');
  if (mini) {
    el.className = 'card-mini mini-back';
    return el;
  }
  return createCardBackElement(el);
}

/**
 * Get a consistent color for a player avatar.
 */
export function getPlayerColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/**
 * Create a player avatar element.
 */
export function createPlayerAvatar(name, index) {
  const el = document.createElement('div');
  el.className = 'player-avatar';
  el.style.backgroundColor = getPlayerColor(index);
  el.textContent = getInitials(name);
  return el;
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function animateCardDeal(cardEl) {
  cardEl.classList.add('card-deal-in');
  cardEl.addEventListener('animationend', () => {
    cardEl.classList.remove('card-deal-in');
  }, { once: true });
}

export function animateBust(container) {
  const cards = container.querySelectorAll('.card, .card-mini');
  cards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('card-bust');
    }, i * 60);
  });
}

export function animateStay(container) {
  const cards = container.querySelectorAll('.card, .card-mini');
  cards.forEach(card => {
    card.classList.add('card-stay');
  });
}

export function createConfetti(count = 60) {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444'];

  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.width = (Math.random() * 8 + 5) + 'px';
    confetti.style.height = (Math.random() * 8 + 5) + 'px';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
    confetti.style.animationDelay = (Math.random() * 1) + 's';
    container.appendChild(confetti);
  }

  setTimeout(() => {
    container.remove();
  }, 5000);
}
