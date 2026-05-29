const { getLegalMoves } = require('./gameLogic');

function chooseBotMove(board, playerSide = 'top') {
  const legalMoves = getLegalMoves(board, playerSide);

  if (legalMoves.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * legalMoves.length);
  return legalMoves[randomIndex];
}

module.exports = {
  chooseBotMove,
};
