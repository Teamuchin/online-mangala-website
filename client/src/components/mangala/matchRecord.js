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
    initialPitCount: moveResult.initialPitCount,
    dropCounts: moveResult.dropCounts,
    dropSequence: moveResult.dropSequence,
    capturedStones: moveResult.capturedStones,
    lastLandingIndex: moveResult.lastLandingIndex,
    gameStatus: moveResult.gameStatus,
    winner: moveResult.winner,
  }
}

export function formatPitLabel(player, pitIndex) {
  return player === 'top' ? 13 - pitIndex : pitIndex + 1
}

export function buildPositionDescription(matchRecord, positionIndex, players, t = null) {
  const translate = typeof t === 'function' ? t : (key, values = {}) => {
    if (key === 'game.viewingLatestPosition') {
      return 'Viewing the latest position.'
    }
    if (key === 'game.matchEndsInDraw') {
      return 'The match ends in a draw.'
    }
    if (key === 'game.wins') {
      return `${values.name} wins.`
    }
    if (key === 'game.toMove') {
      return `${values.name} to move`
    }
    if (key === 'game.viewingSelectedPosition') {
      return 'Viewing the selected position.'
    }
    return key
  }

  const position = matchRecord.positions[positionIndex]

  if (!position) {
    return translate('game.viewingLatestPosition')
  }

  if (position.gameStatus === 'finished') {
    if (position.winner === 'draw') {
      return translate('game.matchEndsInDraw')
    }

    if (position.winner && players[position.winner]) {
      return translate('game.wins', { name: players[position.winner].name })
    }
  }

  if (position.currentPlayer && players[position.currentPlayer]) {
    return translate('game.toMove', { name: players[position.currentPlayer].name })
  }

  return translate('game.viewingSelectedPosition')
}

export function buildReplayDescription(matchRecord, positionIndex, players, t = null) {
  return buildPositionDescription(matchRecord, positionIndex, players, t)
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
