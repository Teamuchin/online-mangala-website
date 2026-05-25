import { LOCAL_MATCH_PLAYERS } from '../../app/mockAppData.js'
import { createMatchRecord } from './matchRecord.js'

export const PLAYER_ORDER = ['bottom', 'top']

export const PLAYER_CONFIG = {
  bottom: {
    pitIndexes: [0, 1, 2, 3, 4, 5],
    storeIndex: 6,
    opponentStoreIndex: 13,
  },
  top: {
    pitIndexes: [7, 8, 9, 10, 11, 12],
    storeIndex: 13,
    opponentStoreIndex: 6,
  },
}

export const INITIAL_BOARD = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]

export const INITIAL_PLAYERS = LOCAL_MATCH_PLAYERS

export function getOpponent(player) {
  return player === 'bottom' ? 'top' : 'bottom'
}

export function isPlayersPit(index, player) {
  return PLAYER_CONFIG[player].pitIndexes.includes(index)
}

export function isStore(index) {
  return index === 6 || index === 13
}

export function isSideEmpty(board, player) {
  return PLAYER_CONFIG[player].pitIndexes.every((index) => board[index] === 0)
}

function getOppositePitIndex(index) {
  if (isStore(index)) {
    return null
  }

  return 12 - index
}

export function formatTime(totalSeconds) {
  const safeValue = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safeValue / 60)
  const seconds = safeValue % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function collectRemainingStones(board, player) {
  const nextBoard = [...board]
  const { pitIndexes, storeIndex } = PLAYER_CONFIG[player]
  const remaining = pitIndexes.reduce((sum, index) => sum + nextBoard[index], 0)

  pitIndexes.forEach((index) => {
    nextBoard[index] = 0
  })
  nextBoard[storeIndex] += remaining

  return nextBoard
}

function collectOpponentStonesForCurrentPlayer(board, currentPlayer) {
  const nextBoard = [...board]
  const opponent = getOpponent(currentPlayer)
  const opponentPitIndexes = PLAYER_CONFIG[opponent].pitIndexes
  const captured = opponentPitIndexes.reduce(
    (sum, index) => sum + nextBoard[index],
    0,
  )

  opponentPitIndexes.forEach((index) => {
    nextBoard[index] = 0
  })
  nextBoard[PLAYER_CONFIG[currentPlayer].storeIndex] += captured

  return nextBoard
}

function getWinnerFromStores(board) {
  const bottomScore = nextBoardScore(board, 'bottom')
  const topScore = nextBoardScore(board, 'top')

  return bottomScore === topScore
    ? 'draw'
    : bottomScore > topScore
      ? 'bottom'
      : 'top'
}

function nextBoardScore(board, player) {
  return board[PLAYER_CONFIG[player].storeIndex]
}

function finalizeGame(board, currentPlayer) {
  let nextBoard = [...board]
  const currentSideEmpty = isSideEmpty(nextBoard, currentPlayer)
  const opponent = getOpponent(currentPlayer)
  const opponentSideEmpty = isSideEmpty(nextBoard, opponent)

  if (currentSideEmpty) {
    nextBoard = collectOpponentStonesForCurrentPlayer(nextBoard, currentPlayer)

    return {
      board: nextBoard,
      winner: getWinnerFromStores(nextBoard),
    }
  }

  if (opponentSideEmpty) {
    nextBoard = collectRemainingStones(nextBoard, currentPlayer)

    return {
      board: nextBoard,
      winner: getWinnerFromStores(nextBoard),
    }
  }

  const bottomScore = nextBoardScore(nextBoard, 'bottom')
  const topScore = nextBoardScore(nextBoard, 'top')

  if (bottomScore > 24 || topScore > 24) {
    return {
      board: nextBoard,
      winner: bottomScore > topScore ? 'bottom' : 'top',
    }
  }

  return null
}

export function createInitialState(options = {}) {
  const {
    initialPlayers = INITIAL_PLAYERS,
    initialCurrentPlayer = 'bottom',
    initialBoard = INITIAL_BOARD,
    initialGameStatus = 'playing',
    initialWinner = null,
    initialTurnMessage = null,
    initialMatchRecord = null,
    initialMoveHistory = [],
    initialSelectedPit = null,
    initialLastMove = null,
    lastTimerStartedAt = null,
  } = options
  const players = structuredClone(initialPlayers)
  const now = Date.now()
  const initialState = {
    board: [...initialBoard],
    currentPlayer: initialCurrentPlayer,
    selectedPit: initialSelectedPit,
    moveInProgress: false,
    ratingApplied: false,
    gameStatus: initialGameStatus,
    winner: initialWinner,
    turnMessage: initialTurnMessage ?? `${players[initialCurrentPlayer].name} to move`,
    lastMove: initialLastMove ? structuredClone(initialLastMove) : null,
    players,
    moveHistory: [...initialMoveHistory],
    lastTimerStartedAt: lastTimerStartedAt ?? now,
  }

  return {
    ...initialState,
    matchRecord: initialMatchRecord
      ? structuredClone(initialMatchRecord)
      : createMatchRecord(initialState),
  }
}

