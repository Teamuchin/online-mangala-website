import styles from './MangalaGame.module.css'

export default function ReplayControls({
  activePositionIndex,
  totalMoves,
  description,
  hasMoves,
  isReviewing,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  onReset,
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
        <button
          type="button"
          className={styles.replayIconButton}
          onClick={onReset}
          aria-label="Restart match"
          title="Restart match"
        >
          ↻
        </button>
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
        <span className={styles.replayMoveLabel}>
          {activePositionIndex === 0 ? 'Start' : `Move ${activePositionIndex} / ${totalMoves}`}
        </span>
      </div>

      <p className={styles.replayDescription}>{description}</p>
    </section>
  )
}
