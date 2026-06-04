import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getActiveMatchesRequest,
  getMatchByIdRequest,
} from '../app/matchApi.js'
import {
  getMatchmakingStatusRequest,
  joinMatchmakingQueueRequest,
  leaveMatchmakingQueueRequest,
} from '../app/matchmakingApi.js'
import { getDisplayName } from '../app/playerNames.js'
import { buildProfileFromBackendUser } from '../app/profileData.js'
import { getLeaderboardUsersRequest } from '../app/userApi.js'
import { getFriendsRequest } from '../app/friendsApi.js'
import { useAppData } from '../app/useAppData.js'
import { useGlobalHeader } from '../app/useGlobalHeader.js'
import {
  clearStoredActiveMatchSession,
  readStoredMatchSessionByGameId,
} from '../components/mangala/gamePersistence.js'
import PlayQueueModal from './PlayQueueModal.jsx'
import styles from './Home.module.css'

const HUMAN_ONLY_TIMEOUT_MS = 60_000
const HOME_ACTIVE_MATCHES_POLL_INTERVAL_MS = 3000

function buildQueueStatusText(rated, t) {
  return rated ? t('home.queueLookingRated') : t('home.queueLookingUnrated')
}

function isPlayerOnline(player) {
  if (player.isBot || player.is_bot) return true
  const lastSeen = player.lastSeen || player.last_seen
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() <= 45000
}

function buildLobbyPlayers(currentUser, users, activeMatches) {
  const seenIds = new Set()
  const participants = new Set(
    activeMatches.flatMap((match) => [
      String(match.bottom_player_id),
      String(match.top_player_id),
    ]),
  )
  const players = users
    .filter((player) => {
      if (!player?.id || seenIds.has(player.id) || String(player.id) === String(currentUser?.id)) {
        return false
      }

      seenIds.add(player.id)
      return true
    })
    .map((player) => {
      let status = 'offline'
      if (participants.has(String(player.id))) {
        status = 'playing'
      } else if (isPlayerOnline(player)) {
        status = 'online'
      }

      return {
        ...player,
        status,
      }
    })
    .filter((player) => player.status === 'online')

  return players.sort((left, right) => {
    return (right.elo ?? 0) - (left.elo ?? 0)
  })
}

function buildFriendsWithStatus(friends, activeMatches, lobbyPlayers) {
  const activeUserIds = new Set(
    activeMatches.flatMap((match) => [
      String(match.bottom_player_id),
      String(match.top_player_id),
    ])
  )
  
  return friends
    .filter((f) => f.status === 'accepted')
    .map((friend) => {
      let status = 'offline'
      if (activeUserIds.has(String(friend.id))) {
        status = 'playing'
      } else if (isPlayerOnline(friend)) {
        status = 'online'
      }

      return {
        ...friend,
        onlineStatus: status,
      }
    })
    .sort((left, right) => {
      if (left.onlineStatus === 'playing' && right.onlineStatus !== 'playing') return -1
      if (left.onlineStatus !== 'playing' && right.onlineStatus === 'playing') return 1
      if (left.onlineStatus === 'online' && right.onlineStatus === 'offline') return -1
      if (left.onlineStatus === 'offline' && right.onlineStatus === 'online') return 1
      return (right.elo ?? 0) - (left.elo ?? 0)
    })
}

