import {
  buildMoveHistoryEntry,
  buildPreMoveLastMove,
  buildResolvedLastMove,
  buildTurnMessage,
} from './movePresentation.js'
import { appendMatchRecord } from './matchRecord.js'

export function syncGameClock(currentGame, now = Date.now()) {
  if (currentGame.gameStatus !== 'playing') {
    return currentGame
  }

  const lastTimerStartedAt = currentGame.lastTimerStartedAt ?? now
  const elapsedSeconds = Math.floor((now - lastTimerStartedAt) / 1000)

  if (elapsedSeconds <= 0) {
    return currentGame
  }

  const activePlayer = currentGame.currentPlayer
  const currentTime = currentGame.players[activePlayer].timeLeft
  const remainingTime = currentTime - elapsedSeconds

  if (remainingTime <= 0) {
    const winner = activePlayer === 'bottom' ? 'top' : 'bottom'

    return {
      ...currentGame,
      gameStatus: 'finished',
      winner,
      turnMessage: `${currentGame.players[winner].name} wins on time.`,
      lastTimerStartedAt: now,
      players: {
        ...currentGame.players,
        [activePlayer]: {
          ...currentGame.players[activePlayer],
          timeLeft: 0,
        },
      },
    }
  }

  return {
    ...currentGame,
    lastTimerStartedAt: lastTimerStartedAt + elapsedSeconds * 1000,
    players: {
      ...currentGame.players,
      [activePlayer]: {
        ...currentGame.players[activePlayer],
        timeLeft: remainingTime,
      },
    },
  }
}

export function finalizeMoveState(liveGame, currentGame, pitIndex, moveResult) {
  const matchRecord = appendMatchRecord(liveGame, currentGame, moveResult)

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
    lastTimerStartedAt: Date.now(),
    matchRecord,
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
