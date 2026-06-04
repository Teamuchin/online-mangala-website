import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveMatchesRequest } from '../app/matchApi.js'
import { getDisplayName } from '../app/playerNames.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import styles from './LeaderboardPage.module.css'

export default function MatchesPage() {
  const { currentUser } = useAppData()
  const { t } = useGlobalHeader()
  const [activeMatches, setActiveMatches] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let isCancelled = false

    const loadMatches = async () => {
      setIsLoading(true)
      setLoadError('')

      try {
        const matches = await getActiveMatchesRequest()

        if (isCancelled) {
          return
        }

        setActiveMatches(matches)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setActiveMatches([])
        setLoadError(error.message || t('home.noMatchesNow'))
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadMatches()
    const intervalId = window.setInterval(() => {
      void loadMatches()
    }, 3000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [t])

  const liveMatches = activeMatches.map((match) => ({
    gameId: match.id,
    url: `/game/${match.id}`,
    bottom: {
      id: String(match.bottom_player_id),
      username:
        String(currentUser.id) === String(match.bottom_player_id)
          ? currentUser.username
          : match.bottom_player_username,
      name:
        String(currentUser.id) === String(match.bottom_player_id)
          ? currentUser.username
          : match.bottom_player_username,
      rating: match.bottom_rating_before,
      isBot: match.bottom_player_is_bot === true,
    },
    top: {
      id: String(match.top_player_id),
      username:
        String(currentUser.id) === String(match.top_player_id)
          ? currentUser.username
          : match.top_player_username,
      name:
        String(currentUser.id) === String(match.top_player_id)
          ? currentUser.username
          : match.top_player_username,
      rating: match.top_rating_before,
      isBot: match.top_player_is_bot === true,
    },
  }))

  if (isLoading && liveMatches.length === 0) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>{t('home.liveMatches')}</p>
              <h1>{t('home.liveMatches')}</h1>
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
            <p className={styles.kicker}>{t('home.liveMatches')}</p>
            <h1>{t('home.liveMatches')} ({liveMatches.length})</h1>
          </div>
          <div className={styles.headerRight}>
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
                  <th>{t('home.player1')}</th>
                  <th>{t('home.player2')}</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {liveMatches.length > 0 ? (
                  liveMatches.map((match) => (
                    <tr key={match.gameId}>
                      <td>
                        <span className={styles.playerNameCell}>
                          <span>{getDisplayName(match.bottom) || t('home.bottomPlayer')}</span>
                          {match.bottom.isBot && <span className={styles.botBadge}>{t('profile.ai')}</span>}
                          {' '}({match.bottom.rating ?? '-'})
                        </span>
                      </td>
                      <td>
                        <span className={styles.playerNameCell}>
                          <span>{getDisplayName(match.top) || t('home.topPlayer')}</span>
                          {match.top.isBot && <span className={styles.botBadge}>{t('profile.ai')}</span>}
                          {' '}({match.top.rating ?? '-'})
                        </span>
                      </td>
                      <td>
                        <Link to={match.url} className={styles.playerLink} style={{ fontWeight: 'bold' }}>
                          Watch
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className={styles.emptyCell}>
                      {loadError || t('home.noMatchesNow')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  )
}
