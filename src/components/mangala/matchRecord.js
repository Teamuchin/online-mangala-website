export function buildPositionSnapshot({
  board,
  currentPlayer,
  gameStatus,
  winner,
  players,
}) {
  return {
    board: [...board],
    currentPlayer,
    gameStatus,
    winner,
    players: structuredClone(players),
  }
}

export function createMatchRecord(gameState) {
  return {
    positions: [buildPositionSnapshot(gameState)],
    moves: [],
  }
}

export function buildRecordedMove(currentGame, moveResult, moveNumber) {
  return {
    moveNumber,
    player: currentGame.currentPlayer,
    fromPit: moveResult.fromPit,
    landedAt: moveResult.lastLandingIndex,
    captured: moveResult.captured,
    extraTurn: moveResult.extraTurn,
    gameStatus: moveResult.gameStatus,
    winner: moveResult.winner,
  }
}

export function appendMatchRecord(liveGame, currentGame, moveResult) {
  const moves = [
    ...liveGame.matchRecord.moves,
    buildRecordedMove(currentGame, moveResult, liveGame.matchRecord.moves.length + 1),
  ]
  const positions = [
    ...liveGame.matchRecord.positions,
    buildPositionSnapshot({
      board: moveResult.board,
      currentPlayer: moveResult.currentPlayer,
      gameStatus: moveResult.gameStatus,
      winner: moveResult.winner,
      players: liveGame.players,
    }),
  ]

  return {
    moves,
    positions,
  }
}
