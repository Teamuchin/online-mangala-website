import { formatTime } from './gameLogic'
import styles from './MangalaGame.module.css'

export default function PlayerPanel({ player, side, isActive, storeCount, compact = false }) {
  const isTop = side === 'top'
  const time = formatTime(player.timeLeft)

  return (
    <section
      className={`${styles.playerPanel} ${isActive ? styles.activePanel : ''} ${
        isTop ? styles.topPanel : styles.bottomPanel
      } ${compact ? styles.compactPlayerPanel : ''}`}
    >
      <div className={`${styles.playerClock} ${isActive ? styles.activeClock : ''}`}>{time}</div>
      <div className={styles.playerMeta}>
        <span className={styles.playerSide}>{isTop ? 'Top Side' : 'Bottom Side'}</span>
        <div className={styles.playerTitle}>
          <h2>{player.name}</h2>
          {player.isBot && <span className={styles.playerBadge}>BOT</span>}
        </div>
        <span className={styles.playerRating}>{player.rating}</span>
      </div>
      <div className={styles.playerStats}>
        <span>Store {storeCount}</span>
      </div>
    </section>
  )
}
