import { Link } from 'react-router-dom'
import { getDisplayName, getRouteName } from '../../app/playerNames.js'
import { formatTime } from './gameLogic'
import styles from './MangalaGame.module.css'

export default function PlayerPanel({
  player,
  position,
  resignSide = position,
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
        position === 'top' ? styles.topPanel : styles.bottomPanel
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
            onClick={() => onResign?.(resignSide)}
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
              to={`/member/${encodeURIComponent(getRouteName(player))}`}
              className={styles.playerNameLink}
            >
              {getDisplayName(player)}
            </Link>
            {player.isBot && <span className={styles.playerBotBadge}>AI</span>}
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
