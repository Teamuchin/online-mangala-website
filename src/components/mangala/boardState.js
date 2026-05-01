export function buildCapturedCounts(capturedStones = []) {
  return capturedStones.reduce((accumulator, item) => {
    accumulator[item.index] = (accumulator[item.index] ?? 0) + item.count
    return accumulator
  }, {})
}

export function buildSourceSilhouetteCounts(lastMove) {
  if (!lastMove?.preMoveSourceCount || lastMove?.fromPit === undefined) {
    return {}
  }

  return { [lastMove.fromPit]: lastMove.preMoveSourceCount }
}

export function buildBoardPresentation(lastMove) {
  return {
    finalTarget: lastMove?.lastLandingIndex ?? null,
    dropCounts: lastMove?.dropCounts ?? {},
    sourceSilhouetteCounts: buildSourceSilhouetteCounts(lastMove),
    capturedCounts: buildCapturedCounts(lastMove?.capturedStones),
  }
}

export function isPitDisabled({ board, index, currentPlayer, gameStatus, side }) {
  return gameStatus === 'finished' || currentPlayer !== side || board[index] === 0
}
