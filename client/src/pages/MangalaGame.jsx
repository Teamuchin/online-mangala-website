import { useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { getMatchByIdRequest } from '../app/matchApi.js'
import { getDisplayName } from '../app/playerNames.js'
import { buildRatedMatchOutcome } from '../app/rating.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import Board from '../components/mangala/Board.jsx'
import {
  readStoredMatchSessionByGameId,
} from '../components/mangala/gamePersistence.js'
import { createInitialState } from '../components/mangala/gameLogic.js'
import { buildPositionSnapshot, buildReplayDescription } from '../components/mangala/matchRecord.js'
import ReplayControls from '../components/mangala/ReplayControls.jsx'
import PlayerPanel from '../components/mangala/PlayerPanel.jsx'
import { useMangalaGame } from '../components/mangala/useMangalaGame.js'
import styles from '../components/mangala/MangalaGame.module.css'

const RESERVED_LOCAL_GAME_IDS = new Set(['local'])

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
      timeLeft: 300,
      isBot: backendMatch.bottom_player_is_bot === true,
    },
    top: {
      id: topId,
      name: topName,
      username: topName,
      rating: backendMatch.top_rating_before,
      timeLeft: 300,
      isBot: backendMatch.top_player_is_bot === true,
    },
  }
}

function buildMatchRecordFromBackendMatch({
  backendMatch,
  initialBoard,
  players,
  currentPlayer,
  gameStatus,
  winner,
}) {
  const rawMoves = Array.isArray(backendMatch?.moves) ? backendMatch.moves : []
  const positions = [
    buildPositionSnapshot({
      board: initialBoard,
      currentPlayer,
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
  const initialBoard =
    buildFlatBoard(backendMatch?.game_state?.board) ?? createInitialState().board
  const gameStatus = backendMatch.status === 'finished' ? 'finished' : 'playing'
  const initialMatchRecord = buildMatchRecordFromBackendMatch({
    backendMatch,
    initialBoard,
    players,
    currentPlayer,
    gameStatus,
    winner,
  })

  return {
    gameId,
    matchMode,
    queueSettings: {
      rated: Boolean(backendMatch.is_rated),
      allowBots:
        backendMatch.bottom_player_is_bot === true || backendMatch.top_player_is_bot === true,
    },
    initialPlayers: players,
    initialCurrentPlayer: currentPlayer,
    initialBoard,
    initialGameStatus: gameStatus,
    initialWinner: winner,
    initialTurnMessage: buildTurnMessageFromState({
      players,
      currentPlayer,
      gameStatus,
      winner,
    }),
    initialMatchRecord,
  }
}

function MangalaGameScreen({ gameId, backendMatch = null }) {
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
    backendMatch && !matchingPersistedSession
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
  const showTopResign =
    !isPracticeMode &&
    (isLocalMatch || currentUserRole === 'top')
  const showBottomResign =
    !isPracticeMode &&
    (isLocalMatch || currentUserRole === 'bottom')
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
        >
          Move Animation: {animateMoves ? 'On' : 'Off'}
        </button>
      </>,
    )

    return () => {
      setSettingsContent(null)
    }
  }, [animateMoves, setSettingsContent, showVisualStones])

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
              player={displayedGame.players.top}
              side="top"
              isActive={game.currentPlayer === 'top' && game.gameStatus === 'playing'}
              compact
              onResign={handleResign}
              resignDisabled={
                isReviewing ||
                game.gameStatus !== 'playing' ||
                (!isLocalMatch && !isPracticeMode && currentUserRole !== 'top')
              }
              ratingChange={ratedOutcome?.opponentDelta ?? null}
              showClock={!isPracticeMode}
              showRating={!isPracticeMode}
              showResign={showTopResign}
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
              disableInteraction={isReviewing || currentUserRole === 'spectator'}
              interactiveSide={
                currentUserRole === 'spectator'
                  ? '__none__'
                  : isComputerMatch
                    ? 'bottom'
                    : isOnlineMatch
                      ? currentUserRole
                    : null
              }
              onPitClick={handlePitClick}
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
              player={displayedGame.players.bottom}
              side="bottom"
              isActive={game.currentPlayer === 'bottom' && game.gameStatus === 'playing'}
              compact
              onResign={handleResign}
              resignDisabled={
                isReviewing ||
                game.gameStatus !== 'playing' ||
                (!isLocalMatch && !isPracticeMode && currentUserRole !== 'bottom')
              }
              ratingChange={ratedOutcome?.playerDelta ?? null}
              showClock={!isPracticeMode}
              showRating={!isPracticeMode}
              showResign={showBottomResign}
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

  const shouldFetchBackendMatch =
    Boolean(gameId) &&
    !location.pathname.startsWith('/practice') &&
    !location.state?.matchMode &&
    !readStoredMatchSessionByGameId(gameId) &&
    !RESERVED_LOCAL_GAME_IDS.has(gameId)

  useEffect(() => {
    let isCancelled = false

    if (!shouldFetchBackendMatch) {
      setBackendMatch(null)
      setBackendMatchError('')
      setIsLoadingBackendMatch(false)
      return undefined
    }

    setIsLoadingBackendMatch(true)
    setBackendMatchError('')

    getMatchByIdRequest(gameId)
      .then((match) => {
        if (isCancelled) {
          return
        }

        setBackendMatch(match)
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        setBackendMatch(null)
        setBackendMatchError(error.message || 'Could not load match.')
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingBackendMatch(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [gameId, shouldFetchBackendMatch])

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
      key={`${gameId}-${backendMatch?.id ?? 'local'}`}
      gameId={gameId}
      backendMatch={backendMatch}
    />
  )
}

export function PracticeBoardPage() {
  return <MangalaGameScreen key="practice-board" gameId="practice-board" />
}
