import { PLAYER_CONFIG } from './gameLogic'
import styles from './MangalaGame.module.css'

const MAX_VISIBLE_STONES = 12
const ROW_ORDER = [0, 1, 2, 3, 2.5, 1.5]
const MAX_STONES_PER_ROW = 2

function getStoneRows(count) {
  const rowCount = Math.ceil(count / MAX_STONES_PER_ROW)
  const rowPositions = ROW_ORDER.slice(0, rowCount)
  const minPosition = Math.min(...rowPositions)
  const maxPosition = Math.max(...rowPositions)
  const centerPosition = (minPosition + maxPosition) / 2

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const stonesInRow = Math.min(
      MAX_STONES_PER_ROW,
      count - rowIndex * MAX_STONES_PER_ROW,
    )
    const visualPosition = rowPositions[rowIndex]

    return {
      id: `row-${rowIndex}`,
      offset: visualPosition - centerPosition,
      stonesInRow,
    }
  })
}

function Pit({ count, disabled, isSelected, onClick }) {
  const shouldUseOverflowCount = count > MAX_VISIBLE_STONES
  const rows = shouldUseOverflowCount ? [] : getStoneRows(count)

  return (
    <button
      type="button"
      className={`${styles.pit} ${isSelected ? styles.selectedPit : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.pitSurface}>
        {shouldUseOverflowCount ? (
          <span className={styles.pitCount}>{count}</span>
        ) : (
          rows.map((row) => (
            <span
              key={row.id}
              className={styles.stoneRow}
              style={{ '--row-offset': row.offset }}
            >
              {Array.from({ length: row.stonesInRow }, (_, stoneIndex) => (
                <span
                  key={`${row.id}-${stoneIndex}`}
                  className={styles.stone}
                />
              ))}
            </span>
          ))
        )}
      </span>
      {shouldUseOverflowCount && (
        <span className={styles.pitOverflowCount}>{count} stones</span>
      )}
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
