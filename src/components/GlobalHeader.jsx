import { Link } from 'react-router-dom'
import { isGuestUser } from '../app/appState.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import styles from './GlobalHeader.module.css'

export default function GlobalHeader() {
  const {
    activeMatchSummary,
    assets,
    brandName,
    currentUser,
    isAuthenticated,
    logOut,
  } = useAppData()
  const { settingsContent } = useGlobalHeader()
  const showProfilePanel = isAuthenticated && !isGuestUser(currentUser)

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand} aria-label="Go home">
          <img src={assets.logo} alt={brandName} className={styles.logo} />
        </a>

        <nav className={styles.actions} aria-label="Global navigation">
          {activeMatchSummary?.isActive && (
            <Link to={activeMatchSummary.url} className={styles.backToGameLink}>
              <span className={styles.liveDot} aria-hidden="true" />
              <span className={styles.actionText}>Back to Game</span>
            </Link>
          )}

          {showProfilePanel ? (
            <div className={styles.menu}>
              <a
                href="/account"
                className={styles.actionLink}
                aria-label="Open account settings"
                onClick={(event) => event.currentTarget.blur()}
              >
                <span className={styles.actionIcon} aria-hidden="true">
                  ◎
                </span>
                <span className={styles.actionText}>{currentUser.username}</span>
              </a>
              <div className={`${styles.panel} ${styles.profilePanel}`}>
                <img
                  src={currentUser.profilePicture || assets.profilePicturePlaceholder}
                  alt={`${currentUser.username} profile`}
                  className={styles.profileImage}
                />
                <h3 className={styles.profileName}>{currentUser.username}</h3>
                <p className={styles.profileElo}>ELO: {currentUser.elo ?? 'N/A'}</p>
                <p className={styles.profileBio}>{currentUser.bio || 'No bio yet.'}</p>
                <Link to="/login" className={styles.panelLink} onClick={logOut}>
                  Log out
                </Link>
              </div>
            </div>
          ) : (
            <a href="/login" className={styles.actionLink}>
              <span className={styles.actionIcon} aria-hidden="true">
                ◎
              </span>
              <span className={styles.actionText}>Account</span>
            </a>
          )}

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
            <div className={styles.panel}>{settingsContent}</div>
          </div>
        </nav>
      </div>
    </header>
  )
}
