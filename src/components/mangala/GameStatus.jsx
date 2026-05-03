import styles from './MangalaGame.module.css'

export default function GameStatus({ gameStatus, winner, turnMessage, players }) {
  const statusLabel =
    gameStatus === 'finished'
      ? winner === 'draw'
        ? 'Match drawn'
        : `${players[winner].name} wins`
      : 'Local two-player match'

  return (
    <details className={styles.accordionCard} open>
      <summary className={styles.accordionSummary}>
        <span className={styles.accordionTitle}>Status</span>
      </summary>
      <div className={styles.accordionBody}>
        <span className={styles.statusLabel}>{statusLabel}</span>
        <p>{turnMessage}</p>
      </div>
    </details>
  )
}
