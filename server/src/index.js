require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
const authRoutes = require('./routes/auth');
const matchmakingRoutes = require('./routes/matchmaking');
const matchRoutes = require('./routes/matches');
const userRoutes = require('./routes/users');
const friendsRoutes = require('./routes/friends');
const { ensureSeededBotUsers } = require('./auth/botSeed');
const { initializeMatchTimeouts } = require('./matches/controller');
const { initSocketManager } = require('./socketManager');
const messagesRoutes = require('./routes/messages');

const app = express();
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      status: 'Server is healthy!',
      db_time: result.rows[0].now,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'Database connection failed', error: err.message });
  }
});

async function startServer() {
  try {
    // Schema is managed via node-pg-migrate scripts before server boot.
    await ensureSeededBotUsers(db);
    console.log('Seeded bot users are ready');
    await initializeMatchTimeouts();
    console.log('Match timeout scheduler is ready');

    const PORT = process.env.PORT || 5000;
    const server = http.createServer(app);
    initSocketManager(server);
    
    server.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

startServer();
