import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseBotMove } from './botLogic.js'

test('chooseBotMove returns a legal top-side pit', () => {
  const board = [4, 4, 4, 4, 4, 4, 0, 4, 0, 2, 0, 0, 0, 0]
  const originalRandom = Math.random

  try {
    Math.random = () => 0.99

    assert.equal(chooseBotMove(board), 9)
  } finally {
    Math.random = originalRandom
  }
})

test('chooseBotMove returns null when the bot has no legal moves', () => {
  const board = [4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0]

  assert.equal(chooseBotMove(board), null)
})
