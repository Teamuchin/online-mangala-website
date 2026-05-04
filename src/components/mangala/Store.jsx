import { buildStoneStates, getStoreStoneRows } from './boardVisuals'
import StoneRows from './StoneRows'
import styles from './MangalaGame.module.css'

export default function Store({
  className = '',
  count,
  label,
  showVisualStones,
  movedCount,
  isFinalTarget,
}) {
  const rows = getStoreStoneRows(count)
  const stoneStates = buildStoneStates(count, movedCount, isFinalTarget)

  return (
    <div
      className={`${styles.store} ${isFinalTarget ? styles.finalStore : ''} ${className}`}
    >
      {showVisualStones ? (
        <div className={styles.storeSurface}>
          <span className={styles.storeLabel}>{label}</span>
          <StoneRows
            rows={rows}
            stoneStates={stoneStates}
            rowClassName={styles.storeRow}
            extraStoneClassName={styles.storeStone}
          />
          <span className={styles.storeTotal}>{count}</span>
        </div>
      ) : (
        <div className={`${styles.storeSurface} ${styles.storeSurfaceHidden}`}>
          <span className={styles.storeLabel}>{label}</span>
          <span className={styles.storeCountOnly}>{count}</span>
        </div>
      )}
    </div>
  )
}
