import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerHandlers, roomManager } from './socket/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// ── Serve static client files ──
const clientPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientPath));

// ── Health check ──
app.get('/health', (req, res) => {
  const stats = roomManager.getStats();
  res.json({ status: 'ok', uptime: process.uptime(), ...stats });
});

// ── Fallback to index.html for SPA-like routing ──
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// ── Register Socket.IO handlers ──
registerHandlers(io);

// ── Start server ──
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║          🃏  FLIP 7 — Game Server  🃏          ║
  ║                                               ║
  ║   Running on: http://localhost:${PORT}           ║
  ║                                               ║
  ╚═══════════════════════════════════════════════╝
  `);
});

// ── Graceful shutdown ──
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  roomManager.shutdown();
  io.close();
  httpServer.close(() => {
    console.log('[Server] Goodbye!');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  roomManager.shutdown();
  io.close();
  httpServer.close(() => process.exit(0));
});
