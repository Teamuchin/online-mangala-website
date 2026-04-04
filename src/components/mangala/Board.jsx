import { PLAYER_CONFIG } from './gameLogic'
import styles from './MangalaGame.module.css'

const MAX_VISIBLE_STONES = 12
const ROW_ORDER = [0, 1, 2, 3, 2.5, 1.5]
const MAX_STONES_PER_ROW = 2
const STORE_MAX_STONES_PER_ROW = 3
const STORE_BASE_ROW_COUNT = 8

function getStoreRowOrder(rowCount) {
  const positions = Array.from({ length: STORE_BASE_ROW_COUNT }, (_, index) => index)

  if (rowCount <= positions.length) {
    return positions.slice(0, rowCount)
  }

  const interleavedPositions = []

  for (let index = positions.length - 2; index >= 0; index -= 1) {
    interleavedPositions.push(index + 0.5)
  }
  interleavedPositions.push(positions.length - 0.5)

  return [...positions, ...interleavedPositions].slice(0, rowCount)
}

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

function getStoreStoneRows(count) {
  const rowCount = Math.ceil(count / STORE_MAX_STONES_PER_ROW)
  const rowPositions = getStoreRowOrder(rowCount)
  const minPosition = Math.min(...rowPositions)
  const maxPosition = Math.max(...rowPositions)
  const centerPosition = (minPosition + maxPosition) / 2

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const stonesInRow = Math.min(
      STORE_MAX_STONES_PER_ROW,
      count - rowIndex * STORE_MAX_STONES_PER_ROW,
    )

    return {
      id: `store-row-${rowIndex}`,
      offset: rowPositions[rowIndex] - centerPosition,
      stonesInRow,
    }
  })
}

function Pit({ count, disabled, isSelected, onClick, showVisualStones }) {
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
        {!showVisualStones || shouldUseOverflowCount ? (
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

function Store({ count, label, showVisualStones }) {
  const rows = getStoreStoneRows(count)

  return (
    <div className={styles.store}>
      <span className={styles.storeLabel}>{label}</span>
      {showVisualStones ? (
        <div className={styles.storeSurface}>
          {rows.map((row) => (
            <span
              key={row.id}
              className={styles.storeRow}
              style={{ '--row-offset': row.offset }}
            >
              {Array.from({ length: row.stonesInRow }, (_, stoneIndex) => (
                <span
                  key={`${row.id}-${stoneIndex}`}
                  className={`${styles.stone} ${styles.storeStone}`}
                />
              ))}
            </span>
          ))}
        </div>
      ) : (
        <div className={`${styles.storeSurface} ${styles.storeSurfaceHidden}`}>
          <span className={styles.storeCountOnly}>{count}</span>
        </div>
      )}
      {showVisualStones && <span className={styles.storeTotal}>{count}</span>}
    </div>
  )
}

export default function Board({
  board,
  currentPlayer,
  selectedPit,
  gameStatus,
  players,
  showVisualStones,
  onPitClick,
}) {
  const topRow = [...PLAYER_CONFIG.top.pitIndexes].reverse()
  const bottomRow = PLAYER_CONFIG.bottom.pitIndexes

  return (
    <section className={styles.boardShell}>
      <Store
        count={board[13]}
        label={`${players.top.name} Store`}
        showVisualStones={showVisualStones}
      />
      <div className={styles.boardCenter}>
        <div className={styles.pitRow}>
          {topRow.map((index) => (
            <Pit
              key={index}
              count={board[index]}
              showVisualStones={showVisualStones}
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
              showVisualStones={showVisualStones}
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
      <Store
        count={board[6]}
        label={`${players.bottom.name} Store`}
        showVisualStones={showVisualStones}
      />
    </section>
  )
}
