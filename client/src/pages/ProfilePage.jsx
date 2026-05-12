import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { isGuestUser } from '../app/appState.js'
import { useAppData } from '../app/useAppData.js'
import styles from './ProfilePage.module.css'

const MAX_VISIBLE_RATING_POINTS = 10

function formatRatingDelta(value) {
  return `${value > 0 ? '+' : ''}${value}`
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

function buildChartModel(ratingHistory) {
  if (ratingHistory.length === 0) {
    return {
      polylinePoints: '',
      points: [],
      labels: [],
    }
  }

  const plotLeft = 92
  const plotRight = 576
  const plotTop = 28
  const plotBottom = 192
  const plotWidth = plotRight - plotLeft
  const plotHeight = plotBottom - plotTop
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
  }
}

export default function ProfilePage() {
  const { username } = useParams()
  const { currentUser, isAuthenticated } = useAppData()
  const [hoveredPointId, setHoveredPointId] = useState(null)
  const visibleRatingHistory = (currentUser.ratingHistory ?? []).slice(
    -MAX_VISIBLE_RATING_POINTS,
  )
  const chart = useMemo(
    () => buildChartModel(visibleRatingHistory),
    [visibleRatingHistory],
  )
  const hoveredPoint =
    chart.points.find((point) => point.id === hoveredPointId) ?? null

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
  const recentMatches = (currentUser.matchHistory ?? []).slice(0, 5)

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
                aria-label="Rating history chart"
                onMouseMove={(event) =>
                  setHoveredPointId(getClosestPointId(chart.points, event))
                }
                onMouseLeave={() => setHoveredPointId(null)}
              >
                <line x1="92" y1="28" x2="92" y2="192" className={styles.chartAxis} />
                <line x1="92" y1="192" x2="576" y2="192" className={styles.chartAxis} />
                <line x1="92" y1="69" x2="576" y2="69" className={styles.chartGrid} />
                <line x1="92" y1="110" x2="576" y2="110" className={styles.chartGrid} />
                <line x1="92" y1="151" x2="576" y2="151" className={styles.chartGrid} />
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
              <span className={styles.sectionLabel}>Last 5 Games</span>
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
                      <tr key={match.id}>
                        <td>
                          <div className={styles.opponentCell}>
                            <span>{match.opponent}</span>
                            {typeof match.opponentRating === 'number' && (
                              <span className={styles.opponentMeta}>
                                {match.opponentRating}
                                {typeof match.opponentRatingDelta === 'number' && (
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
                        <td>{match.result}</td>
                        <td>
                          <div className={styles.ratingCell}>
                            <span>{match.ratingAfter}</span>
                            <span
                              className={
                                match.ratingDelta >= 0
                                  ? styles.positiveChange
                                  : styles.negativeChange
                              }
                            >
                              {formatRatingDelta(match.ratingDelta)}
                            </span>
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
          </div>
        </section>
      </section>
    </main>
  )
}
