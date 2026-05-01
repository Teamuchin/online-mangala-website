import {
  buildMoveHistoryEntry,
  buildPreMoveLastMove,
  buildResolvedLastMove,
  buildTurnMessage,
} from './movePresentation.js'

export function tickGameClock(currentGame) {
  if (currentGame.gameStatus !== 'playing') {
    return currentGame
  }

  const activePlayer = currentGame.currentPlayer
  const currentTime = currentGame.players[activePlayer].timeLeft

  if (currentTime <= 0) {
    const winner = activePlayer === 'bottom' ? 'top' : 'bottom'

    return {
      ...currentGame,
      gameStatus: 'finished',
      winner,
      turnMessage: `${currentGame.players[winner].name} wins on time.`,
    }
  }

  return {
    ...currentGame,
    players: {
      ...currentGame.players,
      [activePlayer]: {
        ...currentGame.players[activePlayer],
        timeLeft: currentTime - 1,
      },
    },
  }
}

export function finalizeMoveState(liveGame, currentGame, pitIndex, moveResult) {
  return {
    ...liveGame,
    board: moveResult.board,
    currentPlayer: moveResult.currentPlayer,
    selectedPit: pitIndex,
    moveInProgress: false,
    gameStatus: moveResult.gameStatus,
    winner: moveResult.winner,
    turnMessage: buildTurnMessage(currentGame, moveResult),
    lastMove: buildResolvedLastMove(moveResult),
    moveHistory: [
      ...liveGame.moveHistory,
      buildMoveHistoryEntry(currentGame.currentPlayer, moveResult),
    ],
  }
}

export function buildAnimatingMoveState(currentGame, pitIndex) {
  return {
    ...currentGame,
    board: currentGame.board,
    selectedPit: pitIndex,
    moveInProgress: true,
    turnMessage: `${currentGame.players[currentGame.currentPlayer].name} is sowing stones...`,
    lastMove: buildPreMoveLastMove(currentGame, pitIndex),
  }
}
