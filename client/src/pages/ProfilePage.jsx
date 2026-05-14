import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { isGuestUser } from '../app/appState.js'
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
  const profile = username
    ? resolveProfile(publicProfileDirectory, currentUser, username)
    : currentUser
  const visibleRatingHistory = (profile?.ratingHistory ?? []).slice(
    -MAX_VISIBLE_RATING_POINTS,
  )
  const chart = buildChartModel(visibleRatingHistory)
  const hoveredPoint =
    chart.points.find((point) => point.id === hoveredPointId) ?? null

  const canonicalUsername = currentUser.username
  const canonicalProfilePath = `/member/${encodeURIComponent(canonicalUsername)}`

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
    isAuthenticated && !isGuestUser(currentUser) && profile.id === currentUser.id
  const liveMatch = buildLiveMatchEntry(activeMatchSummary, currentUser)
  const allMatches = liveMatch
    && profile.id === currentUser.id
      ? [liveMatch, ...(profile.matchHistory ?? []).filter((match) => match.id !== liveMatch.id)]
      : profile.matchHistory ?? []
  const recentMatches = allMatches.slice(0, 5)
  const hasMoreMatches = allMatches.length > recentMatches.length

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
              <h1>{profile.username}</h1>
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
                      <tr
                        key={match.id}
                        className={styles.clickableHistoryRow}
                        onClick={() => navigate(`/game/${match.id}`)}
                      >
                        <td>
                          <div className={styles.opponentCell}>
                            <Link
                              to={`/member/${encodeURIComponent(match.opponent)}`}
                              className={styles.matchLink}
                              onClick={(event) => event.stopPropagation()}
                            >
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
                      </tr>
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
                  to={`/member/${encodeURIComponent(canonicalUsername)}/games`}
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
