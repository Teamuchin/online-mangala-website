import {
  buildStaticStoneStates,
  buildStoneStates,
  getStoneRows,
  shouldRenderInlinePitStones,
  shouldUseOverflowCount,
} from './boardVisuals'
import StoneRows from './StoneRows'
import styles from './MangalaGame.module.css'

export default function Pit({
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
  const capturedRows = shouldRenderInlinePitStones(capturedCount)
    ? getStoneRows(capturedCount)
    : []
  const capturedStoneStates =
    capturedRows.length > 0 ? buildStaticStoneStates(capturedCount, 'captured') : []
  const sourceSilhouetteRows = shouldRenderInlinePitStones(sourceSilhouetteCount)
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
            {sourceSilhouetteRows.length > 0 ? (
              <StoneRows
                rows={sourceSilhouetteRows}
                stoneStates={sourceSilhouetteStates}
                rowClassName={styles.stoneRow}
                extraStoneClassName={styles.departedStone}
              />
            ) : (
              <StoneRows
                rows={rows}
                stoneStates={stoneStates}
                rowClassName={styles.stoneRow}
              />
            )}
            {capturedRows.length > 0 && (
              <StoneRows
                rows={capturedRows}
                stoneStates={capturedStoneStates}
                rowClassName={styles.stoneRow}
                extraStoneClassName={styles.capturedStone}
              />
            )}
          </>
        )}
      </span>
      {useOverflowCount && <span className={styles.pitOverflowCount}>{count} stones</span>}
    </button>
  )
}
