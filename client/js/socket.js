/**
 * Socket.IO Client Wrapper
 * Manages connection, reconnection, and event handling.
 */

class SocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connectionCallbacks = [];
    
    // Generate or retrieve persistent playerId
    try {
      this.playerId = localStorage.getItem('flip7_playerId');
    } catch (e) {
      console.warn('localStorage not available');
    }
    
    if (!this.playerId) {
      try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          this.playerId = crypto.randomUUID();
        }
      } catch (e) {
        console.warn('crypto.randomUUID failed', e);
      }
      
      if (!this.playerId) {
        this.playerId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      }
      
      try {
        localStorage.setItem('flip7_playerId', this.playerId);
      } catch (e) {}
    }
  }

  /** Connect to the server. */
  connect() {
    this.socket = io({
      auth: { playerId: this.playerId },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      this.updateConnectionUI('connected');
      this.connectionCallbacks.forEach(cb => cb('connected'));
      
      const lastRoom = localStorage.getItem('flip7_roomCode');
      if (lastRoom) {
        this.socket.emit('room:rejoin', { roomCode: lastRoom });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.updateConnectionUI('disconnected');
      this.connectionCallbacks.forEach(cb => cb('disconnected'));
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket] Reconnecting... attempt ${attempt}`);
      this.updateConnectionUI('reconnecting');
    });

    this.socket.on('reconnect', () => {
      console.log('[Socket] Reconnected');
      this.updateConnectionUI('connected');
      this.connectionCallbacks.forEach(cb => cb('reconnected'));
    });

    this.socket.on('reconnect_failed', () => {
      console.log('[Socket] Reconnection failed');
      this.updateConnectionUI('disconnected');
    });

    return this.socket;
  }

  /** Send an event to the server. */
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  /** Listen for an event from the server. */
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
    // Store for re-registration on reconnect
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /** Remove a listener. */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    if (this.listeners.has(event)) {
      const cbs = this.listeners.get(event);
      const idx = cbs.indexOf(callback);
      if (idx !== -1) cbs.splice(idx, 1);
    }
  }

  /** Register a connection state change callback. */
  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback);
  }

  /** Get the current socket ID. */
  get id() {
    return this.socket?.id;
  }

  /** Update the connection status indicator in the UI. */
  updateConnectionUI(status) {
    const el = document.getElementById('connection-status');
    if (!el) return;

    el.className = 'connection-status';
    const textEl = el.querySelector('.connection-text');

    switch (status) {
      case 'connected':
        textEl.textContent = 'Connected';
        break;
      case 'disconnected':
        el.classList.add('disconnected');
        textEl.textContent = 'Disconnected';
        break;
      case 'reconnecting':
        el.classList.add('reconnecting');
        textEl.textContent = 'Reconnecting...';
        break;
    }
  }
}

// Export singleton
export const socketManager = new SocketManager();
