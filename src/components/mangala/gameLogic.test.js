import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyMove,
  buildMoveAnimationFrames,
  createInitialState,
  formatTime,
  getLegalMoves,
  INITIAL_BOARD,
} from './gameLogic.js'

test('createInitialState returns the expected starting state', () => {
  const state = createInitialState()

  assert.deepEqual(state.board, INITIAL_BOARD)
  assert.equal(state.currentPlayer, 'bottom')
  assert.equal(state.gameStatus, 'playing')
  assert.equal(state.winner, null)
  assert.equal(state.turnMessage, 'Emre to move')
  assert.deepEqual(state.moveHistory, [])
})

test('createInitialState clones player data for each call', () => {
  const firstState = createInitialState()
  const secondState = createInitialState()

  firstState.players.bottom.name = 'Changed'

  assert.equal(secondState.players.bottom.name, 'Emre')
})

test('formatTime clamps negative values and pads seconds', () => {
  assert.equal(formatTime(125), '2:05')
  assert.equal(formatTime(-2), '0:00')
})

test('getLegalMoves only returns pits with stones for the active player', () => {
  const board = [0, 2, 0, 1, 0, 0, 0, 3, 0, 4, 0, 0, 0, 0]

  assert.deepEqual(getLegalMoves(board, 'bottom'), [1, 3])
  assert.deepEqual(getLegalMoves(board, 'top'), [7, 9])
})

test('buildMoveAnimationFrames follows Mangala sowing order', () => {
  const frames = buildMoveAnimationFrames(INITIAL_BOARD, 'bottom', 0)

  assert.deepEqual(frames, [
    [1, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
    [1, 5, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
    [1, 5, 5, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
    [1, 5, 5, 5, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
  ])
})

test('applyMove rejects empty pits and opponent pits', () => {
  assert.equal(applyMove(INITIAL_BOARD, 'bottom', 7), null)
  assert.equal(applyMove(INITIAL_BOARD, 'bottom', 6), null)
})

test('applyMove grants an extra turn when the last stone lands in the store', () => {
  const board = [0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0]

  const result = applyMove(board, 'bottom', 5)

  assert.notEqual(result, null)
  assert.equal(result.extraTurn, true)
  assert.equal(result.currentPlayer, 'bottom')
  assert.equal(result.gameStatus, 'playing')
  assert.equal(result.lastLandingIndex, 6)
  assert.deepEqual(result.board, [0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0])
})

test('applyMove captures opposite stones when the last stone lands in an empty own pit', () => {
  const board = [0, 0, 1, 0, 0, 2, 0, 1, 0, 4, 0, 0, 0, 0]

  const result = applyMove(board, 'bottom', 2)

  assert.notEqual(result, null)
  assert.equal(result.captured, 5)
  assert.equal(result.extraTurn, false)
  assert.equal(result.currentPlayer, 'top')
  assert.equal(result.lastLandingIndex, 3)
  assert.deepEqual(result.capturedStones, [
    { index: 3, count: 1 },
    { index: 9, count: 4 },
  ])
  assert.equal(result.board[3], 0)
  assert.equal(result.board[9], 0)
  assert.equal(result.board[6], 5)
})

test('applyMove captures an even-numbered opponent pit', () => {
  const board = [0, 0, 0, 0, 4, 0, 0, 1, 1, 0, 0, 0, 0, 0]

  const result = applyMove(board, 'bottom', 4)

  assert.notEqual(result, null)
  assert.equal(result.captured, 2)
  assert.equal(result.currentPlayer, 'top')
  assert.equal(result.lastLandingIndex, 7)
  assert.deepEqual(result.capturedStones, [{ index: 7, count: 2 }])
  assert.deepEqual(result.board, [0, 0, 0, 0, 1, 1, 3, 0, 1, 0, 0, 0, 0, 0])
})

test('applyMove finishes the game and collects remaining stones when a side becomes empty', () => {
  const board = [0, 0, 1, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 0]

  const result = applyMove(board, 'bottom', 2)

  assert.notEqual(result, null)
  assert.equal(result.gameStatus, 'finished')
  assert.equal(result.winner, 'bottom')
  assert.equal(result.currentPlayer, 'bottom')
  assert.deepEqual(result.board, [0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0])
})
