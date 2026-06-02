import { useGlobalHeader } from '../app/useGlobalHeader.js'
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
  const { t } = useGlobalHeader()

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
            <p className={styles.eyebrow}>
              {isQueueing ? t('playModal.matchmaking') : t('playModal.gameSetup')}
            </p>
            <h2 id="play-queue-title">
              {isQueueing ? t('playModal.searchingForGame') : t('playModal.play')}
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={isQueueing ? t('playModal.cancelSearch') : t('playModal.closePlaySetup')}
          >
            ×
          </button>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>{t('playModal.mode')}</span>
          <div className={styles.segmentedControl} role="group" aria-label={t('playModal.matchMode')}>
            <button
              type="button"
              className={`${styles.optionButton} ${
                rated ? styles.optionButtonActive : ''
              } ${styles.segmentStart}`}
              onClick={() => onRatedChange(true)}
              disabled={isQueueing}
            >
              {t('common.rated')}
            </button>
            <button
              type="button"
              className={`${styles.optionButton} ${
                !rated ? styles.optionButtonActive : ''
              } ${styles.segmentEnd}`}
              onClick={() => onRatedChange(false)}
              disabled={isQueueing}
            >
              {t('common.unrated')}
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>{t('playModal.opponents')}</span>
          <div className={styles.segmentedControl} role="group" aria-label={t('playModal.opponents')}>
            <button
              type="button"
              className={`${styles.optionButton} ${
                allowBots ? styles.optionButtonActive : ''
              } ${styles.segmentStart}`}
              onClick={() => onAllowBotsChange(true)}
              disabled={isQueueing}
            >
              {t('playModal.allowBots')}
            </button>
            <button
              type="button"
              className={`${styles.optionButton} ${
                !allowBots ? styles.optionButtonActive : ''
              } ${styles.segmentEnd}`}
              onClick={() => onAllowBotsChange(false)}
              disabled={isQueueing}
            >
              {t('playModal.humansOnly')}
            </button>
          </div>
        </div>

        {isQueueing ? (
          <div className={styles.queueState}>
            <p className={styles.queueStatus}>{queueStatusText}</p>
            <p className={styles.queueHint}>
              {allowBots ? t('playModal.botsAllowed') : t('playModal.humanOpponentsOnly')}
            </p>
            <div className={styles.queueTimer}>{formatQueueTime(elapsedMs)}</div>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <button type="button" className={styles.startButton} onClick={onStart}>
            {t('playModal.startSearch')}
          </button>
        )}
      </section>
    </div>
  )
}
