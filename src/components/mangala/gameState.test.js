import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAnimatingMoveState,
  finalizeMoveState,
  tickGameClock,
} from './gameState.js'

const baseGame = {
  board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
  currentPlayer: 'bottom',
  selectedPit: null,
  moveInProgress: false,
  gameStatus: 'playing',
  winner: null,
  turnMessage: 'Emre to move',
  lastMove: null,
  players: {
    bottom: { id: 'p1', name: 'Emre', rating: 1485, timeLeft: 300 },
    top: { id: 'p2', name: 'Ayse', rating: 1520, timeLeft: 300 },
  },
  moveHistory: [],
}

test('tickGameClock decrements the active player timer during play', () => {
  const nextGame = tickGameClock(baseGame)

  assert.equal(nextGame.players.bottom.timeLeft, 299)
  assert.equal(nextGame.players.top.timeLeft, 300)
  assert.equal(nextGame.gameStatus, 'playing')
})

test('tickGameClock leaves non-playing games unchanged', () => {
  const finishedGame = { ...baseGame, gameStatus: 'finished' }

  assert.equal(tickGameClock(finishedGame), finishedGame)
})

test('tickGameClock ends the game on time and names the winner', () => {
  const expiredGame = {
    ...baseGame,
    players: {
      ...baseGame.players,
      bottom: { ...baseGame.players.bottom, timeLeft: 0 },
    },
  }

  const nextGame = tickGameClock(expiredGame)

  assert.equal(nextGame.gameStatus, 'finished')
  assert.equal(nextGame.winner, 'top')
  assert.equal(nextGame.turnMessage, 'Ayse wins on time.')
})

test('finalizeMoveState resolves the live game with move metadata and history', () => {
  const moveResult = {
    board: [1, 5, 5, 5, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
    currentPlayer: 'top',
    gameStatus: 'playing',
    winner: null,
    fromPit: 0,
    initialPitCount: 4,
    dropCounts: { 0: 1, 1: 1, 2: 1, 3: 1 },
    dropSequence: [0, 1, 2, 3],
    capturedStones: [],
    lastLandingIndex: 3,
    captured: 0,
    extraTurn: false,
  }

  const nextGame = finalizeMoveState(baseGame, baseGame, 0, moveResult)

  assert.equal(nextGame.selectedPit, 0)
  assert.equal(nextGame.moveInProgress, false)
  assert.equal(nextGame.currentPlayer, 'top')
  assert.equal(nextGame.turnMessage, 'Ayse to move')
  assert.deepEqual(nextGame.lastMove, {
    fromPit: 0,
    initialPitCount: 4,
    dropCounts: { 0: 1, 1: 1, 2: 1, 3: 1 },
    dropSequence: [0, 1, 2, 3],
    capturedStones: [],
    lastLandingIndex: 3,
    captured: 0,
    extraTurn: false,
  })
  assert.deepEqual(nextGame.moveHistory, [
    {
      player: 'bottom',
      fromPit: 0,
      landedAt: 3,
      captured: 0,
      extraTurn: false,
    },
  ])
})

test('buildAnimatingMoveState marks a move as in progress and preserves the board', () => {
  const nextGame = buildAnimatingMoveState(baseGame, 2)

  assert.equal(nextGame.selectedPit, 2)
  assert.equal(nextGame.moveInProgress, true)
  assert.equal(nextGame.turnMessage, 'Emre is sowing stones...')
  assert.equal(nextGame.board, baseGame.board)
  assert.deepEqual(nextGame.lastMove, {
    fromPit: 2,
    initialPitCount: 4,
    preMoveSourceCount: 4,
    dropCounts: {},
    dropSequence: [],
    capturedStones: [],
    lastLandingIndex: null,
    captured: 0,
    extraTurn: false,
  })
})
