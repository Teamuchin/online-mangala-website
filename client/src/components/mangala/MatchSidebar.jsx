import PlayerPanel from './PlayerPanel'
import ReplayControls from './ReplayControls.jsx'
import styles from './MangalaGame.module.css'

export default function MatchSidebar({
  activePositionIndex,
  currentPlayer,
  description,
  gameStatus,
  hasMoves,
  isReviewing,
  onResign,
  onFirst,
  onLast,
  onNext,
  onPrevious,
  totalMoves,
  players,
}) {
  return (
    <section className={styles.matchSidebar}>
      <PlayerPanel
        player={players.top}
        side="top"
        isActive={currentPlayer === 'top' && gameStatus === 'playing'}
        compact
        onResign={onResign}
        resignDisabled={isReviewing || gameStatus !== 'playing'}
      />
      <ReplayControls
        activePositionIndex={activePositionIndex}
        totalMoves={totalMoves}
        description={description}
        hasMoves={hasMoves}
        isReviewing={isReviewing}
        onFirst={onFirst}
        onPrevious={onPrevious}
        onNext={onNext}
        onLast={onLast}
      />
      <PlayerPanel
        player={players.bottom}
        side="bottom"
        isActive={currentPlayer === 'bottom' && gameStatus === 'playing'}
        compact
        onResign={onResign}
        resignDisabled={isReviewing || gameStatus !== 'playing'}
      />
    </section>
  )
}
