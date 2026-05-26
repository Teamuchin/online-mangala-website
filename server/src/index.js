require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRoutes = require('./routes/auth');
const matchmakingRoutes = require('./routes/matchmaking');
const matchRoutes = require('./routes/matches');
const userRoutes = require('./routes/users');
const { ensureSeededBotUsers } = require('./auth/botSeed');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/users', userRoutes);

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

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

startServer();
