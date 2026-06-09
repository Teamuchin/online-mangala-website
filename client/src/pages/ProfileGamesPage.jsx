import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { isGuestUser } from '../app/appState.js'
import { getMatchesByUserIdRequest } from '../app/matchApi.js'
import { getDisplayName } from '../app/playerNames.js'
import {
  buildHistoryEntryFromBackendMatch,
  buildProfileFromBackendUser,
  getMatchResultLabel,
} from '../app/profileData.js'
import { getUserByUsernameRequest } from '../app/userApi.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import styles from './ProfileGamesPage.module.css'

const MATCHES_PER_PAGE = 10

function formatRatingDelta(value) {
  return `${value > 0 ? '+' : ''}${value}`
}

function getResultClassName(styles, result) {
  if (result === 'Win') {
    return styles.resultWin
  }

  if (result === 'Loss') {
    return styles.resultLoss
  }

  if (result === 'Draw') {
    return styles.resultDraw
  }

  if (result === 'Live') {
    return styles.resultLive
  }

  return ''
}

function getPlayerHistoryRating(match) {
  if (typeof match.playerRating === 'number') {
    return match.playerRating
  }

  return '-'
}

function getPageCount(totalItems) {
  return Math.max(1, Math.ceil(totalItems / MATCHES_PER_PAGE))
}

function getVisiblePages(currentPage, pageCount) {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5]
  }

  if (currentPage >= pageCount - 2) {
    return Array.from({ length: 5 }, (_, index) => pageCount - 4 + index)
  }

  return [
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
  ]
}

