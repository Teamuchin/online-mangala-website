const { applyMove, getLegalMoves } = require('./gameLogic');

const EXTRA_TURN_ONLY_BOT_USERNAMES = new Set([
  'toprak02',
]);

const EXTRA_TURN_AND_CAPTURE_BOT_USERNAMES = new Set([
  'ruzgar03',
  'alev04',
]);

function chooseRandomLegalMove(legalMoves) {
  if (legalMoves.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * legalMoves.length);
  return legalMoves[randomIndex];
}

function chooseExtraTurnFirstMove(board, playerSide, legalMoves) {
  const prioritizedMoves = [...legalMoves].sort((left, right) => right - left);

  for (const pitIndex of prioritizedMoves) {
    const moveResult = applyMove(board, playerSide, pitIndex);

    if (moveResult?.extraTurn) {
      return pitIndex;
    }
  }

  return chooseRandomLegalMove(legalMoves);
}

function chooseBestCaptureMove(board, playerSide, legalMoves) {
  let bestCaptureAmount = 0;
  const bestCaptureMoves = [];

  for (const pitIndex of legalMoves) {
    const moveResult = applyMove(board, playerSide, pitIndex);
    const captured = moveResult?.captured ?? 0;

    if (captured <= 0) {
      continue;
    }

    if (captured > bestCaptureAmount) {
      bestCaptureAmount = captured;
      bestCaptureMoves.length = 0;
      bestCaptureMoves.push(pitIndex);
      continue;
    }

    if (captured === bestCaptureAmount) {
      bestCaptureMoves.push(pitIndex);
    }
  }

  return chooseRandomLegalMove(bestCaptureMoves);
}

function chooseExtraTurnThenCaptureMove(board, playerSide, legalMoves) {
  const prioritizedMoves = [...legalMoves].sort((left, right) => right - left);

  for (const pitIndex of prioritizedMoves) {
    const moveResult = applyMove(board, playerSide, pitIndex);

    if (moveResult?.extraTurn) {
      return pitIndex;
    }
  }

  const captureMove = chooseBestCaptureMove(board, playerSide, legalMoves);

  if (captureMove !== null) {
    return captureMove;
  }

  return chooseRandomLegalMove(legalMoves);
}

function chooseBotMove(board, playerSide = 'top', botUsername = '') {
  const legalMoves = getLegalMoves(board, playerSide);

  if (legalMoves.length === 0) {
    return null;
  }

  const normalizedBotUsername = String(botUsername || '').trim().toLowerCase();

  if (EXTRA_TURN_ONLY_BOT_USERNAMES.has(normalizedBotUsername)) {
    return chooseExtraTurnFirstMove(board, playerSide, legalMoves);
  }

  if (EXTRA_TURN_AND_CAPTURE_BOT_USERNAMES.has(normalizedBotUsername)) {
    return chooseExtraTurnThenCaptureMove(board, playerSide, legalMoves);
  }

  return chooseRandomLegalMove(legalMoves);
}

module.exports = {
  chooseBotMove,
};
