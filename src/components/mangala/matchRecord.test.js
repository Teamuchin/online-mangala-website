import test from 'node:test'
import assert from 'node:assert/strict'
import {
  appendMatchRecord,
  buildPositionSnapshot,
  buildReplayDescription,
  createMatchRecord,
  formatPitLabel,
} from './matchRecord.js'

const players = {
  bottom: { id: 'p1', name: 'Emre', rating: 1485, timeLeft: 300 },
  top: { id: 'p2', name: 'Ayse', rating: 1520, timeLeft: 300 },
}

test('createMatchRecord captures the initial position snapshot', () => {
  const record = createMatchRecord({
    board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
    currentPlayer: 'bottom',
    gameStatus: 'playing',
    winner: null,
    players,
  })

  assert.equal(record.moves.length, 0)
  assert.equal(record.positions.length, 1)
  assert.deepEqual(record.positions[0].board, [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0])
  assert.equal(record.positions[0].currentPlayer, 'bottom')
})

test('buildPositionSnapshot clones board and player state', () => {
  const snapshot = buildPositionSnapshot({
    board: [1, 5, 5, 5, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
    currentPlayer: 'top',
    gameStatus: 'playing',
    winner: null,
    players,
  })

  snapshot.board[0] = 99
  snapshot.players.bottom.name = 'Changed'

  assert.equal(players.bottom.name, 'Emre')
  assert.equal(snapshot.currentPlayer, 'top')
})

test('appendMatchRecord stores move metadata and the resulting position', () => {
  const liveGame = {
    players,
    matchRecord: {
      positions: [
        {
          board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
          currentPlayer: 'bottom',
          gameStatus: 'playing',
          winner: null,
          players,
        },
      ],
      moves: [],
    },
  }
  const currentGame = {
    currentPlayer: 'bottom',
  }
  const moveResult = {
    board: [1, 5, 5, 5, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
    currentPlayer: 'top',
    gameStatus: 'playing',
    winner: null,
    fromPit: 0,
    lastLandingIndex: 3,
    captured: 0,
    extraTurn: false,
  }

  const record = appendMatchRecord(liveGame, currentGame, moveResult)

  assert.deepEqual(record.moves, [
    {
      moveNumber: 1,
      player: 'bottom',
      fromPit: 0,
      landedAt: 3,
      captured: 0,
      extraTurn: false,
      gameStatus: 'playing',
      winner: null,
    },
  ])
  assert.equal(record.positions.length, 2)
  assert.deepEqual(record.positions[1].board, moveResult.board)
  assert.equal(record.positions[1].currentPlayer, 'top')
})

test('formatPitLabel maps each side to a simple one-to-six pit label', () => {
  assert.equal(formatPitLabel('bottom', 0), 1)
  assert.equal(formatPitLabel('bottom', 5), 6)
  assert.equal(formatPitLabel('top', 12), 1)
  assert.equal(formatPitLabel('top', 7), 6)
})

test('buildReplayDescription summarizes the selected recorded move', () => {
  const matchRecord = {
    positions: [],
    moves: [
      {
        moveNumber: 1,
        player: 'bottom',
        fromPit: 0,
        landedAt: 3,
        captured: 0,
        extraTurn: false,
        gameStatus: 'playing',
        winner: null,
      },
      {
        moveNumber: 2,
        player: 'top',
        fromPit: 11,
        landedAt: 13,
        captured: 0,
        extraTurn: true,
        gameStatus: 'playing',
        winner: null,
      },
    ],
  }

  assert.equal(buildReplayDescription(matchRecord, 0, players), 'Viewing the start position.')
  assert.equal(buildReplayDescription(matchRecord, 1, players), 'Emre played pit 1.')
  assert.equal(
    buildReplayDescription(matchRecord, 2, players),
    'Ayse played pit 2 and moved again.',
  )
})
