import { useEffect, useRef, useState } from 'react'
import {
  applyMove,
  buildMoveAnimationFrames,
  createInitialState,
  getLegalMoves,
  getOpponent,
} from './gameLogic'
import { chooseBotMove } from './botLogic.js'
import { MOVE_ANIMATION_DELAY_MS } from './constants'
import {
  ACTIVE_MATCH_STORAGE_KEY,
  buildPersistedMatchSession,
  readPersistedMatchSession,
} from './gamePersistence.js'
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
  const restoredSession =
    typeof window === 'undefined'
      ? null
      : readPersistedMatchSession(
          window.localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY),
        )
  const shouldRestorePersistedSession = Boolean(
    restoredSession &&
      (
        !initialConfig?.matchMode ||
        restoredSession.matchMode === initialConfig.matchMode
      ) &&
      (
        !initialConfig?.matchToken ||
        restoredSession.matchToken === initialConfig.matchToken
      ),
  )
  const activeMatchMode =
    shouldRestorePersistedSession
      ? restoredSession?.matchMode ?? initialConfig?.matchMode ?? null
      : initialConfig?.matchMode ?? null
  const activeMatchToken =
    shouldRestorePersistedSession
      ? restoredSession?.matchToken ?? initialConfig?.matchToken ?? null
      : initialConfig?.matchToken ?? null
  const [game, setGame] = useState(
    () =>
      shouldRestorePersistedSession
        ? restoredSession.game
        : createInitialState(initialConfig),
  )
  const [showVisualStones, setShowVisualStones] = useState(
    () =>
      shouldRestorePersistedSession
        ? restoredSession.showVisualStones
        : true,
  )
  const [animateMoves, setAnimateMoves] = useState(
    () =>
      shouldRestorePersistedSession
        ? restoredSession.animateMoves
        : false,
  )
  const [reviewIndex, setReviewIndex] = useState(
    () =>
      shouldRestorePersistedSession
        ? restoredSession.reviewIndex
        : null,
  )
  const animationTimeoutsRef = useRef([])
  const botTurnTimeoutRef = useRef(null)
  const botSettings =
    shouldRestorePersistedSession
      ? restoredSession?.botSettings ?? initialConfig?.botSettings ?? null
      : initialConfig?.botSettings ?? null
  const latestPositionIndex = game.matchRecord.positions.length - 1
  const activePositionIndex = reviewIndex ?? latestPositionIndex
  const activePosition = game.matchRecord.positions[activePositionIndex]
  const isReviewing = reviewIndex !== null
  const displayedGame = isReviewing
    ? {
        ...game,
        board: activePosition.board,
        currentPlayer: activePosition.currentPlayer,
        gameStatus: activePosition.gameStatus,
        winner: activePosition.winner,
        players: {
          ...activePosition.players,
          bottom: {
            ...activePosition.players.bottom,
            timeLeft: game.players.bottom.timeLeft,
          },
          top: {
            ...activePosition.players.top,
            timeLeft: game.players.top.timeLeft,
          },
        },
        selectedPit: null,
        moveInProgress: false,
        lastMove: null,
      }
    : game

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const session = buildPersistedMatchSession({
      game,
      showVisualStones,
      animateMoves,
      reviewIndex,
      matchMode: activeMatchMode,
      matchToken: activeMatchToken,
      botSettings,
    })

    window.localStorage.setItem(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(session))
  }, [
    activeMatchMode,
    activeMatchToken,
    animateMoves,
    botSettings,
    game,
    reviewIndex,
    showVisualStones,
  ])

  const handleReset = () => {
    clearAnimationTimeouts()
    clearBotTurnTimeout()
    setReviewIndex(null)
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
      if (
        reviewIndex !== null ||
        currentGame.moveInProgress ||
        currentGame.gameStatus !== 'playing' ||
        (botSettings && currentGame.currentPlayer === 'top')
      ) {
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

  const handleReplayFirst = () => {
    if (latestPositionIndex > 0) {
      setReviewIndex(0)
    }
  }

  const handleReplayPrevious = () => {
    if (latestPositionIndex === 0) {
      return
    }

    setReviewIndex((currentValue) => {
      if (currentValue === null) {
        return latestPositionIndex - 1
      }

      return Math.max(0, currentValue - 1)
    })
  }

  const handleReplayNext = () => {
    setReviewIndex((currentValue) => {
      if (currentValue === null) {
        return null
      }

      if (currentValue >= latestPositionIndex - 1) {
        return null
      }

      return currentValue + 1
    })
  }

  const handleReplayLast = () => {
    setReviewIndex(null)
  }

  const handleResign = (player) => {
    clearAnimationTimeouts()
    clearBotTurnTimeout()
    setReviewIndex(null)
    setGame((currentGame) => {
      if (currentGame.gameStatus !== 'playing') {
        return currentGame
      }

      const winner = getOpponent(player)

      return {
        ...currentGame,
        gameStatus: 'finished',
        winner,
        turnMessage: `${currentGame.players[winner].name} wins by resignation.`,
        moveInProgress: false,
      }
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
    displayedGame,
    animateMoves,
    activePositionIndex,
    isReviewing,
    showVisualStones,
    handleAnimationToggle,
    handlePitClick,
    handleReplayFirst,
    handleReplayLast,
    handleReplayNext,
    handleReplayPrevious,
    handleResign,
    handleReset,
    handleStoneToggle,
  }
}
