import { formatTime } from './gameLogic'
import styles from './MangalaGame.module.css'

export default function PlayerPanel({ player, side, isActive, storeCount }) {
  const isTop = side === 'top'
  const stats = isTop
    ? [`Rating ${player.rating}`, `Store ${storeCount}`, `Time ${formatTime(player.timeLeft)}`]
    : [`Time ${formatTime(player.timeLeft)}`, `Store ${storeCount}`, `Rating ${player.rating}`]

  return (
    <section
      className={`${styles.playerPanel} ${isActive ? styles.activePanel : ''} ${
        isTop ? styles.topPanel : styles.bottomPanel
      }`}
    >
      <div className={styles.playerMeta}>
        <span className={styles.playerSide}>{isTop ? 'Top Side' : 'Bottom Side'}</span>
        <div className={styles.playerTitle}>
          <h2>{player.name}</h2>
          {player.isBot && <span className={styles.playerBadge}>BOT</span>}
        </div>
      </div>
      <div className={styles.playerStats}>
        {stats.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  )
}