export function getLegalMoves(board, player) {
  return PLAYER_CONFIG[player].pitIndexes.filter((index) => board[index] > 0)
}

export function buildMoveAnimationFrames(board, currentPlayer, pitIndex) {
  if (!isPlayersPit(pitIndex, currentPlayer) || board[pitIndex] === 0) {
    return []
  }

  const nextBoard = [...board]
  let stonesInHand = nextBoard[pitIndex]
  let cursor = pitIndex
  const frames = []

  nextBoard[pitIndex] = 0

  if (stonesInHand > 1) {
    nextBoard[pitIndex] = 1
    stonesInHand -= 1
    frames.push([...nextBoard])
  }

  while (stonesInHand > 0) {
    cursor = (cursor + 1) % nextBoard.length

    if (cursor === PLAYER_CONFIG[currentPlayer].opponentStoreIndex) {
      continue
    }

    nextBoard[cursor] += 1
    stonesInHand -= 1
    frames.push([...nextBoard])
  }

  return frames
}

export function applyMove(board, currentPlayer, pitIndex) {
  if (!isPlayersPit(pitIndex, currentPlayer) || board[pitIndex] === 0) {
    return null
  }

  const nextBoard = [...board]
  let stonesInHand = nextBoard[pitIndex]
  let cursor = pitIndex
  const dropSequence = []
  const dropCounts = {}
  const capturedStones = []

  nextBoard[pitIndex] = 0

  if (stonesInHand > 1) {
    // Mangala sowing starts from the selected pit unless it contained exactly one stone.
    nextBoard[pitIndex] = 1
    stonesInHand -= 1
    dropSequence.push(pitIndex)
    dropCounts[pitIndex] = (dropCounts[pitIndex] ?? 0) + 1
  }

  while (stonesInHand > 0) {
    cursor = (cursor + 1) % nextBoard.length

    if (cursor === PLAYER_CONFIG[currentPlayer].opponentStoreIndex) {
      continue
    }

    nextBoard[cursor] += 1
    stonesInHand -= 1
    dropSequence.push(cursor)
    dropCounts[cursor] = (dropCounts[cursor] ?? 0) + 1
  }

  const extraTurn = cursor === PLAYER_CONFIG[currentPlayer].storeIndex
  let captured = 0

  if (
    !extraTurn &&
    isPlayersPit(cursor, currentPlayer) &&
    nextBoard[cursor] === 1
  ) {
    const oppositePitIndex = getOppositePitIndex(cursor)
    const oppositePitStones =
      oppositePitIndex === null ? 0 : nextBoard[oppositePitIndex]

    if (oppositePitStones > 0) {
      capturedStones.push({ index: cursor, count: nextBoard[cursor] })
      capturedStones.push({ index: oppositePitIndex, count: oppositePitStones })
      captured = oppositePitStones + nextBoard[cursor]
      nextBoard[cursor] = 0
      nextBoard[oppositePitIndex] = 0
      nextBoard[PLAYER_CONFIG[currentPlayer].storeIndex] += captured
      dropCounts[PLAYER_CONFIG[currentPlayer].storeIndex] =
        (dropCounts[PLAYER_CONFIG[currentPlayer].storeIndex] ?? 0) + captured
    }
  } else if (
    isPlayersPit(cursor, getOpponent(currentPlayer)) &&
    nextBoard[cursor] % 2 === 0
  ) {
    capturedStones.push({ index: cursor, count: nextBoard[cursor] })
    captured = nextBoard[cursor]
    nextBoard[cursor] = 0
    nextBoard[PLAYER_CONFIG[currentPlayer].storeIndex] += captured
    dropCounts[PLAYER_CONFIG[currentPlayer].storeIndex] =
      (dropCounts[PLAYER_CONFIG[currentPlayer].storeIndex] ?? 0) + captured
  }

  const completedGame = finalizeGame(nextBoard, currentPlayer)
  const nextPlayer = extraTurn ? currentPlayer : getOpponent(currentPlayer)

  return {
    board: completedGame?.board ?? nextBoard,
    currentPlayer: completedGame ? currentPlayer : nextPlayer,
    captured,
    extraTurn,
    fromPit: pitIndex,
    initialPitCount: board[pitIndex],
    dropCounts,
    dropSequence,
    capturedStones,
    lastLandingIndex: cursor,
    gameStatus: completedGame ? 'finished' : 'playing',
    winner: completedGame?.winner ?? null,
  }
}
