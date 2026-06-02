import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { isGuestUser } from '../app/appState.js'
import { getMatchesByUserIdRequest } from '../app/matchApi.js'
import { challengeBotRequest } from '../app/matchmakingApi.js'
import { getDisplayName } from '../app/playerNames.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import {
  buildHistoryEntryFromBackendMatch,
  buildProfileFromBackendUser,
  buildRatingHistoryFromBackendMatches,
} from '../app/profileData.js'
import { getUserByUsernameRequest } from '../app/userApi.js'
import { useAppData } from '../app/useAppData.js'
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

  return '-'
}

function formatChartDateLabel(value, showTime) {
  const date = new Date(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  if (showTime) {
    return `${hours}:${minutes}`
  }

  return `${day}:${month}:${year}`
}

function getTooltipDateLabel(value) {
  const date = new Date(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const datePart = `${day}:${month}:${year}`

  if (hours === '00' && minutes === '00') {
    return datePart
  }

  return `${datePart} ${hours}:${minutes}`
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

  const maxXLabels = 4
  const xLabelIndices = new Set()

  if (points.length <= maxXLabels) {
    points.forEach((_, index) => xLabelIndices.add(index))
  } else {
    xLabelIndices.add(0)
    xLabelIndices.add(points.length - 1)
    xLabelIndices.add(Math.round((points.length - 1) / 3))
    xLabelIndices.add(Math.round(((points.length - 1) * 2) / 3))
  }

  const firstPlayedAt = new Date(points[0].playedAt)
  const sameCalendarDay = points.every((point) => {
    const date = new Date(point.playedAt)
    return (
      date.getFullYear() === firstPlayedAt.getFullYear() &&
      date.getMonth() === firstPlayedAt.getMonth() &&
      date.getDate() === firstPlayedAt.getDate()
    )
  })

  const xLabels = Array.from(xLabelIndices)
    .sort((left, right) => left - right)
    .map((index) => ({
      value: formatChartDateLabel(points[index].playedAt, sameCalendarDay),
      x: points[index].x,
    }))

  return {
    polylinePoints: points.map((point) => `${point.x},${point.y}`).join(' '),
    points,
    labels: [
      { value: displayMax, y: plotTop },
      { value: Math.round((displayMin + displayMax) / 2), y: plotTop + plotHeight / 2 },
      { value: displayMin, y: plotBottom },
    ],
    xLabels,
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
    currentUser,
    isAuthenticated,
    publicProfileDirectory,
  } = useAppData()
  const { t } = useGlobalHeader()
  const [hoveredPointId, setHoveredPointId] = useState(null)
  const [backendProfile, setBackendProfile] = useState(null)
  const [backendMatches, setBackendMatches] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false)
  const [isChallengeSubmitting, setIsChallengeSubmitting] = useState(false)
  const [challengeError, setChallengeError] = useState('')
  const fallbackProfile = username
    ? resolveProfile(publicProfileDirectory, currentUser, username)
    : currentUser
  const profile = backendProfile ?? fallbackProfile
  const allMatches = useMemo(() => {
    if (!profile) {
      return []
    }

    return backendMatches.map((match) => buildHistoryEntryFromBackendMatch(match, profile.id))
  }, [backendMatches, profile])
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

  const hoveredTooltipPosition = hoveredPoint
    ? {
        x: Math.min(
          Math.max(hoveredPoint.x - 90, chart.plot.left + 8),
          chart.plot.right - 180 - 8,
        ),
        y:
          hoveredPoint.y - 56 < chart.plot.top + 8
            ? hoveredPoint.y + 10
            : hoveredPoint.y - 56,
      }
    : null

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
              <h1>{t('common.noSuchPlayer')}</h1>
              <p>{t('profile.noSuchPlayerDescription')}</p>
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
            <h1>{t('common.noSuchPlayer')}</h1>
            <p>{t('profile.noSuchPlayerDescription')}</p>
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
  const canChallengeBot =
    isAuthenticated && !isGuestUser(currentUser) && profile.isBot === true

  if (isLoading && !profile) {
    return (
      <main className={styles.profilePage}>
        <section className={styles.profileShell}>
          <section className={styles.missingProfileCard}>
            <h1>{t('profile.loadingProfile')}</h1>
            <p>{t('profile.fetchingPlayerDetails')}</p>
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
            <h1>{t('common.noSuchPlayer')}</h1>
            <p>{loadError}</p>
          </section>
        </section>
      </main>
    )
  }

  const handleChallengeBot = async (rated) => {
    const token =
      typeof window === 'undefined'
        ? ''
        : window.localStorage.getItem('mangala.authToken') ?? ''

    if (!token || !profile?.id || isChallengeSubmitting) {
      return
    }

    setIsChallengeSubmitting(true)
    setChallengeError('')

    try {
      const result = await challengeBotRequest(
        {
          botUserId: profile.id,
          rated,
        },
        token,
      )

      setIsChallengeModalOpen(false)
      navigate(`/game/${result.gameId}`, {
        state: {
          backendMatchId: result.gameId,
          matchMode: 'computer',
          queueSettings: {
            rated,
            allowBots: true,
          },
          initialPlayers: result.players,
        },
      })
    } catch (error) {
      if (error.message === 'This user is not a bot.') {
        setChallengeError(t('matchmaking.targetNotBot'))
      } else if (error.message === 'This user is currently playing another match.') {
        setChallengeError(t('matchmaking.userBusy'))
      } else if (error.message === 'You already have an active match.') {
        setChallengeError(t('matchmaking.selfBusy'))
      } else {
        setChallengeError(error.message || t('profile.challengeError'))
      }
    } finally {
      setIsChallengeSubmitting(false)
    }
  }

  return (
    <main className={styles.profilePage}>
      {isChallengeModalOpen && (
        <div className={styles.challengeOverlay} onClick={() => setIsChallengeModalOpen(false)}>
          <div
            className={styles.challengeModal}
            role="dialog"
            aria-modal="true"
            aria-label={t('profile.challengeTitle')}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>{t('profile.challengeTitle')}</h2>
            <p className={styles.challengeText}>{t('profile.challengeText')}</p>
            {challengeError && <p className={styles.challengeError}>{challengeError}</p>}
            <div className={styles.challengeActions}>
              <button
                type="button"
                className={styles.challengeButton}
                onClick={() => void handleChallengeBot(true)}
                disabled={isChallengeSubmitting}
              >
                {t('common.rated')}
              </button>
              <button
                type="button"
                className={styles.challengeButton}
                onClick={() => void handleChallengeBot(false)}
                disabled={isChallengeSubmitting}
              >
                {t('common.unrated')}
              </button>
              <button
                type="button"
                className={styles.challengeCancelButton}
                onClick={() => setIsChallengeModalOpen(false)}
                disabled={isChallengeSubmitting}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      <section className={styles.profileShell}>
        <header className={styles.profileHeader}>
          <div className={styles.identityBlock}>
            <div className={styles.identityText}>
              <h1>
                <span>{profileDisplayName}</span>
                {profile.isBot && <span className={styles.botBadge}>{t('profile.ai')}</span>}
                {canChallengeBot && (
                  <button
                    type="button"
                    className={styles.challengeProfileButton}
                    onClick={() => {
                      setChallengeError('')
                      setIsChallengeModalOpen(true)
                    }}
                  >
                    {t('profile.challenge')}
                  </button>
                )}
              </h1>
              <div className={styles.metaRow}>
                <span>{isOnline ? t('profile.online') : t('profile.offline')}</span>
                <span className={styles.metaDivider}>|</span>
                <span>{t('profile.memberSince')} {profile.memberSince}</span>
              </div>
            </div>
          </div>
          <div className={styles.headerRating}>
            <span className={styles.sectionLabel}>{t('profile.rating')}</span>
            <strong className={styles.headerRatingValue}>{profile.elo ?? '-'}</strong>
          </div>
        </header>

        <section className={styles.ratingSection}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={styles.sectionLabel}>{t('profile.ratingHistory')}</span>
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
                {chart.xLabels?.map((label, index) => (
                  <text
                    key={`${label.value}-${label.x}`}
                    x={label.x}
                    y={chart.plot.bottom + 20}
                    className={styles.chartLabel}
                    textAnchor={
                      index === 0
                        ? 'start'
                        : index === chart.xLabels.length - 1
                          ? 'end'
                          : 'middle'
                    }
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
                {hoveredPoint && hoveredTooltipPosition && (
                  <foreignObject
                    x={hoveredTooltipPosition.x}
                    y={hoveredTooltipPosition.y}
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
                <div className={styles.emptyChartText}>{t('profile.noRatingHistory')}</div>
              )}
            </div>
          </div>

          <div className={styles.historyCard}>
            <div className={styles.historyHeader}>
              <span className={styles.sectionLabel}>
                {t('profile.matchHistory')} ({allMatches.length})
              </span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>{t('profile.opponent')}</th>
                    <th>{t('profile.result')}</th>
                    <th>{t('profile.score')}</th>
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
                                  <span className={styles.inlineBotBadge}>{t('profile.ai')}</span>
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
                        {t('profile.noMatchesSaved')}
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
                  {t('profile.seeMore')}
                </Link>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
