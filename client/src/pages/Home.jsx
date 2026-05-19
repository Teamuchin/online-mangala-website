import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { buildWelcomeMessage } from '../app/appState.js'
import { buildLeaderboardProfiles } from '../app/leaderboard.js'
import {
  buildHumanMatchPayload,
  buildQueueEntry,
  findCompatibleHumanEntry,
  getClosestBotProfile,
  markHumanQueueMatch,
  readMatchmakingQueue,
  removeQueueEntry,
  upsertQueueEntry,
} from '../app/matchmaking.js'
import { getDisplayName } from '../app/playerNames.js'
import { useAppData } from '../app/useAppData.js'
import {
  createRandomGameId,
  readStoredMatchIds,
  readStoredMatchSessionByGameId,
} from '../components/mangala/gamePersistence.js'
import PlayQueueModal from './PlayQueueModal.jsx'
import styles from './Home.module.css'

const BOT_FALLBACK_DELAY_MS = 4000
const HUMAN_ONLY_TIMEOUT_MS = 60_000

function buildQueueStatusText(rated) {
  return rated ? 'Looking for a rated game...' : 'Looking for an unrated game...'
}

function buildLobbyPlayers(currentUser, publicProfileDirectory, activeMatchSummary) {
  const seenIds = new Set()
  const participants = new Set(
    [activeMatchSummary?.participants?.bottom, activeMatchSummary?.participants?.top].filter(
      Boolean,
    ),
  )
  const players = [currentUser, ...publicProfileDirectory]
    .filter((player) => {
      if (!player?.id || seenIds.has(player.id)) {
        return false
      }

      seenIds.add(player.id)
      return true
    })
    .map((player) => {
      const status = participants.has(player.id) ? 'playing' : 'online'

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

function buildLiveMatches(activeMatchSummary) {
  if (!activeMatchSummary?.gameId) {
    return []
  }

  const session = readStoredMatchSessionByGameId(activeMatchSummary.gameId)

  if (!session?.game?.players) {
    return []
  }

  const { bottom, top } = session.game.players

  return [
    {
      gameId: activeMatchSummary.gameId,
      url: activeMatchSummary.url,
      bottom,
      top,
    },
  ]
}

export default function Home() {
  const navigate = useNavigate()
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false)
  const [queueConfig, setQueueConfig] = useState({ rated: true, allowBots: true })
  const [queueState, setQueueState] = useState({
    isSearching: false,
    elapsedMs: 0,
    statusText: buildQueueStatusText(true),
  })
  const [rightPanelTab, setRightPanelTab] = useState('players')
  const queueStartedAtRef = useRef(null)
  const { activeMatchSummary, currentUser, isAuthenticated, publicProfileDirectory } =
    useAppData()

  const lobbyPlayers = useMemo(
    () => buildLobbyPlayers(currentUser, publicProfileDirectory, activeMatchSummary),
    [activeMatchSummary, currentUser, publicProfileDirectory],
  )
  const liveMatches = useMemo(
    () => buildLiveMatches(activeMatchSummary),
    [activeMatchSummary],
  )
  const leaderboardPreview = useMemo(
    () =>
      buildLeaderboardProfiles(currentUser, publicProfileDirectory, isAuthenticated).slice(0, 8),
    [currentUser, isAuthenticated, publicProfileDirectory],
  )

  const redirectToActiveGame = () => {
    if (activeMatchSummary?.isActive) {
      navigate(activeMatchSummary.url)
      return true
    }

    return false
  }

  const openPlayModal = () => {
    if (redirectToActiveGame()) {
      return
    }

    setIsPlayModalOpen(true)
  }

  const resetQueueState = useCallback(() => {
    queueStartedAtRef.current = null
    setQueueState({
      isSearching: false,
      elapsedMs: 0,
      statusText: buildQueueStatusText(queueConfig.rated),
    })
  }, [queueConfig.rated])

  const cancelQueue = useCallback(() => {
    removeQueueEntry(currentUser.id)
    resetQueueState()
  }, [currentUser.id, resetQueueState])

  const closePlayModal = () => {
    if (queueState.isSearching) {
      cancelQueue()
    }

    setIsPlayModalOpen(false)
  }

  const startBotMatch = useCallback((rated) => {
    const selectedBotProfile = getClosestBotProfile(publicProfileDirectory, currentUser.elo ?? 1200)

    if (!selectedBotProfile) {
      resetQueueState()
      setIsPlayModalOpen(false)
      return
    }

    const gameId = createRandomGameId(readStoredMatchIds())
    const bottomStarts = Math.random() < 0.5

    removeQueueEntry(currentUser.id)
    resetQueueState()
    setIsPlayModalOpen(false)

    navigate(`/game/${gameId}`, {
      state: {
        botSettings: {
          difficulty:
            selectedBotProfile.id === 'bot-alev'
              ? 4
              : selectedBotProfile.id === 'bot-ruzgar'
                ? 3
                : selectedBotProfile.id === 'bot-toprak'
                  ? 2
                  : 1,
          firstMove: 'random',
        },
        botProfile: selectedBotProfile,
        matchMode: 'computer',
        queueSettings: {
          rated,
          allowBots: true,
        },
        startingPlayer: bottomStarts ? 'bottom' : 'top',
      },
    })
  }, [currentUser.elo, currentUser.id, navigate, publicProfileDirectory, resetQueueState])

  const startHumanMatch = useCallback((matchedEntry) => {
    const queueEntry = buildQueueEntry(currentUser, queueConfig)
    const gameId = createRandomGameId(readStoredMatchIds())
    const matchPayload = buildHumanMatchPayload(queueEntry, matchedEntry, gameId)

    markHumanQueueMatch(queueEntry, matchedEntry, matchPayload)
  }, [currentUser, queueConfig])

  const attemptHumanMatch = useCallback(() => {
    const queueEntry = buildQueueEntry(currentUser, queueConfig)
    const queuedPlayers = readMatchmakingQueue()
    const matchedEntry = findCompatibleHumanEntry(queuedPlayers, queueEntry)

    if (!matchedEntry) {
      return false
    }

    startHumanMatch(matchedEntry)
    return true
  }, [currentUser, queueConfig, startHumanMatch])

  const handleStartQueue = () => {
    const queueEntry = buildQueueEntry(currentUser, queueConfig)

    upsertQueueEntry(queueEntry)
    queueStartedAtRef.current = queueEntry.joinedAt
    setQueueState({
      isSearching: true,
      elapsedMs: 0,
      statusText: buildQueueStatusText(queueConfig.rated),
    })

    attemptHumanMatch()
  }

  useEffect(() => {
    if (!queueState.isSearching) {
      return undefined
    }

    const processQueue = () => {
      const queueEntries = readMatchmakingQueue()
      const currentEntry = queueEntries.find((entry) => entry.userId === currentUser.id)

      if (!currentEntry) {
        resetQueueState()
        return
      }

      const elapsedMs = Date.now() - (queueStartedAtRef.current ?? currentEntry.joinedAt ?? Date.now())
      setQueueState((existingState) => ({
        ...existingState,
        elapsedMs,
      }))

      if (currentEntry.status === 'matched' && currentEntry.gameId && currentEntry.players) {
        removeQueueEntry(currentUser.id)
        resetQueueState()
        setIsPlayModalOpen(false)
        navigate(`/game/${currentEntry.gameId}`, {
          state: {
            matchMode: 'online',
            initialPlayers: currentEntry.players,
            queueSettings: {
              rated: currentEntry.rated,
              allowBots: currentEntry.allowBots,
            },
          },
        })
        return
      }

      if (attemptHumanMatch()) {
        return
      }

      if (queueConfig.allowBots && elapsedMs >= BOT_FALLBACK_DELAY_MS) {
        startBotMatch(queueConfig.rated)
        return
      }

      if (!queueConfig.allowBots && elapsedMs >= HUMAN_ONLY_TIMEOUT_MS) {
        cancelQueue()
        setIsPlayModalOpen(false)
      }
    }

    processQueue()
    const intervalId = window.setInterval(processQueue, 300)
    const handleBeforeUnload = () => {
      removeQueueEntry(currentUser.id)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [
    attemptHumanMatch,
    cancelQueue,
    currentUser.id,
    navigate,
    queueConfig,
    queueState.isSearching,
    resetQueueState,
    startBotMatch,
  ])

  if (!isAuthenticated) {
    return (
      <main className={styles.home}>
        <section className={styles.guestShell}>
          <div className={styles.guestHero}>
            <h1>Play Mangala online.</h1>
            <div className={styles.guestActions}>
              <Link to="/login" className={styles.primaryAction}>
                Log in
              </Link>
              <Link to="/register" className={styles.secondaryAction}>
                Sign Up
              </Link>
              <Link to="/learn" className={styles.ghostAction}>
                Learn &amp; Train
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
          <h1 className={styles.heroTitle}>{buildWelcomeMessage(currentUser)}</h1>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={activeMatchSummary?.isActive ? redirectToActiveGame : openPlayModal}
            >
              {activeMatchSummary?.isActive ? 'Resume Current Game' : 'Play'}
            </button>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={() => navigate('/practice')}
            >
              Practice Board
            </button>
            <Link to="/learn" className={styles.ghostAction}>
              Learn &amp; Train
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
            <div className={styles.panelTabs} role="tablist" aria-label="Lobby side panel">
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
                  Available Players ({lobbyPlayers.length})
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
                Leaderboard
              </button>
            </div>

            {rightPanelTab === 'players' ? (
              lobbyPlayers.length > 0 ? (
                <div className={styles.tableWrap}>
                  <div className={styles.playerTableHeader}>
                    <span>Player</span>
                    <span>Rating</span>
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
                          {player.isBot && <span className={styles.botBadge}>AI</span>}
                        </span>
                        <span className={styles.playerRating}>{player.elo ?? '-'}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.emptyPlayersState}>
                  <strong>No available players right now.</strong>
                </div>
              )
            ) : (
              <div className={styles.leaderboardBody}>
                <div className={styles.tableWrap}>
                  <div className={styles.leaderboardHeader}>
                    <span>#</span>
                    <span>Player</span>
                    <span>Rating</span>
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
                          {player.isBot && <span className={styles.botBadge}>AI</span>}
                        </span>
                        <span className={styles.leaderboardRating}>{player.elo ?? '-'}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <Link to="/leaderboard" className={styles.showMoreLink}>
                  Show More
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
                    Live Matches ({liveMatches.length})
                  </span>
                </h2>
              </div>

              {liveMatches.length > 0 ? (
                <div className={styles.tableWrap}>
                  <div className={styles.matchTableHeader}>
                    <span>Player 1</span>
                    <span>Player 2</span>
                  </div>
                  <div className={styles.matchList}>
                    {liveMatches.map((match) => (
                      <Link key={match.gameId} to={match.url} className={styles.matchCard}>
                        <span className={styles.matchPlayerCell}>
                          <strong className={styles.matchPlayerName}>
                            {getDisplayName(match.bottom) || 'Bottom Player'}{' '}
                            <span className={styles.matchInlineRating}>
                              {match.bottom?.rating ?? '-'}
                            </span>
                          </strong>
                        </span>
                        <span className={styles.matchPlayerCell}>
                          <strong className={styles.matchPlayerName}>
                            {getDisplayName(match.top) || 'Top Player'}{' '}
                            <span className={styles.matchInlineRating}>
                              {match.top?.rating ?? '-'}
                            </span>
                          </strong>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.emptyMatchesState}>
                  <strong>No matches right now.</strong>
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
