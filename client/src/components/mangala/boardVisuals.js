const BASE_LAYER_ROW_ORDER = [3, 2, 1, 0]
const STORE_LAYER_ROW_ORDER = [5, 4, 3, 2, 1, 0]
const MAX_STONES_PER_ROW = 2
const MAX_ROWS_PER_LAYER = 4
const STORE_MAX_ROWS_PER_LAYER = 6
const STACK_LAYER_SHIFT_X = 0
const STACK_LAYER_SHIFT_Y = -0.4

function buildRows(count, stonesPerRow, rowIdPrefix, rowOrder, maxRowsPerLayer) {
  const rowCount = Math.ceil(count / stonesPerRow)
  const minPosition = Math.min(...rowOrder)
  const maxPosition = Math.max(...rowOrder)
  const centerPosition = (minPosition + maxPosition) / 2

  return Array.from({ length: rowCount }, (_, rowIndex) => ({
    id: `${rowIdPrefix}-${rowIndex}`,
    offset: rowOrder[rowIndex % maxRowsPerLayer] - centerPosition,
    layerShiftX: Math.floor(rowIndex / maxRowsPerLayer) * STACK_LAYER_SHIFT_X,
    layerShiftY: Math.floor(rowIndex / maxRowsPerLayer) * STACK_LAYER_SHIFT_Y,
    stonesInRow: Math.min(stonesPerRow, count - rowIndex * stonesPerRow),
  }))
}

export function getStoneRows(count) {
  return buildRows(
    count,
    MAX_STONES_PER_ROW,
    'row',
    BASE_LAYER_ROW_ORDER,
    MAX_ROWS_PER_LAYER,
  )
}

export function getStoreStoneRows(count) {
  return buildRows(
    count,
    MAX_STONES_PER_ROW,
    'store-row',
    STORE_LAYER_ROW_ORDER,
    STORE_MAX_ROWS_PER_LAYER,
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

export function shouldRenderInlinePitStones(count) {
  return count > 0
}
