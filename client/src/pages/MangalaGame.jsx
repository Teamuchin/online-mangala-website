import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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
    recordRatedMatchResult,
  } = useAppData()
  const { setSettingsContent } = useGlobalHeader()
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
    location.state?.matchMode ??
    matchingPersistedSession?.matchMode ??
    matchingActiveMatchSummary?.matchMode ??
    null
  const isLocalMatch = matchMode === 'local'
  const isComputerMatch = matchMode === 'computer'
  const botSettings =
    isComputerMatch
      ? location.state?.botSettings ??
        matchingPersistedSession?.botSettings ??
        null
      : null
  const initialConfig =
    matchMode === 'local'
        ? {
            gameId,
            matchMode: 'local',
            initialPlayers: {
            ...seededPlayers,
            bottom: {
              ...seededPlayers.bottom,
              id: currentUser.id,
              name: currentUser.username,
              rating: currentUser.elo ?? seededPlayers.bottom.rating,
            },
          },
        }
      : botSettings
        ? {
            gameId,
            matchMode: 'computer',
            botSettings,
            initialCurrentPlayer: location.state?.startingPlayer ?? 'bottom',
            initialPlayers: {
              ...seededPlayers,
              bottom: {
                ...seededPlayers.bottom,
                id: currentUser.id,
                name: currentUser.username,
                rating: currentUser.elo ?? seededPlayers.bottom.rating,
              },
              top: {
                id: 'bot-player',
                name: 'Computer',
                rating: 800 + botSettings.difficulty * 200,
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
    handleStoneToggle,
    markRatingApplied,
  } = useMangalaGame(initialConfig)

  const currentUserRole = !isAuthenticated
    ? 'spectator'
    : isLocalMatch
      ? 'both'
      : currentUser.id === game.players.bottom.id
        ? 'bottom'
        : currentUser.id === game.players.top.id
          ? 'top'
          : 'spectator'
  const canRequestRematch = currentUserRole !== 'spectator' && Boolean(matchMode)
  const ratedOutcome =
    isComputerMatch && game.gameStatus === 'finished'
      ? buildRatedMatchOutcome(
          game.players.bottom.rating,
          game.players.top.rating,
          game.winner === 'bottom'
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
          startingPlayer: nextStartingPlayer,
        },
      })

      return
    }

    navigate(`/game/${nextGameId}`, {
      state: {
        matchMode: 'local',
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
      !isComputerMatch ||
      currentUserRole !== 'bottom' ||
      game.gameStatus !== 'finished' ||
      game.ratingApplied
    ) {
      return
    }

    const playerResult =
      game.winner === 'bottom'
        ? 'win'
        : game.winner === 'draw'
          ? 'draw'
          : 'loss'
    const ratedOutcome = buildRatedMatchOutcome(
      game.players.bottom.rating,
      game.players.top.rating,
      playerResult,
    )

    recordRatedMatchResult({
      gameId,
      playedAt: new Date().toISOString(),
      opponent: game.players.top.name,
      playerRating: game.players.bottom.rating,
      opponentRating: ratedOutcome.opponentRating,
      opponentRatingDelta: ratedOutcome.opponentDelta,
      mode: 'Bot',
      result:
        playerResult === 'win'
          ? 'Win'
          : playerResult === 'draw'
            ? 'Draw'
            : 'Loss',
      ratingAfter: ratedOutcome.playerRating,
      ratingDelta: ratedOutcome.playerDelta,
    })
    markRatingApplied()
  }, [
    currentUserRole,
    game.gameStatus,
    game.players.bottom.rating,
    game.players.top.rating,
    game.ratingApplied,
    game.winner,
    game.players.top.name,
    gameId,
    isComputerMatch,
    markRatingApplied,
    recordRatedMatchResult,
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
              (!isLocalMatch && currentUserRole !== 'top')
            }
            ratingChange={ratedOutcome?.opponentDelta ?? null}
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
              showReset={game.gameStatus === 'finished'}
              onFirst={handleReplayFirst}
              onLast={handleReplayLast}
              onNext={handleReplayNext}
              onPrevious={handleReplayPrevious}
              onReset={handleRematch}
              resetDisabled={!canRequestRematch}
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
              (!isLocalMatch && currentUserRole !== 'bottom')
            }
            ratingChange={ratedOutcome?.playerDelta ?? null}
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