function buildLiveMatches(activeMatches, currentUser) {
  return activeMatches.map((match) => ({
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
}

export default function Home() {
  const navigate = useNavigate()
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false)
  const [queueConfig, setQueueConfig] = useState({ rated: true, allowBots: true })
  const [queueState, setQueueState] = useState({
    isSearching: false,
    elapsedMs: 0,
    statusText: '',
  })
  const [leaderboardUsers, setLeaderboardUsers] = useState([])
  const [activeMatches, setActiveMatches] = useState([])
  const [friends, setFriends] = useState([])
  const [rightPanelTab, setRightPanelTab] = useState('players')
  const queueStartedAtRef = useRef(null)
  const { activeMatchSummary, currentUser, isAuthenticated } =
    useAppData()
  const { t } = useGlobalHeader()

  const lobbyPlayers = useMemo(
    () => buildLobbyPlayers(currentUser, leaderboardUsers, activeMatches),
    [activeMatches, currentUser, leaderboardUsers],
  )
  const liveMatches = useMemo(
    () => buildLiveMatches(activeMatches, currentUser),
    [activeMatches, currentUser],
  )
  const friendsList = useMemo(
    () => buildFriendsWithStatus(friends, activeMatches, lobbyPlayers),
    [friends, activeMatches, lobbyPlayers],
  )
  const leaderboardPreview = useMemo(
    () =>
      leaderboardUsers
        .map((user) =>
          String(user.id) === String(currentUser.id)
            ? {
                ...user,
                username: currentUser.username,
              }
            : user,
        )
        .slice(0, 8),
    [currentUser.id, currentUser.username, leaderboardUsers],
  )

  const validateActiveMatchSummary = useCallback(async () => {
    if (!activeMatchSummary?.isActive) {
      return null
    }

    if (
      activeMatchSummary.matchMode === 'local' ||
      activeMatchSummary.matchMode === 'practice'
    ) {
      return activeMatchSummary
    }

    try {
      const backendMatch = await getMatchByIdRequest(activeMatchSummary.gameId)

      if (backendMatch.status !== 'active') {
        clearStoredActiveMatchSession(activeMatchSummary.gameId)
        return null
      }

      return activeMatchSummary
    } catch (error) {
      console.error('Validate active match error:', error)
      clearStoredActiveMatchSession(activeMatchSummary.gameId)
      return null
    }
  }, [activeMatchSummary])

  const redirectToActiveGame = useCallback(async () => {
    const validatedActiveMatch = await validateActiveMatchSummary()

    if (validatedActiveMatch?.isActive) {
      navigate(validatedActiveMatch.url)
      return true
    }

    return false
  }, [navigate, validateActiveMatchSummary])

  const openPlayModal = async () => {
    if (await redirectToActiveGame()) {
      return
    }

    setIsPlayModalOpen(true)
  }

  const resetQueueState = useCallback(() => {
    queueStartedAtRef.current = null
    setQueueState({
      isSearching: false,
      elapsedMs: 0,
      statusText: buildQueueStatusText(queueConfig.rated, t),
    })
  }, [queueConfig.rated, t])

  const cancelQueue = useCallback(() => {
    const token =
      typeof window === 'undefined'
        ? ''
        : (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')) ?? ''

    if (token) {
      void leaveMatchmakingQueueRequest(token).catch((error) => {
        console.error('Leave matchmaking queue error:', error)
      })
    }

    resetQueueState()
  }, [resetQueueState])

  const closePlayModal = () => {
    if (queueState.isSearching) {
      cancelQueue()
    }

    setIsPlayModalOpen(false)
  }

  const handleStartQueue = async () => {
    if (await redirectToActiveGame()) {
      return
    }

    const token =
      typeof window === 'undefined'
        ? ''
        : (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')) ?? ''

    if (!token) {
      return
    }

    try {
      const queueResponse = await joinMatchmakingQueueRequest(
        {
          rated: queueConfig.rated,
          allowBots: queueConfig.allowBots,
        },
        token,
      )

      queueStartedAtRef.current = queueResponse.joinedAt ?? Date.now()
      if (queueResponse.status === 'matched' && queueResponse.gameId && queueResponse.players) {
        resetQueueState()
        setIsPlayModalOpen(false)
        navigate(`/game/${queueResponse.gameId}`, {
          state: {
            backendMatchId: queueResponse.gameId,
            matchMode: 'online',
            initialPlayers: queueResponse.players,
            queueSettings: {
              rated: queueResponse.rated,
              allowBots: queueResponse.allowBots,
            },
          },
        })
        return
      }
    } catch (error) {
      console.error('Join matchmaking queue error:', error)
      return
    }

    setQueueState({
      isSearching: true,
      elapsedMs: 0,
      statusText: buildQueueStatusText(queueConfig.rated, t),
    })
  }

  useEffect(() => {
    setQueueState((existingState) =>
      existingState.isSearching
        ? existingState
        : {
            ...existingState,
            statusText: buildQueueStatusText(queueConfig.rated, t),
          },
    )
  }, [queueConfig.rated, t])

  useEffect(() => {
    let isCancelled = false

    const loadLeaderboard = async () => {
      try {
        const users = await getLeaderboardUsersRequest()

        if (isCancelled) {
          return
        }

        setLeaderboardUsers(users.map((user) => buildProfileFromBackendUser(user)))
      } catch (error) {
        if (!isCancelled) {
          console.error('Load homepage leaderboard error:', error)
        }
      }
    }

    void loadLeaderboard()
    
    const intervalId = window.setInterval(() => {
      void loadLeaderboard()
    }, 15000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadActiveMatches = async () => {
      try {
        const matches = await getActiveMatchesRequest()

        if (isCancelled) {
          return
        }

        setActiveMatches(matches)
      } catch (error) {
        if (!isCancelled) {
          console.error('Load active matches error:', error)
        }
      }
    }

    void loadActiveMatches()
    const intervalId = window.setInterval(() => {
      void loadActiveMatches()
    }, HOME_ACTIVE_MATCHES_POLL_INTERVAL_MS)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false
    const token = typeof window === 'undefined' ? '' : (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')) ?? ''
    
    if (!token || !isAuthenticated) {
      return undefined
    }

    const loadFriends = async () => {
      try {
        const data = await getFriendsRequest(token)
        if (isCancelled) return
        setFriends(data)
      } catch (error) {
        if (!isCancelled) {
          console.error('Load friends error:', error)
        }
      }
    }

    void loadFriends()
    const intervalId = window.setInterval(() => {
      void loadFriends()
    }, HOME_ACTIVE_MATCHES_POLL_INTERVAL_MS)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!queueState.isSearching) {
      return undefined
    }

    const token =
      typeof window === 'undefined'
        ? ''
        : (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')) ?? ''

    if (!token) {
      resetQueueState()
      return undefined
    }

    const processQueue = async () => {
      let currentStatus

      try {
        currentStatus = await getMatchmakingStatusRequest(token)
      } catch (error) {
        console.error('Get matchmaking status error:', error)
        return
      }

      if (currentStatus.status === 'idle') {
        resetQueueState()
        return
      }

      const elapsedMs = Date.now() - (queueStartedAtRef.current ?? currentStatus.joinedAt ?? Date.now())
      setQueueState((existingState) => ({
        ...existingState,
        elapsedMs,
      }))

      if (currentStatus.status === 'matched' && currentStatus.gameId && currentStatus.players) {
        resetQueueState()
        setIsPlayModalOpen(false)
        navigate(`/game/${currentStatus.gameId}`, {
          state: {
            backendMatchId: currentStatus.gameId,
            matchMode: 'online',
            initialPlayers: currentStatus.players,
            queueSettings: {
              rated: currentStatus.rated,
              allowBots: currentStatus.allowBots,
            },
          },
        })
        return
      }

      if (!queueConfig.allowBots && elapsedMs >= HUMAN_ONLY_TIMEOUT_MS) {
        cancelQueue()
        setIsPlayModalOpen(false)
      }
    }

    void processQueue()
    const intervalId = window.setInterval(() => {
      void processQueue()
    }, 1000)
    const handleBeforeUnload = () => {
      void leaveMatchmakingQueueRequest(token).catch(() => {})
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [
    cancelQueue,
    navigate,
    queueConfig,
    queueState.isSearching,
    resetQueueState,
  ])

  if (!isAuthenticated) {
    return (
      <main className={styles.home}>
        <section className={styles.guestShell}>
          <div className={styles.guestHero}>
            <h1>{t('home.guestHeroTitle')}</h1>
            <div className={styles.guestActions}>
              <Link to="/login" className={styles.primaryAction}>
                {t('auth.logIn')}
              </Link>
              <Link to="/register" className={styles.secondaryAction}>
                {t('auth.signUp')}
              </Link>
              <Link to="/learn" className={styles.ghostAction}>
                {t('home.learnTrain')}
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.home}>
      <section className={styles.shell}>
        <section className={styles.heroPanel}>
          <h1 className={styles.heroTitle}>{t('home.welcome', { name: currentUser.username })}</h1>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={openPlayModal}
            >
              {activeMatchSummary?.isActive ? t('home.resumeCurrentGame') : t('home.play')}
            </button>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={() => navigate('/practice')}
            >
              {t('home.practiceBoard')}
            </button>
            <Link to="/learn" className={styles.ghostAction}>
              {t('home.learnTrain')}
            </Link>
          </div>
        </section>

        <section className={styles.contentGrid}>
          <aside
            className={`${styles.playersPanel} ${
              rightPanelTab === 'players' && lobbyPlayers.length === 0
                ? styles.playersPanelEmpty
                : ''
            } ${
              rightPanelTab === 'players' && lobbyPlayers.length > 0
                ? styles.playersPanelFilled
                : ''
            }`}
          >
            <div className={styles.panelTabs} role="tablist" aria-label={t('home.lobbySidePanel')}>
              <button
                type="button"
                role="tab"
                aria-selected={rightPanelTab === 'players'}
                className={`${styles.panelTab} ${
                  rightPanelTab === 'players' ? styles.panelTabActive : ''
                }`}
                onClick={() => setRightPanelTab('players')}
              >
                <span className={styles.panelTabLabel}>
                  <span className={styles.availableDot} aria-hidden="true" />
                  {t('home.availablePlayers')} ({lobbyPlayers.length})
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rightPanelTab === 'leaderboard'}
                className={`${styles.panelTab} ${
                  rightPanelTab === 'leaderboard' ? styles.panelTabActive : ''
                }`}
                onClick={() => setRightPanelTab('leaderboard')}
              >
                {t('home.leaderboard')}
              </button>
            </div>

            {rightPanelTab === 'players' ? (
              lobbyPlayers.length > 0 ? (
                <div className={styles.tableWrap}>
                  <div className={styles.playerTableHeader}>
                    <span>{t('home.player')}</span>
                    <span>{t('profile.rating')}</span>
                  </div>
                  <div className={styles.playerList}>
                    {lobbyPlayers.map((player) => (
                      <Link
                        key={player.id}
                        to={`/member/${encodeURIComponent(player.username)}`}
                        className={styles.playerRow}
                      >
                        <span className={styles.playerNameCell}>
                          <strong className={styles.playerName}>{getDisplayName(player)}</strong>
                          {player.isBot && <span className={styles.botBadge}>{t('profile.ai')}</span>}
                        </span>
                        <span className={styles.playerRating}>{player.elo ?? '-'}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.emptyPlayersState}>
                  <strong>{t('home.noAvailablePlayers')}</strong>
                </div>
              )
            ) : (
              <div className={styles.leaderboardBody}>
                <div className={styles.tableWrap}>
                  <div className={styles.leaderboardHeader}>
                    <span>#</span>
                    <span>{t('home.player')}</span>
                    <span>{t('profile.rating')}</span>
                  </div>
                  <div className={styles.leaderboardList}>
                    {leaderboardPreview.map((player, index) => (
                      <Link
                        key={player.id}
                        to={`/member/${encodeURIComponent(player.username)}`}
                        className={styles.leaderboardRow}
                      >
                        <span className={styles.leaderboardRank}>{index + 1}</span>
                        <span className={styles.leaderboardNameCell}>
                          <strong className={styles.leaderboardName}>
                            {getDisplayName(player)}
                          </strong>
                          {player.isBot && <span className={styles.botBadge}>{t('profile.ai')}</span>}
                        </span>
                        <span className={styles.leaderboardRating}>{player.elo ?? '-'}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <Link to="/leaderboard" className={styles.showMoreLink}>
                  {t('home.showMore')}
                </Link>
              </div>
            )}
          </aside>

          <section className={styles.mainColumn}>
            <section
              className={`${styles.matchesPanel} ${
                liveMatches.length === 0 ? styles.matchesPanelEmpty : ''
              } ${liveMatches.length > 0 ? styles.matchesPanelFilled : ''}`}
            >
              <div className={styles.sectionHeading}>
                <h2>
                  <span className={styles.sectionHeadingLabel}>
                    <span className={styles.liveDot} aria-hidden="true" />
                    {t('home.liveMatches')} ({liveMatches.length})
                  </span>
                </h2>
              </div>

              {liveMatches.length > 0 ? (
                <div className={styles.tableWrap}>
                  <div className={styles.matchTableHeader}>
                    <span>{t('home.player1')}</span>
                    <span>{t('home.player2')}</span>
                  </div>
                  <div className={styles.matchList}>
                    {liveMatches.slice(0, 5).map((match) => (
                      <Link key={match.gameId} to={match.url} className={styles.matchCard}>
                        <span className={styles.matchPlayerCell}>
                          <strong className={styles.matchPlayerName}>
                            {getDisplayName(match.bottom) || t('home.bottomPlayer')}{' '}
                            <span className={styles.matchInlineRating}>
                              {match.bottom?.rating ?? '-'}
                            </span>
                          </strong>
                        </span>
                        <span className={styles.matchPlayerCell}>
                          <strong className={styles.matchPlayerName}>
                            {getDisplayName(match.top) || t('home.topPlayer')}{' '}
                            <span className={styles.matchInlineRating}>
                              {match.top?.rating ?? '-'}
                            </span>
                          </strong>
                        </span>
                      </Link>
                    ))}
                  </div>
                  {liveMatches.length > 5 && (
                    <Link to="/matches" className={styles.showMoreLink} style={{ alignSelf: 'start' }}>
                      {t('home.showMore')}
                    </Link>
                  )}
                </div>
              ) : (
                <div className={styles.emptyMatchesState}>
                  <strong>{t('home.noMatchesNow')}</strong>
                </div>
              )}
            </section>

            <section
              className={`${styles.friendsPanel} ${
                friendsList.length === 0 ? styles.friendsPanelEmpty : ''
              } ${friendsList.length > 0 ? styles.friendsPanelFilled : ''}`}
            >
              <div className={styles.sectionHeading}>
                <h2>
                  <span className={styles.sectionHeadingLabel}>
                    <span className={styles.availableDot} aria-hidden="true" />
                    {t('home.friends')} ({friendsList.length})
                  </span>
                </h2>
              </div>

              {friendsList.length > 0 ? (
                <div className={styles.tableWrap}>
                  <div className={styles.friendTableHeader}>
                    <span>{t('home.player')}</span>
                    <span>{t('profile.rating')}</span>
                  </div>
                  <div className={styles.friendList}>
                    {friendsList.map((friend) => (
                      <Link
                        key={friend.id}
                        to={`/member/${encodeURIComponent(friend.username)}`}
                        className={styles.playerRow}
                      >
                        <span className={styles.playerNameCell}>
                          <strong className={styles.playerName}>{getDisplayName(friend)}</strong>
                          {friend.onlineStatus === 'playing' && (
                            <span className={styles.botBadge} style={{ background: '#d44434', color: '#fff' }}>{t('profile.resultLive')}</span>
                          )}
                          {friend.onlineStatus === 'online' && (
                            <span className={styles.botBadge} style={{ background: '#45a458', color: '#fff' }}>{t('profile.online')}</span>
                          )}
                        </span>
                        <span className={styles.playerRating}>{friend.elo ?? '-'}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.emptyFriendsState}>
                  <strong>{t('home.noFriendsYet')}</strong>
                </div>
              )}
            </section>
          </section>
        </section>
      </section>

      {isPlayModalOpen && (
        <PlayQueueModal
          allowBots={queueConfig.allowBots}
          elapsedMs={queueState.elapsedMs}
          isQueueing={queueState.isSearching}
          onAllowBotsChange={(allowBots) =>
            setQueueConfig((existingConfig) => ({
              ...existingConfig,
              allowBots,
            }))
          }
          onClose={closePlayModal}
          onRatedChange={(rated) =>
            setQueueConfig((existingConfig) => ({
              ...existingConfig,
              rated,
            }))
          }
          onStart={handleStartQueue}
          queueStatusText={queueState.statusText}
          rated={queueConfig.rated}
        />
      )}
    </main>
  )
}
