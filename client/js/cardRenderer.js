/**
 * Card Renderer — creates authentic, crisp, physical card DOM elements using SVG.
 */

const AVATAR_COLORS = [
  '#10b981', '#8b5cf6', '#3b82f6', '#ef4444', '#f59e0b',
  '#06b6d4', '#ec4899', '#84cc16', '#a855f7', '#d97706',
];

// Color coding for number card headers by value range
function getNumberHeaderColor(value) {
  if (value <= 3) return '#0f766e'; // Teal
  if (value <= 7) return '#1d4ed8'; // Blue
  return '#4338ca';                 // Indigo
}

export function createCardElement(card, mini = false) {
  const el = document.createElement('div');
  
  if (mini) {
    el.className = 'card-mini';
    el.dataset.cardId = card.id ?? '';
    if (card.type === 'number') el.dataset.value = card.value;
    if (card.type === 'modifier') el.dataset.value = card.label;
    if (card.type === 'action') el.dataset.action = card.action;
    el.innerHTML = getMiniSvg(card);
    return el;
  }

  el.className = 'card';
  el.dataset.cardId = card.id ?? '';

  if (card.type === 'number') {
    el.dataset.value = card.value;
    el.innerHTML = getNumberSvg(card);
  } else if (card.type === 'modifier') {
    el.dataset.value = card.label;
    el.innerHTML = getModifierSvg(card);
  } else if (card.type === 'action') {
    el.dataset.action = card.action;
    el.innerHTML = getActionSvg(card);
  } else {
    el.innerHTML = getBackSvg();
  }

  return el;
}

function getNumberSvg(card) {
  const headerBg = getNumberHeaderColor(card.value);
  const cid = card.id || Math.random().toString(36).slice(2);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="100%" height="100%" style="display:block;">
      <defs>
        <pattern id="pat-${cid}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="${headerBg}" opacity="0.1" />
        </pattern>
      </defs>
      <rect width="200" height="280" fill="#ffffff" />
      <rect width="200" height="280" fill="url(#pat-${cid})" />
      
      <rect width="200" height="40" fill="${headerBg}" />
      <text x="100" y="26" font-family="Outfit, sans-serif" font-weight="800" font-size="16" fill="#fff" text-anchor="middle" letter-spacing="2">NUMBER</text>
      
      <text x="24" y="80" font-family="Outfit, sans-serif" font-weight="900" font-size="32" fill="${headerBg}" text-anchor="middle">${card.value}</text>
      <text x="176" y="260" font-family="Outfit, sans-serif" font-weight="900" font-size="32" fill="${headerBg}" text-anchor="middle" transform="rotate(180 176 250)">${card.value}</text>
      
      <text x="100" y="180" font-family="Outfit, sans-serif" font-weight="900" font-size="110" fill="#0f172a" text-anchor="middle">${card.value}</text>
    </svg>
  `;
}

function getModifierSvg(card) {
  const cid = card.id || Math.random().toString(36).slice(2);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="100%" height="100%" style="display:block;">
      <defs>
        <linearGradient id="modGrad-${cid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#d97706" />
        </linearGradient>
        <pattern id="modPat-${cid}" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20,0 L20,40 M0,20 L40,20" stroke="#fff" stroke-width="2" opacity="0.15" />
        </pattern>
      </defs>
      <rect width="200" height="280" fill="url(#modGrad-${cid})" />
      <rect width="200" height="280" fill="url(#modPat-${cid})" />
      
      <rect width="200" height="40" fill="rgba(0,0,0,0.2)" />
      <text x="100" y="26" font-family="Outfit, sans-serif" font-weight="800" font-size="16" fill="#fff" text-anchor="middle" letter-spacing="2">MODIFIER</text>
      
      <text x="28" y="80" font-family="Outfit, sans-serif" font-weight="900" font-size="28" fill="#fff" text-anchor="middle">${card.label}</text>
      <text x="172" y="260" font-family="Outfit, sans-serif" font-weight="900" font-size="28" fill="#fff" text-anchor="middle" transform="rotate(180 172 250)">${card.label}</text>
      
      <text x="100" y="175" font-family="Outfit, sans-serif" font-weight="900" font-size="80" fill="#fff" text-anchor="middle">${card.label}</text>
    </svg>
  `;
}

