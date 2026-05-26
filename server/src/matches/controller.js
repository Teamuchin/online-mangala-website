const crypto = require('crypto');
const db = require('../db');
const { updateUserEloQuery } = require('../auth/queries');
const { buildRatedMatchOutcome } = require('./rating');
const { chooseBotMove } = require('./botLogic');
const { applyMove, getLegalMoves } = require('./gameLogic');
const {
  createMatchQuery,
  findMatchByIdQuery,
  findMatchesByUserIdQuery,
  listActiveMatchesQuery,
  updateMatchQuery,
} = require('./queries');

function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function createMatchId() {
  return crypto.randomBytes(6).toString('hex');
}

function buildFlatBoard(boardState) {
  if (Array.isArray(boardState) && boardState.length === 14) {
    return [...boardState];
  }

  if (!boardState || typeof boardState !== 'object') {
    return null;
  }

  const {
    bottomPits = [],
    topPits = [],
    bottomStore = 0,
    topStore = 0,
  } = boardState;

  if (
    !Array.isArray(bottomPits) ||
    !Array.isArray(topPits) ||
    bottomPits.length !== 6 ||
    topPits.length !== 6
  ) {
    return null;
  }

  return [
    ...bottomPits,
    bottomStore,
    ...topPits,
    topStore,
  ];
}

function buildBoardStatePayload(board) {
  if (!Array.isArray(board) || board.length !== 14) {
    return null;
  }

  return {
    bottomPits: board.slice(0, 6),
    bottomStore: board[6],
    topPits: board.slice(7, 13),
    topStore: board[13],
  };
}

function buildMovePayload(moveResult, moveNumber) {
  return {
    moveNumber,
    playerSide: moveResult.playerSide,
    fromPit: moveResult.fromPit,
    pitIndex: moveResult.fromPit,
    captured: moveResult.captured,
    extraTurn: moveResult.extraTurn,
    initialPitCount: moveResult.initialPitCount,
    dropCounts: moveResult.dropCounts,
    dropSequence: moveResult.dropSequence,
    capturedStones: moveResult.capturedStones,
    lastLandingIndex: moveResult.lastLandingIndex,
    nextPlayer: moveResult.currentPlayer,
    boardAfter: buildBoardStatePayload(moveResult.board),
    gameStatus: moveResult.gameStatus,
    winner: moveResult.winner,
  };
}

function isBotSide(existingMatch, side) {
  return side === 'bottom'
    ? existingMatch.bottom_player_is_bot === true
    : existingMatch.top_player_is_bot === true;
}

