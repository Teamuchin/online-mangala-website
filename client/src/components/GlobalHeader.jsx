import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { isGuestUser } from '../app/appState.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import { getFriendsRequest, acceptFriendRequest, rejectFriendRequest } from '../app/friendsApi.js'
import styles from './GlobalHeader.module.css'

export default function GlobalHeader() {
  const location = useLocation()
  const {
    activeMatchSummary,
    assets,
    brandName,
    currentUser,
    isAuthenticated,
    logOut,
  } = useAppData()
  const { settingsContent, language, setLanguage, t } = useGlobalHeader()
  const showAccountSettings = isAuthenticated && !isGuestUser(currentUser)
  const isOnGamePage = location.pathname.startsWith('/game/')
  const showBackToGame = activeMatchSummary?.isActive && !isOnGamePage
  const profileHref = `/member/${encodeURIComponent(currentUser.username)}`

  const [requests, setRequests] = useState([])
  
  useEffect(() => {
    let isCancelled = false
    const token = typeof window === 'undefined' ? '' : (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')) ?? ''
    
    if (!token || !isAuthenticated || isGuestUser(currentUser)) {
      return undefined
    }

    const loadRequests = async () => {
      try {
        const data = await getFriendsRequest(token)
        if (isCancelled) return
        const pending = data.filter(f => f.status === 'pending' && String(f.addressee_id) === String(currentUser.id))
        setRequests(pending)
      } catch (error) {
        if (!isCancelled) {
          console.error('Load friend requests error:', error)
        }
      }
    }

    void loadRequests()
    const intervalId = window.setInterval(loadRequests, 10000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated, currentUser])

  const handleAcceptRequest = async (username) => {
    const token = typeof window === 'undefined' ? '' : (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')) ?? ''
    if (!token) return
    try {
      await acceptFriendRequest(token, username)
      setRequests(prev => prev.filter(r => r.username !== username))
    } catch (error) {
      console.error('Accept friend request error:', error)
    }
  }

  const handleRejectRequest = async (username) => {
    const token = typeof window === 'undefined' ? '' : (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')) ?? ''
    if (!token) return
    try {
      await rejectFriendRequest(token, username)
      setRequests(prev => prev.filter(r => r.username !== username))
    } catch (error) {
      console.error('Reject friend request error:', error)
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.leftCluster}>
          <Link to="/" className={styles.brand} aria-label={t('header.goHome')}>
            <img src={assets.logo} alt={brandName} className={styles.logo} />
            <span className={styles.brandText}>MangalaOyna</span>
          </Link>

          {showBackToGame ? (
            <Link to={activeMatchSummary.url} className={styles.backToGameLink}>
              <span className={styles.liveDot} aria-hidden="true" />
              <span className={styles.actionText}>{t('header.backToGame')}</span>
            </Link>
          ) : null}
        </div>

        <nav className={styles.actions} aria-label="Global navigation">
          {isAuthenticated && !isGuestUser(currentUser) ? (
            <Link
              to={profileHref}
              className={styles.actionLink}
              aria-label={t('header.openProfile')}
              onClick={(event) => event.currentTarget.blur()}
            >
              <span className={styles.actionIcon} aria-hidden="true">◎</span>
              <span className={styles.actionText}>{currentUser.username}</span>
            </Link>
          ) : (
            <Link to="/login" className={styles.actionLink}>
              <span className={styles.actionIcon} aria-hidden="true">◎</span>
              <span className={styles.actionText}>{t('header.account')}</span>
            </Link>
          )}

          {isAuthenticated && !isGuestUser(currentUser) && (
            <div className={styles.menu}>
              <button type="button" className={styles.actionButton} aria-label={t('header.notifications')} style={{ position: 'relative' }}>
                <span className={styles.actionIcon} aria-hidden="true">🔔</span>
                <span className={styles.actionText}>{t('header.notifications')}</span>
                {requests.length > 0 && (
                  <span className={styles.notificationBadge}>{requests.length}</span>
                )}
              </button>
              <div className={styles.panel}>
                {requests.length === 0 ? (
                  <div className={styles.panelLink} style={{ cursor: 'default' }}>{t('header.noNewNotifications')}</div>
                ) : (
                  requests.map(req => (
                    <div key={req.friendship_id} className={styles.requestItem}>
                      <span className={styles.requestInfo}><strong>{req.username}</strong> {t('header.wantsToBeFriends')}</span>
                      <div className={styles.requestActions}>
                        <button type="button" className={styles.acceptButton} onClick={() => handleAcceptRequest(req.username)}>{t('header.accept')}</button>
                        <button type="button" className={styles.rejectButton} onClick={() => handleRejectRequest(req.username)}>{t('header.reject')}</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className={styles.menu}>
            <button type="button" className={styles.actionButton} aria-label={t('header.language')}>
              <span className={styles.actionIcon} aria-hidden="true">
                A
              </span>
              <span className={styles.actionText}>{t('header.language')}</span>
            </button>
            <div className={styles.panel}>
              <button
                type="button"
                className={styles.panelButton}
                onClick={() => setLanguage('en')}
                disabled={language === 'en'}
              >
                {t('header.english')}
              </button>
              <button
                type="button"
                className={styles.panelButton}
                onClick={() => setLanguage('tr')}
                disabled={language === 'tr'}
              >
                {t('header.turkish')}
              </button>
            </div>
          </div>

          <div className={styles.menu}>
            <button type="button" className={styles.actionButton} aria-label={t('header.settings')}>
              <span className={styles.actionIcon} aria-hidden="true">⚙</span>
              <span className={styles.actionText}>{t('header.settings')}</span>
            </button>
            <div className={styles.panel}>
              {showAccountSettings ? (
                <Link to="/account" className={styles.panelLink}>
                  {t('header.accountSettings')}
                </Link>
              ) : null}
              {isAuthenticated ? (
                <Link to="/login" className={styles.panelLink} onClick={logOut}>
                  {t('header.logOut')}
                </Link>
              ) : null}
              {settingsContent}
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
