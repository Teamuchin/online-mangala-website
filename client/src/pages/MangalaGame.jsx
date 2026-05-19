import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getDisplayName } from '../app/playerNames.js'
import { buildRatedMatchOutcome } from '../app/rating.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import Board from '../components/mangala/Board.jsx'
import {
  createRandomGameId,
  readStoredMatchIds,
  readStoredMatchSessionByGameId,
} from '../components/mangala/gamePersistence.js'
import { createInitialState } from '../components/mangala/gameLogic.js'
import ReplayControls from '../components/mangala/ReplayControls.jsx'
import PlayerPanel from '../components/mangala/PlayerPanel.jsx'
import { buildReplayDescription } from '../components/mangala/matchRecord.js'
import { useMangalaGame } from '../components/mangala/useMangalaGame.js'
import styles from '../components/mangala/MangalaGame.module.css'

function MangalaGameScreen({ gameId }) {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    activeMatchSummary,
    currentUser,
    isAuthenticated,
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
  const matchMode =
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
    matchMode === 'practice'
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
                displayName:
                  location.state?.botProfile?.displayName ??
                  getDisplayName(location.state?.botProfile),
                rating: location.state?.botProfile?.elo ?? 1000,
                timeLeft: 300,
                isBot: true,
              },
            },
          }
      : {
            gameId,
            matchMode: null,
          }

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
  const canRequestRematch =
    currentUserRole !== 'spectator' && Boolean(matchMode) && !isOnlineMatch
  const isRatedMatch = Boolean(queueSettings?.rated)
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

  const handleRematch = () => {
    if (!canRequestRematch) {
      return
    }

    const nextGameId = createRandomGameId(readStoredMatchIds())

    if (isComputerMatch) {
      const nextStartingPlayer =
        botSettings?.firstMove === 'random'
          ? Math.random() < 0.5
            ? 'bottom'
            : 'top'
          : botSettings?.firstMove === 'computer'
            ? 'top'
            : 'bottom'

      navigate(`/game/${nextGameId}`, {
        state: {
          matchMode: 'computer',
          botSettings,
          queueSettings,
          startingPlayer: nextStartingPlayer,
          botProfile: location.state?.botProfile ?? null,
        },
      })

      return
    }

    navigate(`/game/${nextGameId}`, {
      state: {
        matchMode: isPracticeMode ? 'practice' : 'local',
      },
    })
  }

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
      !isRatedMatch ||
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

    recordRatedMatchResult({
      gameId,
      playedAt,
      opponent: getDisplayName(game.players[opponentSide]) ?? game.players[opponentSide].name,
      playerRating: game.players[playerSide].rating,
      opponentRating: ratedOutcome.opponentRating,
      opponentRatingDelta: ratedOutcome.opponentDelta,
      mode: isComputerMatch ? 'Bot' : 'Online',
      result:
        playerResult === 'win'
          ? 'Win'
          : playerResult === 'draw'
            ? 'Draw'
            : 'Loss',
      ratingAfter: ratedOutcome.playerRating,
      ratingDelta: ratedOutcome.playerDelta,
    })

    if (game.players[opponentSide].id !== currentUser.id) {
      recordPublicProfileMatchResult(game.players[opponentSide].id, {
        gameId,
        playedAt,
        opponent: getDisplayName(game.players[playerSide]) ?? game.players[playerSide].name,
        playerRating: game.players[opponentSide].rating,
        opponentRating: game.players[playerSide].rating,
        opponentRatingDelta: ratedOutcome.playerDelta,
        mode: isComputerMatch ? 'Bot' : 'Online',
        result:
          playerResult === 'win'
            ? 'Loss'
            : playerResult === 'draw'
              ? 'Draw'
              : 'Win',
        ratingAfter: ratedOutcome.opponentRating,
        ratingDelta: ratedOutcome.opponentDelta,
      })
    }
    markRatingApplied()
  }, [
    currentUserRole,
    game.gameStatus,
    game.players,
    game.players.bottom.rating,
    game.players.bottom.name,
    game.players.bottom.displayName,
    game.players.bottom.id,
    game.players.top.rating,
    game.players.top.id,
    game.ratingApplied,
    game.winner,
    game.players.top.name,
    game.players.top.displayName,
    gameId,
    isComputerMatch,
    isRatedMatch,
    markRatingApplied,
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
            showResign={!isPracticeMode}
          />
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
              showReset={isPracticeMode || game.gameStatus === 'finished'}
              onFirst={handleReplayFirst}
              onLast={handleReplayLast}
              onNext={handleReplayNext}
              onPrevious={handleReplayPrevious}
              onReset={isPracticeMode ? handleReset : handleRematch}
              resetDisabled={isPracticeMode ? false : !canRequestRematch}
              resetLabel={isPracticeMode ? 'Restart match' : 'Start rematch'}
            />
          </div>
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
            showResign={!isPracticeMode}
          />
        </section>
      </div>
    </main>
  )
}

export default function MangalaGame() {
  const { gameId } = useParams()

  return <MangalaGameScreen key={gameId} gameId={gameId} />
}

export function PracticeBoardPage() {
  return <MangalaGameScreen key="practice-board" gameId="practice-board" />
}
