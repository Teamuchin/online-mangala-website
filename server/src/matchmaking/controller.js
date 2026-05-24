const crypto = require('crypto');
const db = require('../db');
const { findUserByIdQuery } = require('../auth/queries');
const { createMatchQuery } = require('../matches/queries');
const {
  cleanupQueueEntries,
  findCompatibleQueueEntry,
  getQueueEntry,
  removeQueueEntry,
  setQueueEntry,
} = require('./state');

const INITIAL_MATCH_BOARD = {
  bottomPits: [4, 4, 4, 4, 4, 4],
  bottomStore: 0,
  topPits: [4, 4, 4, 4, 4, 4],
  topStore: 0,
};

function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function buildQueuedPlayer(user) {
  return {
    id: String(user.id),
    name: user.username,
    username: user.username,
    rating: user.elo,
    timeLeft: 300,
  };
}

function buildMatchPlayers(currentUser, opponentUser) {
  const currentOnBottom = Math.random() < 0.5;
  const currentPlayer = buildQueuedPlayer(currentUser);
  const opponentPlayer = buildQueuedPlayer(opponentUser);

  return currentOnBottom
    ? {
        bottom: currentPlayer,
        top: opponentPlayer,
      }
    : {
        bottom: opponentPlayer,
        top: currentPlayer,
      };
}

function buildSearchingResponse(entry) {
  return {
    status: 'searching',
    rated: entry.rated,
    allowBots: entry.allowBots,
    joinedAt: entry.joinedAt,
  };
}

function buildMatchedResponse(entry) {
  return {
    status: 'matched',
    rated: entry.rated,
    allowBots: entry.allowBots,
    gameId: entry.gameId,
    players: entry.players,
    matchedAt: entry.matchedAt,
  };
}

async function readUserById(userId) {
  const result = await db.query(findUserByIdQuery, [userId]);
  return result.rows[0] ?? null;
}

async function createBackendMatch(players, rated) {
  const gameId = crypto.randomBytes(6).toString('hex');

  await db.query(createMatchQuery, [
    gameId,
    parseInteger(players.bottom.id),
    parseInteger(players.top.id),
    rated,
    'active',
    null,
    null,
    players.bottom.rating,
    players.top.rating,
    0,
    0,
    new Date().toISOString(),
    null,
    JSON.stringify([]),
    JSON.stringify({
      currentPlayer: 'bottom',
      board: INITIAL_MATCH_BOARD,
    }),
  ]);

  return gameId;
}

async function joinQueue(req, res) {
  try {
    const userId = String(req.auth?.userId || '').trim();
    const rated = Boolean(req.body?.rated);
    const allowBots = Boolean(req.body?.allowBots);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    cleanupQueueEntries();

    const currentUser = await readUserById(userId);

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingEntry = getQueueEntry(userId);

    if (existingEntry?.status === 'matched') {
      return res.status(200).json(buildMatchedResponse(existingEntry));
    }

    const currentEntry = {
      userId: String(currentUser.id),
      username: currentUser.username,
      rating: currentUser.elo,
      rated,
      allowBots,
      joinedAt: existingEntry?.joinedAt ?? Date.now(),
      status: 'searching',
    };

    const matchedEntry = findCompatibleQueueEntry(currentEntry);

    if (!matchedEntry) {
      setQueueEntry(currentEntry);
      return res.status(200).json(buildSearchingResponse(currentEntry));
    }

    const opponentUser = await readUserById(matchedEntry.userId);

    if (!opponentUser) {
      removeQueueEntry(matchedEntry.userId);
      setQueueEntry(currentEntry);
      return res.status(200).json(buildSearchingResponse(currentEntry));
    }

    const players = buildMatchPlayers(currentUser, opponentUser);
    const gameId = await createBackendMatch(players, rated);
    const matchedAt = Date.now();
    const currentMatchedEntry = {
      ...currentEntry,
      status: 'matched',
      matchedAt,
      gameId,
      players,
    };
    const opponentMatchedEntry = {
      ...matchedEntry,
      status: 'matched',
      matchedAt,
      gameId,
      players,
    };

    setQueueEntry(currentMatchedEntry);
    setQueueEntry(opponentMatchedEntry);

    return res.status(200).json(buildMatchedResponse(currentMatchedEntry));
  } catch (error) {
    console.error('Join queue error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

function getQueueStatus(req, res) {
  try {
    const userId = String(req.auth?.userId || '').trim();

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    cleanupQueueEntries();

    const entry = getQueueEntry(userId);

    if (!entry) {
      return res.status(200).json({ status: 'idle' });
    }

    if (entry.status === 'matched') {
      return res.status(200).json(buildMatchedResponse(entry));
    }

    return res.status(200).json(buildSearchingResponse(entry));
  } catch (error) {
    console.error('Get queue status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

function leaveQueue(req, res) {
  try {
    const userId = String(req.auth?.userId || '').trim();

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    removeQueueEntry(userId);
    return res.status(200).json({ message: 'Left queue' });
  } catch (error) {
    console.error('Leave queue error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getQueueStatus,
  joinQueue,
  leaveQueue,
};
