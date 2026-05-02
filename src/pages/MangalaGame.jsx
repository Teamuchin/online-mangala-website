import Board from '../components/mangala/Board'
import GameStatus from '../components/mangala/GameStatus'
import PlayerPanel from '../components/mangala/PlayerPanel'
import PageBackLink from '../components/PageBackLink.jsx'
import { PLAYER_CONFIG } from '../components/mangala/gameLogic'
import { RULES } from '../components/mangala/constants'
import { useMangalaGame } from '../components/mangala/useMangalaGame'
import styles from '../components/mangala/MangalaGame.module.css'

export default function MangalaGame() {
  const {
    game,
    animateMoves,
    showVisualStones,
    handleAnimationToggle,
    handlePitClick,
    handleReset,
    handleStoneToggle,
  } = useMangalaGame()

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <h1>Mangala Local Match</h1>
            <p>
              Practice the Turkish Mancala variant locally with mock player data,
              active timers, and turn-by-turn capture logic.
            </p>
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

        <section className={styles.playerGrid}>
          <PlayerPanel
            player={game.players.top}
            side="top"
            isActive={game.currentPlayer === 'top' && game.gameStatus === 'playing'}
            storeCount={game.board[PLAYER_CONFIG.top.storeIndex]}
          />
          <PlayerPanel
            player={game.players.bottom}
            side="bottom"
            isActive={game.currentPlayer === 'bottom' && game.gameStatus === 'playing'}
            storeCount={game.board[PLAYER_CONFIG.bottom.storeIndex]}
          />
        </section>

        <Board
          board={game.board}
          currentPlayer={game.currentPlayer}
          selectedPit={game.selectedPit}
          gameStatus={game.gameStatus}
          players={game.players}
          showVisualStones={showVisualStones}
          lastMove={game.lastMove}
          onPitClick={handlePitClick}
        />

        <section className={styles.footerGrid}>
          <GameStatus
            gameStatus={game.gameStatus}
            winner={game.winner}
            turnMessage={game.turnMessage}
            players={game.players}
          />

          <section className={styles.rulesCard}>
            <h3>Rules in Use</h3>
            <div className={styles.rulesList}>
              {RULES.map((rule) => (
                <p key={rule}>{rule}</p>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
