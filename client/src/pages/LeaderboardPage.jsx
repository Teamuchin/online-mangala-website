import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getLeaderboardPageCount,
  getVisibleLeaderboardPages,
  LEADERBOARD_PAGE_SIZE,
} from '../app/leaderboard.js'
import { getDisplayName } from '../app/playerNames.js'
import { buildProfileFromBackendUser } from '../app/profileData.js'
import { getLeaderboardUsersRequest } from '../app/userApi.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import styles from './LeaderboardPage.module.css'

export default function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentUser } = useAppData()
  const { t } = useGlobalHeader()
  const [leaderboardUsers, setLeaderboardUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let isCancelled = false

    const loadLeaderboard = async () => {
      setIsLoading(true)
      setLoadError('')

      try {
        const users = await getLeaderboardUsersRequest()

        if (isCancelled) {
          return
        }

        setLeaderboardUsers(users.map((user) => buildProfileFromBackendUser(user)))
      } catch (error) {
        if (isCancelled) {
          return
        }

        setLeaderboardUsers([])
        setLoadError(error.message || t('leaderboard.loadFailed'))
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadLeaderboard()

    return () => {
      isCancelled = true
    }
  }, [t])

  const leaderboard = useMemo(() => {
    let mapped = leaderboardUsers.map((user) =>
      String(user.id) === String(currentUser.id)
        ? {
            ...user,
            username: currentUser.username,
          }
        : user,
    )

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.trim().toLowerCase()
      mapped = mapped.filter((u) => u.username.toLowerCase().includes(lowerQuery))
    }

    return mapped
  }, [currentUser.id, currentUser.username, leaderboardUsers, searchQuery])
  const pageCount = getLeaderboardPageCount(leaderboard.length)
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const currentPage = Number.isNaN(rawPage)
    ? 1
    : Math.min(Math.max(rawPage, 1), pageCount)
  const pageStart = (currentPage - 1) * LEADERBOARD_PAGE_SIZE
  const visiblePages = getVisibleLeaderboardPages(currentPage, pageCount)
  const pagedPlayers = leaderboard.slice(pageStart, pageStart + LEADERBOARD_PAGE_SIZE)

  if (isLoading && leaderboard.length === 0) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>{t('leaderboard.competition')}</p>
              <h1>{t('leaderboard.title')}</h1>
            </div>
            <Link to="/" className={styles.backLink}>
              {t('leaderboard.backToLobby')}
            </Link>
          </header>
          <section className={styles.leaderboardCard}>
            <div className={styles.emptyCell}>{t('leaderboard.loading')}</div>
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>{t('leaderboard.competition')}</p>
            <h1>{t('leaderboard.title')} ({leaderboard.length})</h1>
          </div>
          <div className={styles.headerRight}>
            <input 
              type="text" 
              placeholder={t('leaderboard.searchUsers')} 
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (searchParams.get('page') && searchParams.get('page') !== '1') {
                  setSearchParams({ page: '1' })
                }
              }}
            />
            <Link to="/" className={styles.backLink}>
              {t('leaderboard.backToLobby')}
            </Link>
          </div>
        </header>

        <section className={styles.leaderboardCard}>
          <div className={styles.tableWrap}>
            <table className={styles.leaderboardTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('home.player')}</th>
                  <th>{t('profile.rating')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedPlayers.length > 0 ? (
                  pagedPlayers.map((player, index) => (
                    <tr key={player.id}>
                      <td>{pageStart + index + 1}</td>
                      <td>
                        <Link
                          to={`/member/${encodeURIComponent(player.username)}`}
                          className={styles.playerLink}
                        >
                          <span className={styles.playerNameCell}>
                            <span>{getDisplayName(player)}</span>
                            {player.isBot && <span className={styles.botBadge}>{t('profile.ai')}</span>}
                          </span>
                        </Link>
                      </td>
                      <td>{player.elo ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className={styles.emptyCell}>
                      {loadError || t('leaderboard.noPlayers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {leaderboard.length > LEADERBOARD_PAGE_SIZE && (
            <nav className={styles.pagination} aria-label={t('leaderboard.pages')}>
              <Link
                to={`/leaderboard?page=${Math.max(1, currentPage - 1)}`}
                className={`${styles.pageButton} ${
                  currentPage === 1 ? styles.pageButtonDisabled : ''
                }`}
                aria-disabled={currentPage === 1}
              >
                {t('leaderboard.prev')}
              </Link>
              {visiblePages.map((pageNumber) => (
                <Link
                  key={pageNumber}
                  to={`/leaderboard?page=${pageNumber}`}
                  className={`${styles.pageButton} ${
                    pageNumber === currentPage ? styles.pageButtonActive : ''
                  }`}
                >
                  {pageNumber}
                </Link>
              ))}
              <Link
                to={`/leaderboard?page=${Math.min(pageCount, currentPage + 1)}`}
                className={`${styles.pageButton} ${
                  currentPage === pageCount ? styles.pageButtonDisabled : ''
                }`}
                aria-disabled={currentPage === pageCount}
              >
                {t('leaderboard.next')}
              </Link>
            </nav>
          )}
        </section>
      </section>
    </main>
  )
}
