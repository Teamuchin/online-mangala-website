import styles from './PlayQueueModal.module.css'

function formatQueueTime(elapsedMs) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function PlayQueueModal({
  allowBots,
  elapsedMs,
  isQueueing,
  onAllowBotsChange,
  onClose,
  onRatedChange,
  onStart,
  queueStatusText,
  rated,
}) {
  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="play-queue-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{isQueueing ? 'Matchmaking' : 'Game Setup'}</p>
            <h2 id="play-queue-title">{isQueueing ? 'Searching for a game' : 'Play'}</h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={isQueueing ? 'Cancel search' : 'Close play setup'}
          >
            ×
          </button>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Mode</span>
          <div className={styles.segmentedControl} role="group" aria-label="Match mode">
            <button
              type="button"
              className={`${styles.optionButton} ${
                rated ? styles.optionButtonActive : ''
              } ${styles.segmentStart}`}
              onClick={() => onRatedChange(true)}
              disabled={isQueueing}
            >
              Rated
            </button>
            <button
              type="button"
              className={`${styles.optionButton} ${
                !rated ? styles.optionButtonActive : ''
              } ${styles.segmentEnd}`}
              onClick={() => onRatedChange(false)}
              disabled={isQueueing}
            >
              Unrated
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Opponents</span>
          <div className={styles.segmentedControl} role="group" aria-label="Allow bots">
            <button
              type="button"
              className={`${styles.optionButton} ${
                allowBots ? styles.optionButtonActive : ''
              } ${styles.segmentStart}`}
              onClick={() => onAllowBotsChange(true)}
              disabled={isQueueing}
            >
              Allow Bots
            </button>
            <button
              type="button"
              className={`${styles.optionButton} ${
                !allowBots ? styles.optionButtonActive : ''
              } ${styles.segmentEnd}`}
              onClick={() => onAllowBotsChange(false)}
              disabled={isQueueing}
            >
              Humans Only
            </button>
          </div>
        </div>

        {isQueueing ? (
          <div className={styles.queueState}>
            <p className={styles.queueStatus}>{queueStatusText}</p>
            <p className={styles.queueHint}>
              {allowBots ? 'Bots allowed' : 'Human opponents only'}
            </p>
            <div className={styles.queueTimer}>{formatQueueTime(elapsedMs)}</div>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className={styles.startButton} onClick={onStart}>
            Start Search
          </button>
        )}
      </section>
    </div>
  )
}