async function persistUpdatedMatch(client, matchId, payload) {
  await client.query(updateMatchQuery, [
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

  const eloUpdates = buildFinishedRatedEloUpdates(payload);

  if (eloUpdates) {
    await client.query(updateUserEloQuery, [
      eloUpdates.bottom.userId,
      eloUpdates.bottom.nextElo,
    ]);
    await client.query(updateUserEloQuery, [
      eloUpdates.top.userId,
      eloUpdates.top.nextElo,
    ]);
  }
}

function normalizeMatchPayload(input, options = {}) {
  const {
    requireId = true,
    existingMatch = null,
  } = options;

  const source = input ?? {};
  const providedMatchId = String(source.id || '').trim();
  const matchId = requireId
    ? providedMatchId
    : providedMatchId || String(existingMatch?.id || '').trim();

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

function buildFinishedRatedEloUpdates(payload) {
  if (!payload.isRated || payload.status !== 'finished') {
    return null;
  }

  return {
    bottom: {
      userId: payload.bottomPlayerId,
      nextElo: payload.bottomRatingBefore + payload.bottomRatingChange,
    },
    top: {
      userId: payload.topPlayerId,
      nextElo: payload.topRatingBefore + payload.topRatingChange,
    },
  };
}

function buildServerRatedResult(existingMatch, payload) {
  if (!existingMatch?.is_rated || payload.status !== 'finished') {
    return null;
  }

  const bottomRatingBefore = existingMatch.bottom_rating_before;
  const topRatingBefore = existingMatch.top_rating_before;

  if (payload.winnerSide === 'bottom') {
    const ratedOutcome = buildRatedMatchOutcome(bottomRatingBefore, topRatingBefore, 'win');

    return {
      bottomRatingBefore,
      topRatingBefore,
      bottomRatingChange: ratedOutcome.playerDelta,
      topRatingChange: ratedOutcome.opponentDelta,
    };
  }

  if (payload.winnerSide === 'top') {
    const ratedOutcome = buildRatedMatchOutcome(topRatingBefore, bottomRatingBefore, 'win');

    return {
      bottomRatingBefore,
      topRatingBefore,
      bottomRatingChange: ratedOutcome.opponentDelta,
      topRatingChange: ratedOutcome.playerDelta,
    };
  }

  if (payload.winnerSide === 'draw') {
    const ratedOutcome = buildRatedMatchOutcome(bottomRatingBefore, topRatingBefore, 'draw');

    return {
      bottomRatingBefore,
      topRatingBefore,
      bottomRatingChange: ratedOutcome.playerDelta,
      topRatingChange: ratedOutcome.opponentDelta,
    };
  }

  return {
    bottomRatingBefore,
    topRatingBefore,
    bottomRatingChange: 0,
    topRatingChange: 0,
  };
}

async function createMatch(req, res) {
  try {
    const authenticatedUserId = parseInteger(req.auth?.userId);
    const payload = normalizeMatchPayload(req.body, { requireId: false });
    const validationError = validateMatchPayload(payload, { requireId: false });

    if (
      authenticatedUserId !== payload.bottomPlayerId &&
      authenticatedUserId !== payload.topPlayerId
    ) {
      return res.status(403).json({ message: 'You cannot create a match for other players' });
    }

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (!payload.id) {
      payload.id = createMatchId();
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

    const serverRatedResult = buildServerRatedResult(existingMatch, payload);

    if (serverRatedResult) {
      payload.bottomRatingBefore = serverRatedResult.bottomRatingBefore;
      payload.topRatingBefore = serverRatedResult.topRatingBefore;
      payload.bottomRatingChange = serverRatedResult.bottomRatingChange;
      payload.topRatingChange = serverRatedResult.topRatingChange;
    } else {
      payload.bottomRatingBefore = existingMatch.bottom_rating_before;
      payload.topRatingBefore = existingMatch.top_rating_before;
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      await persistUpdatedMatch(client, matchId, payload);

      const refreshedMatchResult = await client.query(findMatchByIdQuery, [matchId]);

      await client.query('COMMIT');
      return res.status(200).json(refreshedMatchResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update match error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function submitMove(req, res) {
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
      return res.status(403).json({ message: 'You cannot play moves for other players' });
    }

    if (existingMatch.status === 'finished') {
      return res.status(400).json({ message: 'Match is already finished' });
    }

    const board = buildFlatBoard(existingMatch?.game_state?.board);

    if (!board) {
      return res.status(500).json({ message: 'Stored match board is invalid' });
    }

    let currentPlayer = existingMatch?.game_state?.currentPlayer === 'top' ? 'top' : 'bottom';
    const actingSide =
      authenticatedUserId === existingMatch.bottom_player_id ? 'bottom' : 'top';
    const submittedPitIndex =
      req.body?.pitIndex === undefined ? null : parseInteger(req.body.pitIndex);
    const nextMoves = Array.isArray(existingMatch.moves) ? [...existingMatch.moves] : [];
    let currentBoard = board;
    let currentStatus = 'active';
    let winnerSide = null;
    let resultReason = null;

    if (submittedPitIndex === null) {
      if (!isBotSide(existingMatch, currentPlayer)) {
        return res.status(400).json({ message: 'pitIndex is required for a human turn' });
      }
    } else {
      if (currentPlayer !== actingSide) {
        return res.status(403).json({ message: 'It is not your turn' });
      }

      const legalMoves = getLegalMoves(currentBoard, currentPlayer);

      if (!legalMoves.includes(submittedPitIndex)) {
        return res.status(400).json({ message: 'Illegal move' });
      }
    }

    const pitIndexToApply =
      submittedPitIndex === null ? chooseBotMove(currentBoard) : submittedPitIndex;

    if (pitIndexToApply === null) {
      return res.status(400).json({ message: 'No legal move available' });
    }

    const moveResult = applyMove(currentBoard, currentPlayer, pitIndexToApply);

    if (!moveResult) {
      return res.status(400).json({ message: 'Illegal move' });
    }

    moveResult.playerSide = currentPlayer;
    nextMoves.push(buildMovePayload(moveResult, nextMoves.length + 1));
    currentBoard = moveResult.board;
    currentPlayer = moveResult.currentPlayer;

    if (moveResult.gameStatus === 'finished') {
      currentStatus = 'finished';
      winnerSide = moveResult.winner;
      resultReason = 'normal';
    }

    const payload = normalizeMatchPayload(
      {
        is_rated: existingMatch.is_rated,
        status: currentStatus,
        winner_side: winnerSide,
        result_reason: resultReason,
        bottom_rating_before: existingMatch.bottom_rating_before,
        top_rating_before: existingMatch.top_rating_before,
        bottom_rating_change: existingMatch.bottom_rating_change,
        top_rating_change: existingMatch.top_rating_change,
        started_at: existingMatch.started_at,
        finished_at:
          currentStatus === 'finished'
            ? existingMatch.finished_at ?? new Date().toISOString()
            : null,
        moves: nextMoves,
        game_state: {
          currentPlayer,
          board: buildBoardStatePayload(currentBoard),
          bottomTimeLeft: existingMatch?.game_state?.bottomTimeLeft ?? 300,
          topTimeLeft: existingMatch?.game_state?.topTimeLeft ?? 300,
        },
      },
      {
        requireId: false,
        existingMatch,
      },
    );

    const serverRatedResult = buildServerRatedResult(existingMatch, payload);

    if (serverRatedResult) {
      payload.bottomRatingBefore = serverRatedResult.bottomRatingBefore;
      payload.topRatingBefore = serverRatedResult.topRatingBefore;
      payload.bottomRatingChange = serverRatedResult.bottomRatingChange;
      payload.topRatingChange = serverRatedResult.topRatingChange;
    } else {
      payload.bottomRatingBefore = existingMatch.bottom_rating_before;
      payload.topRatingBefore = existingMatch.top_rating_before;
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      await persistUpdatedMatch(client, matchId, payload);
      const refreshedMatchResult = await client.query(findMatchByIdQuery, [matchId]);
      await client.query('COMMIT');
      return res.status(200).json(refreshedMatchResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Submit move error:', error);
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

async function getActiveMatches(req, res) {
  try {
    const result = await db.query(listActiveMatchesQuery);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get active matches error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createMatch,
  updateMatch,
  submitMove,
  getMatchById,
  getMatchesByUserId,
  getActiveMatches,
};
