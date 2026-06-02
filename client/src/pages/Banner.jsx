import styles from './Banner.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'

export default function Banner() {
  const navigate = useNavigate()
  const { t } = useGlobalHeader()
  const {
    bannerActions,
    bannerSloganLines,
    continueAsGuest,
    isAuthenticated,
  } = useAppData()

  const visibleActions = isAuthenticated
    ? [{ to: '/', className: 'loginbtn', label: t('banner.goHome') }]
    : bannerActions

  const handleGuestStart = () => {
    continueAsGuest()
    navigate('/')
  }

  const getActionLabel = (action) => {
    if (action.label === 'Play as Guest') {
      return t('auth.playAsGuest')
    }

    if (action.label === 'Log in') {
      return t('auth.logIn')
    }

    if (action.label === 'Sign up') {
      return t('auth.signUp')
    }

    if (action.label === 'Play') {
      return t('banner.play')
    }

    if (action.label === 'Learn') {
      return t('banner.learn')
    }

    if (action.label === 'About') {
      return t('banner.about')
    }

    if (action.label === 'Go Home') {
      return t('banner.goHome')
    }

    return action.label
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
            action.label === 'Play as Guest' || action.label === t('banner.playAsGuest') ? (
              <button
                key={action.label}
                type="button"
                className={styles[action.className]}
                onClick={handleGuestStart}
              >
                {t('auth.playAsGuest')}
              </button>
            ) : (
              <Link key={action.label} to={action.to} className={styles[action.className]}>
                {getActionLabel(action)}
              </Link>
            ),
          )}
        </div>
        <section className={styles.learnRules}>
          <h2>{t('banner.rules')}</h2>
          <div className={styles.rulesList}>
            {[1, 2, 3, 4, 5].map((ruleIndex) => (
              <p key={ruleIndex}>{t(`banner.rule${ruleIndex}`)}</p>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
