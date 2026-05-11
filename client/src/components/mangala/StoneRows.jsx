import styles from './MangalaGame.module.css'

export default function StoneRows({
  rows,
  stoneStates,
  rowClassName,
  extraStoneClassName = '',
}) {
  let stoneOffset = 0
  const seenOffsets = new Set()

  return rows.map((row) => {
    const rowStates = stoneStates.slice(stoneOffset, stoneOffset + row.stonesInRow)
    stoneOffset += row.stonesInRow
    const isStackedRow = seenOffsets.has(row.offset)
    seenOffsets.add(row.offset)

    return (
      <span
        key={row.id}
        className={rowClassName}
        style={{
          '--row-offset': row.offset,
          '--layer-shift-x': row.layerShiftX ?? 0,
          '--layer-shift-y': row.layerShiftY ?? 0,
        }}
      >
        {rowStates.map((stoneState) => (
          <span
            key={stoneState.id}
            className={`${styles.stone} ${extraStoneClassName} ${
              stoneState.isMovedStone ? styles.movedStone : ''
            } ${stoneState.isFinalStone ? styles.finalStone : ''} ${
              isStackedRow ? styles.stackedStone : ''
            }`}
          />
        ))}
      </span>
    )
  })
}
