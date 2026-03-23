import styles from './MangalaGame.module.css'

export default function GameStatus({ gameStatus, winner, turnMessage, players }) {
  const statusLabel =
    gameStatus === 'finished'
      ? winner === 'draw'
        ? 'Match drawn'
        : `${players[winner].name} wins`
      : 'Local two-player match'

  return (
    <section className={styles.statusCard}>
      <span className={styles.statusLabel}>{statusLabel}</span>
      <p>{turnMessage}</p>
    </section>
  )
}
