export function buildTurnMessage(currentGame, moveResult) {
  const activeName = currentGame.players[currentGame.currentPlayer].name
  const nextName = currentGame.players[moveResult.currentPlayer].name

  if (moveResult.gameStatus === 'finished') {
    return moveResult.winner === 'draw'
      ? 'The match ends in a draw.'
      : `${currentGame.players[moveResult.winner].name} collects more stones and wins.`
  }

  if (moveResult.extraTurn) {
    return `${activeName} landed in the store and plays again.`
  }

  if (moveResult.captured > 0) {
    return `${activeName} captured ${moveResult.captured} stones. ${nextName} is up next.`
  }

  return `${nextName} to move`
}

export function buildAnimatedLastMove(moveResult, frameIndex) {
  const visibleSequence = moveResult.dropSequence.slice(0, frameIndex + 1)
  const dropCounts = visibleSequence.reduce((accumulator, index) => {
    accumulator[index] = (accumulator[index] ?? 0) + 1
    return accumulator
  }, {})

  return {
    fromPit: moveResult.fromPit,
    initialPitCount: moveResult.initialPitCount,
    dropCounts,
    dropSequence: visibleSequence,
    capturedStones: [],
    lastLandingIndex:
      visibleSequence.length > 0
        ? visibleSequence[visibleSequence.length - 1]
        : null,
    captured: 0,
    extraTurn: false,
  }
}

export function buildPreMoveLastMove(currentGame, pitIndex) {
  return {
    fromPit: pitIndex,
    initialPitCount: currentGame.board[pitIndex],
    preMoveSourceCount: currentGame.board[pitIndex],
    dropCounts: {},
    dropSequence: [],
    capturedStones: [],
    lastLandingIndex: null,
    captured: 0,
    extraTurn: false,
  }
}

export function buildResolvedLastMove(moveResult) {
  return {
    fromPit: moveResult.fromPit,
    initialPitCount: moveResult.initialPitCount,
    dropCounts: moveResult.dropCounts,
    dropSequence: moveResult.dropSequence,
    capturedStones: moveResult.capturedStones,
    lastLandingIndex: moveResult.lastLandingIndex,
    captured: moveResult.captured,
    extraTurn: moveResult.extraTurn,
  }
}

export function buildMoveHistoryEntry(currentPlayer, moveResult) {
  return {
    player: currentPlayer,
    fromPit: moveResult.fromPit,
    landedAt: moveResult.lastLandingIndex,
    captured: moveResult.captured,
    extraTurn: moveResult.extraTurn,
  }
}
