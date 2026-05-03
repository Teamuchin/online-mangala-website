import Board from '../components/mangala/Board'
import GameStatus from '../components/mangala/GameStatus'
import PlayerPanel from '../components/mangala/PlayerPanel'
import PageBackLink from '../components/PageBackLink.jsx'
import { useLocation } from 'react-router-dom'
import { PLAYER_CONFIG, createInitialState } from '../components/mangala/gameLogic'
import { RULES } from '../components/mangala/constants'
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
    animateMoves,
    showVisualStones,
    handleAnimationToggle,
    handlePitClick,
    handleReset,
    handleStoneToggle,
  } = useMangalaGame(initialConfig)

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

          <details className={styles.accordionCard}>
            <summary className={styles.accordionSummary}>
              <span className={styles.accordionTitle}>Rules</span>
            </summary>
            <div className={styles.accordionBody}>
              <h3>Rules in Use</h3>
              <div className={styles.rulesList}>
                {RULES.map((rule) => (
                  <p key={rule}>{rule}</p>
                ))}
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  )
}
