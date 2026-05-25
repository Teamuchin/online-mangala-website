import { PLAYER_CONFIG } from './gameLogic'
import Pit from './Pit'
import Store from './Store'
import { buildBoardPresentation, isPitDisabled } from './boardState'
import styles from './MangalaGame.module.css'

const BOARD_VIEW_CONFIG = {
  bottom: {
    topRow: [...PLAYER_CONFIG.top.pitIndexes].reverse().map((index) => ({
      index,
      ownerSide: 'top',
    })),
    bottomRow: PLAYER_CONFIG.bottom.pitIndexes.map((index) => ({
      index,
      ownerSide: 'bottom',
    })),
    leftStore: {
      index: PLAYER_CONFIG.top.storeIndex,
      ownerSide: 'top',
    },
    rightStore: {
      index: PLAYER_CONFIG.bottom.storeIndex,
      ownerSide: 'bottom',
    },
  },
  top: {
    topRow: [...PLAYER_CONFIG.bottom.pitIndexes].reverse().map((index) => ({
      index,
      ownerSide: 'bottom',
    })),
    bottomRow: PLAYER_CONFIG.top.pitIndexes.map((index) => ({
      index,
      ownerSide: 'top',
    })),
    leftStore: {
      index: PLAYER_CONFIG.bottom.storeIndex,
      ownerSide: 'bottom',
    },
    rightStore: {
      index: PLAYER_CONFIG.top.storeIndex,
      ownerSide: 'top',
    },
  },
}

export default function Board({
  board,
  currentPlayer,
  selectedPit,
  gameStatus,
  players,
  showVisualStones,
  lastMove,
  disableInteraction = false,
  interactiveSide = null,
  perspectiveSide = 'bottom',
  onPitClick,
}) {
  const boardView = BOARD_VIEW_CONFIG[perspectiveSide] ?? BOARD_VIEW_CONFIG.bottom
  const { finalTarget, dropCounts, sourceSilhouetteCounts, capturedCounts } =
    buildBoardPresentation(lastMove)

  return (
    <section className={styles.boardShell}>
      <Store
        className={styles.leftStore}
        count={board[boardView.leftStore.index]}
        label={`${players[boardView.leftStore.ownerSide].name} Store`}
        showVisualStones={showVisualStones}
        movedCount={dropCounts[boardView.leftStore.index] ?? 0}
        isFinalTarget={finalTarget === boardView.leftStore.index}
      />
      <div className={`${styles.pitRow} ${styles.topPitRow}`}>
        {boardView.topRow.map(({ index, ownerSide }) => (
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
              side: ownerSide,
              interactiveSide,
            })}
            isSelected={selectedPit === index}
            onClick={() => onPitClick(index)}
          />
        ))}
      </div>
      <div className={`${styles.pitRow} ${styles.bottomPitRow}`}>
        {boardView.bottomRow.map(({ index, ownerSide }) => (
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
              side: ownerSide,
              interactiveSide,
            })}
            isSelected={selectedPit === index}
            onClick={() => onPitClick(index)}
          />
        ))}
      </div>
      <Store
        className={styles.rightStore}
        count={board[boardView.rightStore.index]}
        label={`${players[boardView.rightStore.ownerSide].name} Store`}
        showVisualStones={showVisualStones}
        movedCount={dropCounts[boardView.rightStore.index] ?? 0}
        isFinalTarget={finalTarget === boardView.rightStore.index}
      />
    </section>
  )
}
