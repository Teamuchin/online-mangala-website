import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { buildMoveAnimationFrames, INITIAL_BOARD } from './gameLogic.js'
import { MOVE_ANIMATION_DELAY_MS } from './constants.js'
import {
  buildAnimatedLastMove,
  buildPreMoveLastMove,
  buildResolvedLastMove,
} from './movePresentation.js'

function mapWinnerSideToWinner(winnerSide) {
  if (winnerSide === 'bottom' || winnerSide === 'top' || winnerSide === 'draw') {
    return winnerSide
  }

  return null
}

function getBackendMoveCount(match) {
  return Array.isArray(match?.moves) ? match.moves.length : 0
}

function buildFlatBoard(boardState) {
  if (Array.isArray(boardState) && boardState.length === 14) {
    return [...boardState]
  }

  if (!boardState || typeof boardState !== 'object') {
    return null
  }

  const {
    bottomPits = [],
    topPits = [],
    bottomStore = 0,
    topStore = 0,
  } = boardState

  if (
    !Array.isArray(bottomPits) ||
    !Array.isArray(topPits) ||
    bottomPits.length !== 6 ||
    topPits.length !== 6
  ) {
    return null
  }

  return [
    ...bottomPits,
    bottomStore,
    ...topPits,
    topStore,
  ]
}

function normalizeBackendMoveForPresentation(rawMove) {
  if (!rawMove) {
    return null
  }

  return {
    fromPit: rawMove.fromPit ?? rawMove.pitIndex ?? 0,
    initialPitCount: rawMove.initialPitCount ?? 0,
    dropCounts: rawMove.dropCounts ?? {},
    dropSequence: rawMove.dropSequence ?? [],
    capturedStones: rawMove.capturedStones ?? [],
    lastLandingIndex: rawMove.lastLandingIndex ?? rawMove.landedAt ?? null,
    captured: rawMove.captured ?? 0,
    extraTurn: rawMove.extraTurn === true,
  }
}

function buildBackendTimeline(match) {
  const rawMoves = Array.isArray(match?.moves) ? match.moves : []
  const winner = mapWinnerSideToWinner(match?.winner_side)
  const finalGameStatus = match?.status === 'finished' ? 'finished' : 'playing'
  const initialCurrentPlayer =
    rawMoves.length > 0
      ? rawMoves[0]?.playerSide ?? rawMoves[0]?.player ?? 'bottom'
      : match?.game_state?.currentPlayer === 'top'
        ? 'top'
        : 'bottom'
  const positions = [
    {
      board: [...INITIAL_BOARD],
      currentPlayer: initialCurrentPlayer,
      gameStatus: rawMoves.length === 0 ? finalGameStatus : 'playing',
      winner: rawMoves.length === 0 ? winner : null,
    },
  ]

  rawMoves.forEach((rawMove, index) => {
    const boardAfter = buildFlatBoard(rawMove?.boardAfter)

    if (!boardAfter) {
      return
    }

    positions.push({
      board: boardAfter,
      currentPlayer:
        rawMove?.nextPlayer ?? positions[positions.length - 1]?.currentPlayer ?? 'bottom',
      gameStatus:
        index === rawMoves.length - 1 ? finalGameStatus : rawMove?.gameStatus ?? 'playing',
      winner: index === rawMoves.length - 1 ? winner : rawMove?.winner ?? null,
    })
  })

  return {
    moves: rawMoves,
    positions,
  }
}

function buildBackendAnimationSteps(match, fromMoveCount, toMoveCount) {
  if (!match || toMoveCount <= fromMoveCount) {
    return []
  }

  const timeline = buildBackendTimeline(match)
  const steps = []

  for (let moveIndex = fromMoveCount; moveIndex < toMoveCount; moveIndex += 1) {
    const rawMove = timeline.moves[moveIndex]
    const previousPosition = timeline.positions[moveIndex]
    const nextPosition = timeline.positions[moveIndex + 1]
    const move = normalizeBackendMoveForPresentation(rawMove)

    if (!rawMove || !previousPosition || !nextPosition || !move) {
      continue
    }

    steps.push({
      moveNumber: moveIndex + 1,
      move,
      previousPosition,
      nextPosition,
    })
  }

  return steps
}

