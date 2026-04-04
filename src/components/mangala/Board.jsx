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

function buildStoneStates(count, movedCount, isFinalTarget) {
  return Array.from({ length: count }, (_, stoneIndex) => {
    const isMovedStone = stoneIndex >= count - movedCount
    const isFinalStone = isFinalTarget && stoneIndex === count - 1

    return {
      id: `stone-${stoneIndex}`,
      isMovedStone,
      isFinalStone,
    }
  })
}

function renderStoneRows(rows, stoneStates, rowClassName, extraStoneClassName = '') {
  let stoneOffset = 0

  return rows.map((row) => {
    const rowStates = stoneStates.slice(stoneOffset, stoneOffset + row.stonesInRow)
    stoneOffset += row.stonesInRow

    return (
      <span
        key={row.id}
        className={rowClassName}
        style={{ '--row-offset': row.offset }}
      >
        {rowStates.map((stoneState) => (
          <span
            key={stoneState.id}
            className={`${styles.stone} ${extraStoneClassName} ${
              stoneState.isMovedStone ? styles.movedStone : ''
            } ${stoneState.isFinalStone ? styles.finalStone : ''}`}
          />
        ))}
      </span>
    )
  })
}

function Pit({
  count,
  disabled,
  isSelected,
  movedCount,
  isFinalTarget,
  capturedCount,
  onClick,
  showVisualStones,
}) {
  const shouldUseOverflowCount = count > MAX_VISIBLE_STONES
  const rows = shouldUseOverflowCount ? [] : getStoneRows(count)
  const stoneStates = shouldUseOverflowCount
    ? []
    : buildStoneStates(count, movedCount, isFinalTarget)
  const capturedRows =
    capturedCount > 0 && capturedCount <= MAX_VISIBLE_STONES
      ? getStoneRows(capturedCount)
      : []
  const capturedStoneStates =
    capturedRows.length > 0
      ? Array.from({ length: capturedCount }, (_, stoneIndex) => ({
          id: `captured-${stoneIndex}`,
          isMovedStone: false,
          isFinalStone: false,
        }))
      : []

  return (
    <button
      type="button"
      className={`${styles.pit} ${isSelected ? styles.selectedPit : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span
        className={`${styles.pitSurface} ${
          isFinalTarget ? styles.finalTargetSurface : ''
        }`}
      >
        {!showVisualStones || shouldUseOverflowCount ? (
          <span className={styles.pitCount}>{count}</span>
        ) : (
          <>
            {renderStoneRows(rows, stoneStates, styles.stoneRow)}
            {capturedRows.length > 0 &&
              renderStoneRows(
                capturedRows,
                capturedStoneStates,
                styles.stoneRow,
                styles.capturedStone,
              )}
          </>
        )}
      </span>
      {shouldUseOverflowCount && (
        <span className={styles.pitOverflowCount}>{count} stones</span>
      )}
    </button>
  )
}

function Store({ count, label, showVisualStones, movedCount, isFinalTarget }) {
  const rows = getStoreStoneRows(count)
  const stoneStates = buildStoneStates(count, movedCount, isFinalTarget)

  return (
    <div className={`${styles.store} ${isFinalTarget ? styles.finalStore : ''}`}>
      <span className={styles.storeLabel}>{label}</span>
      {showVisualStones ? (
        <div className={styles.storeSurface}>
          {renderStoneRows(rows, stoneStates, styles.storeRow, styles.storeStone)}
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
  lastMove,
  onPitClick,
}) {
  const topRow = [...PLAYER_CONFIG.top.pitIndexes].reverse()
  const bottomRow = PLAYER_CONFIG.bottom.pitIndexes
  const finalTarget = lastMove?.lastLandingIndex ?? null
  const dropCounts = lastMove?.dropCounts ?? {}
  const capturedCounts = (lastMove?.capturedStones ?? []).reduce(
    (accumulator, item) => {
      accumulator[item.index] = (accumulator[item.index] ?? 0) + item.count
      return accumulator
    },
    {},
  )

  return (
    <section className={styles.boardShell}>
      <Store
        count={board[13]}
        label={`${players.top.name} Store`}
        showVisualStones={showVisualStones}
        movedCount={dropCounts[13] ?? 0}
        isFinalTarget={finalTarget === 13}
      />
      <div className={styles.boardCenter}>
        <div className={styles.pitRow}>
          {topRow.map((index) => (
            <Pit
              key={index}
              count={board[index]}
              showVisualStones={showVisualStones}
              movedCount={dropCounts[index] ?? 0}
              isFinalTarget={finalTarget === index}
              capturedCount={capturedCounts[index] ?? 0}
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
              movedCount={dropCounts[index] ?? 0}
              isFinalTarget={finalTarget === index}
              capturedCount={capturedCounts[index] ?? 0}
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
        movedCount={dropCounts[6] ?? 0}
        isFinalTarget={finalTarget === 6}
      />
    </section>
  )
}
