import styles from './Banner.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'

export default function Banner() {
  const navigate = useNavigate()
  const { t } = useGlobalHeader()
  const { continueAsGuest, isAuthenticated } = useAppData()

  const actionItems = isAuthenticated
    ? [{ key: 'home', to: '/', className: 'loginbtn', label: t('banner.goHome') }]
    : [
        { key: 'login', to: '/login', className: 'loginbtn', label: t('auth.logIn') },
        { key: 'signup', to: '/register', className: 'signupbtn', label: t('auth.signUp') },
        {
          key: 'guest',
          to: '/register',
          className: 'signupbtn',
          label: t('auth.playAsGuest'),
          isGuest: true,
        },
      ]

  const handleGuestStart = () => {
    continueAsGuest()
    navigate('/')
  }

  return (
    <div className={styles.banner}>
      <div className={styles.bannerbody}>
        <div className={styles.bodyslogan}>
          {[
            { accent: t('banner.slogan1Accent'), text: t('banner.slogan1Text') },
            { accent: t('banner.slogan2Accent'), text: t('banner.slogan2Text'), className: 'shiftedLine' },
            { accent: t('banner.slogan3Accent'), text: t('banner.slogan3Text') },
          ].map((line) => (
            <h1
              key={`${line.accent}-${line.text}`}
              className={line.className ? styles[line.className] : undefined}
            >
              <span className={styles.accentWord}>{line.accent}</span> {line.text}
            </h1>
          ))}
        </div>
        <div className={styles.bodybuttons}>
          {actionItems.map((action) =>
            action.isGuest ? (
              <button
                key={action.key}
                type="button"
                className={styles[action.className]}
                onClick={handleGuestStart}
              >
                {action.label}
              </button>
            ) : (
              <Link key={action.key} to={action.to} className={styles[action.className]}>
                {action.label}
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
