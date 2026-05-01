import { useEffect, useRef, useState } from 'react'
import {
  applyMove,
  buildMoveAnimationFrames,
  createInitialState,
  getLegalMoves,
} from './gameLogic'
import { MOVE_ANIMATION_DELAY_MS } from './constants'
import {
  buildAnimatedLastMove,
} from './movePresentation'
import {
  buildAnimatingMoveState,
  finalizeMoveState,
  tickGameClock,
} from './gameState.js'

export function useMangalaGame() {
  const [game, setGame] = useState(createInitialState)
  const [showVisualStones, setShowVisualStones] = useState(true)
  const [animateMoves, setAnimateMoves] = useState(false)
  const animationTimeoutsRef = useRef([])

  const clearAnimationTimeouts = () => {
    animationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    animationTimeoutsRef.current = []
  }

  useEffect(() => {
    if (game.gameStatus !== 'playing') {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setGame(tickGameClock)
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [game.gameStatus])

  useEffect(() => () => clearAnimationTimeouts(), [])

  const scheduleAnimatedMove = (currentGame, pitIndex, moveResult) => {
    clearAnimationTimeouts()

    const frames = buildMoveAnimationFrames(
      currentGame.board,
      currentGame.currentPlayer,
      pitIndex,
    )

    frames.forEach((frame, frameIndex) => {
      const timeoutId = window.setTimeout(() => {
        setGame((liveGame) => ({
          ...liveGame,
          board: frame,
          lastMove: buildAnimatedLastMove(moveResult, frameIndex),
        }))
      }, (frameIndex + 1) * MOVE_ANIMATION_DELAY_MS)

      animationTimeoutsRef.current.push(timeoutId)
    })

    const finalizeTimeoutId = window.setTimeout(() => {
      setGame((liveGame) =>
        finalizeMoveState(liveGame, currentGame, pitIndex, moveResult),
      )
      clearAnimationTimeouts()
    }, (frames.length + 1) * MOVE_ANIMATION_DELAY_MS)

    animationTimeoutsRef.current.push(finalizeTimeoutId)
  }

  const handleReset = () => {
    clearAnimationTimeouts()
    setGame(createInitialState())
  }

  const handleStoneToggle = () => {
    setShowVisualStones((currentValue) => !currentValue)
  }

  const handleAnimationToggle = () => {
    setAnimateMoves((currentValue) => !currentValue)
  }

  const handlePitClick = (pitIndex) => {
    setGame((currentGame) => {
      if (currentGame.moveInProgress || currentGame.gameStatus !== 'playing') {
        return currentGame
      }

      const legalMoves = getLegalMoves(currentGame.board, currentGame.currentPlayer)

      if (!legalMoves.includes(pitIndex)) {
        return currentGame
      }

      const moveResult = applyMove(
        currentGame.board,
        currentGame.currentPlayer,
        pitIndex,
      )

      if (!moveResult) {
        return currentGame
      }

      if (animateMoves) {
        scheduleAnimatedMove(currentGame, pitIndex, moveResult)

        return buildAnimatingMoveState(currentGame, pitIndex)
      }

      return finalizeMoveState(currentGame, currentGame, pitIndex, moveResult)
    })
  }

  return {
    game,
    animateMoves,
    showVisualStones,
    handleAnimationToggle,
    handlePitClick,
    handleReset,
    handleStoneToggle,
  }
}
