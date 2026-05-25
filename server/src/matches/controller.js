const db = require('../db');
const {
  createMatchQuery,
  findMatchByIdQuery,
  findMatchesByUserIdQuery,
  updateMatchQuery,
} = require('./queries');

function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeMatchPayload(input, options = {}) {
  const {
    requireId = true,
    existingMatch = null,
  } = options;

  const source = input ?? {};
  const matchId = requireId
    ? String(source.id || '').trim()
    : String(existingMatch?.id || '').trim();

  const bottomPlayerId =
    source.bottom_player_id === undefined
      ? existingMatch?.bottom_player_id ?? null
      : parseInteger(source.bottom_player_id);
  const topPlayerId =
    source.top_player_id === undefined
      ? existingMatch?.top_player_id ?? null
      : parseInteger(source.top_player_id);
  const bottomRatingBefore =
    source.bottom_rating_before === undefined
      ? existingMatch?.bottom_rating_before ?? null
      : parseInteger(source.bottom_rating_before);
  const topRatingBefore =
    source.top_rating_before === undefined
      ? existingMatch?.top_rating_before ?? null
      : parseInteger(source.top_rating_before);
  const bottomRatingChange =
    source.bottom_rating_change === undefined
      ? existingMatch?.bottom_rating_change ?? 0
      : parseInteger(source.bottom_rating_change);
  const topRatingChange =
    source.top_rating_change === undefined
      ? existingMatch?.top_rating_change ?? 0
      : parseInteger(source.top_rating_change);

  return {
    id: matchId,
    bottomPlayerId,
    topPlayerId,
    isRated:
      source.is_rated === undefined
        ? Boolean(existingMatch?.is_rated)
        : Boolean(source.is_rated),
    status: source.status ?? existingMatch?.status ?? null,
    winnerSide:
      source.winner_side === undefined
        ? existingMatch?.winner_side ?? null
        : source.winner_side,
    resultReason:
      source.result_reason === undefined
        ? existingMatch?.result_reason ?? null
        : source.result_reason,
    bottomRatingBefore,
    topRatingBefore,
    bottomRatingChange,
    topRatingChange,
    startedAt:
      source.started_at === undefined
        ? existingMatch?.started_at ?? new Date().toISOString()
        : source.started_at,
    finishedAt:
      source.finished_at === undefined
        ? existingMatch?.finished_at ?? null
        : source.finished_at,
    moves: source.moves === undefined ? existingMatch?.moves ?? [] : source.moves,
    gameState:
      source.game_state === undefined ? existingMatch?.game_state ?? {} : source.game_state,
  };
}

function validateMatchPayload(payload, { requireId = true } = {}) {
  if (requireId && !payload.id) {
    return 'Match id is required';
  }

  if (!payload.bottomPlayerId || !payload.topPlayerId) {
    return 'Both player ids are required';
  }

  if (payload.bottomPlayerId === payload.topPlayerId) {
    return 'A match requires two different players';
  }

  if (payload.bottomRatingBefore === null || payload.topRatingBefore === null) {
    return 'Starting ratings are required';
  }

  if (payload.bottomRatingChange === null || payload.topRatingChange === null) {
    return 'Rating changes must be integers';
  }

  if (!['active', 'finished'].includes(payload.status)) {
    return 'Invalid match status';
  }

  if (
    payload.winnerSide !== null &&
    !['bottom', 'top', 'draw'].includes(payload.winnerSide)
  ) {
    return 'Invalid winner side';
  }

  if (
    payload.resultReason !== null &&
    !['normal', 'resign', 'timeout'].includes(payload.resultReason)
  ) {
    return 'Invalid result reason';
  }

  if (!Array.isArray(payload.moves)) {
    return 'Moves must be an array';
  }

  if (
    !payload.gameState ||
    typeof payload.gameState !== 'object' ||
    Array.isArray(payload.gameState)
  ) {
    return 'Game state must be an object';
  }

  return null;
}

async function createMatch(req, res) {
  try {
    const authenticatedUserId = parseInteger(req.auth?.userId);
    const payload = normalizeMatchPayload(req.body, { requireId: true });
    const validationError = validateMatchPayload(payload, { requireId: true });

    if (
      authenticatedUserId !== payload.bottomPlayerId &&
      authenticatedUserId !== payload.topPlayerId
    ) {
      return res.status(403).json({ message: 'You cannot create a match for other players' });
    }

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await db.query(createMatchQuery, [
      payload.id,
      payload.bottomPlayerId,
      payload.topPlayerId,
      payload.isRated,
      payload.status,
      payload.winnerSide,
      payload.resultReason,
      payload.bottomRatingBefore,
      payload.topRatingBefore,
      payload.bottomRatingChange,
      payload.topRatingChange,
      payload.startedAt,
      payload.finishedAt,
      JSON.stringify(payload.moves),
      JSON.stringify(payload.gameState),
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

async function updateMatch(req, res) {
  try {
    const authenticatedUserId = parseInteger(req.auth?.userId);
    const matchId = String(req.params?.id || '').trim();

    if (!matchId) {
      return res.status(400).json({ message: 'Match id is required' });
    }

    const existingMatchResult = await db.query(findMatchByIdQuery, [matchId]);

    if (existingMatchResult.rows.length === 0) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const existingMatch = existingMatchResult.rows[0];

    if (
      authenticatedUserId !== existingMatch.bottom_player_id &&
      authenticatedUserId !== existingMatch.top_player_id
    ) {
      return res.status(403).json({ message: 'You cannot update a match for other players' });
    }

    if (
      req.body?.bottom_player_id !== undefined &&
      parseInteger(req.body.bottom_player_id) !== existingMatch.bottom_player_id
    ) {
      return res.status(400).json({ message: 'Match players cannot be changed' });
    }

    if (
      req.body?.top_player_id !== undefined &&
      parseInteger(req.body.top_player_id) !== existingMatch.top_player_id
    ) {
      return res.status(400).json({ message: 'Match players cannot be changed' });
    }

    // Once a match is finished, backend state becomes authoritative and immutable.
    // This prevents a stale polling client from overwriting the final result
    // with an older "active" snapshot before it rehydrates from the backend.
    if (existingMatch.status === 'finished') {
      return res.status(200).json(existingMatch);
    }

    const payload = normalizeMatchPayload(req.body, {
      requireId: false,
      existingMatch,
    });
    const validationError = validateMatchPayload(payload, { requireId: false });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await db.query(updateMatchQuery, [
      matchId,
      payload.isRated,
      payload.status,
      payload.winnerSide,
      payload.resultReason,
      payload.bottomRatingBefore,
      payload.topRatingBefore,
      payload.bottomRatingChange,
      payload.topRatingChange,
      payload.startedAt,
      payload.finishedAt,
      JSON.stringify(payload.moves),
      JSON.stringify(payload.gameState),
    ]);

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update match error:', error);
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
  updateMatch,
  getMatchById,
  getMatchesByUserId,
};
