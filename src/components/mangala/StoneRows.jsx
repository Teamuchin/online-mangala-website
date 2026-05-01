import styles from './MangalaGame.module.css'

export default function StoneRows({
  rows,
  stoneStates,
  rowClassName,
  extraStoneClassName = '',
}) {
  let stoneOffset = 0

  return rows.map((row) => {
    const rowStates = stoneStates.slice(stoneOffset, stoneOffset + row.stonesInRow)
    stoneOffset += row.stonesInRow

    return (
      <span
        key={row.id}
        className={rowClassName}
        style={{ '--row-offset': row.offset }}
      >
        {rowStates.map((stoneState) => (
          <span
            key={stoneState.id}
            className={`${styles.stone} ${extraStoneClassName} ${
              stoneState.isMovedStone ? styles.movedStone : ''
            } ${stoneState.isFinalStone ? styles.finalStone : ''}`}
          />
        ))}
      </span>
    )
  })
}
