import { PLAYER_CONFIG } from './gameLogic'
import {
  buildStaticStoneStates,
  buildStoneStates,
  getStoneRows,
  getStoreStoneRows,
  shouldRenderInlinePitStones,
  shouldUseOverflowCount,
} from './boardVisuals'
import styles from './MangalaGame.module.css'

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
  sourceSilhouetteCount,
  onClick,
  showVisualStones,
}) {
  const useOverflowCount = shouldUseOverflowCount(count)
  const rows = useOverflowCount ? [] : getStoneRows(count)
  const stoneStates = useOverflowCount
    ? []
    : buildStoneStates(count, movedCount, isFinalTarget)
  const capturedRows =
    shouldRenderInlinePitStones(capturedCount)
      ? getStoneRows(capturedCount)
      : []
  const capturedStoneStates =
    capturedRows.length > 0
      ? buildStaticStoneStates(capturedCount, 'captured')
      : []
  const sourceSilhouetteRows =
    shouldRenderInlinePitStones(sourceSilhouetteCount)
      ? getStoneRows(sourceSilhouetteCount)
      : []
  const sourceSilhouetteStates =
    sourceSilhouetteRows.length > 0
      ? buildStaticStoneStates(sourceSilhouetteCount, 'source')
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
        {!showVisualStones || useOverflowCount ? (
          <span className={styles.pitCount}>{count}</span>
        ) : (
          <>
            {sourceSilhouetteRows.length > 0
              ? renderStoneRows(
                  sourceSilhouetteRows,
                  sourceSilhouetteStates,
                  styles.stoneRow,
                  styles.departedStone,
                )
              : renderStoneRows(rows, stoneStates, styles.stoneRow)}
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
      {useOverflowCount && (
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
  const sourceSilhouetteCounts =
    lastMove?.preMoveSourceCount && lastMove?.fromPit !== undefined
      ? { [lastMove.fromPit]: lastMove.preMoveSourceCount }
      : {}
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
              sourceSilhouetteCount={sourceSilhouetteCounts[index] ?? 0}
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
              sourceSilhouetteCount={sourceSilhouetteCounts[index] ?? 0}
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
