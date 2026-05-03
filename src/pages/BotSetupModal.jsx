import styles from './BotSetupModal.module.css'

const DIFFICULTY_OPTIONS = ['1', '2', '3', '4']
const FIRST_MOVE_OPTIONS = [
  { value: 'you', label: 'You' },
  { value: 'computer', label: 'Computer' },
  { value: 'random', label: 'Random' },
]

export default function BotSetupModal({
  difficulty,
  firstMove,
  onClose,
  onDifficultyChange,
  onFirstMoveChange,
  onStart,
}) {
  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bot-setup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Game Setup</p>
            <h2 id="bot-setup-title">Play Against Computer</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Difficulty</span>
          <div className={styles.optionRow}>
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.optionButton} ${
                  difficulty === option ? styles.optionButtonActive : ''
                }`}
                onClick={() => onDifficultyChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>First Move</span>
          <div className={styles.optionRow}>
            {FIRST_MOVE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.optionButton} ${
                  firstMove === option.value ? styles.optionButtonActive : ''
                }`}
                onClick={() => onFirstMoveChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={styles.startButton} onClick={onStart}>
          Start
        </button>
      </section>
    </div>
  )
}
