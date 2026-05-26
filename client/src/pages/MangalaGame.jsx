import { useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import {
  getMatchByIdRequest,
  submitMatchMoveRequest,
  updateMatchRequest,
} from '../app/matchApi.js'
import { getDisplayName } from '../app/playerNames.js'
import { buildRatedMatchOutcome } from '../app/rating.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import Board from '../components/mangala/Board.jsx'
import {
  readStoredMatchSessionByGameId,
} from '../components/mangala/gamePersistence.js'
import { createInitialState, INITIAL_BOARD } from '../components/mangala/gameLogic.js'
import { buildPositionSnapshot, buildReplayDescription } from '../components/mangala/matchRecord.js'
import { buildResolvedLastMove } from '../components/mangala/movePresentation.js'
import ReplayControls from '../components/mangala/ReplayControls.jsx'
import PlayerPanel from '../components/mangala/PlayerPanel.jsx'
import { useMangalaGame } from '../components/mangala/useMangalaGame.js'
import styles from '../components/mangala/MangalaGame.module.css'

const RESERVED_LOCAL_GAME_IDS = new Set(['local'])
const BACKEND_MATCH_POLL_INTERVAL_MS = 1500
const BOT_MOVE_DELAY_MS = 700

function getBackendMoveCount(match) {
  return Array.isArray(match?.moves) ? match.moves.length : 0
}

function getLocalMoveCount(session) {
  return Array.isArray(session?.game?.matchRecord?.moves)
    ? session.game.matchRecord.moves.length
    : 0
}

function shouldKeepLocalSessionAheadOfBackend(session, fetchedMatch) {
  if (!session || !fetchedMatch) {
    return false
  }

  if (session.backendMatchId !== fetchedMatch.id) {
    return false
  }

  const localMoveCount = getLocalMoveCount(session)
  const backendMoveCount = getBackendMoveCount(fetchedMatch)

  if (localMoveCount > backendMoveCount) {
    return true
  }

  return session.game?.gameStatus === 'finished' && fetchedMatch.status !== 'finished'
}

function mapWinnerSideToWinner(winnerSide) {
  if (winnerSide === 'bottom' || winnerSide === 'top' || winnerSide === 'draw') {
    return winnerSide
  }

  return null
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

function buildBoardStatePayload(board) {
  if (!Array.isArray(board) || board.length !== 14) {
    return null
  }

  return {
    bottomPits: board.slice(0, 6),
    bottomStore: board[6],
    topPits: board.slice(7, 13),
    topStore: board[13],
  }
}

function buildTurnMessageFromState({ players, currentPlayer, gameStatus, winner }) {
  if (gameStatus === 'finished') {
    if (winner === 'draw') {
      return 'The match ends in a draw.'
    }

    if (winner && players[winner]) {
      return `${players[winner].name} wins.`
    }
  }

  return `${players[currentPlayer].name} to move`
}

function inferResultReason(game) {
  if (game.gameStatus !== 'finished') {
    return null
  }

  if (game.turnMessage.includes('resignation')) {
    return 'resign'
  }

  if (game.turnMessage.includes('on time')) {
    return 'timeout'
  }

  return 'normal'
}

function getRatingChangeForSide(currentUserRole, ratedOutcome, side) {
  if (!ratedOutcome || (currentUserRole !== 'bottom' && currentUserRole !== 'top')) {
    return null
  }

  return side === currentUserRole ? ratedOutcome.playerDelta : ratedOutcome.opponentDelta
}

function buildPlayersFromBackendMatch(backendMatch, currentUser) {
  const bottomId = String(backendMatch.bottom_player_id)
  const topId = String(backendMatch.top_player_id)
  const bottomName =
    String(currentUser?.id) === bottomId
      ? currentUser.username
      : backendMatch.bottom_player_username ?? `Player ${bottomId}`
  const topName =
    String(currentUser?.id) === topId
      ? currentUser.username
      : backendMatch.top_player_username ?? `Player ${topId}`

  return {
    bottom: {
      id: bottomId,
      name: bottomName,
      username: bottomName,
      rating: backendMatch.bottom_rating_before,
      timeLeft: backendMatch?.game_state?.bottomTimeLeft ?? 300,
      isBot: backendMatch.bottom_player_is_bot === true,
    },
    top: {
      id: topId,
      name: topName,
      username: topName,
      rating: backendMatch.top_rating_before,
      timeLeft: backendMatch?.game_state?.topTimeLeft ?? 300,
      isBot: backendMatch.top_player_is_bot === true,
    },
  }
}

function buildBackendMovesPayload(game) {
  return game.matchRecord.moves.map((move, index) => {
    const positionAfter = game.matchRecord.positions[index + 1]
    const resolvedLastMove = index === game.matchRecord.moves.length - 1 ? game.lastMove : null

    return {
      moveNumber: move.moveNumber,
      playerSide: move.player,
      fromPit: move.fromPit,
      pitIndex: move.fromPit,
      captured: move.captured,
      extraTurn: move.extraTurn,
      initialPitCount: resolvedLastMove?.initialPitCount ?? null,
      dropCounts: resolvedLastMove?.dropCounts ?? {},
      dropSequence: resolvedLastMove?.dropSequence ?? [],
      capturedStones: resolvedLastMove?.capturedStones ?? [],
      lastLandingIndex:
        resolvedLastMove?.lastLandingIndex ?? move?.landedAt ?? null,
      nextPlayer: positionAfter?.currentPlayer ?? game.currentPlayer,
      boardAfter: buildBoardStatePayload(positionAfter?.board ?? game.board),
      gameStatus: positionAfter?.gameStatus ?? game.gameStatus,
      winner: positionAfter?.winner ?? game.winner,
    }
  })
}

function buildHydratedLastMove(rawMove) {
  if (!rawMove) {
    return null
  }

  return buildResolvedLastMove({
    fromPit: rawMove.fromPit ?? rawMove.pitIndex ?? 0,
    initialPitCount: rawMove.initialPitCount ?? 0,
    dropCounts: rawMove.dropCounts ?? {},
    dropSequence: rawMove.dropSequence ?? [],
    capturedStones: rawMove.capturedStones ?? [],
    lastLandingIndex: rawMove.lastLandingIndex ?? rawMove.landedAt ?? null,
    captured: rawMove.captured ?? 0,
    extraTurn: rawMove.extraTurn === true,
  })
}

function buildMatchRecordFromBackendMatch({
  backendMatch,
  replayStartBoard,
  players,
  currentPlayer,
  gameStatus,
  winner,
}) {
  const rawMoves = Array.isArray(backendMatch?.moves) ? backendMatch.moves : []
  const replayStartPlayer =
    rawMoves.length > 0
      ? rawMoves[0]?.player ?? rawMoves[0]?.playerSide ?? currentPlayer
      : currentPlayer
  const positions = [
    buildPositionSnapshot({
      board: replayStartBoard,
      currentPlayer: replayStartPlayer,
      gameStatus: rawMoves.length === 0 ? gameStatus : 'playing',
      winner: rawMoves.length === 0 ? winner : null,
      players,
    }),
  ]

  const moves = []
  let latestCurrentPlayer = currentPlayer

  rawMoves.forEach((move, index) => {
    const boardAfter = buildFlatBoard(move?.boardAfter)

    if (!boardAfter) {
      return
    }

    const movePlayer = move?.player ?? move?.playerSide ?? latestCurrentPlayer
    const nextPlayer = move?.nextPlayer ?? latestCurrentPlayer
    const moveGameStatus =
      index === rawMoves.length - 1 ? gameStatus : move?.gameStatus ?? 'playing'
    const moveWinner = index === rawMoves.length - 1 ? winner : move?.winner ?? null

    moves.push({
      moveNumber: move?.moveNumber ?? moves.length + 1,
      player: movePlayer,
      fromPit: move?.fromPit ?? move?.pitIndex ?? 0,
      landedAt: move?.landedAt ?? move?.lastLandingIndex ?? null,
      captured: move?.captured ?? 0,
      extraTurn: move?.extraTurn === true,
      gameStatus: moveGameStatus,
      winner: moveWinner,
    })

    positions.push(
      buildPositionSnapshot({
        board: boardAfter,
        currentPlayer: nextPlayer,
        gameStatus: moveGameStatus,
        winner: moveWinner,
        players,
      }),
    )

    latestCurrentPlayer = nextPlayer
  })

  return {
    positions,
    moves,
  }
}

function buildInitialConfigFromBackendMatch({ backendMatch, currentUser, gameId }) {
  const matchMode =
    backendMatch.bottom_player_is_bot === true || backendMatch.top_player_is_bot === true
      ? 'computer'
      : 'online'
  const players = buildPlayersFromBackendMatch(backendMatch, currentUser)
  const winner = mapWinnerSideToWinner(backendMatch.winner_side)
  const currentPlayer =
    backendMatch?.game_state?.currentPlayer === 'top' ? 'top' : 'bottom'
  const currentBoard =
    buildFlatBoard(backendMatch?.game_state?.board) ?? createInitialState().board
  const replayStartBoard =
    Array.isArray(INITIAL_BOARD) ? [...INITIAL_BOARD] : createInitialState().board
  const gameStatus = backendMatch.status === 'finished' ? 'finished' : 'playing'
  const initialMatchRecord = buildMatchRecordFromBackendMatch({
    backendMatch,
    replayStartBoard,
    players,
    currentPlayer,
    gameStatus,
    winner,
  })
  const latestMove =
    Array.isArray(backendMatch?.moves) && backendMatch.moves.length > 0
      ? backendMatch.moves[backendMatch.moves.length - 1]
      : null

  return {
    gameId,
    backendMatchId: backendMatch.id,
    forceFreshState: true,
    matchMode,
    queueSettings: {
      rated: Boolean(backendMatch.is_rated),
      allowBots:
        backendMatch.bottom_player_is_bot === true || backendMatch.top_player_is_bot === true,
    },
    initialPlayers: players,
    initialCurrentPlayer: currentPlayer,
    initialBoard: currentBoard,
    initialGameStatus: gameStatus,
    initialWinner: winner,
    initialTurnMessage: buildTurnMessageFromState({
      players,
      currentPlayer,
      gameStatus,
      winner,
    }),
    initialSelectedPit: latestMove?.fromPit ?? latestMove?.pitIndex ?? null,
    initialLastMove: buildHydratedLastMove(latestMove),
    initialMatchRecord,
  }
}

function buildMatchSyncPayload({
  backendMatch,
  gameId,
  game,
  startedAt,
  finishedAt,
}) {
  const winnerSide = mapWinnerSideToWinner(game.winner)

  return {
    id: backendMatch?.id ?? gameId,
    status: game.gameStatus === 'finished' ? 'finished' : 'active',
    winner_side: winnerSide,
    result_reason: inferResultReason(game),
    bottom_rating_before: backendMatch?.bottom_rating_before ?? game.players.bottom.rating,
    top_rating_before: backendMatch?.top_rating_before ?? game.players.top.rating,
    bottom_rating_change: backendMatch?.bottom_rating_change ?? 0,
    top_rating_change: backendMatch?.top_rating_change ?? 0,
    started_at: startedAt,
    finished_at: game.gameStatus === 'finished' ? finishedAt : null,
    moves: buildBackendMovesPayload(game),
    game_state: {
      currentPlayer: game.currentPlayer,
      board: buildBoardStatePayload(game.board),
      bottomTimeLeft: game.players.bottom.timeLeft,
      topTimeLeft: game.players.top.timeLeft,
    },
  }
}

function MangalaGameScreen({
  gameId,
  backendMatch = null,
  onSubmitAuthoritativeMove = null,
  isSubmittingAuthoritativeMove = false,
}) {
  const location = useLocation()
  const {
    activeMatchSummary,
    currentUser,
    isAuthenticated,
    recordMatchHistoryResult,
    recordPublicProfileMatchResult,
    recordRatedMatchResult,
  } = useAppData()
  const { setSettingsContent } = useGlobalHeader()
  const isPracticeBoard = location.pathname === '/practice'
  const seededPlayers = createInitialState().players
  const persistedRouteSession =
    typeof window === 'undefined'
      ? null
      : readStoredMatchSessionByGameId(gameId)
  const matchingPersistedSession =
    persistedRouteSession?.gameId === gameId ? persistedRouteSession : null
  const matchingActiveMatchSummary =
    activeMatchSummary?.gameId === gameId ? activeMatchSummary : null
  const backendInitialConfig =
    backendMatch
      ? buildInitialConfigFromBackendMatch({
          backendMatch,
          currentUser,
          gameId,
        })
      : null
  const matchMode =
    backendInitialConfig?.matchMode ??
    (isPracticeBoard ? 'practice' : null) ??
    location.state?.matchMode ??
    matchingPersistedSession?.matchMode ??
    matchingActiveMatchSummary?.matchMode ??
    null
  const isLocalMatch = matchMode === 'local'
  const isComputerMatch = matchMode === 'computer'
  const isOnlineMatch = matchMode === 'online'
  const isPracticeMode = matchMode === 'practice'
  const queueSettings =
    isComputerMatch || isOnlineMatch
      ? location.state?.queueSettings ??
        matchingPersistedSession?.queueSettings ??
        null
      : null
  const botSettings =
    isComputerMatch
      ? location.state?.botSettings ??
        matchingPersistedSession?.botSettings ??
        null
      : null
  const initialConfig =
    backendInitialConfig ??
    (matchMode === 'practice'
      ? {
          gameId,
          matchMode: 'practice',
          initialPlayers: {
            ...seededPlayers,
            bottom: {
              ...seededPlayers.bottom,
              id: 'practice-player-1',
              name: 'Player 1',
            },
            top: {
              ...seededPlayers.top,
              id: 'practice-player-2',
              name: 'Player 2',
            },
          },
        }
      : matchMode === 'local'
        ? {
            gameId,
            matchMode: 'local',
            initialPlayers: {
            ...seededPlayers,
              bottom: {
                ...seededPlayers.bottom,
                id: currentUser.id,
                name: currentUser.username,
                username: currentUser.username,
                rating: currentUser.elo ?? seededPlayers.bottom.rating,
              },
            },
        }
      : isOnlineMatch
        ? {
            gameId,
            backendMatchId:
              location.state?.backendMatchId ?? matchingPersistedSession?.backendMatchId ?? null,
            matchMode: 'online',
            queueSettings,
            initialPlayers:
              location.state?.initialPlayers ??
              matchingPersistedSession?.game?.players ??
              seededPlayers,
          }
      : botSettings
        ? {
            gameId,
            matchMode: 'computer',
            botSettings,
            queueSettings,
            initialCurrentPlayer: location.state?.startingPlayer ?? 'bottom',
            initialPlayers: {
              ...seededPlayers,
              bottom: {
                ...seededPlayers.bottom,
                id: currentUser.id,
                name: currentUser.username,
                username: currentUser.username,
                rating: currentUser.elo ?? seededPlayers.bottom.rating,
              },
              top: {
                id: location.state?.botProfile?.id ?? 'bot-deniz',
                name: location.state?.botProfile?.username ?? 'deniz-bot',
                username: location.state?.botProfile?.username ?? 'deniz-bot',
                rating: location.state?.botProfile?.elo ?? 1000,
                timeLeft: 300,
                isBot: true,
              },
            },
          }
      : {
            gameId,
            matchMode: null,
          })

  const {
    game,
    displayedGame,
    isUnavailable,
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
    markRatingApplied,
  } = useMangalaGame(initialConfig)

  const currentUserRole = !isAuthenticated
    ? 'spectator'
    : isPracticeMode || isLocalMatch
      ? 'both'
      : currentUser.id === game.players.bottom.id
        ? 'bottom'
        : currentUser.id === game.players.top.id
          ? 'top'
          : 'spectator'
  const isRatedMatch = Boolean(queueSettings?.rated)
  const perspectiveSide =
    isOnlineMatch && currentUserRole === 'top' ? 'top' : 'bottom'
  const visualTopSide = perspectiveSide === 'top' ? 'bottom' : 'top'
  const visualBottomSide = perspectiveSide === 'top' ? 'top' : 'bottom'
  const topDisplayPlayer = displayedGame.players[visualTopSide]
  const bottomDisplayPlayer = displayedGame.players[visualBottomSide]
  const showResignForSide = (side) =>
    !isPracticeMode && (isLocalMatch || currentUserRole === side)
  const resignDisabledForSide = (side) =>
    isReviewing ||
    game.gameStatus !== 'playing' ||
    (!isLocalMatch && !isPracticeMode && currentUserRole !== side)
  const matchTypeLabel =
    queueSettings && typeof queueSettings.rated === 'boolean'
      ? queueSettings.rated
        ? 'Rated'
        : 'Unrated'
      : null
  const ratedOutcome =
    isRatedMatch && currentUserRole !== 'spectator' && game.gameStatus === 'finished'
      ? buildRatedMatchOutcome(
          game.players[currentUserRole].rating,
          game.players[currentUserRole === 'bottom' ? 'top' : 'bottom'].rating,
          game.winner === currentUserRole
            ? 'win'
            : game.winner === 'draw'
              ? 'draw'
              : 'loss',
        )
      : null
  const replayDescription = buildReplayDescription(
    game.matchRecord,
    activePositionIndex,
    displayedGame.players,
  )
  const sidebarDescription = isReviewing ? replayDescription : game.turnMessage
  const stoneToggleRef = useRef(handleStoneToggle)
  const animationToggleRef = useRef(handleAnimationToggle)
  const startedAtRef = useRef(backendMatch?.started_at ?? new Date().toISOString())
  const finishedAtRef = useRef(backendMatch?.finished_at ?? null)
  const lastSyncedSignatureRef = useRef('')
  const inFlightSyncSignatureRef = useRef('')
  const syncTargetMatchId =
    backendMatch?.id ??
    location.state?.backendMatchId ??
    matchingPersistedSession?.backendMatchId ??
    null
  const allowMoveAnimation = !syncTargetMatchId
  const boardInteractionDisabled =
    isReviewing ||
    currentUserRole === 'spectator' ||
    isSubmittingAuthoritativeMove

  useEffect(() => {
    startedAtRef.current = backendMatch?.started_at ?? new Date().toISOString()
    finishedAtRef.current = backendMatch?.finished_at ?? null
    lastSyncedSignatureRef.current = ''
    inFlightSyncSignatureRef.current = ''
  }, [backendMatch?.finished_at, backendMatch?.id, backendMatch?.started_at])

  useEffect(() => {
    stoneToggleRef.current = handleStoneToggle
    animationToggleRef.current = handleAnimationToggle
  }, [handleAnimationToggle, handleStoneToggle])

  useEffect(() => {
    setSettingsContent(
      <>
        <button
          type="button"
          className={styles.headerSettingsOption}
          onClick={() => stoneToggleRef.current()}
        >
          Visual Stones: {showVisualStones ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          className={styles.headerSettingsOption}
          onClick={() => animationToggleRef.current()}
          disabled={!allowMoveAnimation}
        >
          Move Animation: {!allowMoveAnimation ? 'Unavailable' : animateMoves ? 'On' : 'Off'}
        </button>
      </>,
    )

    return () => {
      setSettingsContent(null)
    }
  }, [allowMoveAnimation, animateMoves, setSettingsContent, showVisualStones])

  useEffect(() => {
    if (
      (!isRatedMatch && !queueSettings) ||
      currentUserRole === 'spectator' ||
      game.gameStatus !== 'finished' ||
      game.ratingApplied
    ) {
      return
    }

    const playerSide = currentUserRole
    const opponentSide = playerSide === 'bottom' ? 'top' : 'bottom'
    const playerResult =
      game.winner === playerSide
        ? 'win'
        : game.winner === 'draw'
          ? 'draw'
          : 'loss'
    const ratedOutcome = buildRatedMatchOutcome(
      game.players[playerSide].rating,
      game.players[opponentSide].rating,
      playerResult,
    )
    const playedAt = new Date().toISOString()
    const mode = isComputerMatch ? 'Bot' : 'Online'
    const currentPlayerPayload = {
      gameId,
      playedAt,
      opponent: getDisplayName(game.players[opponentSide]) ?? game.players[opponentSide].name,
      playerRating: game.players[playerSide].rating,
      opponentRating: game.players[opponentSide].rating,
      mode,
      result:
        playerResult === 'win'
          ? 'Win'
          : playerResult === 'draw'
            ? 'Draw'
            : 'Loss',
    }

    if (isRatedMatch) {
      recordRatedMatchResult({
        ...currentPlayerPayload,
        opponentRating: ratedOutcome.opponentRating,
        opponentRatingDelta: ratedOutcome.opponentDelta,
        ratingAfter: ratedOutcome.playerRating,
        ratingDelta: ratedOutcome.playerDelta,
      })
    } else {
      recordMatchHistoryResult(currentPlayerPayload)
    }

    if (game.players[opponentSide].id !== currentUser.id) {
      recordPublicProfileMatchResult(game.players[opponentSide].id, {
        gameId,
        playedAt,
        opponent: getDisplayName(game.players[playerSide]) ?? game.players[playerSide].name,
        playerRating: game.players[opponentSide].rating,
        opponentRating: game.players[playerSide].rating,
        mode,
        result:
          playerResult === 'win'
            ? 'Loss'
            : playerResult === 'draw'
              ? 'Draw'
              : 'Win',
        ...(isRatedMatch
          ? {
              opponentRatingDelta: ratedOutcome.playerDelta,
              ratingAfter: ratedOutcome.opponentRating,
              ratingDelta: ratedOutcome.opponentDelta,
            }
          : {}),
      })
    }
    markRatingApplied()
  }, [
    currentUserRole,
    game.gameStatus,
    game.players,
    game.players.bottom.rating,
    game.players.bottom.name,
    game.players.bottom.id,
    game.players.top.rating,
    game.players.top.id,
    game.ratingApplied,
    game.winner,
    game.players.top.name,
    gameId,
    isComputerMatch,
    isRatedMatch,
    markRatingApplied,
    queueSettings,
    recordMatchHistoryResult,
    recordPublicProfileMatchResult,
    recordRatedMatchResult,
    currentUser.id,
  ])

  useEffect(() => {
    if (!syncTargetMatchId) {
      return
    }

    if (game.moveInProgress) {
      return
    }

    if (currentUserRole !== 'bottom' && currentUserRole !== 'top') {
      return
    }

    const token =
      typeof window === 'undefined'
        ? ''
        : window.localStorage.getItem('mangala.authToken') ?? ''

    if (!token) {
      return
    }

    if (game.gameStatus === 'finished' && !finishedAtRef.current) {
      finishedAtRef.current = new Date().toISOString()
    }

    if (game.gameStatus !== 'finished' && finishedAtRef.current) {
      finishedAtRef.current = null
    }

    const payload = buildMatchSyncPayload({
      backendMatch,
      gameId: syncTargetMatchId,
      game,
      startedAt: startedAtRef.current,
      finishedAt: finishedAtRef.current,
    })
    const signature = JSON.stringify(payload)

    if (
      signature === lastSyncedSignatureRef.current ||
      signature === inFlightSyncSignatureRef.current
    ) {
      return
    }

    inFlightSyncSignatureRef.current = signature

    updateMatchRequest(syncTargetMatchId, payload, token)
      .then(() => {
        lastSyncedSignatureRef.current = signature
      })
      .catch((error) => {
        console.error('Match sync error:', error)
      })
      .finally(() => {
        if (inFlightSyncSignatureRef.current === signature) {
          inFlightSyncSignatureRef.current = ''
        }
      })
  }, [
    backendMatch,
    syncTargetMatchId,
    currentUserRole,
    game,
  ])

  if (isUnavailable) {
    return (
      <main className={styles.page}>
        <div className={styles.layout}>
          <section className={styles.unavailableState}>
            <h1>Game unavailable</h1>
            <p>This game is not available in the current session.</p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.matchArena}>
          <div className={styles.playerColumn}>
            <PlayerPanel
              player={topDisplayPlayer}
              position="top"
              resignSide={visualTopSide}
              isActive={displayedGame.currentPlayer === visualTopSide && displayedGame.gameStatus === 'playing'}
              compact
              onResign={handleResign}
              resignDisabled={resignDisabledForSide(visualTopSide)}
              ratingChange={getRatingChangeForSide(currentUserRole, ratedOutcome, visualTopSide)}
              showClock={!isPracticeMode}
              showRating={!isPracticeMode}
              showResign={showResignForSide(visualTopSide)}
            />
          </div>
          <div className={styles.boardColumn}>
            <Board
              board={displayedGame.board}
              currentPlayer={displayedGame.currentPlayer}
              selectedPit={displayedGame.selectedPit}
              gameStatus={displayedGame.gameStatus}
              players={displayedGame.players}
              showVisualStones={showVisualStones}
              lastMove={displayedGame.lastMove}
              disableInteraction={boardInteractionDisabled}
              interactiveSide={
                currentUserRole === 'spectator'
                  ? '__none__'
                  : isComputerMatch
                    ? 'bottom'
                    : isOnlineMatch
                      ? currentUserRole
                    : null
              }
              perspectiveSide={perspectiveSide}
              onPitClick={
                syncTargetMatchId && onSubmitAuthoritativeMove
                  ? onSubmitAuthoritativeMove
                  : handlePitClick
              }
            />
            <ReplayControls
              activePositionIndex={activePositionIndex}
              totalMoves={game.matchRecord.moves.length}
              description={sidebarDescription}
              hasMoves={game.matchRecord.moves.length > 0}
              isReviewing={isReviewing}
              matchTypeLabel={matchTypeLabel}
              showReset={isPracticeMode}
              onFirst={handleReplayFirst}
              onLast={handleReplayLast}
              onNext={handleReplayNext}
              onPrevious={handleReplayPrevious}
              onReset={handleReset}
              resetDisabled={false}
              resetLabel="Restart match"
            />
          </div>
          <div className={styles.playerColumn}>
            <PlayerPanel
              player={bottomDisplayPlayer}
              position="bottom"
              resignSide={visualBottomSide}
              isActive={displayedGame.currentPlayer === visualBottomSide && displayedGame.gameStatus === 'playing'}
              compact
              onResign={handleResign}
              resignDisabled={resignDisabledForSide(visualBottomSide)}
              ratingChange={getRatingChangeForSide(
                currentUserRole,
                ratedOutcome,
                visualBottomSide,
              )}
              showClock={!isPracticeMode}
              showRating={!isPracticeMode}
              showResign={showResignForSide(visualBottomSide)}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

export default function MangalaGame() {
  const { gameId } = useParams()
  const location = useLocation()
  const [backendMatch, setBackendMatch] = useState(null)
  const [isLoadingBackendMatch, setIsLoadingBackendMatch] = useState(false)
  const [backendMatchError, setBackendMatchError] = useState('')
  const [isSubmittingAuthoritativeMove, setIsSubmittingAuthoritativeMove] = useState(false)
  const botAutoMoveTimeoutRef = useRef(null)
  const persistedMatchSession =
    typeof window === 'undefined' || typeof gameId !== 'string'
      ? null
      : readStoredMatchSessionByGameId(gameId)
  const targetBackendMatchId =
    location.state?.backendMatchId ??
    persistedMatchSession?.backendMatchId ??
    (!location.pathname.startsWith('/practice') &&
    !location.state?.matchMode &&
    !RESERVED_LOCAL_GAME_IDS.has(gameId)
      ? gameId
      : null)
  const backendMatchRevision = backendMatch
    ? JSON.stringify({
        status: backendMatch.status,
        winnerSide: backendMatch.winner_side,
        resultReason: backendMatch.result_reason,
        finishedAt: backendMatch.finished_at,
        currentPlayer: backendMatch.game_state?.currentPlayer ?? null,
        board: backendMatch.game_state?.board ?? null,
        moves: backendMatch.moves ?? [],
      })
    : 'local'

  const submitAuthoritativeMove = async (pitIndex = null) => {
    if (!targetBackendMatchId || isSubmittingAuthoritativeMove) {
      return
    }

    const token =
      typeof window === 'undefined'
        ? ''
        : window.localStorage.getItem('mangala.authToken') ?? ''

    if (!token) {
      return
    }

    setIsSubmittingAuthoritativeMove(true)

    try {
      const updatedMatch = await submitMatchMoveRequest(targetBackendMatchId, pitIndex, token)
      setBackendMatch(updatedMatch)
    } catch (error) {
      console.error('Submit authoritative move error:', error)
    } finally {
      setIsSubmittingAuthoritativeMove(false)
    }
  }

  useEffect(
    () => () => {
      if (botAutoMoveTimeoutRef.current !== null) {
        window.clearTimeout(botAutoMoveTimeoutRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    let isCancelled = false

    if (!targetBackendMatchId) {
      setBackendMatch(null)
      setBackendMatchError('')
      setIsLoadingBackendMatch(false)
      return undefined
    }

    const fetchMatch = async ({ showLoading = false } = {}) => {
      if (showLoading) {
        setIsLoadingBackendMatch(true)
      }

      try {
        const match = await getMatchByIdRequest(targetBackendMatchId)

        if (isCancelled) {
          return
        }

        const latestPersistedSession = readStoredMatchSessionByGameId(gameId)

        if (shouldKeepLocalSessionAheadOfBackend(latestPersistedSession, match)) {
          return
        }

        setBackendMatch((currentMatch) => {
          const currentRevision = currentMatch
            ? JSON.stringify({
                status: currentMatch.status,
                winnerSide: currentMatch.winner_side,
                resultReason: currentMatch.result_reason,
                finishedAt: currentMatch.finished_at,
                currentPlayer: currentMatch.game_state?.currentPlayer ?? null,
                board: currentMatch.game_state?.board ?? null,
                moves: currentMatch.moves ?? [],
              })
            : null
          const nextRevision = JSON.stringify({
            status: match.status,
            winnerSide: match.winner_side,
            resultReason: match.result_reason,
            finishedAt: match.finished_at,
            currentPlayer: match.game_state?.currentPlayer ?? null,
            board: match.game_state?.board ?? null,
            moves: match.moves ?? [],
          })

          return currentRevision === nextRevision ? currentMatch : match
        })
        setBackendMatchError('')
      } catch (error) {
        if (isCancelled) {
          return
        }

        setBackendMatch(null)
        setBackendMatchError(error.message || 'Could not load match.')
      } finally {
        if (!isCancelled && showLoading) {
          setIsLoadingBackendMatch(false)
        }
      }
    }

    void fetchMatch({ showLoading: true })
    const intervalId = window.setInterval(() => {
      void fetchMatch()
    }, BACKEND_MATCH_POLL_INTERVAL_MS)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [targetBackendMatchId])

  useEffect(() => {
    if (!backendMatch || !targetBackendMatchId || isSubmittingAuthoritativeMove) {
      return
    }

    const currentPlayer =
      backendMatch?.game_state?.currentPlayer === 'top' ? 'top' : 'bottom'
    const topIsBot = backendMatch.top_player_is_bot === true

    if (backendMatch.status !== 'active' || !topIsBot || currentPlayer !== 'top') {
      return
    }

    if (botAutoMoveTimeoutRef.current !== null) {
      window.clearTimeout(botAutoMoveTimeoutRef.current)
    }

    botAutoMoveTimeoutRef.current = window.setTimeout(() => {
      void submitAuthoritativeMove(null)
      botAutoMoveTimeoutRef.current = null
    }, BOT_MOVE_DELAY_MS)

    return () => {
      if (botAutoMoveTimeoutRef.current !== null) {
        window.clearTimeout(botAutoMoveTimeoutRef.current)
        botAutoMoveTimeoutRef.current = null
      }
    }
  }, [backendMatch, isSubmittingAuthoritativeMove, targetBackendMatchId])

  if (isLoadingBackendMatch) {
    return (
      <main className={styles.page}>
        <div className={styles.layout}>
          <section className={styles.unavailableState}>
            <h1>Loading match</h1>
            <p>Fetching the latest game state...</p>
          </section>
        </div>
      </main>
    )
  }

  if (backendMatchError) {
    return (
      <main className={styles.page}>
        <div className={styles.layout}>
          <section className={styles.unavailableState}>
            <h1>Game unavailable</h1>
            <p>{backendMatchError}</p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <MangalaGameScreen
      key={`${gameId}-${backendMatch?.id ?? 'local'}-${backendMatchRevision}`}
      gameId={gameId}
      backendMatch={backendMatch}
      onSubmitAuthoritativeMove={submitAuthoritativeMove}
      isSubmittingAuthoritativeMove={isSubmittingAuthoritativeMove}
    />
  )
}

export function PracticeBoardPage() {
  return <MangalaGameScreen key="practice-board" gameId="practice-board" />
}
