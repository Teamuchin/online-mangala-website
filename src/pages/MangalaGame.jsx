import Board from '../components/mangala/Board'
import MatchSidebar from '../components/mangala/MatchSidebar.jsx'
import PageBackLink from '../components/PageBackLink.jsx'
import { useLocation } from 'react-router-dom'
import { PLAYER_CONFIG, createInitialState } from '../components/mangala/gameLogic'
import { buildReplayDescription } from '../components/mangala/matchRecord.js'
import { useMangalaGame } from '../components/mangala/useMangalaGame'
import styles from '../components/mangala/MangalaGame.module.css'

export default function MangalaGame() {
  const location = useLocation()
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
    handleReset,
    handleStoneToggle,
  } = useMangalaGame(initialConfig)
  const replayDescription = buildReplayDescription(
    game.matchRecord,
    activePositionIndex,
    displayedGame.players,
  )
  const sidebarDescription = isReviewing ? replayDescription : game.turnMessage

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <h1>{botSettings ? 'Bot Match' : 'Local Match'}</h1>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleStoneToggle}
            >
              Visual Stones: {showVisualStones ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleAnimationToggle}
            >
              Move Animation: {animateMoves ? 'On' : 'Off'}
            </button>
            <PageBackLink className={styles.homeLink} />
            <button type="button" className={styles.resetButton} onClick={handleReset}>
              Restart Match
            </button>
          </div>
        </section>

        <section className={styles.matchArena}>
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
          <MatchSidebar
            activePositionIndex={activePositionIndex}
            currentPlayer={game.currentPlayer}
            description={sidebarDescription}
            gameStatus={game.gameStatus}
            hasMoves={game.matchRecord.moves.length > 0}
            isReviewing={isReviewing}
            onFirst={handleReplayFirst}
            onLast={handleReplayLast}
            onNext={handleReplayNext}
            onPrevious={handleReplayPrevious}
            players={displayedGame.players}
            totalMoves={game.matchRecord.moves.length}
            topStoreCount={displayedGame.board[PLAYER_CONFIG.top.storeIndex]}
            bottomStoreCount={displayedGame.board[PLAYER_CONFIG.bottom.storeIndex]}
          />
        </section>
      </div>
    </main>
  )
}
