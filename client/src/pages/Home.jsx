import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { buildWelcomeMessage } from '../app/appState.js'
import {
  createRandomGameId,
  readStoredMatchIds,
} from '../components/mangala/gamePersistence.js'
import BotSetupModal from './BotSetupModal.jsx'
import { useAppData } from '../app/useAppData.js'
import styles from './Home.module.css'

export default function Home() {
  const navigate = useNavigate()
  const [isBotSetupOpen, setIsBotSetupOpen] = useState(false)
  const [botDifficulty, setBotDifficulty] = useState('1')
  const [botFirstMove, setBotFirstMove] = useState('you')
  const {
    activeMatchSummary,
    currentUser,
    isAuthenticated,
    homePrimaryActions,
    homeSecondaryActions,
  } = useAppData()

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

  const handleStartLocalMatch = () => {
    if (redirectToActiveGame()) {
      return
    }

    const gameId = createRandomGameId(readStoredMatchIds())
    navigate(`/game/${gameId}`, {
      state: {
        matchMode: 'local',
      },
    })
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.home}>
        <div className={styles.homebody}>
          <h1>Please log in to continue.</h1>
          <div className={styles.homebuttons}>
            <div className={styles.homebuttonupper}>
              <Link to="/login" className={styles.localbtn}>
                Log in
              </Link>
              <Link to="/register" className={styles.offlinebtn}>
                Sign Up
              </Link>
            </div>
            <div className={styles.homebuttonlower}>
              <Link to="/learn" className={styles.learnbtn}>
                Learn & Train
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.home}>
      <div className={styles.homebody}>
        <h1>{buildWelcomeMessage(currentUser)}</h1>
        <div className={styles.homebuttons}>
          <div className={styles.homebuttonupper}>
            {homePrimaryActions.map((action) =>
              action.label === 'Play Againist Bots' ? (
                <button
                  key={action.label}
                  type="button"
                  className={styles[action.className]}
                  onClick={openBotSetup}
                >
                  {action.label}
                </button>
              ) : action.label === 'Local Match' ? (
                <button
                  key={action.label}
                  type="button"
                  className={styles[action.className]}
                  onClick={handleStartLocalMatch}
                >
                  {action.label}
                </button>
              ) : (
                <Link key={action.label} to={action.to} className={styles[action.className]}>
                  {action.label}
                </Link>
              ),
            )}
          </div>
          <div className={styles.homebuttonlower}>
            {homeSecondaryActions.map((action) => (
              <Link key={action.label} to={action.to} className={styles[action.className]}>
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
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
    </div>
  )
}
