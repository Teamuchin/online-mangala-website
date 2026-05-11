import { Navigate, useParams } from 'react-router-dom'
import { isGuestUser } from '../app/appState.js'
import { useAppData } from '../app/useAppData.js'
import styles from './ProfilePage.module.css'

const EMPTY_MATCHES = []
const EMPTY_RATING_POINTS = []

export default function ProfilePage() {
  const { username } = useParams()
  const { currentUser, isAuthenticated } = useAppData()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isGuestUser(currentUser)) {
    return <Navigate to="/" replace />
  }

  const canonicalUsername = currentUser.username
  const canonicalProfilePath = `/member/${encodeURIComponent(canonicalUsername)}`

  if (!username) {
    return <Navigate to={canonicalProfilePath} replace />
  }

  if (username !== canonicalUsername) {
    return (
      <main className={styles.profilePage}>
        <section className={styles.profileShell}>
          <section className={styles.missingProfileCard}>
            <h1>No such player</h1>
            <p>This username doesn&apos;t match any player.</p>
          </section>
        </section>
      </main>
    )
  }

  const isOnline = isAuthenticated

  return (
    <main className={styles.profilePage}>
      <section className={styles.profileShell}>
        <header className={styles.profileHeader}>
          <div className={styles.identityBlock}>
            <div
              className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`}
              aria-hidden="true"
            />
            <div className={styles.identityText}>
              <h1>{currentUser.username}</h1>
              <div className={styles.metaRow}>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
                <span className={styles.metaDivider}>•</span>
                <span>Member since {currentUser.memberSince}</span>
              </div>
            </div>
          </div>
          <div className={styles.headerRating}>
            <span className={styles.sectionLabel}>Rating</span>
            <strong className={styles.headerRatingValue}>{currentUser.elo ?? '—'}</strong>
          </div>
        </header>

        <section className={styles.ratingSection}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={styles.sectionLabel}>Rating History</span>
            </div>
            <div className={styles.chartFrame}>
              <svg
                viewBox="0 0 640 240"
                className={styles.chartSvg}
                role="img"
                aria-label="Empty rating history chart"
              >
                <line x1="52" y1="22" x2="52" y2="204" className={styles.chartAxis} />
                <line x1="52" y1="204" x2="604" y2="204" className={styles.chartAxis} />
                <line x1="52" y1="62" x2="604" y2="62" className={styles.chartGrid} />
                <line x1="52" y1="108" x2="604" y2="108" className={styles.chartGrid} />
                <line x1="52" y1="154" x2="604" y2="154" className={styles.chartGrid} />
                {EMPTY_RATING_POINTS.length > 0 && null}
              </svg>
              <div className={styles.emptyChartText}>No rating history yet.</div>
            </div>
          </div>

          <div className={styles.historyCard}>
            <div className={styles.historyHeader}>
              <span className={styles.sectionLabel}>Last 5 Games</span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th>Mode</th>
                    <th>Result</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {EMPTY_MATCHES.length > 0 ? (
                    EMPTY_MATCHES.map((match) => (
                      <tr key={match.id}>
                        <td>{match.opponent}</td>
                        <td>{match.mode}</td>
                        <td>{match.result}</td>
                        <td>{match.rating}</td>
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
          </div>
        </section>
      </section>
    </main>
  )
}