export function useBackendMoveAnimationQueue({ backendMatch, enabled }) {
  const [backendAnimationDisplay, setBackendAnimationDisplay] = useState(null)
  const animationTimeoutsRef = useRef([])
  const animationQueueRef = useRef([])
  const animationRunningRef = useRef(false)
  const displayedMoveCountRef = useRef(null)
  const scheduledMoveCountRef = useRef(null)

  const clearAnimationTimeouts = () => {
    animationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    animationTimeoutsRef.current = []
  }

  const clearAnimationState = () => {
    clearAnimationTimeouts()
    animationQueueRef.current = []
    animationRunningRef.current = false
    setBackendAnimationDisplay(null)
  }

  const runNextAnimation = () => {
    const nextStep = animationQueueRef.current.shift()

    if (!nextStep) {
      animationRunningRef.current = false
      setBackendAnimationDisplay(null)
      return
    }

    animationRunningRef.current = true
    const { move, previousPosition, nextPosition, moveNumber } = nextStep
    const frames = buildMoveAnimationFrames(
      previousPosition.board,
      previousPosition.currentPlayer,
      move.fromPit,
    )

    setBackendAnimationDisplay({
      board: previousPosition.board,
      currentPlayer: previousPosition.currentPlayer,
      gameStatus: previousPosition.gameStatus,
      winner: previousPosition.winner,
      selectedPit: move.fromPit,
      moveInProgress: true,
      lastMove: buildPreMoveLastMove(
        {
          board: previousPosition.board,
        },
        move.fromPit,
      ),
    })

    frames.forEach((frame, frameIndex) => {
      const timeoutId = window.setTimeout(() => {
        setBackendAnimationDisplay({
          board: frame,
          currentPlayer: previousPosition.currentPlayer,
          gameStatus: previousPosition.gameStatus,
          winner: previousPosition.winner,
          selectedPit: move.fromPit,
          moveInProgress: true,
          lastMove: buildAnimatedLastMove(move, frameIndex),
        })
      }, (frameIndex + 1) * MOVE_ANIMATION_DELAY_MS)

      animationTimeoutsRef.current.push(timeoutId)
    })

    const finalizeTimeoutId = window.setTimeout(() => {
      displayedMoveCountRef.current = moveNumber
      setBackendAnimationDisplay({
        board: nextPosition.board,
        currentPlayer: nextPosition.currentPlayer,
        gameStatus: nextPosition.gameStatus,
        winner: nextPosition.winner,
        selectedPit: move.fromPit,
        moveInProgress: false,
        lastMove: buildResolvedLastMove(move),
      })

      clearAnimationTimeouts()

      if (animationQueueRef.current.length > 0) {
        runNextAnimation()
        return
      }

      animationRunningRef.current = false
      setBackendAnimationDisplay(null)
    }, (frames.length + 1) * MOVE_ANIMATION_DELAY_MS)

    animationTimeoutsRef.current.push(finalizeTimeoutId)
  }

  useEffect(
    () => () => {
      clearAnimationState()
    },
    [],
  )

  useLayoutEffect(() => {
    if (!backendMatch) {
      displayedMoveCountRef.current = null
      scheduledMoveCountRef.current = null
      clearAnimationState()
      return
    }

    const backendMoveCount = getBackendMoveCount(backendMatch)

    if (!enabled) {
      displayedMoveCountRef.current = backendMoveCount
      scheduledMoveCountRef.current = backendMoveCount
      clearAnimationState()
      return
    }

    if (
      displayedMoveCountRef.current === null ||
      scheduledMoveCountRef.current === null
    ) {
      displayedMoveCountRef.current = backendMoveCount
      scheduledMoveCountRef.current = backendMoveCount
      setBackendAnimationDisplay(null)
      return
    }

    if (backendMoveCount < displayedMoveCountRef.current) {
      displayedMoveCountRef.current = backendMoveCount
      scheduledMoveCountRef.current = backendMoveCount
      clearAnimationState()
      return
    }

    if (backendMoveCount <= scheduledMoveCountRef.current) {
      return
    }

    const steps = buildBackendAnimationSteps(
      backendMatch,
      scheduledMoveCountRef.current,
      backendMoveCount,
    )

    if (steps.length === 0) {
      displayedMoveCountRef.current = backendMoveCount
      scheduledMoveCountRef.current = backendMoveCount
      clearAnimationState()
      return
    }

    animationQueueRef.current.push(...steps)
    scheduledMoveCountRef.current = backendMoveCount

    if (!animationRunningRef.current) {
      runNextAnimation()
    }
  }, [backendMatch, enabled])

  return {
    backendAnimationDisplay,
    isAnimatingBackendMoves: backendAnimationDisplay?.moveInProgress === true,
  }
}
