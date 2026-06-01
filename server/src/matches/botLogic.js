const { applyMove, getLegalMoves } = require('./gameLogic');

const EXTRA_TURN_BOT_USERNAMES = new Set([
  'toprak02',
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

function chooseBotMove(board, playerSide = 'top', botUsername = '') {
  const legalMoves = getLegalMoves(board, playerSide);

  if (legalMoves.length === 0) {
    return null;
  }

  const normalizedBotUsername = String(botUsername || '').trim().toLowerCase();

  if (EXTRA_TURN_BOT_USERNAMES.has(normalizedBotUsername)) {
    return chooseExtraTurnFirstMove(board, playerSide, legalMoves);
  }

  return chooseRandomLegalMove(legalMoves);
}

module.exports = {
  chooseBotMove,
};
