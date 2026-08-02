/**
 * SoundManager — generates all game sounds using the Web Audio API.
 * No external audio files needed — everything is synthesized.
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/** Resume audio context on first user interaction (browser requirement). */
export function initAudio() {
  const resumeAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };
  document.addEventListener('click', resumeAudio, { once: true });
  document.addEventListener('touchstart', resumeAudio, { once: true });
}

/**
 * Play a short tone.
 */
function playTone(freq, duration = 0.15, type = 'sine', volume = 0.12) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/**
 * Play noise burst (for card shuffle / deal sounds).
 */
function playNoise(duration = 0.08, volume = 0.06) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

// ── Sound Effects ──

/** Card dealt / flipped. */
export function soundCardDeal() {
  playNoise(0.06, 0.08);
  setTimeout(() => playTone(800, 0.06, 'sine', 0.04), 30);
}

/** Your turn notification. */
export function soundYourTurn() {
  playTone(523, 0.12, 'sine', 0.1);
  setTimeout(() => playTone(659, 0.12, 'sine', 0.1), 100);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.12), 200);
}

/** Player busted. */
export function soundBust() {
  playTone(300, 0.15, 'sawtooth', 0.08);
  setTimeout(() => playTone(200, 0.25, 'sawtooth', 0.06), 100);
  setTimeout(() => playTone(120, 0.35, 'sawtooth', 0.04), 200);
}

/** Player stayed. */
export function soundStay() {
  playTone(440, 0.1, 'sine', 0.06);
  setTimeout(() => playTone(554, 0.15, 'sine', 0.08), 80);
}

/** Flip 7 achieved! */
export function soundFlip7() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.1), i * 80);
  });
}

/** Round end jingle. */
export function soundRoundEnd() {
  playTone(440, 0.15, 'triangle', 0.08);
  setTimeout(() => playTone(523, 0.15, 'triangle', 0.08), 120);
  setTimeout(() => playTone(659, 0.2, 'triangle', 0.1), 240);
}

/** Game over fanfare. */
export function soundGameOver() {
  const notes = [392, 440, 523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 'sine', 0.1), i * 100);
  });
}

/** Button click. */
export function soundClick() {
  playTone(600, 0.05, 'sine', 0.05);
}

/** Error / invalid action. */
export function soundError() {
  playTone(200, 0.1, 'square', 0.04);
  setTimeout(() => playTone(150, 0.15, 'square', 0.03), 80);
}

/** Action card used (freeze, flip three). */
export function soundAction() {
  playTone(880, 0.08, 'sine', 0.06);
  setTimeout(() => playTone(1100, 0.1, 'sine', 0.08), 60);
  setTimeout(() => playTone(880, 0.08, 'sine', 0.05), 140);
}

/** Timer warning (last 5 seconds). */
export function soundTimerTick() {
  playTone(1000, 0.03, 'sine', 0.04);
}

/** Card shuffle. */
export function soundShuffle() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => playNoise(0.04, 0.04), i * 50);
  }
}

/** Second chance save. */
export function soundSecondChance() {
  playTone(523, 0.1, 'sine', 0.08);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 80);
  setTimeout(() => playTone(1047, 0.2, 'sine', 0.12), 180);
}
