import { useEffect, useRef, useState } from 'react'
import {
  applyMove,
  buildMoveAnimationFrames,
  createInitialState,
  getLegalMoves,
  getOpponent,
} from './gameLogic.js'
import { chooseBotMove } from './botLogic.js'
import { MOVE_ANIMATION_DELAY_MS } from './constants.js'
import {
  buildActiveMatchSummary,
  buildPersistedMatchSession,
  readStoredMatchSessionByGameId,
  writePersistedMatchSession,
} from './gamePersistence.js'
import { buildAnimatedLastMove, buildResolvedLastMove } from './movePresentation.js'
import {
  buildAnimatingMoveState,
  finalizeMoveState,
  syncGameClock,
} from './gameState.js'

const BOT_MOVE_DELAY_MS = 700

function buildUnavailableGameState(t = null) {
  const state = createInitialState()

  return {
    ...state,
    gameStatus: 'finished',
    turnMessage: t ? t('common.gameUnavailable') : 'Game unavailable.',
  }
}

function buildSimpleTurnMessage(gameState, t = null) {
  if (gameState.gameStatus === 'finished') {
    if (gameState.winner === 'draw') {
      return t ? t('game.matchEndsInDraw') : 'The match ends in a draw.'
    }

    if (gameState.winner && gameState.players[gameState.winner]) {
      return t ? t('game.wins', { name: gameState.players[gameState.winner].name }) : `${gameState.players[gameState.winner].name} wins.`
    }
  }

  return t ? t('game.toMove', { name: gameState.players[gameState.currentPlayer].name }) : `${gameState.players[gameState.currentPlayer].name} to move`
}

function applySimpleTurnMessage(gameState, t = null) {
  return {
    ...gameState,
    turnMessage: buildSimpleTurnMessage(gameState, t),
  }
}

function scheduleAnimatedMove({
  animationTimeoutsRef,
  clearAnimationTimeouts,
  currentGame,
  pitIndex,
  moveResult,
  setGame,
  t,
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
      finalizeMoveState(liveGame, currentGame, pitIndex, moveResult, t),
    )
    clearAnimationTimeouts()
  }, (frames.length + 1) * MOVE_ANIMATION_DELAY_MS)

  animationTimeoutsRef.current.push(finalizeTimeoutId)
}

