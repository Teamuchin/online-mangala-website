import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { isGuestUser } from '../app/appState.js'
import { useAppData } from '../app/useAppData.js'
import { readStoredMatchSessionByGameId } from '../components/mangala/gamePersistence.js'
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

  if (
    typeof match.ratingAfter === 'number' &&
    typeof match.ratingDelta === 'number'
  ) {
    return match.ratingAfter - match.ratingDelta
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

function formatDateLabel(value) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function buildLiveMatchEntry(activeMatchSummary, currentUser) {
  if (!activeMatchSummary?.isActive) {
    return null
  }

  const session = readStoredMatchSessionByGameId(activeMatchSummary.gameId)

  if (!session?.game?.players) {
    return null
  }

  const { bottom, top } = session.game.players
  const player = currentUser.id === bottom?.id ? bottom : currentUser.id === top?.id ? top : null
  const opponent = player?.id === bottom?.id ? top : bottom

  if (!player || !opponent) {
    return null
  }

  return {
    id: activeMatchSummary.gameId,
    playedAt: new Date(session.game.lastTimerStartedAt ?? Date.now()).toISOString(),
    opponent: opponent.name,
    playerRating: player.rating,
    opponentRating: opponent.rating,
    result: 'Live',
    ratingDelta: null,
    opponentRatingDelta: null,
    isLive: true,
  }
}

function resolveProfile(publicProfileDirectory, currentUser, username) {
  if (currentUser.username === username) {
    return currentUser
  }

  return (
    publicProfileDirectory.find((profile) => profile.username === username) ?? null
  )
}

export default function ProfileGamesPage() {
  const { username } = useParams()
  const [searchParams] = useSearchParams()
  const {
    activeMatchSummary,
    currentUser,
    isAuthenticated,
    publicProfileDirectory,
  } = useAppData()

  const canonicalUsername = currentUser.username
  const canonicalProfilePath = `/member/${encodeURIComponent(canonicalUsername)}`
  const canonicalGamesPath = `${canonicalProfilePath}/games`

  if (!username) {
    return isAuthenticated
      ? <Navigate to={canonicalGamesPath} replace />
      : (
        <main className={styles.page}>
          <section className={styles.shell}>
            <section className={styles.missingCard}>
              <h1>No such player</h1>
              <p>This username doesn&apos;t match any player.</p>
            </section>
          </section>
        </main>
      )
  }

  const profile = resolveProfile(publicProfileDirectory, currentUser, username)

  if (!profile || (isGuestUser(currentUser) && username === currentUser.username)) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <section className={styles.missingCard}>
            <h1>No such player</h1>
            <p>This username doesn&apos;t match any player.</p>
          </section>
        </section>
      </main>
    )
  }

  const liveMatch = buildLiveMatchEntry(activeMatchSummary, currentUser)
  const allMatches = liveMatch
    && profile.id === currentUser.id
      ? [liveMatch, ...(profile.matchHistory ?? []).filter((match) => match.id !== liveMatch.id)]
      : profile.matchHistory ?? []
  const pageCount = getPageCount(allMatches.length)
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const currentPage = Number.isNaN(rawPage)
    ? 1
    : Math.min(Math.max(rawPage, 1), pageCount)
  const pageStart = (currentPage - 1) * MATCHES_PER_PAGE
  const pagedMatches = allMatches.slice(pageStart, pageStart + MATCHES_PER_PAGE)
  const visiblePages = getVisiblePages(currentPage, pageCount)

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Profile</p>
            <h1>Match History ({allMatches.length})</h1>
          </div>
          <Link to={canonicalProfilePath} className={styles.backLink}>
            Back to Overview
          </Link>
        </header>

        <section className={styles.historyCard}>
          <div className={styles.tableWrap}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Rating</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {pagedMatches.length > 0 ? (
                  pagedMatches.map((match) => (
                    <tr key={match.id}>
                      <td>
                        <div className={styles.opponentCell}>
                          <Link to={`/game/${match.id}`} className={styles.matchLink}>
                            {match.opponent}
                          </Link>
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
                          {match.result}
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
                      <td>{formatDateLabel(match.playedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className={styles.emptyCell}>
                      No matches saved yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {allMatches.length > MATCHES_PER_PAGE && (
            <nav className={styles.pagination} aria-label="Match history pages">
              <Link
                to={`${canonicalGamesPath}?page=${Math.max(1, currentPage - 1)}`}
                className={`${styles.pageButton} ${
                  currentPage === 1 ? styles.pageButtonDisabled : ''
                }`}
                aria-disabled={currentPage === 1}
              >
                Prev
              </Link>
              {visiblePages.map((pageNumber) => (
                <Link
                  key={pageNumber}
                  to={`${canonicalGamesPath}?page=${pageNumber}`}
                  className={`${styles.pageButton} ${
                    pageNumber === currentPage ? styles.pageButtonActive : ''
                  }`}
                >
                  {pageNumber}
                </Link>
              ))}
              <Link
                to={`${canonicalGamesPath}?page=${Math.min(pageCount, currentPage + 1)}`}
                className={`${styles.pageButton} ${
                  currentPage === pageCount ? styles.pageButtonDisabled : ''
                }`}
                aria-disabled={currentPage === pageCount}
              >
                Next
              </Link>
            </nav>
          )}
        </section>
      </section>
    </main>
  )
}
