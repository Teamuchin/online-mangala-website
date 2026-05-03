import { useEffect, useRef, useState } from 'react'
import {
  applyMove,
  buildMoveAnimationFrames,
  createInitialState,
  getLegalMoves,
} from './gameLogic'
import { chooseBotMove } from './botLogic.js'
import { MOVE_ANIMATION_DELAY_MS } from './constants'
import {
  buildAnimatedLastMove,
} from './movePresentation'
import {
  buildAnimatingMoveState,
  finalizeMoveState,
  tickGameClock,
} from './gameState.js'

const BOT_MOVE_DELAY_MS = 700

function scheduleAnimatedMove({
  animationTimeoutsRef,
  clearAnimationTimeouts,
  currentGame,
  pitIndex,
  moveResult,
  setGame,
}) {
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

export function useMangalaGame(initialConfig) {
  const [game, setGame] = useState(() => createInitialState(initialConfig))
  const [showVisualStones, setShowVisualStones] = useState(true)
  const [animateMoves, setAnimateMoves] = useState(false)
  const animationTimeoutsRef = useRef([])
  const botTurnTimeoutRef = useRef(null)
  const botSettings = initialConfig?.botSettings ?? null

  const clearAnimationTimeouts = () => {
    animationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    animationTimeoutsRef.current = []
  }

  const clearBotTurnTimeout = () => {
    if (botTurnTimeoutRef.current !== null) {
      window.clearTimeout(botTurnTimeoutRef.current)
      botTurnTimeoutRef.current = null
    }
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

  useEffect(
    () => () => {
      clearAnimationTimeouts()
      clearBotTurnTimeout()
    },
    [],
  )

  const handleReset = () => {
    clearAnimationTimeouts()
    clearBotTurnTimeout()
    setGame(createInitialState(initialConfig))
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
        scheduleAnimatedMove({
          animationTimeoutsRef,
          clearAnimationTimeouts,
          currentGame,
          pitIndex,
          moveResult,
          setGame,
        })

        return buildAnimatingMoveState(currentGame, pitIndex)
      }

      return finalizeMoveState(currentGame, currentGame, pitIndex, moveResult)
    })
  }

  useEffect(() => {
    if (
      !botSettings ||
      game.currentPlayer !== 'top' ||
      game.moveInProgress ||
      game.gameStatus !== 'playing'
    ) {
      return undefined
    }

    clearBotTurnTimeout()

    botTurnTimeoutRef.current = window.setTimeout(() => {
      setGame((currentGame) => {
        if (
          currentGame.currentPlayer !== 'top' ||
          currentGame.moveInProgress ||
          currentGame.gameStatus !== 'playing'
        ) {
          return currentGame
        }

        const pitIndex = chooseBotMove(currentGame.board)

        if (pitIndex === null) {
          return currentGame
        }

        const moveResult = applyMove(currentGame.board, currentGame.currentPlayer, pitIndex)

        if (!moveResult) {
          return currentGame
        }

        if (animateMoves) {
          scheduleAnimatedMove({
            animationTimeoutsRef,
            clearAnimationTimeouts,
            currentGame,
            pitIndex,
            moveResult,
            setGame,
          })

          return buildAnimatingMoveState(currentGame, pitIndex)
        }

        return finalizeMoveState(currentGame, currentGame, pitIndex, moveResult)
      })

      botTurnTimeoutRef.current = null
    }, BOT_MOVE_DELAY_MS)

    return () => clearBotTurnTimeout()
  }, [
    animateMoves,
    botSettings,
    game.board,
    game.currentPlayer,
    game.gameStatus,
    game.moveInProgress,
  ])

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
