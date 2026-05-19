import styles from './MangalaGame.module.css'

export default function ReplayControls({
  activePositionIndex,
  totalMoves,
  description,
  hasMoves,
  isReviewing,
  matchTypeLabel = null,
  showReset = false,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  onReset,
  resetDisabled = false,
  resetLabel = 'Start rematch',
}) {
  return (
    <section className={styles.replayPanel}>
      <div className={styles.replayToolbar}>
        <button
          type="button"
          className={styles.replayIconButton}
          onClick={onFirst}
          disabled={!hasMoves || activePositionIndex === 0}
        >
          |&lt;
        </button>
        <button
          type="button"
          className={styles.replayIconButton}
          onClick={onPrevious}
          disabled={!hasMoves || activePositionIndex === 0}
        >
          &lt;
        </button>
        {showReset && (
          <button
            type="button"
            className={styles.replayIconButton}
            onClick={onReset}
            aria-label={resetLabel}
            title={resetLabel}
            disabled={resetDisabled}
          >
            ↻
          </button>
        )}
        <button
          type="button"
          className={styles.replayIconButton}
          onClick={onNext}
          disabled={!hasMoves || !isReviewing}
        >
          &gt;
        </button>
        <button
          type="button"
          className={styles.replayIconButton}
          onClick={onLast}
          disabled={!hasMoves || !isReviewing}
        >
          &gt;|
        </button>
      </div>

      <div className={styles.replayStatusRow}>
        <div className={styles.replayStatusMeta}>
          <span className={styles.replayMoveLabel}>
            {activePositionIndex === 0 ? 'Start' : `Move ${activePositionIndex} / ${totalMoves}`}
          </span>
          {matchTypeLabel && (
            <span className={styles.replayMatchTypeBadge}>{matchTypeLabel}</span>
          )}
        </div>
      </div>

      <p className={styles.replayDescription}>{description}</p>
    </section>
  )
}
