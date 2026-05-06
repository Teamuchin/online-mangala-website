import { useEffect, useRef } from 'react'
import Board from '../components/mangala/Board'
import PlayerPanel from '../components/mangala/PlayerPanel.jsx'
import ReplayControls from '../components/mangala/ReplayControls.jsx'
import { useLocation } from 'react-router-dom'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import { createInitialState } from '../components/mangala/gameLogic'
import { buildReplayDescription } from '../components/mangala/matchRecord.js'
import { useMangalaGame } from '../components/mangala/useMangalaGame'
import styles from '../components/mangala/MangalaGame.module.css'

export default function MangalaGame() {
  const location = useLocation()
  const { setSettingsContent } = useGlobalHeader()
  const botSettings = location.state?.botSettings ?? null
  const initialConfig = botSettings
    ? {
        botSettings,
        initialCurrentPlayer: location.state?.startingPlayer ?? 'bottom',
        initialPlayers: {
          ...createInitialState().players,
          top: {
            id: 'bot-player',
            name: 'Computer',
            rating: 800 + botSettings.difficulty * 200,
            timeLeft: 300,
            isBot: true,
          },
        },
      }
    : undefined
  const {
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
  } = useMangalaGame(initialConfig)
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
  }, [
    setSettingsContent,
    showVisualStones,
    animateMoves,
  ])

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
            resignDisabled={isReviewing || game.gameStatus !== 'playing'}
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
              disableInteraction={isReviewing}
              onPitClick={handlePitClick}
            />
            <ReplayControls
              activePositionIndex={activePositionIndex}
              totalMoves={game.matchRecord.moves.length}
              description={sidebarDescription}
              hasMoves={game.matchRecord.moves.length > 0}
              isReviewing={isReviewing}
              onFirst={handleReplayFirst}
              onLast={handleReplayLast}
              onNext={handleReplayNext}
              onPrevious={handleReplayPrevious}
              onReset={handleReset}
            />
          </div>
          <PlayerPanel
            player={displayedGame.players.bottom}
            side="bottom"
            isActive={game.currentPlayer === 'bottom' && game.gameStatus === 'playing'}
            compact
            onResign={handleResign}
            resignDisabled={isReviewing || game.gameStatus !== 'playing'}
          />
        </section>
      </div>
    </main>
  )
}
