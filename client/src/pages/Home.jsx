import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { buildWelcomeMessage } from '../app/appState.js'
import { useAppData } from '../app/useAppData.js'
import {
  createRandomGameId,
  readStoredMatchIds,
  readStoredMatchSessionByGameId,
} from '../components/mangala/gamePersistence.js'
import BotSetupModal from './BotSetupModal.jsx'
import styles from './Home.module.css'

function formatStatusLabel(status) {
  if (status === 'playing') {
    return 'Playing'
  }

  return 'Online'
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

  const statusWeight = {
    playing: 0,
    online: 1,
    bot: 2,
  }

  return players.sort((left, right) => {
    const weightDifference =
      (statusWeight[left.status] ?? 99) - (statusWeight[right.status] ?? 99)

    if (weightDifference !== 0) {
      return weightDifference
    }

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
  const { activeMatchSummary, currentUser, isAuthenticated, publicProfileDirectory } =
    useAppData()

  const lobbyPlayers = useMemo(
    () =>
      buildLobbyPlayers(currentUser, publicProfileDirectory, activeMatchSummary).slice(0, 8),
    [activeMatchSummary, currentUser, publicProfileDirectory],
  )
  const liveMatches = useMemo(
    () => buildLiveMatches(activeMatchSummary),
    [activeMatchSummary],
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
                            {match.bottom?.name ?? 'Bottom Player'}{' '}
                            <span className={styles.matchInlineRating}>
                              {match.bottom?.rating ?? '-'}
                            </span>
                          </strong>
                        </span>
                        <span className={styles.matchPlayerCell}>
                          <strong className={styles.matchPlayerName}>
                            {match.top?.name ?? 'Top Player'}{' '}
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

            <section className={styles.chatPanel}>
              <div className={styles.chatBody}>
                <div className={styles.chatMessages} />
                <div className={styles.chatComposer}>
                  <input
                    type="text"
                    value=""
                    readOnly
                    placeholder=""
                    className={styles.chatInput}
                  />
                  <button type="button" className={styles.chatSendButton} disabled>
                    Send
                  </button>
                </div>
              </div>
            </section>
          </section>

          <aside className={styles.playersPanel}>
            <div className={styles.sectionHeading}>
              <h2>Online Players</h2>
              <span className={styles.playerCount}>{lobbyPlayers.length}</span>
            </div>

            <div className={styles.tableWrap}>
              <div className={styles.playerTableHeader}>
                <span>Player</span>
                <span>Status</span>
                <span>Rating</span>
              </div>
              <div className={styles.playerList}>
                {lobbyPlayers.map((player) => (
                  <Link
                    key={player.id}
                    to={`/member/${encodeURIComponent(player.username)}`}
                    className={styles.playerRow}
                  >
                    <div className={styles.playerIdentity}>
                      <span
                        className={`${styles.presenceDot} ${
                          player.status === 'playing'
                            ? styles.presencePlaying
                            : styles.presenceOnline
                        }`}
                        aria-hidden="true"
                      />
                      <strong className={styles.playerName}>{player.username}</strong>
                    </div>
                    <span className={styles.playerStatusText}>
                      {formatStatusLabel(player.status)}
                    </span>
                    <span className={styles.playerRating}>{player.elo ?? '-'}</span>
                  </Link>
                ))}
              </div>
            </div>
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
