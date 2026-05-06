import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPersistedMatchSession,
  readPersistedMatchSession,
} from './gamePersistence.js'

const baseSession = buildPersistedMatchSession({
  game: {
    board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
    players: {
      bottom: { name: 'Emre', timeLeft: 300 },
      top: { name: 'Ayse', timeLeft: 300 },
    },
    matchRecord: {
      positions: [{ board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0] }],
      moves: [],
    },
  },
  showVisualStones: true,
  animateMoves: false,
  reviewIndex: null,
  matchMode: 'computer',
  matchToken: 12345,
  botSettings: null,
})

test('buildPersistedMatchSession returns the serializable match session shape', () => {
  assert.equal(baseSession.version, 1)
  assert.equal(baseSession.showVisualStones, true)
  assert.equal(baseSession.animateMoves, false)
  assert.equal(baseSession.reviewIndex, null)
  assert.equal(baseSession.matchMode, 'computer')
  assert.equal(baseSession.matchToken, 12345)
  assert.equal(baseSession.botSettings, null)
})

test('readPersistedMatchSession restores a valid saved match session', () => {
  const restoredSession = readPersistedMatchSession(JSON.stringify(baseSession))

  assert.deepEqual(restoredSession, baseSession)
})

test('readPersistedMatchSession rejects invalid saved data', () => {
  assert.equal(readPersistedMatchSession('{"foo":"bar"}'), null)
  assert.equal(readPersistedMatchSession('not-json'), null)
})
