const db = require('../db');
const {
  createMatchQuery,
  findMatchByIdQuery,
  findMatchesByUserIdQuery,
} = require('./queries');

function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

async function createMatch(req, res) {
  try {
    const authenticatedUserId = parseInteger(req.auth?.userId);
    const {
      id,
      bottom_player_id: rawBottomPlayerId,
      top_player_id: rawTopPlayerId,
      is_rated: rawIsRated,
      status,
      winner_side: winnerSide = null,
      result_reason: resultReason = null,
      bottom_rating_before: rawBottomRatingBefore,
      top_rating_before: rawTopRatingBefore,
      bottom_rating_change: rawBottomRatingChange = 0,
      top_rating_change: rawTopRatingChange = 0,
      started_at: startedAt = new Date().toISOString(),
      finished_at: finishedAt = null,
      moves = [],
      game_state: gameState = {},
    } = req.body ?? {};

    const matchId = String(id || '').trim();
    const bottomPlayerId = parseInteger(rawBottomPlayerId);
    const topPlayerId = parseInteger(rawTopPlayerId);
    const bottomRatingBefore = parseInteger(rawBottomRatingBefore);
    const topRatingBefore = parseInteger(rawTopRatingBefore);
    const bottomRatingChange = parseInteger(rawBottomRatingChange);
    const topRatingChange = parseInteger(rawTopRatingChange);
    const isRated = Boolean(rawIsRated);

    if (!matchId) {
      return res.status(400).json({ message: 'Match id is required' });
    }

    if (!bottomPlayerId || !topPlayerId) {
      return res.status(400).json({ message: 'Both player ids are required' });
    }

    if (
      authenticatedUserId !== bottomPlayerId &&
      authenticatedUserId !== topPlayerId
    ) {
      return res.status(403).json({ message: 'You cannot create a match for other players' });
    }

    if (bottomPlayerId === topPlayerId) {
      return res.status(400).json({ message: 'A match requires two different players' });
    }

    if (bottomRatingBefore === null || topRatingBefore === null) {
      return res.status(400).json({ message: 'Starting ratings are required' });
    }

    if (bottomRatingChange === null || topRatingChange === null) {
      return res.status(400).json({ message: 'Rating changes must be integers' });
    }

    if (!['active', 'finished'].includes(status)) {
      return res.status(400).json({ message: 'Invalid match status' });
    }

    if (
      winnerSide !== null &&
      !['bottom', 'top', 'draw'].includes(winnerSide)
    ) {
      return res.status(400).json({ message: 'Invalid winner side' });
    }

    if (
      resultReason !== null &&
      !['normal', 'resign', 'timeout'].includes(resultReason)
    ) {
      return res.status(400).json({ message: 'Invalid result reason' });
    }

    if (!Array.isArray(moves)) {
      return res.status(400).json({ message: 'Moves must be an array' });
    }

    if (!gameState || typeof gameState !== 'object' || Array.isArray(gameState)) {
      return res.status(400).json({ message: 'Game state must be an object' });
    }

    const result = await db.query(createMatchQuery, [
      matchId,
      bottomPlayerId,
      topPlayerId,
      isRated,
      status,
      winnerSide,
      resultReason,
      bottomRatingBefore,
      topRatingBefore,
      bottomRatingChange,
      topRatingChange,
      startedAt,
      finishedAt,
      JSON.stringify(moves),
      JSON.stringify(gameState),
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create match error:', error);

    if (error.code === '23503') {
      return res.status(400).json({ message: 'One or both players do not exist' });
    }

    if (error.code === '23505') {
      return res.status(409).json({ message: 'Match id already exists' });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getMatchById(req, res) {
  try {
    const matchId = String(req.params?.id || '').trim();

    if (!matchId) {
      return res.status(400).json({ message: 'Match id is required' });
    }

    const result = await db.query(findMatchByIdQuery, [matchId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get match by id error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getMatchesByUserId(req, res) {
  try {
    const userId = parseInteger(req.params?.userId);

    if (!userId) {
      return res.status(400).json({ message: 'User id must be a valid integer' });
    }

    const result = await db.query(findMatchesByUserIdQuery, [userId]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get matches by user id error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createMatch,
  getMatchById,
  getMatchesByUserId,
};
