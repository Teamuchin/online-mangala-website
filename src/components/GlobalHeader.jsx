import { Link } from 'react-router-dom'
import { isGuestUser } from '../app/appState.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import styles from './GlobalHeader.module.css'

export default function GlobalHeader() {
  const { assets, brandName, currentUser, isAuthenticated, logOut } = useAppData()
  const { settingsContent } = useGlobalHeader()
  const accountTarget =
    isAuthenticated && !isGuestUser(currentUser) ? '/account' : '/login'

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="Go home">
          <img src={assets.logo} alt={brandName} className={styles.logo} />
        </Link>

        <nav className={styles.actions} aria-label="Global navigation">
          <Link to={accountTarget} className={styles.actionLink}>
            <span className={styles.actionIcon} aria-hidden="true">
              ◎
            </span>
            <span className={styles.actionText}>
              {isAuthenticated ? currentUser.username : 'Account'}
            </span>
          </Link>

          <div className={styles.menu}>
            <button type="button" className={styles.actionButton} aria-label="Language">
              <span className={styles.actionIcon} aria-hidden="true">
                A
              </span>
              <span className={styles.actionText}>Language</span>
            </button>
            <div className={styles.panel}>
              <button type="button" className={styles.panelButton}>
                English
              </button>
              <button type="button" className={styles.panelButton}>
                Turkce
              </button>
            </div>
          </div>

          <div className={styles.menu}>
            <button type="button" className={styles.actionButton} aria-label="Settings">
              <span className={styles.actionIcon} aria-hidden="true">
                ⚙
              </span>
              <span className={styles.actionText}>Settings</span>
            </button>
            <div className={styles.panel}>
              {settingsContent}
              <Link to="/learn" className={styles.panelLink}>
                Learn
              </Link>
              {isAuthenticated && (
                <Link to="/login" className={styles.panelLink} onClick={logOut}>
                  Log out
                </Link>
              )}
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
