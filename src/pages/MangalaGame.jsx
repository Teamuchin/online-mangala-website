import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Board from '../components/mangala/Board'
import GameStatus from '../components/mangala/GameStatus'
import PlayerPanel from '../components/mangala/PlayerPanel'
import {
  applyMove,
  buildMoveAnimationFrames,
  createInitialState,
  getLegalMoves,
  PLAYER_CONFIG,
} from '../components/mangala/gameLogic'
import styles from '../components/mangala/MangalaGame.module.css'

const MOVE_ANIMATION_DELAY_MS = 260

const RULES = [
  'Each side begins with 4 stones in all 6 pits.',
  'Stones are distributed counter-clockwise and the opponent store is skipped.',
  'Landing your last stone in your own store grants another turn.',
  'If the last stone lands in an opponent pit and makes it even, those stones are captured.',
  'The game ends when either player side becomes empty.',
]

export default function MangalaGame() {
  const [game, setGame] = useState(createInitialState)
  const [showVisualStones, setShowVisualStones] = useState(true)
  const [animateMoves, setAnimateMoves] = useState(false)
  const animationTimeoutsRef = useRef([])

  const clearAnimationTimeouts = () => {
    animationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    animationTimeoutsRef.current = []
  }

  const buildTurnMessage = (currentGame, moveResult) => {
    const activeName = currentGame.players[currentGame.currentPlayer].name
    const nextName = currentGame.players[moveResult.currentPlayer].name

    if (moveResult.gameStatus === 'finished') {
      return moveResult.winner === 'draw'
        ? 'The match ends in a draw.'
        : `${currentGame.players[moveResult.winner].name} collects more stones and wins.`
    }

    if (moveResult.extraTurn) {
      return `${activeName} landed in the store and plays again.`
    }

    if (moveResult.captured > 0) {
      return `${activeName} captured ${moveResult.captured} stones. ${nextName} is up next.`
    }

    return `${nextName} to move`
  }

  useEffect(() => {
    if (game.gameStatus !== 'playing') {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setGame((currentGame) => {
        if (currentGame.gameStatus !== 'playing') {
          return currentGame
        }

        const activePlayer = currentGame.currentPlayer
        const currentTime = currentGame.players[activePlayer].timeLeft

        if (currentTime <= 0) {
          const winner = activePlayer === 'bottom' ? 'top' : 'bottom'

          return {
            ...currentGame,
            gameStatus: 'finished',
            winner,
            turnMessage: `${currentGame.players[winner].name} wins on time.`,
          }
        }

        return {
          ...currentGame,
          players: {
            ...currentGame.players,
            [activePlayer]: {
              ...currentGame.players[activePlayer],
              timeLeft: currentTime - 1,
            },
          },
        }
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [game.gameStatus])

  useEffect(() => () => clearAnimationTimeouts(), [])

  const handleReset = () => {
    clearAnimationTimeouts()
    setGame(createInitialState())
  }

  const handleStoneToggle = () => {
    setShowVisualStones((currentValue) => !currentValue)
  }

  const handleAnimationToggle = () => {
    setAnimateMoves((currentValue) => !currentValue)
  }

  const handlePitClick = (pitIndex) => {
    setGame((currentGame) => {
      if (currentGame.moveInProgress || currentGame.gameStatus !== 'playing') {
        return currentGame
      }

      const legalMoves = getLegalMoves(currentGame.board, currentGame.currentPlayer)

      if (!legalMoves.includes(pitIndex)) {
        return currentGame
      }

      const moveResult = applyMove(
        currentGame.board,
        currentGame.currentPlayer,
        pitIndex,
      )

      if (!moveResult) {
        return currentGame
      }

      if (animateMoves) {
        clearAnimationTimeouts()

        const frames = buildMoveAnimationFrames(
          currentGame.board,
          currentGame.currentPlayer,
          pitIndex,
        )
        const activeName = currentGame.players[currentGame.currentPlayer].name

        frames.forEach((frame, frameIndex) => {
          const timeoutId = window.setTimeout(() => {
            setGame((liveGame) => ({
              ...liveGame,
              board: frame,
            }))
          }, frameIndex * MOVE_ANIMATION_DELAY_MS)

          animationTimeoutsRef.current.push(timeoutId)
        })

        const finalizeTimeoutId = window.setTimeout(() => {
          setGame((liveGame) => ({
            ...liveGame,
            board: moveResult.board,
            currentPlayer: moveResult.currentPlayer,
            selectedPit: pitIndex,
            moveInProgress: false,
            gameStatus: moveResult.gameStatus,
            winner: moveResult.winner,
            turnMessage: buildTurnMessage(currentGame, moveResult),
            lastMove: {
              fromPit: moveResult.fromPit,
              dropCounts: moveResult.dropCounts,
              dropSequence: moveResult.dropSequence,
              capturedStones: moveResult.capturedStones,
              lastLandingIndex: moveResult.lastLandingIndex,
              captured: moveResult.captured,
              extraTurn: moveResult.extraTurn,
            },
            moveHistory: [
              ...liveGame.moveHistory,
              {
                player: currentGame.currentPlayer,
                fromPit: moveResult.fromPit,
                landedAt: moveResult.lastLandingIndex,
                captured: moveResult.captured,
                extraTurn: moveResult.extraTurn,
              },
            ],
          }))
          clearAnimationTimeouts()
        }, frames.length * MOVE_ANIMATION_DELAY_MS)

        animationTimeoutsRef.current.push(finalizeTimeoutId)

        return {
          ...currentGame,
          board: frames[0] ?? currentGame.board,
          selectedPit: pitIndex,
          moveInProgress: true,
          turnMessage: `${activeName} is sowing stones...`,
          lastMove: null,
        }
      }

      return {
        ...currentGame,
        board: moveResult.board,
        currentPlayer: moveResult.currentPlayer,
        selectedPit: pitIndex,
        moveInProgress: false,
        gameStatus: moveResult.gameStatus,
        winner: moveResult.winner,
        turnMessage: buildTurnMessage(currentGame, moveResult),
        lastMove: {
          fromPit: moveResult.fromPit,
          dropCounts: moveResult.dropCounts,
          dropSequence: moveResult.dropSequence,
          capturedStones: moveResult.capturedStones,
          lastLandingIndex: moveResult.lastLandingIndex,
          captured: moveResult.captured,
          extraTurn: moveResult.extraTurn,
        },
        moveHistory: [
          ...currentGame.moveHistory,
          {
            player: currentGame.currentPlayer,
            fromPit: moveResult.fromPit,
            landedAt: moveResult.lastLandingIndex,
            captured: moveResult.captured,
            extraTurn: moveResult.extraTurn,
          },
        ],
      }
    })
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <h1>Mangala Local Match</h1>
            <p>
              Practice the Turkish Mancala variant locally with mock player data,
              active timers, and turn-by-turn capture logic.
            </p>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleStoneToggle}
            >
              Visual Stones: {showVisualStones ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleAnimationToggle}
            >
              Move Animation: {animateMoves ? 'On' : 'Off'}
            </button>
            <Link to="/" className={styles.homeLink}>
              Back Home
            </Link>
            <button type="button" className={styles.resetButton} onClick={handleReset}>
              Restart Match
            </button>
          </div>
        </section>

        <section className={styles.playerGrid}>
          <PlayerPanel
            player={game.players.top}
            side="top"
            isActive={game.currentPlayer === 'top' && game.gameStatus === 'playing'}
            storeCount={game.board[PLAYER_CONFIG.top.storeIndex]}
          />
          <PlayerPanel
            player={game.players.bottom}
            side="bottom"
            isActive={game.currentPlayer === 'bottom' && game.gameStatus === 'playing'}
            storeCount={game.board[PLAYER_CONFIG.bottom.storeIndex]}
          />
        </section>

        <Board
          board={game.board}
          currentPlayer={game.currentPlayer}
          selectedPit={game.selectedPit}
          gameStatus={game.gameStatus}
          players={game.players}
          showVisualStones={showVisualStones}
          lastMove={game.lastMove}
          onPitClick={handlePitClick}
        />

        <section className={styles.footerGrid}>
          <GameStatus
            gameStatus={game.gameStatus}
            winner={game.winner}
            turnMessage={game.turnMessage}
            players={game.players}
          />

          <section className={styles.rulesCard}>
            <h3>Rules in Use</h3>
            <div className={styles.rulesList}>
              {RULES.map((rule) => (
                <p key={rule}>{rule}</p>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
