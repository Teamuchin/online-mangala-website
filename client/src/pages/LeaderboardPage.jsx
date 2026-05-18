import { Link, useSearchParams } from 'react-router-dom'
import { buildLeaderboardProfiles, getLeaderboardPageCount, getVisibleLeaderboardPages, LEADERBOARD_PAGE_SIZE } from '../app/leaderboard.js'
import { getDisplayName } from '../app/playerNames.js'
import { useAppData } from '../app/useAppData.js'
import styles from './LeaderboardPage.module.css'

export default function LeaderboardPage() {
  const [searchParams] = useSearchParams()
  const { currentUser, isAuthenticated, publicProfileDirectory } = useAppData()

  const leaderboard = buildLeaderboardProfiles(
    currentUser,
    publicProfileDirectory,
    isAuthenticated,
  )
  const pageCount = getLeaderboardPageCount(leaderboard.length)
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const currentPage = Number.isNaN(rawPage)
    ? 1
    : Math.min(Math.max(rawPage, 1), pageCount)
  const pageStart = (currentPage - 1) * LEADERBOARD_PAGE_SIZE
  const visiblePages = getVisibleLeaderboardPages(currentPage, pageCount)
  const pagedPlayers = leaderboard.slice(pageStart, pageStart + LEADERBOARD_PAGE_SIZE)

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Competition</p>
            <h1>Leaderboard ({leaderboard.length})</h1>
          </div>
          <Link to="/" className={styles.backLink}>
            Back to Lobby
          </Link>
        </header>

        <section className={styles.leaderboardCard}>
          <div className={styles.tableWrap}>
            <table className={styles.leaderboardTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Rating</th>
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
                            {player.isBot && <span className={styles.botBadge}>AI</span>}
                          </span>
                        </Link>
                      </td>
                      <td>{player.elo ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className={styles.emptyCell}>
                      No players yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {leaderboard.length > LEADERBOARD_PAGE_SIZE && (
            <nav className={styles.pagination} aria-label="Leaderboard pages">
              <Link
                to={`/leaderboard?page=${Math.max(1, currentPage - 1)}`}
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
                Next
              </Link>
            </nav>
          )}
        </section>
      </section>
    </main>
  )
}
