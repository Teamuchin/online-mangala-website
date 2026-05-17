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
  showClock = true,
  showRating = true,
  showResign = true,
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
        {showClock ? (
          <div className={`${styles.playerClock} ${isActive ? styles.activeClock : ''}`}>
            {time}
          </div>
        ) : (
          <div className={styles.playerHeaderSpacer} aria-hidden="true" />
        )}
        {showResign ? (
          <button
            type="button"
            className={styles.resignButton}
            onClick={() => onResign?.(side)}
            disabled={resignDisabled}
          >
            Resign
          </button>
        ) : (
          <div className={styles.playerHeaderSpacer} aria-hidden="true" />
        )}
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
        {showRating ? (
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
        ) : null}
      </div>
    </section>
  )
}
