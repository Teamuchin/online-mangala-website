import { formatTime } from './gameLogic'
import styles from './MangalaGame.module.css'

export default function PlayerPanel({
  player,
  side,
  isActive,
  compact = false,
  onResign,
  resignDisabled = false,
}) {
  const time = formatTime(player.timeLeft)

  return (
    <section
      className={`${styles.playerPanel} ${isActive ? styles.activePanel : ''} ${
        side === 'top' ? styles.topPanel : styles.bottomPanel
      } ${compact ? styles.compactPlayerPanel : ''}`}
    >
      <div className={styles.playerHeader}>
        <div className={`${styles.playerClock} ${isActive ? styles.activeClock : ''}`}>
          {time}
        </div>
        <button
          type="button"
          className={styles.resignButton}
          onClick={() => onResign?.(side)}
          disabled={resignDisabled}
        >
          Resign
        </button>
      </div>
      <div className={styles.playerMeta}>
        <span className={styles.playerSide} />
        <div className={styles.playerTitle}>
          <h2>{player.name}</h2>
          {player.isBot && <span className={styles.playerBadge}>BOT</span>}
        </div>
        <span className={styles.playerRating}>{player.rating}</span>
      </div>
    </section>
  )
}
