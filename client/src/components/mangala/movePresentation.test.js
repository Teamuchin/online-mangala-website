import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAnimatedLastMove,
  buildMoveHistoryEntry,
  buildPreMoveLastMove,
  buildResolvedLastMove,
  buildTurnMessage,
} from './movePresentation.js'

const baseGame = {
  currentPlayer: 'bottom',
  board: [4, 5, 6, 2, 1, 0, 3, 4, 3, 2, 1, 0, 5, 7],
  players: {
    bottom: { name: 'Emre' },
    top: { name: 'Ayse' },
  },
}

test('buildTurnMessage reports a draw when the game is finished', () => {
  const message = buildTurnMessage(baseGame, {
    currentPlayer: 'top',
    gameStatus: 'finished',
    winner: 'draw',
    extraTurn: false,
    captured: 0,
  })

  assert.equal(message, 'The match ends in a draw.')
})

test('buildTurnMessage reports the named winner when the game is finished', () => {
  const message = buildTurnMessage(baseGame, {
    currentPlayer: 'top',
    gameStatus: 'finished',
    winner: 'bottom',
    extraTurn: false,
    captured: 0,
  })

  assert.equal(message, 'Emre collects more stones and wins.')
})

test('buildTurnMessage reports extra turns before capture messaging', () => {
  const message = buildTurnMessage(baseGame, {
    currentPlayer: 'bottom',
    gameStatus: 'playing',
    winner: null,
    extraTurn: true,
    captured: 4,
  })

  assert.equal(message, 'Emre landed in the store and plays again.')
})

test('buildTurnMessage reports captures and next player turn', () => {
  const message = buildTurnMessage(baseGame, {
    currentPlayer: 'top',
    gameStatus: 'playing',
    winner: null,
    extraTurn: false,
    captured: 6,
  })

  assert.equal(message, 'Emre captured 6 stones. Ayse is up next.')
})

test('buildTurnMessage falls back to the next player prompt', () => {
  const message = buildTurnMessage(baseGame, {
    currentPlayer: 'top',
    gameStatus: 'playing',
    winner: null,
    extraTurn: false,
    captured: 0,
  })

  assert.equal(message, 'Ayse to move')
})

test('buildAnimatedLastMove truncates the visible sequence to the current frame', () => {
  const moveResult = {
    fromPit: 2,
    initialPitCount: 4,
    dropSequence: [2, 3, 4, 6],
  }

  const presentation = buildAnimatedLastMove(moveResult, 2)

  assert.deepEqual(presentation, {
    fromPit: 2,
    initialPitCount: 4,
    dropCounts: { 2: 1, 3: 1, 4: 1 },
    dropSequence: [2, 3, 4],
    capturedStones: [],
    lastLandingIndex: 4,
    captured: 0,
    extraTurn: false,
  })
})

test('buildAnimatedLastMove handles an empty visible sequence', () => {
  const presentation = buildAnimatedLastMove(
    {
      fromPit: 5,
      initialPitCount: 1,
      dropSequence: [],
    },
    0,
  )

  assert.equal(presentation.lastLandingIndex, null)
  assert.deepEqual(presentation.dropCounts, {})
  assert.deepEqual(presentation.dropSequence, [])
})

test('buildPreMoveLastMove records the source pit silhouette state', () => {
  const preMove = buildPreMoveLastMove(baseGame, 1)

  assert.deepEqual(preMove, {
    fromPit: 1,
    initialPitCount: 5,
    preMoveSourceCount: 5,
    dropCounts: {},
    dropSequence: [],
    capturedStones: [],
    lastLandingIndex: null,
    captured: 0,
    extraTurn: false,
  })
})

test('buildResolvedLastMove preserves the move result shape needed by the board', () => {
  const moveResult = {
    fromPit: 0,
    initialPitCount: 4,
    dropCounts: { 0: 1, 1: 1, 2: 1, 3: 1 },
    dropSequence: [0, 1, 2, 3],
    capturedStones: [{ index: 3, count: 2 }],
    lastLandingIndex: 3,
    captured: 2,
    extraTurn: false,
  }

  assert.deepEqual(buildResolvedLastMove(moveResult), moveResult)
})

test('buildMoveHistoryEntry stores the move summary for later history views', () => {
  const entry = buildMoveHistoryEntry('top', {
    fromPit: 8,
    lastLandingIndex: 12,
    captured: 3,
    extraTurn: true,
  })

  assert.deepEqual(entry, {
    player: 'top',
    fromPit: 8,
    landedAt: 12,
    captured: 3,
    extraTurn: true,
  })
})
