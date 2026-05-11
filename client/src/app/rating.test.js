import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildRatedMatchOutcome,
  getActualScore,
  getExpectedScore,
  getRatingDelta,
} from './rating.js'

test('getExpectedScore returns 0.5 for equal ratings', () => {
  assert.equal(getExpectedScore(1200, 1200), 0.5)
})

test('getActualScore maps supported result labels', () => {
  assert.equal(getActualScore('win'), 1)
  assert.equal(getActualScore('draw'), 0.5)
  assert.equal(getActualScore('loss'), 0)
})

test('getRatingDelta gives the classic +16 change for equal-rating win', () => {
  assert.equal(getRatingDelta(1200, 1200, 'win'), 16)
  assert.equal(getRatingDelta(1200, 1200, 'loss'), -16)
})

test('getRatingDelta rewards upset wins more than expected wins', () => {
  assert.equal(getRatingDelta(1200, 1600, 'win'), 29)
  assert.equal(getRatingDelta(1600, 1200, 'win'), 3)
})

test('buildRatedMatchOutcome returns balanced player and opponent changes', () => {
  assert.deepEqual(buildRatedMatchOutcome(1600, 1200, 'draw'), {
    playerDelta: -13,
    opponentDelta: 13,
    playerRating: 1587,
    opponentRating: 1213,
  })
})
