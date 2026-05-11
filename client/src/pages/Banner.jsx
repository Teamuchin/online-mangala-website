import styles from './Banner.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'
import { RULES } from '../components/mangala/constants.js'

export default function Banner() {
  const navigate = useNavigate()
  const {
    bannerActions,
    bannerSloganLines,
    continueAsGuest,
    isAuthenticated,
  } = useAppData()

  const visibleActions = isAuthenticated
    ? [{ to: '/', className: 'loginbtn', label: 'Go Home' }]
    : bannerActions

  const handleGuestStart = () => {
    continueAsGuest()
    navigate('/')
  }

  return (
    <div className={styles.banner}>
      <div className={styles.bannerbody}>
        <div className={styles.bodyslogan}>
          {bannerSloganLines.map((line) => (
            <h1
              key={`${line.accent}-${line.text}`}
              className={line.className ? styles[line.className] : undefined}
            >
              <span className={styles.accentWord}>{line.accent}</span> {line.text}
            </h1>
          ))}
        </div>
        <div className={styles.bodybuttons}>
          {visibleActions.map((action) =>
            action.label === 'Play as Guest' ? (
              <button
                key={action.label}
                type="button"
                className={styles[action.className]}
                onClick={handleGuestStart}
              >
                {action.label}
              </button>
            ) : (
              <Link key={action.label} to={action.to} className={styles[action.className]}>
                {action.label}
              </Link>
            ),
          )}
        </div>
        <section className={styles.learnRules}>
          <h2>Rules</h2>
          <div className={styles.rulesList}>
            {RULES.map((rule) => (
              <p key={rule}>{rule}</p>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
