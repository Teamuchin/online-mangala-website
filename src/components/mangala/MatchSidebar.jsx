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
  onFirst,
  onLast,
  onNext,
  onPrevious,
  totalMoves,
  players,
  topStoreCount,
  bottomStoreCount,
}) {
  return (
    <aside className={styles.matchSidebar}>
      <div className={styles.sidebarRow}>
        <PlayerPanel
          player={players.top}
          side="top"
          isActive={currentPlayer === 'top' && gameStatus === 'playing'}
          storeCount={topStoreCount}
          compact
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
          storeCount={bottomStoreCount}
          compact
        />
      </div>
    </aside>
  )
}
