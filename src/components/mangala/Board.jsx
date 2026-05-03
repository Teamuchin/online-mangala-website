import { PLAYER_CONFIG } from './gameLogic'
import Pit from './Pit'
import Store from './Store'
import { buildBoardPresentation, isPitDisabled } from './boardState'
import styles from './MangalaGame.module.css'

export default function Board({
  board,
  currentPlayer,
  selectedPit,
  gameStatus,
  players,
  showVisualStones,
  lastMove,
  disableInteraction = false,
  onPitClick,
}) {
  const topRow = [...PLAYER_CONFIG.top.pitIndexes].reverse()
  const bottomRow = PLAYER_CONFIG.bottom.pitIndexes
  const { finalTarget, dropCounts, sourceSilhouetteCounts, capturedCounts } =
    buildBoardPresentation(lastMove)

  return (
    <section className={styles.boardShell}>
      <Store
        count={board[13]}
        label={`${players.top.name} Store`}
        showVisualStones={showVisualStones}
        movedCount={dropCounts[13] ?? 0}
        isFinalTarget={finalTarget === 13}
      />
      <div className={styles.boardCenter}>
        <div className={styles.pitRow}>
          {topRow.map((index) => (
            <Pit
              key={index}
              count={board[index]}
              showVisualStones={showVisualStones}
              movedCount={dropCounts[index] ?? 0}
              isFinalTarget={finalTarget === index}
              capturedCount={capturedCounts[index] ?? 0}
              sourceSilhouetteCount={sourceSilhouetteCounts[index] ?? 0}
              disabled={isPitDisabled({
                board,
                disableInteraction,
                index,
                currentPlayer,
                gameStatus,
                side: 'top',
              })}
              isSelected={selectedPit === index}
              onClick={() => onPitClick(index)}
            />
          ))}
        </div>
        <div className={styles.pitRow}>
          {bottomRow.map((index) => (
            <Pit
              key={index}
              count={board[index]}
              showVisualStones={showVisualStones}
              movedCount={dropCounts[index] ?? 0}
              isFinalTarget={finalTarget === index}
              capturedCount={capturedCounts[index] ?? 0}
              sourceSilhouetteCount={sourceSilhouetteCounts[index] ?? 0}
              disabled={isPitDisabled({
                board,
                disableInteraction,
                index,
                currentPlayer,
                gameStatus,
                side: 'bottom',
              })}
              isSelected={selectedPit === index}
              onClick={() => onPitClick(index)}
            />
          ))}
        </div>
      </div>
      <Store
        count={board[6]}
        label={`${players.bottom.name} Store`}
        showVisualStones={showVisualStones}
        movedCount={dropCounts[6] ?? 0}
        isFinalTarget={finalTarget === 6}
      />
    </section>
  )
}
