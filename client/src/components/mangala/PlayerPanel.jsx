import { Link } from 'react-router-dom'
import { formatTime } from './gameLogic'
import styles from './MangalaGame.module.css'

export default function PlayerPanel({
  player,
  side,
  isActive,
  compact = false,
  onResign,
  resignDisabled = false,
  ratingChange = null,
}) {
  const time = formatTime(player.timeLeft)
  const ratingChangeText =
    ratingChange === null ? null : `${ratingChange > 0 ? '+' : ''}${ratingChange}`

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
        <div className={styles.playerTitle}>
          <h2>
            <Link
              to={`/member/${encodeURIComponent(player.name)}`}
              className={styles.playerNameLink}
            >
              {player.name}
            </Link>
          </h2>
        </div>
        <div className={styles.playerRatingRow}>
          <span className={styles.playerRating}>{player.rating}</span>
          {ratingChangeText && (
            <span
              className={`${styles.ratingChange} ${
                ratingChange > 0
                  ? styles.positiveRatingChange
                  : styles.negativeRatingChange
              }`}
            >
              {ratingChangeText}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