function getActionSvg(card) {
  const descriptions = {
    freeze: 'Target player\nmust STAY.',
    flip_three: 'Target player\ndraws 3 cards.',
    second_chance: 'Saves you\nfrom 1 BUST.',
  };
  const descLines = (descriptions[card.action] || '').split('\n');
  const cid = card.id || Math.random().toString(36).slice(2);
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="100%" height="100%" style="display:block;">
      <defs>
        <linearGradient id="actGrad-${cid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#6d28d9" />
        </linearGradient>
        <pattern id="actPat-${cid}" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="20" fill="#fff" opacity="0.08" />
        </pattern>
      </defs>
      <rect width="200" height="280" fill="url(#actGrad-${cid})" />
      <rect width="200" height="280" fill="url(#actPat-${cid})" />
      
      <rect width="200" height="40" fill="rgba(0,0,0,0.3)" />
      <text x="100" y="26" font-family="Outfit, sans-serif" font-weight="800" font-size="16" fill="#fff" text-anchor="middle" letter-spacing="2">ACTION</text>
      
      <text x="100" y="130" font-family="Outfit, sans-serif" font-size="64" fill="#fff" text-anchor="middle">${card.emoji || '⚡'}</text>
      <text x="100" y="180" font-family="Outfit, sans-serif" font-weight="900" font-size="22" fill="#fff" text-anchor="middle" text-transform="uppercase">${card.label}</text>
      ${descLines.map((line, i) => `<text x="100" y="${210 + (i*16)}" font-family="Inter, sans-serif" font-weight="500" font-size="13" fill="#e9d5ff" text-anchor="middle">${line}</text>`).join('')}
    </svg>
  `;
}

function getBackSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="100%" height="100%" style="display:block;">
      <defs>
        <linearGradient id="backGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#059669" />
          <stop offset="100%" stop-color="#064e3b" />
        </linearGradient>
        <pattern id="backPat" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20,0 L40,20 L20,40 L0,20 Z" fill="none" stroke="#047857" stroke-width="2" />
          <circle cx="20" cy="20" r="4" fill="#047857" />
        </pattern>
      </defs>
      <rect width="200" height="280" fill="url(#backGrad)" />
      <rect width="200" height="280" fill="url(#backPat)" />
      
      <rect x="12" y="12" width="176" height="256" fill="none" stroke="#f59e0b" stroke-width="3" rx="8" />
      <rect x="30" y="90" width="140" height="100" fill="rgba(6, 78, 59, 0.95)" rx="4" />
      
      <text x="100" y="135" font-family="Outfit, sans-serif" font-weight="900" font-size="32" fill="#fff" text-anchor="middle" letter-spacing="2">FLIP</text>
      <text x="100" y="175" font-family="Outfit, sans-serif" font-weight="900" font-size="44" fill="#f59e0b" text-anchor="middle">7</text>
    </svg>
  `;
}

function getMiniSvg(card) {
  if (card.type === 'number') {
    const headerBg = getNumberHeaderColor(card.value);
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 84" width="100%" height="100%" style="display:block;">
        <rect width="60" height="84" fill="#ffffff" />
        <rect width="12" height="84" fill="${headerBg}" />
        <text x="36" y="55" font-family="Outfit, sans-serif" font-weight="900" font-size="32" fill="#0f172a" text-anchor="middle">${card.value}</text>
      </svg>
    `;
  } else if (card.type === 'modifier') {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 84" width="100%" height="100%" style="display:block;">
        <rect width="60" height="84" fill="#d97706" />
        <text x="30" y="52" font-family="Outfit, sans-serif" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">${card.label}</text>
      </svg>
    `;
  } else if (card.type === 'action') {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 84" width="100%" height="100%" style="display:block;">
        <rect width="60" height="84" fill="#6d28d9" />
        <text x="30" y="56" font-family="Outfit, sans-serif" font-size="28" fill="#ffffff" text-anchor="middle">${card.emoji || '⚡'}</text>
      </svg>
    `;
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 84" width="100%" height="100%" style="display:block;">
      <rect width="60" height="84" fill="#064e3b" />
      <rect x="6" y="6" width="48" height="72" fill="none" stroke="#f59e0b" stroke-width="2" rx="4" />
    </svg>
  `;
}

export function createCardBack(mini = false) {
  const el = document.createElement('div');
  if (mini) {
    el.className = 'card-mini';
    el.innerHTML = getMiniSvg({ type: 'back' });
    return el;
  }
  el.className = 'card card-back';
  el.innerHTML = getBackSvg();
  return el;
}

export function getPlayerColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

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
