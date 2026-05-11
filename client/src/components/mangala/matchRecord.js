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

export function formatPitLabel(player, pitIndex) {
  return player === 'top' ? 13 - pitIndex : pitIndex + 1
}

export function buildReplayDescription(matchRecord, positionIndex, players) {
  if (positionIndex === 0) {
    return 'Viewing the start position.'
  }

  const move = matchRecord.moves[positionIndex - 1]

  if (!move) {
    return 'Viewing the latest position.'
  }

  const playerName = players[move.player].name
  const pitLabel = formatPitLabel(move.player, move.fromPit)

  if (move.extraTurn) {
    return `${playerName} played pit ${pitLabel} and moved again.`
  }

  if (move.captured > 0) {
    return `${playerName} played pit ${pitLabel} and captured ${move.captured}.`
  }

  return `${playerName} played pit ${pitLabel}.`
}

export function buildReplayEntries(matchRecord, players) {
  return matchRecord.moves.map((move) => {
    const playerName = players[move.player].name
    const pitLabel = formatPitLabel(move.player, move.fromPit)
    let detail = `Pit ${pitLabel}`

    if (move.captured > 0) {
      detail += ` x${move.captured}`
    }

    if (move.extraTurn) {
      detail += ' +'
    }

    return {
      id: `${move.moveNumber}-${move.player}-${move.fromPit}`,
      moveNumber: move.moveNumber,
      playerName,
      detail,
    }
  })
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
