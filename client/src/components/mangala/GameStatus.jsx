import styles from './MangalaGame.module.css'

export default function GameStatus({
  gameStatus,
  winner,
  turnMessage,
  players,
  statusLabelOverride,
  messageOverride,
}) {
  const statusLabel =
    statusLabelOverride ??
    (gameStatus === 'finished'
      ? winner === 'draw'
        ? 'Match drawn'
        : `${players[winner].name} wins`
      : 'Local two-player match')
  const message = messageOverride ?? turnMessage

  return (
    <details className={styles.accordionCard} open>
      <summary className={styles.accordionSummary}>
        <span className={styles.accordionTitle}>Status</span>
      </summary>
      <div className={styles.accordionBody}>
        <span className={styles.statusLabel}>{statusLabel}</span>
        <p>{message}</p>
      </div>
    </details>
  )
}
