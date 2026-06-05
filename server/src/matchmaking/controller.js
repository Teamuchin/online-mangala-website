const crypto = require('crypto');
const db = require('../db');
const { findUserByIdQuery } = require('../auth/queries');
const { createMatchQuery, findActiveMatchByUserIdQuery } = require('../matches/queries');
const {
  cleanupQueueEntries,
  consumeQueueEntry,
  findCompatibleQueueEntry,
  getQueueEntry,
  removeQueueEntry,
  setQueueEntry,
} = require('./state');

const BOT_FALLBACK_DELAY_MS = 4 * 1000;
const INITIAL_MATCH_BOARD = {
  bottomPits: [4, 4, 4, 4, 4, 4],
  bottomStore: 0,
  topPits: [4, 4, 4, 4, 4, 4],
  topStore: 0,
};

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

async function readActiveMatchByUserId(userId) {
  const result = await db.query(findActiveMatchByUserIdQuery, [userId]);
  return result.rows[0] ?? null;
}

async function createBackendMatch(players, rated) {
  const gameId = crypto.randomBytes(6).toString('hex');
  const startedAt = new Date().toISOString();

  await db.query(createMatchQuery, [
    gameId,
    players.bottom.id,
    players.top.id,
    rated,
    'active',
    null,
    null,
    players.bottom.rating,
    players.top.rating,
    0,
    0,
    startedAt,
    null,
    JSON.stringify([]),
    JSON.stringify({
      currentPlayer: 'bottom',
      board: INITIAL_MATCH_BOARD,
      bottomTimeLeft: 300,
      topTimeLeft: 300,
      lastTurnStartedAt: startedAt,
    }),
  ]);

  return gameId;
}

async function readClosestBotUser(excludedUserId, targetRating) {
  const excludedId = String(excludedUserId || '').trim() || null;
  const normalizedTargetRating = Number.isInteger(targetRating) ? targetRating : 1200;
  const result = await db.query(
    `
    SELECT id, username, elo
    FROM users
    WHERE is_bot = TRUE
      AND ($1::text IS NULL OR id::text <> $1::text)
      AND NOT EXISTS (
        SELECT 1 FROM matches
        WHERE status = 'active'
          AND (bottom_player_id = users.id OR top_player_id = users.id)
      )
    ORDER BY ABS(elo - $2::int) ASC, RANDOM()
    LIMIT 1;
    `,
    [excludedId, normalizedTargetRating],
  );

  return result.rows[0] ?? null;
}

async function buildBotMatchedEntry(entry) {
  const currentUser = await readUserById(entry.userId);

  if (!currentUser) {
    removeQueueEntry(entry.userId);
    return null;
  }

  const botUser = await readClosestBotUser(currentUser.id, currentUser.elo ?? entry.rating);

  if (!botUser) {
    return null;
  }

  const players = buildMatchPlayers(currentUser, botUser);
  const gameId = await createBackendMatch(players, entry.rated);
  const matchedAt = Date.now();

  return {
    ...entry,
    status: 'matched',
    matchedAt,
    gameId,
    players,
  };
}

function buildAndConsumeMatchedResponse(userId, entry) {
  const response = buildMatchedResponse(entry);
  consumeQueueEntry(userId);
  return response;
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

    const activeMatch = await readActiveMatchByUserId(userId);
    if (activeMatch) {
      return res.status(409).json({ message: 'You already have an active match.' });
    }

    const existingEntry = getQueueEntry(userId);

    if (existingEntry?.status === 'matched') {
      return res.status(200).json(buildAndConsumeMatchedResponse(userId, existingEntry));
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

    const reservedOpponentEntry = consumeQueueEntry(matchedEntry.userId);

    if (
      !reservedOpponentEntry ||
      reservedOpponentEntry.status !== 'searching' ||
      reservedOpponentEntry.rated !== currentEntry.rated
    ) {
      setQueueEntry(currentEntry);
      return res.status(200).json(buildSearchingResponse(currentEntry));
    }

    const opponentUser = await readUserById(reservedOpponentEntry.userId);

    if (!opponentUser) {
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
      ...reservedOpponentEntry,
      status: 'matched',
      matchedAt,
      gameId,
      players,
    };

    setQueueEntry(currentMatchedEntry);
    setQueueEntry(opponentMatchedEntry);

    return res.status(200).json(buildAndConsumeMatchedResponse(userId, currentMatchedEntry));
  } catch (error) {
    console.error('Join queue error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getQueueStatus(req, res) {
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
      return res.status(200).json(buildAndConsumeMatchedResponse(userId, entry));
    }

    if (entry.allowBots && Date.now() - entry.joinedAt >= BOT_FALLBACK_DELAY_MS) {
      const reservedEntry = consumeQueueEntry(userId);

      if (!reservedEntry) {
        return res.status(200).json({ status: 'idle' });
      }

      if (reservedEntry.status === 'matched') {
        return res.status(200).json(buildMatchedResponse(reservedEntry));
      }

      const botMatchedEntry = await buildBotMatchedEntry(reservedEntry);

      if (botMatchedEntry) {
        return res.status(200).json(buildMatchedResponse(botMatchedEntry));
      }

      setQueueEntry(reservedEntry);
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

async function challengeBot(req, res) {
  try {
    const userId = String(req.auth?.userId || '').trim();
    const botUserId = String(req.body?.botUserId || '').trim();
    const rated = Boolean(req.body?.rated);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!botUserId) {
      return res.status(400).json({ message: 'Bot user id is required' });
    }

    if (userId === botUserId) {
      return res.status(400).json({ message: 'You cannot challenge yourself' });
    }

    cleanupQueueEntries();
    removeQueueEntry(userId);

    const [currentUser, botUser, currentUserActiveMatch, botUserActiveMatch] = await Promise.all([
      readUserById(userId),
      readUserById(botUserId),
      readActiveMatchByUserId(userId),
      readActiveMatchByUserId(botUserId),
    ]);

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!botUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    if (botUser.is_bot !== true) {
      return res.status(400).json({ message: 'This user is not a bot.' });
    }

    if (currentUserActiveMatch) {
      return res.status(409).json({ message: 'You already have an active match.' });
    }

    if (botUserActiveMatch) {
      return res.status(409).json({ message: 'This user is currently playing another match.' });
    }

    const players = buildMatchPlayers(currentUser, botUser);
    const gameId = await createBackendMatch(players, rated);

    return res.status(200).json({
      status: 'matched',
      rated,
      allowBots: false,
      gameId,
      players,
      matchedAt: Date.now(),
    });
  } catch (error) {
    console.error('Challenge bot error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  challengeBot,
  getQueueStatus,
  joinQueue,
  leaveQueue,
};
