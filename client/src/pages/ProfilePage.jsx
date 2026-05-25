import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { isGuestUser } from '../app/appState.js'
import { getMatchesByUserIdRequest } from '../app/matchApi.js'
import { getDisplayName } from '../app/playerNames.js'
import {
  buildHistoryEntryFromBackendMatch,
  buildProfileFromBackendUser,
  buildRatingHistoryFromBackendMatches,
} from '../app/profileData.js'
import { getUserByUsernameRequest } from '../app/userApi.js'
import { useAppData } from '../app/useAppData.js'
import { readStoredMatchSessionByGameId } from '../components/mangala/gamePersistence.js'
import styles from './ProfilePage.module.css'

const MAX_VISIBLE_RATING_POINTS = 10

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

function getTooltipDateLabel(value) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function getClosestPointId(points, mouseEvent) {
  if (points.length === 0) {
    return null
  }

  const svgBounds = mouseEvent.currentTarget.getBoundingClientRect()
  const relativeX = ((mouseEvent.clientX - svgBounds.left) / svgBounds.width) * 640

  return points.reduce((closestPoint, point) => {
    if (!closestPoint) {
      return point
    }

    return Math.abs(point.x - relativeX) < Math.abs(closestPoint.x - relativeX)
      ? point
      : closestPoint
  }, null)?.id ?? null
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
  const currentUserId = String(currentUser.id)
  const player =
    currentUserId === String(bottom?.id)
      ? bottom
      : currentUserId === String(top?.id)
        ? top
        : null
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

function buildChartModel(ratingHistory) {
  const plotLeft = 92
  const plotRight = 576
  const plotTop = 36
  const plotBottom = 328
  const plotWidth = plotRight - plotLeft
  const plotHeight = plotBottom - plotTop

  if (ratingHistory.length === 0) {
    return {
      polylinePoints: '',
      points: [],
      labels: [],
      gridLines: [],
      plot: { left: plotLeft, right: plotRight, top: plotTop, bottom: plotBottom },
    }
  }

  const ratings = ratingHistory.map((point) => point.rating)
  const minRating = Math.min(...ratings)
  const maxRating = Math.max(...ratings)
  const ratingRange = maxRating - minRating
  const displayPadding = Math.max(8, Math.ceil((ratingRange || 40) * 0.2))
  const displayMin = minRating - displayPadding
  const displayMax = maxRating + displayPadding
  const displayRange = displayMax - displayMin

  const points = ratingHistory.map((point, index) => {
    const x =
      ratingHistory.length === 1
        ? plotLeft + plotWidth / 2
        : plotLeft + (index / (ratingHistory.length - 1)) * plotWidth
    const y =
      plotBottom - ((point.rating - displayMin) / displayRange) * plotHeight

    return {
      ...point,
      x,
      y,
    }
  })

  return {
    polylinePoints: points.map((point) => `${point.x},${point.y}`).join(' '),
    points,
    labels: [
      { value: displayMax, y: plotTop },
      { value: Math.round((displayMin + displayMax) / 2), y: plotTop + plotHeight / 2 },
      { value: displayMin, y: plotBottom },
    ],
    gridLines: [
      plotTop + plotHeight * 0.25,
      plotTop + plotHeight * 0.5,
      plotTop + plotHeight * 0.75,
    ],
    plot: { left: plotLeft, right: plotRight, top: plotTop, bottom: plotBottom },
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

function resolveOpponentProfile(publicProfileDirectory, currentUser, opponentName) {
  if (currentUser.username === opponentName) {
    return currentUser
  }

  return (
    publicProfileDirectory.find((profile) => profile.username === opponentName) ?? null
  )
}

export default function ProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const {
    activeMatchSummary,
    currentUser,
    isAuthenticated,
    publicProfileDirectory,
  } = useAppData()
  const [hoveredPointId, setHoveredPointId] = useState(null)
  const [backendProfile, setBackendProfile] = useState(null)
  const [backendMatches, setBackendMatches] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const fallbackProfile = username
    ? resolveProfile(publicProfileDirectory, currentUser, username)
    : currentUser
  const profile = backendProfile ?? fallbackProfile
  const allMatches = useMemo(() => {
    if (!profile) {
      return []
    }

    const mappedMatches = backendMatches.map((match) =>
      buildHistoryEntryFromBackendMatch(match, profile.id),
    )
    const liveMatch = buildLiveMatchEntry(activeMatchSummary, currentUser)

    return liveMatch && String(profile.id) === String(currentUser.id)
      ? [liveMatch, ...mappedMatches.filter((match) => match.id !== liveMatch.id)]
      : mappedMatches
  }, [activeMatchSummary, backendMatches, currentUser, profile])
  const visibleRatingHistory = useMemo(
    () =>
      buildRatingHistoryFromBackendMatches(backendMatches, profile?.id ?? '').slice(
        -MAX_VISIBLE_RATING_POINTS,
      ),
    [backendMatches, profile?.id],
  )
  const chart = buildChartModel(visibleRatingHistory)
  const hoveredPoint =
    chart.points.find((point) => point.id === hoveredPointId) ?? null

  const canonicalUsername = currentUser.username
  const canonicalProfilePath = `/member/${encodeURIComponent(canonicalUsername)}`

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
        setLoadError(error.message || 'Could not load profile.')
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
  }, [username])

  if (!username) {
    return isAuthenticated
      ? <Navigate to={canonicalProfilePath} replace />
      : (
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

  if (!profile || (isGuestUser(currentUser) && username === currentUser.username)) {
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

  const isOnline =
    isAuthenticated && !isGuestUser(currentUser) && String(profile.id) === String(currentUser.id)
  const recentMatches = allMatches.slice(0, 5)
  const hasMoreMatches = allMatches.length > recentMatches.length
  const profileDisplayName = backendProfile
    ? profile.username
    : getDisplayName(profile)

  if (isLoading && !profile) {
    return (
      <main className={styles.profilePage}>
        <section className={styles.profileShell}>
          <section className={styles.missingProfileCard}>
            <h1>Loading profile</h1>
            <p>Fetching player details...</p>
          </section>
        </section>
      </main>
    )
  }

  if (loadError && !profile) {
    return (
      <main className={styles.profilePage}>
        <section className={styles.profileShell}>
          <section className={styles.missingProfileCard}>
            <h1>No such player</h1>
            <p>{loadError}</p>
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.profilePage}>
      <section className={styles.profileShell}>
        <header className={styles.profileHeader}>
          <div className={styles.identityBlock}>
            <div className={styles.identityText}>
              <h1>
                <span>{profileDisplayName}</span>
                {profile.isBot && <span className={styles.botBadge}>AI</span>}
              </h1>
              <div className={styles.metaRow}>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
                <span className={styles.metaDivider}>|</span>
                <span>Member since {profile.memberSince}</span>
              </div>
            </div>
          </div>
          <div className={styles.headerRating}>
            <span className={styles.sectionLabel}>Rating</span>
            <strong className={styles.headerRatingValue}>{profile.elo ?? '-'}</strong>
          </div>
        </header>

        <section className={styles.ratingSection}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={styles.sectionLabel}>Rating History</span>
            </div>
            <div className={styles.chartFrame}>
              <svg
                viewBox="0 0 640 360"
                className={styles.chartSvg}
                role="img"
                aria-label="Rating history chart"
                onMouseMove={(event) =>
                  setHoveredPointId(getClosestPointId(chart.points, event))
                }
                onMouseLeave={() => setHoveredPointId(null)}
              >
                <line
                  x1={chart.plot.left}
                  y1={chart.plot.top}
                  x2={chart.plot.left}
                  y2={chart.plot.bottom}
                  className={styles.chartAxis}
                />
                <line
                  x1={chart.plot.left}
                  y1={chart.plot.bottom}
                  x2={chart.plot.right}
                  y2={chart.plot.bottom}
                  className={styles.chartAxis}
                />
                {chart.gridLines.map((gridY) => (
                  <line
                    key={gridY}
                    x1={chart.plot.left}
                    y1={gridY}
                    x2={chart.plot.right}
                    y2={gridY}
                    className={styles.chartGrid}
                  />
                ))}
                {chart.labels.map((label) => (
                  <text
                    key={`${label.value}-${label.y}`}
                    x="80"
                    y={label.y + 4}
                    className={styles.chartLabel}
                    textAnchor="end"
                  >
                    {label.value}
                  </text>
                ))}
                {chart.points.length > 1 && (
                  <polyline
                    points={chart.polylinePoints}
                    className={styles.chartLine}
                  />
                )}
                {chart.points.map((point) => (
                  <circle
                    key={point.id}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    className={`${styles.chartPoint} ${
                      hoveredPointId === point.id ? styles.chartPointActive : ''
                    }`}
                  />
                ))}
                {hoveredPoint && (
                  <foreignObject
                    x={hoveredPoint.x - 90}
                    y={hoveredPoint.y - 56}
                    width="180"
                    height="40"
                    className={styles.chartTooltipObject}
                  >
                    <div className={styles.chartTooltip}>
                      <span className={styles.chartTooltipDate}>
                        {getTooltipDateLabel(hoveredPoint.playedAt)}:
                      </span>
                      <span className={styles.chartTooltipRating}>{hoveredPoint.rating}</span>
                    </div>
                  </foreignObject>
                )}
              </svg>
              {chart.points.length === 0 && (
                <div className={styles.emptyChartText}>No rating history yet.</div>
              )}
            </div>
          </div>

          <div className={styles.historyCard}>
            <div className={styles.historyHeader}>
              <span className={styles.sectionLabel}>
                Match History ({allMatches.length})
              </span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th>Result</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMatches.length > 0 ? (
                    recentMatches.map((match) => (
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
                          </tr>
                        )
                      })()
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className={styles.emptyCell}>
                        No matches saved yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {hasMoreMatches && (
              <div className={styles.historyFooter}>
                <Link
                  to={`/member/${encodeURIComponent(profile.username)}/games`}
                  className={styles.seeMoreLink}
                >
                  See More
                </Link>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