function formatDateLabel(value, locale) {
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function resolveProfile(publicProfileDirectory, currentUser, username) {
  if (currentUser.username === username) {
    return currentUser
  }

  return (
    publicProfileDirectory.find((profile) => profile.username === username) ?? null
  )
}

function resolveOpponentProfile(publicProfileDirectory, currentUser, opponentName) {
  if (currentUser.username === opponentName) {
    return currentUser
  }

  return (
    publicProfileDirectory.find((profile) => profile.username === opponentName) ?? null
  )
}

export default function ProfileGamesPage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    currentUser,
    isAuthenticated,
    publicProfileDirectory,
  } = useAppData()
  const { language, t } = useGlobalHeader()
  const [backendProfile, setBackendProfile] = useState(null)
  const [backendMatches, setBackendMatches] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const fallbackProfile = username
    ? resolveProfile(publicProfileDirectory, currentUser, username)
    : null
  const profile = backendProfile ?? fallbackProfile

  useEffect(() => {
    let isCancelled = false

    if (!username) {
      return undefined
    }

    const loadProfile = async () => {
      setIsLoading(true)
      setLoadError('')

      try {
        const user = await getUserByUsernameRequest(username)
        const nextProfile = buildProfileFromBackendUser(user)
        const matches = await getMatchesByUserIdRequest(user.id)

        if (isCancelled) {
          return
        }

        setBackendProfile(nextProfile)
        setBackendMatches(matches)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setBackendProfile(null)
        setBackendMatches([])
        setLoadError(error.message || t('profileGames.loadFailed'))
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isCancelled = true
    }
  }, [t, username])

  const allMatches = useMemo(() => {
    if (!profile) {
      return []
    }

    return backendMatches.map((match) => buildHistoryEntryFromBackendMatch(match, profile.id))
  }, [backendMatches, profile])

  if (!username) {
    return isAuthenticated
      ? <Navigate to={`/member/${encodeURIComponent(currentUser.username)}/games`} replace />
      : (
        <main className={styles.page}>
          <section className={styles.shell}>
            <section className={styles.missingCard}>
              <h1>{t('common.noSuchPlayer')}</h1>
              <p>{t('profile.noSuchPlayerDescription')}</p>
            </section>
          </section>
        </main>
      )
  }

  if (!profile || (isGuestUser(currentUser) && username === currentUser.username)) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <section className={styles.missingCard}>
            <h1>{t('common.noSuchPlayer')}</h1>
            <p>{t('profile.noSuchPlayerDescription')}</p>
          </section>
        </section>
      </main>
    )
  }

  const profileGamesPath = `/member/${encodeURIComponent(profile.username)}/games`
  const pageCount = getPageCount(allMatches.length)
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const currentPage = Number.isNaN(rawPage)
    ? 1
    : Math.min(Math.max(rawPage, 1), pageCount)
  const pageStart = (currentPage - 1) * MATCHES_PER_PAGE
  const pagedMatches = allMatches.slice(pageStart, pageStart + MATCHES_PER_PAGE)
  const visiblePages = getVisiblePages(currentPage, pageCount)

  if (isLoading && !profile) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <section className={styles.missingCard}>
            <h1>{t('profileGames.loading')}</h1>
            <p>{t('profileGames.fetching')}</p>
          </section>
        </section>
      </main>
    )
  }

  if (loadError && !profile) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <section className={styles.missingCard}>
            <h1>{t('common.noSuchPlayer')}</h1>
            <p>{loadError}</p>
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
            <p className={styles.kicker}>{t('header.account')}</p>
            <h1>{t('profileGames.title')} ({allMatches.length})</h1>
          </div>
          <Link to={`/member/${encodeURIComponent(profile.username)}`} className={styles.backLink}>
            {t('profileGames.backToOverview')}
          </Link>
        </header>

        <section className={styles.historyCard}>
          <div className={styles.tableWrap}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>{t('profile.opponent')}</th>
                  <th>{t('profile.result')}</th>
                  <th>{t('profile.score')}</th>
                  <th>{t('profileGames.date')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedMatches.length > 0 ? (
                  pagedMatches.map((match) => (
                    (() => {
                      const opponentProfile = resolveOpponentProfile(
                        publicProfileDirectory,
                        currentUser,
                        match.opponent,
                      )
                      const opponentRouteName = opponentProfile?.username ?? match.opponent
                      const opponentDisplayName = opponentProfile
                        ? getDisplayName(opponentProfile)
                        : match.opponent

                      return (
                        <tr
                          key={match.id}
                          className={styles.clickableHistoryRow}
                          onClick={() => navigate(`/game/${match.id}`)}
                        >
                          <td>
                            <div className={styles.opponentCell}>
                              <Link
                                to={`/member/${encodeURIComponent(opponentRouteName)}`}
                                className={styles.matchLink}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {opponentDisplayName}
                              </Link>
                              {opponentProfile?.isBot && (
                                <span className={styles.inlineBotBadge}>AI</span>
                              )}
                          {typeof match.opponentRating === 'number' && (
                            <span className={styles.opponentMeta}>
                              {match.opponentRating}
                              {typeof match.opponentRatingDelta === 'number' && !match.isLive && (
                                <span
                                  className={
                                    match.opponentRatingDelta >= 0
                                      ? styles.positiveChange
                                      : styles.negativeChange
                                  }
                                >
                                  {formatRatingDelta(match.opponentRatingDelta)}
                                </span>
                              )}
                            </span>
                          )}
                            </div>
                          </td>
                            <td>
                              <span className={getResultClassName(styles, match.result)}>
                                {getMatchResultLabel(match.result, t)}
                              </span>
                            </td>
                          <td>
                            <div className={styles.ratingCell}>
                              <span>{getPlayerHistoryRating(match)}</span>
                              {typeof match.ratingDelta === 'number' && !match.isLive && (
                                <span
                                  className={
                                    match.ratingDelta >= 0
                                      ? styles.positiveChange
                                      : styles.negativeChange
                                  }
                                >
                                  {formatRatingDelta(match.ratingDelta)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{formatDateLabel(match.playedAt, language === 'tr' ? 'tr-TR' : 'en-US')}</td>
                        </tr>
                      )
                    })()
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className={styles.emptyCell}>
                      {t('profile.noMatchesSaved')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {allMatches.length > MATCHES_PER_PAGE && (
            <nav className={styles.pagination} aria-label={t('profileGames.pages')}>
              <Link
                to={`${profileGamesPath}?page=${Math.max(1, currentPage - 1)}`}
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
                  to={`${profileGamesPath}?page=${pageNumber}`}
                  className={`${styles.pageButton} ${
                    pageNumber === currentPage ? styles.pageButtonActive : ''
                  }`}
                >
                  {pageNumber}
                </Link>
              ))}
              <Link
                to={`${profileGamesPath}?page=${Math.min(pageCount, currentPage + 1)}`}
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