export function useMangalaGame(initialConfig, t = null) {
  const isPracticeBoard = initialConfig?.matchMode === 'practice'
  const restoredSession =
    typeof window === 'undefined'
      ? null
      : readStoredMatchSessionByGameId(initialConfig?.gameId)
  const hasRestoredGameForRoute = Boolean(
    restoredSession && restoredSession.gameId === initialConfig?.gameId,
  )
  const restoredUiSession = hasRestoredGameForRoute ? restoredSession : null
  const canCreateFreshMatch = Boolean(initialConfig?.matchMode)
  const shouldRestorePersistedSession = Boolean(
    !isPracticeBoard &&
    !initialConfig?.forceFreshState &&
    restoredSession &&
      restoredSession.gameId === initialConfig?.gameId &&
      (!initialConfig?.matchMode ||
        restoredSession.matchMode === initialConfig.matchMode),
  )
  const isUnavailable = !hasRestoredGameForRoute && !canCreateFreshMatch
  const activeGameId = initialConfig?.gameId ?? restoredSession?.gameId ?? null
  const activeMatchMode = shouldRestorePersistedSession
    ? restoredSession?.matchMode ?? initialConfig?.matchMode ?? null
    : initialConfig?.matchMode ?? null
  const botSettings = shouldRestorePersistedSession
    ? restoredSession?.botSettings ?? initialConfig?.botSettings ?? null
    : initialConfig?.botSettings ?? null
  const queueSettings = shouldRestorePersistedSession
    ? restoredSession?.queueSettings ?? initialConfig?.queueSettings ?? null
    : initialConfig?.queueSettings ?? null
  const backendMatchId = shouldRestorePersistedSession
    ? restoredSession?.backendMatchId ?? initialConfig?.backendMatchId ?? null
    : initialConfig?.backendMatchId ?? null
  const useAuthoritativeBackendClock = Boolean(backendMatchId)

  const [game, setGame] = useState(() =>
    shouldRestorePersistedSession
      ? useAuthoritativeBackendClock
        ? restoredSession.game
        : syncGameClock(restoredSession.game, Date.now(), t)
      : isUnavailable
        ? buildUnavailableGameState(t)
        : createInitialState(initialConfig),
  )
  const [showVisualStones, setShowVisualStones] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('mangala.showVisualStones')
      if (stored !== null) return stored === 'true'
    }
    return restoredUiSession ? restoredUiSession.showVisualStones : true
  })
  const [animateMoves, setAnimateMoves] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('mangala.animateMoves')
      if (stored !== null) return stored === 'true'
    }
    return restoredUiSession ? restoredUiSession.animateMoves : true
  })
  const [reviewIndex, setReviewIndex] = useState(() =>
    restoredUiSession ? restoredUiSession.reviewIndex : null,
  )
  const isComputerMatch =
    activeMatchMode === 'computer' || game.players.top?.isBot === true
  const allowLocalComputerAutomation = !backendMatchId && isComputerMatch
  const animationTimeoutsRef = useRef([])
  const botTurnTimeoutRef = useRef(null)
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
        selectedPit:
          activePositionIndex > 0
            ? game.matchRecord.moves[activePositionIndex - 1]?.fromPit ?? null
            : null,
        moveInProgress: false,
        lastMove:
          activePositionIndex > 0 && game.matchRecord.moves[activePositionIndex - 1]
            ? buildResolvedLastMove(game.matchRecord.moves[activePositionIndex - 1])
            : null,
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
    if (useAuthoritativeBackendClock || game.gameStatus !== 'playing' || isPracticeBoard) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setGame((currentGame) => syncGameClock(currentGame, Date.now(), t))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [game.gameStatus, useAuthoritativeBackendClock, isPracticeBoard])

  useEffect(
    () => () => {
      clearAnimationTimeouts()
      clearBotTurnTimeout()
    },
    [],
  )

  const backendMatchRevision = useAuthoritativeBackendClock
    ? JSON.stringify({
        board: initialConfig?.initialBoard,
        moves: initialConfig?.initialMatchRecord?.moves,
        status: initialConfig?.initialGameStatus,
        currentPlayer: initialConfig?.initialCurrentPlayer,
      })
    : null

  useEffect(() => {
    if (backendMatchRevision && !isUnavailable) {
      setGame((currentGame) => {
        if (currentGame.moveInProgress) {
          return currentGame
        }
        return createInitialState(initialConfig)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendMatchRevision])

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !activeGameId ||
      !activeMatchMode ||
      isUnavailable ||
      isPracticeBoard ||
      game.moveInProgress
    ) {
      return
    }

    const session = buildPersistedMatchSession({
      game,
      gameId: activeGameId,
      backendMatchId,
      showVisualStones,
      animateMoves,
      reviewIndex,
      matchMode: activeMatchMode,
      botSettings,
      queueSettings,
    })

    writePersistedMatchSession(session)
  }, [
    activeGameId,
    activeMatchMode,
    animateMoves,
    botSettings,
    backendMatchId,
    queueSettings,
    game,
    isPracticeBoard,
    isUnavailable,
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
    setShowVisualStones((currentValue) => {
      const nextValue = !currentValue
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mangala.showVisualStones', String(nextValue))
      }
      return nextValue
    })
  }

  const handleAnimationToggle = () => {
    setAnimateMoves((currentValue) => {
      const nextValue = !currentValue
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mangala.animateMoves', String(nextValue))
      }
      return nextValue
    })
  }

  const markRatingApplied = () => {
    setGame((currentGame) =>
      currentGame.ratingApplied
        ? currentGame
        : {
            ...currentGame,
            ratingApplied: true,
          },
    )
  }

  const handlePitClick = (pitIndex) => {
    setGame((currentGame) => {
      if (
        reviewIndex !== null ||
        currentGame.moveInProgress ||
        currentGame.gameStatus !== 'playing' ||
        (isComputerMatch && currentGame.currentPlayer === 'top')
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
          t,
        })

        return buildAnimatingMoveState(currentGame, pitIndex, t)
      }

      const nextGame = finalizeMoveState(currentGame, currentGame, pitIndex, moveResult, t)
      return isPracticeBoard ? applySimpleTurnMessage(nextGame, t) : nextGame
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
        turnMessage: isPracticeBoard
          ? (t ? t('game.wins', { name: currentGame.players[winner].name }) : `${currentGame.players[winner].name} wins.`)
          : (t ? t('game.winsByResignation', { name: currentGame.players[winner].name }) : `${currentGame.players[winner].name} wins by resignation.`),
        moveInProgress: false,
      }
    })
  }

  useEffect(() => {
    if (
      !allowLocalComputerAutomation ||
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
            t,
          })

          return buildAnimatingMoveState(currentGame, pitIndex, t)
        }

        const nextGame = finalizeMoveState(currentGame, currentGame, pitIndex, moveResult, t)
        return isPracticeBoard ? applySimpleTurnMessage(nextGame, t) : nextGame
      })

      botTurnTimeoutRef.current = null
    }, BOT_MOVE_DELAY_MS)

    return () => clearBotTurnTimeout()
  }, [
    allowLocalComputerAutomation,
    animateMoves,
    game.board,
    game.currentPlayer,
    game.gameStatus,
    game.moveInProgress,
  ])

  return {
    game,
    displayedGame,
    isUnavailable,
    activeMatchSummary: buildActiveMatchSummary({
      game,
      gameId: activeGameId,
      matchMode: activeMatchMode,
    }),
    animateMoves,
    activePositionIndex,
    isReviewing,
    showVisualStones,
    handleAnimationToggle,
    handlePitClick,
    markRatingApplied,
    handleReplayFirst,
    handleReplayLast,
    handleReplayNext,
    handleReplayPrevious,
    handleResign,
    handleReset,
    handleStoneToggle,
  }
}
