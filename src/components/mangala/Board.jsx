import { PLAYER_CONFIG } from './gameLogic'
import styles from './MangalaGame.module.css'

function Pit({ count, disabled, isSelected, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.pit} ${isSelected ? styles.selectedPit : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.pitCount}>{count}</span>
    </button>
  )
}

function Store({ count, label }) {
  return (
    <div className={styles.store}>
      <span className={styles.storeLabel}>{label}</span>
      <span className={styles.storeCount}>{count}</span>
    </div>
  )
}

export default function Board({
  board,
  currentPlayer,
  selectedPit,
  gameStatus,
  players,
  onPitClick,
}) {
  const topRow = [...PLAYER_CONFIG.top.pitIndexes].reverse()
  const bottomRow = PLAYER_CONFIG.bottom.pitIndexes

  return (
    <section className={styles.boardShell}>
      <Store count={board[13]} label={`${players.top.name} Store`} />
      <div className={styles.boardCenter}>
        <div className={styles.pitRow}>
          {topRow.map((index) => (
            <Pit
              key={index}
              count={board[index]}
              disabled={
                gameStatus === 'finished' ||
                currentPlayer !== 'top' ||
                board[index] === 0
              }
              isSelected={selectedPit === index}
              onClick={() => onPitClick(index)}
            />
          ))}
        </div>
        <div className={styles.pitRow}>
          {bottomRow.map((index) => (
            <Pit
              key={index}
              count={board[index]}
              disabled={
                gameStatus === 'finished' ||
                currentPlayer !== 'bottom' ||
                board[index] === 0
              }
              isSelected={selectedPit === index}
              onClick={() => onPitClick(index)}
            />
          ))}
        </div>
      </div>
      <Store count={board[6]} label={`${players.bottom.name} Store`} />
    </section>
  )
}
