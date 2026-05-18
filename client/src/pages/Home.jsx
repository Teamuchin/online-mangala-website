import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { buildWelcomeMessage } from '../app/appState.js'
import { buildLeaderboardProfiles } from '../app/leaderboard.js'
import { getDisplayName } from '../app/playerNames.js'
import { useAppData } from '../app/useAppData.js'
import {
  createRandomGameId,
  readStoredMatchIds,
  readStoredMatchSessionByGameId,
} from '../components/mangala/gamePersistence.js'
import BotSetupModal from './BotSetupModal.jsx'
import styles from './Home.module.css'

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
  const [isBotSetupOpen, setIsBotSetupOpen] = useState(false)
  const [botDifficulty, setBotDifficulty] = useState('1')
  const [botFirstMove, setBotFirstMove] = useState('you')
  const [rightPanelTab, setRightPanelTab] = useState('players')
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

  const openBotSetup = () => {
    if (redirectToActiveGame()) {
      return
    }

    setIsBotSetupOpen(true)
  }

  const closeBotSetup = () => setIsBotSetupOpen(false)

  const handleStartBotMatch = () => {
    const gameId = createRandomGameId(readStoredMatchIds())
    const startingPlayer =
      botFirstMove === 'random'
        ? Math.random() < 0.5
          ? 'bottom'
          : 'top'
        : botFirstMove === 'computer'
          ? 'top'
          : 'bottom'

    navigate(`/game/${gameId}`, {
      state: {
        botSettings: {
          difficulty: Number(botDifficulty),
          firstMove: botFirstMove,
        },
        matchMode: 'computer',
        startingPlayer,
      },
    })
    closeBotSetup()
  }

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
              onClick={activeMatchSummary?.isActive ? redirectToActiveGame : openBotSetup}
            >
              {activeMatchSummary?.isActive ? 'Resume Current Game' : 'Play Against Bots'}
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
          <section className={styles.mainColumn}>
            <section className={styles.matchesPanel}>
              <div className={styles.sectionHeading}>
                <h2>Live Matches</h2>
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
                <div className={styles.emptyPanel}>
                  <strong>No matches</strong>
                </div>
              )}
            </section>
          </section>

          <aside className={styles.playersPanel}>
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
        </section>
      </section>

      {isBotSetupOpen && (
        <BotSetupModal
          difficulty={botDifficulty}
          firstMove={botFirstMove}
          onClose={closeBotSetup}
          onDifficultyChange={setBotDifficulty}
          onFirstMoveChange={setBotFirstMove}
          onStart={handleStartBotMatch}
        />
      )}
    </main>
  )
}
