const MAX_VISIBLE_STONES = 12
const ROW_ORDER = [0, 1, 2, 3, 2.5, 1.5]
const MAX_STONES_PER_ROW = 2
const STORE_MAX_STONES_PER_ROW = 3
const STORE_BASE_ROW_COUNT = 8

function getStoreRowOrder(rowCount) {
  const positions = Array.from({ length: STORE_BASE_ROW_COUNT }, (_, index) => index)

  if (rowCount <= positions.length) {
    return positions.slice(0, rowCount)
  }

  const interleavedPositions = []

  for (let index = positions.length - 2; index >= 0; index -= 1) {
    interleavedPositions.push(index + 0.5)
  }
  interleavedPositions.push(positions.length - 0.5)

  return [...positions, ...interleavedPositions].slice(0, rowCount)
}

function buildRows(count, stonesPerRow, rowPositions, rowIdPrefix) {
  const rowCount = Math.ceil(count / stonesPerRow)
  const visiblePositions = rowPositions.slice(0, rowCount)
  const minPosition = Math.min(...visiblePositions)
  const maxPosition = Math.max(...visiblePositions)
  const centerPosition = (minPosition + maxPosition) / 2

  return Array.from({ length: rowCount }, (_, rowIndex) => ({
    id: `${rowIdPrefix}-${rowIndex}`,
    offset: visiblePositions[rowIndex] - centerPosition,
    stonesInRow: Math.min(stonesPerRow, count - rowIndex * stonesPerRow),
  }))
}

export function getStoneRows(count) {
  return buildRows(count, MAX_STONES_PER_ROW, ROW_ORDER, 'row')
}

export function getStoreStoneRows(count) {
  return buildRows(
    count,
    STORE_MAX_STONES_PER_ROW,
    getStoreRowOrder(Math.ceil(count / STORE_MAX_STONES_PER_ROW)),
    'store-row',
  )
}

export function buildStoneStates(count, movedCount, isFinalTarget, idPrefix = 'stone') {
  return Array.from({ length: count }, (_, stoneIndex) => ({
    id: `${idPrefix}-${stoneIndex}`,
    isMovedStone: stoneIndex >= count - movedCount,
    isFinalStone: isFinalTarget && stoneIndex === count - 1,
  }))
}

export function buildStaticStoneStates(count, idPrefix) {
  return Array.from({ length: count }, (_, stoneIndex) => ({
    id: `${idPrefix}-${stoneIndex}`,
    isMovedStone: false,
    isFinalStone: false,
  }))
}

export function shouldUseOverflowCount(count) {
  return count > MAX_VISIBLE_STONES
}

export function shouldRenderInlinePitStones(count) {
  return count > 0 && count <= MAX_VISIBLE_STONES
}
