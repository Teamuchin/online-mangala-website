import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBoardPresentation,
  buildCapturedCounts,
  buildSourceSilhouetteCounts,
  isPitDisabled,
} from './boardState.js'

test('buildCapturedCounts groups repeated captured pit entries by index', () => {
  assert.deepEqual(
    buildCapturedCounts([
      { index: 3, count: 1 },
      { index: 9, count: 4 },
      { index: 3, count: 2 },
    ]),
    { 3: 3, 9: 4 },
  )
})

test('buildSourceSilhouetteCounts only exposes the pre-move source when present', () => {
  assert.deepEqual(
    buildSourceSilhouetteCounts({ fromPit: 5, preMoveSourceCount: 4 }),
    { 5: 4 },
  )
  assert.deepEqual(buildSourceSilhouetteCounts({ fromPit: 5, preMoveSourceCount: 0 }), {})
  assert.deepEqual(buildSourceSilhouetteCounts(null), {})
})

test('buildBoardPresentation derives board display details from the last move', () => {
  assert.deepEqual(
    buildBoardPresentation({
      lastLandingIndex: 6,
      dropCounts: { 4: 1, 5: 1, 6: 1 },
      fromPit: 4,
      preMoveSourceCount: 2,
      capturedStones: [{ index: 9, count: 2 }],
    }),
    {
      finalTarget: 6,
      dropCounts: { 4: 1, 5: 1, 6: 1 },
      sourceSilhouetteCounts: { 4: 2 },
      capturedCounts: { 9: 2 },
    },
  )
})

test('isPitDisabled reflects finished games, side ownership, and empty pits', () => {
  const board = [1, 0, 2, 3, 0, 1, 0, 4, 4, 4, 4, 4, 4, 0]

  assert.equal(
    isPitDisabled({
      board,
      index: 0,
      currentPlayer: 'bottom',
      gameStatus: 'playing',
      side: 'bottom',
    }),
    false,
  )
  assert.equal(
    isPitDisabled({
      board,
      index: 1,
      currentPlayer: 'bottom',
      gameStatus: 'playing',
      side: 'bottom',
    }),
    true,
  )
  assert.equal(
    isPitDisabled({
      board,
      index: 0,
      currentPlayer: 'top',
      gameStatus: 'playing',
      side: 'bottom',
    }),
    true,
  )
  assert.equal(
    isPitDisabled({
      board,
      index: 7,
      currentPlayer: 'top',
      gameStatus: 'finished',
      side: 'top',
    }),
    true,
  )
})
