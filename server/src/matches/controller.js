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

const DEFAULT_TIME_LEFT_SECONDS = 300;
const matchTimeoutHandles = new Map();

function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeUserId(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function isSameUserId(left, right) {
  return normalizeUserId(left) !== null && normalizeUserId(left) === normalizeUserId(right);
}

function getOpponent(side) {
  return side === 'bottom' ? 'top' : 'bottom';
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

function getCurrentPlayer(match) {
  return match?.game_state?.currentPlayer === 'top' ? 'top' : 'bottom';
}

function resolveClockSnapshot(match, now = Date.now()) {
  const gameState =
    match?.game_state && typeof match.game_state === 'object' && !Array.isArray(match.game_state)
      ? match.game_state
      : {};
  const currentPlayer = getCurrentPlayer(match);
  const bottomTimeLeft =
    parseInteger(gameState.bottomTimeLeft) ?? DEFAULT_TIME_LEFT_SECONDS;
  const topTimeLeft =
    parseInteger(gameState.topTimeLeft) ?? DEFAULT_TIME_LEFT_SECONDS;
  const lastTurnStartedAtSource = gameState.lastTurnStartedAt ?? match?.started_at ?? null;
  const lastTurnStartedAtMs = lastTurnStartedAtSource
    ? Date.parse(lastTurnStartedAtSource)
    : null;
  const hasTurnStart =
    match?.status === 'active' &&
    Number.isFinite(lastTurnStartedAtMs) &&
    lastTurnStartedAtMs !== null;

  const elapsedMs = hasTurnStart ? Math.max(0, now - lastTurnStartedAtMs) : 0;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  let resolvedBottom = bottomTimeLeft;
  let resolvedTop = topTimeLeft;
  let timedOutSide = null;

  if (hasTurnStart) {
    if (currentPlayer === 'bottom') {
      resolvedBottom = Math.max(0, bottomTimeLeft - elapsedSeconds);

      if (elapsedMs >= bottomTimeLeft * 1000) {
        timedOutSide = 'bottom';
      }
    } else {
      resolvedTop = Math.max(0, topTimeLeft - elapsedSeconds);

      if (elapsedMs >= topTimeLeft * 1000) {
        timedOutSide = 'top';
      }
    }
  }

  const remainingMs =
    match?.status !== 'active' || !hasTurnStart
      ? null
      : Math.max(
          0,
          (currentPlayer === 'bottom' ? bottomTimeLeft : topTimeLeft) * 1000 - elapsedMs,
        );

  return {
    currentPlayer,
    bottomTimeLeft: resolvedBottom,
    topTimeLeft: resolvedTop,
    lastTurnStartedAt: hasTurnStart ? new Date(lastTurnStartedAtMs).toISOString() : null,
    remainingMs,
    timedOutSide,
  };
}

function hydrateMatchForResponse(match, now = Date.now()) {
  if (!match || match.status !== 'active') {
    return match;
  }

  const snapshot = resolveClockSnapshot(match, now);

  return {
    ...match,
    game_state: {
      ...(match.game_state ?? {}),
      currentPlayer: snapshot.currentPlayer,
      bottomTimeLeft: snapshot.bottomTimeLeft,
      topTimeLeft: snapshot.topTimeLeft,
      // Return a fresh clock snapshot baseline so the client can render
      // a smooth local countdown without subtracting the same elapsed time twice.
      lastTurnStartedAt: new Date(now).toISOString(),
    },
  };
}

function clearScheduledMatchTimeout(matchId) {
  const timeoutHandle = matchTimeoutHandles.get(matchId);

  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    matchTimeoutHandles.delete(matchId);
  }
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
      : normalizeUserId(source.bottom_player_id);
  const topPlayerId =
    source.top_player_id === undefined
      ? existingMatch?.top_player_id ?? null
      : normalizeUserId(source.top_player_id);
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

async function finalizeMatchByTimeout(matchId) {
  clearScheduledMatchTimeout(matchId);

  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    const existingMatchResult = await client.query(findMatchByIdQuery, [matchId]);

    if (existingMatchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const existingMatch = existingMatchResult.rows[0];

    if (existingMatch.status !== 'active') {
      await client.query('COMMIT');
      return existingMatch;
    }

    const snapshot = resolveClockSnapshot(existingMatch, Date.now());

    if (!snapshot.timedOutSide) {
      await client.query('COMMIT');
      scheduleMatchTimeout(existingMatch);
      return hydrateMatchForResponse(existingMatch);
    }

    const payload = normalizeMatchPayload(
      {
        is_rated: existingMatch.is_rated,
        status: 'finished',
        winner_side: getOpponent(snapshot.timedOutSide),
        result_reason: 'timeout',
        bottom_rating_before: existingMatch.bottom_rating_before,
        top_rating_before: existingMatch.top_rating_before,
        bottom_rating_change: existingMatch.bottom_rating_change,
        top_rating_change: existingMatch.top_rating_change,
        started_at: existingMatch.started_at,
        finished_at: new Date().toISOString(),
        moves: existingMatch.moves,
        game_state: {
          ...(existingMatch.game_state ?? {}),
          currentPlayer: snapshot.currentPlayer,
          bottomTimeLeft: snapshot.bottomTimeLeft,
          topTimeLeft: snapshot.topTimeLeft,
          lastTurnStartedAt: null,
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
    }

    await persistUpdatedMatch(client, matchId, payload);
    const refreshedMatchResult = await client.query(findMatchByIdQuery, [matchId]);
    await client.query('COMMIT');

    return refreshedMatchResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function scheduleMatchTimeout(match) {
  clearScheduledMatchTimeout(match?.id);

  if (!match || match.status !== 'active') {
    return;
  }

  const snapshot = resolveClockSnapshot(match, Date.now());

  if (snapshot.remainingMs === null) {
    return;
  }

  const timeoutHandle = setTimeout(() => {
    void finalizeMatchByTimeout(match.id).catch((error) => {
      console.error(`Finalize timeout match error (${match.id}):`, error);
    });
  }, Math.max(0, snapshot.remainingMs));

  matchTimeoutHandles.set(match.id, timeoutHandle);
}

async function initializeMatchTimeouts() {
  matchTimeoutHandles.forEach((handle) => clearTimeout(handle));
  matchTimeoutHandles.clear();

  const result = await db.query(listActiveMatchesQuery);
  result.rows.forEach((match) => {
    scheduleMatchTimeout(match);
  });
}

function isBotSide(existingMatch, side) {
  return side === 'bottom'
    ? existingMatch.bottom_player_is_bot === true
    : existingMatch.top_player_is_bot === true;
}

async function createMatch(req, res) {
  try {
    const authenticatedUserId = normalizeUserId(req.auth?.userId);
    const payload = normalizeMatchPayload(req.body, { requireId: false });
    const validationError = validateMatchPayload(payload, { requireId: false });

    if (
      !isSameUserId(authenticatedUserId, payload.bottomPlayerId) &&
      !isSameUserId(authenticatedUserId, payload.topPlayerId)
    ) {
      return res.status(403).json({ message: 'You cannot create a match for other players' });
    }

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (!payload.id) {
      payload.id = createMatchId();
    }

    const initialCurrentPlayer =
      payload.gameState?.currentPlayer === 'top' ? 'top' : 'bottom';
    const initialBottomTimeLeft =
      parseInteger(payload.gameState?.bottomTimeLeft) ?? DEFAULT_TIME_LEFT_SECONDS;
    const initialTopTimeLeft =
      parseInteger(payload.gameState?.topTimeLeft) ?? DEFAULT_TIME_LEFT_SECONDS;
    payload.gameState = {
      ...(payload.gameState ?? {}),
      currentPlayer: initialCurrentPlayer,
      bottomTimeLeft: initialBottomTimeLeft,
      topTimeLeft: initialTopTimeLeft,
      lastTurnStartedAt: payload.status === 'active' ? new Date().toISOString() : null,
    };

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

    scheduleMatchTimeout(result.rows[0]);

    return res.status(201).json(hydrateMatchForResponse(result.rows[0]));
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
    const authenticatedUserId = normalizeUserId(req.auth?.userId);
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
      !isSameUserId(authenticatedUserId, existingMatch.bottom_player_id) &&
      !isSameUserId(authenticatedUserId, existingMatch.top_player_id)
    ) {
      return res.status(403).json({ message: 'You cannot update a match for other players' });
    }

    if (
      req.body?.bottom_player_id !== undefined &&
      !isSameUserId(req.body.bottom_player_id, existingMatch.bottom_player_id)
    ) {
      return res.status(400).json({ message: 'Match players cannot be changed' });
    }

    if (
      req.body?.top_player_id !== undefined &&
      !isSameUserId(req.body.top_player_id, existingMatch.top_player_id)
    ) {
      return res.status(400).json({ message: 'Match players cannot be changed' });
    }

    const timeoutResolvedMatch = await finalizeMatchByTimeout(matchId);
    const activeMatch =
      timeoutResolvedMatch && timeoutResolvedMatch.id === existingMatch.id
        ? timeoutResolvedMatch
        : existingMatch;

    if (activeMatch.status === 'finished') {
      return res.status(200).json(hydrateMatchForResponse(activeMatch));
    }

    const payload = normalizeMatchPayload(req.body, {
      requireId: false,
      existingMatch: activeMatch,
    });
    const validationError = validateMatchPayload(payload, { requireId: false });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const snapshot = resolveClockSnapshot(activeMatch, Date.now());
    payload.gameState = {
      ...(payload.gameState ?? {}),
      currentPlayer:
        payload.gameState?.currentPlayer === 'top' ? 'top' : snapshot.currentPlayer,
      bottomTimeLeft: snapshot.bottomTimeLeft,
      topTimeLeft: snapshot.topTimeLeft,
      lastTurnStartedAt:
        payload.status === 'active'
          ? payload.gameState?.lastTurnStartedAt ?? new Date().toISOString()
          : null,
    };

    const serverRatedResult = buildServerRatedResult(activeMatch, payload);

    if (serverRatedResult) {
      payload.bottomRatingBefore = serverRatedResult.bottomRatingBefore;
      payload.topRatingBefore = serverRatedResult.topRatingBefore;
      payload.bottomRatingChange = serverRatedResult.bottomRatingChange;
      payload.topRatingChange = serverRatedResult.topRatingChange;
    } else {
      payload.bottomRatingBefore = activeMatch.bottom_rating_before;
      payload.topRatingBefore = activeMatch.top_rating_before;
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      await persistUpdatedMatch(client, matchId, payload);
      const refreshedMatchResult = await client.query(findMatchByIdQuery, [matchId]);
      await client.query('COMMIT');
      scheduleMatchTimeout(refreshedMatchResult.rows[0]);
      return res.status(200).json(hydrateMatchForResponse(refreshedMatchResult.rows[0]));
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
    const authenticatedUserId = normalizeUserId(req.auth?.userId);
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
      !isSameUserId(authenticatedUserId, existingMatch.bottom_player_id) &&
      !isSameUserId(authenticatedUserId, existingMatch.top_player_id)
    ) {
      return res.status(403).json({ message: 'You cannot play moves for other players' });
    }

    if (existingMatch.status === 'finished') {
      return res.status(400).json({
        message: 'Match is already finished',
        match: existingMatch,
      });
    }

    const timeoutResolvedMatch = await finalizeMatchByTimeout(matchId);
    const activeMatch =
      timeoutResolvedMatch && timeoutResolvedMatch.id === existingMatch.id
        ? timeoutResolvedMatch
        : existingMatch;

    if (activeMatch.status === 'finished') {
      return res.status(409).json({
        message: 'Match timed out',
        match: activeMatch,
      });
    }

    const board = buildFlatBoard(activeMatch?.game_state?.board);

    if (!board) {
      return res.status(500).json({ message: 'Stored match board is invalid' });
    }

    const clockSnapshot = resolveClockSnapshot(activeMatch, Date.now());
    let currentPlayer = clockSnapshot.currentPlayer;
    const actingSide =
      isSameUserId(authenticatedUserId, activeMatch.bottom_player_id) ? 'bottom' : 'top';
    const submittedPitIndex =
      req.body?.pitIndex === undefined ? null : parseInteger(req.body.pitIndex);
    const nextMoves = Array.isArray(activeMatch.moves) ? [...activeMatch.moves] : [];
    let currentBoard = board;
    let currentStatus = 'active';
    let winnerSide = null;
    let resultReason = null;

    if (submittedPitIndex === null) {
      if (!isBotSide(activeMatch, currentPlayer)) {
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
      submittedPitIndex === null ? chooseBotMove(currentBoard, currentPlayer) : submittedPitIndex;

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
        is_rated: activeMatch.is_rated,
        status: currentStatus,
        winner_side: winnerSide,
        result_reason: resultReason,
        bottom_rating_before: activeMatch.bottom_rating_before,
        top_rating_before: activeMatch.top_rating_before,
        bottom_rating_change: activeMatch.bottom_rating_change,
        top_rating_change: activeMatch.top_rating_change,
        started_at: activeMatch.started_at,
        finished_at:
          currentStatus === 'finished'
            ? activeMatch.finished_at ?? new Date().toISOString()
            : null,
        moves: nextMoves,
        game_state: {
          currentPlayer,
          board: buildBoardStatePayload(currentBoard),
          bottomTimeLeft: clockSnapshot.bottomTimeLeft,
          topTimeLeft: clockSnapshot.topTimeLeft,
          lastTurnStartedAt: currentStatus === 'active' ? new Date().toISOString() : null,
        },
      },
      {
        requireId: false,
        existingMatch: activeMatch,
      },
    );

    const serverRatedResult = buildServerRatedResult(activeMatch, payload);

    if (serverRatedResult) {
      payload.bottomRatingBefore = serverRatedResult.bottomRatingBefore;
      payload.topRatingBefore = serverRatedResult.topRatingBefore;
      payload.bottomRatingChange = serverRatedResult.bottomRatingChange;
      payload.topRatingChange = serverRatedResult.topRatingChange;
    } else {
      payload.bottomRatingBefore = activeMatch.bottom_rating_before;
      payload.topRatingBefore = activeMatch.top_rating_before;
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      await persistUpdatedMatch(client, matchId, payload);
      const refreshedMatchResult = await client.query(findMatchByIdQuery, [matchId]);
      await client.query('COMMIT');
      scheduleMatchTimeout(refreshedMatchResult.rows[0]);
      return res.status(200).json(hydrateMatchForResponse(refreshedMatchResult.rows[0]));
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

async function resignMatch(req, res) {
  try {
    const authenticatedUserId = normalizeUserId(req.auth?.userId);
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
      !isSameUserId(authenticatedUserId, existingMatch.bottom_player_id) &&
      !isSameUserId(authenticatedUserId, existingMatch.top_player_id)
    ) {
      return res.status(403).json({ message: 'You cannot resign for other players' });
    }

    const timeoutResolvedMatch = await finalizeMatchByTimeout(matchId);
    const activeMatch =
      timeoutResolvedMatch && timeoutResolvedMatch.id === existingMatch.id
        ? timeoutResolvedMatch
        : existingMatch;

    if (activeMatch.status === 'finished') {
      return res.status(200).json(hydrateMatchForResponse(activeMatch));
    }

    const resigningSide =
      isSameUserId(authenticatedUserId, activeMatch.bottom_player_id) ? 'bottom' : 'top';
    const clockSnapshot = resolveClockSnapshot(activeMatch, Date.now());
    const payload = normalizeMatchPayload(
      {
        is_rated: activeMatch.is_rated,
        status: 'finished',
        winner_side: getOpponent(resigningSide),
        result_reason: 'resign',
        bottom_rating_before: activeMatch.bottom_rating_before,
        top_rating_before: activeMatch.top_rating_before,
        bottom_rating_change: activeMatch.bottom_rating_change,
        top_rating_change: activeMatch.top_rating_change,
        started_at: activeMatch.started_at,
        finished_at: new Date().toISOString(),
        moves: activeMatch.moves,
        game_state: {
          ...(activeMatch.game_state ?? {}),
          currentPlayer: clockSnapshot.currentPlayer,
          bottomTimeLeft: clockSnapshot.bottomTimeLeft,
          topTimeLeft: clockSnapshot.topTimeLeft,
          lastTurnStartedAt: null,
        },
      },
      {
        requireId: false,
        existingMatch: activeMatch,
      },
    );

    const serverRatedResult = buildServerRatedResult(activeMatch, payload);

    if (serverRatedResult) {
      payload.bottomRatingBefore = serverRatedResult.bottomRatingBefore;
      payload.topRatingBefore = serverRatedResult.topRatingBefore;
      payload.bottomRatingChange = serverRatedResult.bottomRatingChange;
      payload.topRatingChange = serverRatedResult.topRatingChange;
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      await persistUpdatedMatch(client, matchId, payload);
      const refreshedMatchResult = await client.query(findMatchByIdQuery, [matchId]);
      await client.query('COMMIT');
      clearScheduledMatchTimeout(matchId);
      return res.status(200).json(refreshedMatchResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Resign match error:', error);
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

    const timeoutResolvedMatch = await finalizeMatchByTimeout(matchId);
    const match = timeoutResolvedMatch ?? result.rows[0];

    return res.status(200).json(hydrateMatchForResponse(match));
  } catch (error) {
    console.error('Get match by id error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getMatchesByUserId(req, res) {
  try {
    const userId = String(req.params?.userId || '').trim();

    if (!userId) {
      return res.status(400).json({ message: 'User id is required' });
    }

    const result = await db.query(findMatchesByUserIdQuery, [userId]);
    return res.status(200).json(result.rows.map((match) => hydrateMatchForResponse(match)));
  } catch (error) {
    console.error('Get matches by user id error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getActiveMatches(req, res) {
  try {
    const result = await db.query(listActiveMatchesQuery);
    const matches = await Promise.all(
      result.rows.map(async (match) => (await finalizeMatchByTimeout(match.id)) ?? match),
    );
    return res.status(200).json(matches.map((match) => hydrateMatchForResponse(match)));
  } catch (error) {
    console.error('Get active matches error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createMatch,
  updateMatch,
  submitMove,
  resignMatch,
  getMatchById,
  getMatchesByUserId,
  getActiveMatches,
  initializeMatchTimeouts,
};
