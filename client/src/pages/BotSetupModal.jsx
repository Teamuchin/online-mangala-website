import styles from './BotSetupModal.module.css'

const DIFFICULTY_OPTIONS = ['1', '2', '3', '4']
const FIRST_MOVE_OPTIONS = [
  { value: 'you', label: 'You', icon: '◉' },
  { value: 'computer', label: 'Computer', icon: '⌘' },
  { value: 'random', label: 'Random', icon: '⚄' },
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
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close setup"
          >
            ×
          </button>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Difficulty</span>
          <div className={styles.segmentedControl} role="group" aria-label="Difficulty">
            {DIFFICULTY_OPTIONS.map((option, index) => (
              <button
                key={option}
                type="button"
                className={`${styles.optionButton} ${
                  difficulty === option ? styles.optionButtonActive : ''
                } ${index === 0 ? styles.segmentStart : ''} ${
                  index === DIFFICULTY_OPTIONS.length - 1 ? styles.segmentEnd : ''
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
          <div className={styles.segmentedControl} role="group" aria-label="First move">
            {FIRST_MOVE_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.optionButton} ${
                  firstMove === option.value ? styles.optionButtonActive : ''
                } ${index === 0 ? styles.segmentStart : ''} ${
                  index === FIRST_MOVE_OPTIONS.length - 1 ? styles.segmentEnd : ''
                }`}
                onClick={() => onFirstMoveChange(option.value)}
              >
                <span className={styles.optionIcon} aria-hidden="true">
                  {option.icon}
                </span>
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
