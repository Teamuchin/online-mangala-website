const DEFAULT_K_FACTOR = 32
const ELO_DIVISOR = 400

export function getExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / ELO_DIVISOR))
}

export function getActualScore(result) {
  if (result === 'win') {
    return 1
  }

  if (result === 'draw') {
    return 0.5
  }

  if (result === 'loss') {
    return 0
  }

  throw new Error(`Unsupported rating result: ${result}`)
}

export function getRatingDelta(
  playerRating,
  opponentRating,
  result,
  kFactor = DEFAULT_K_FACTOR,
) {
  const expectedScore = getExpectedScore(playerRating, opponentRating)
  const actualScore = getActualScore(result)

  return Math.round(kFactor * (actualScore - expectedScore))
}

export function buildRatedMatchOutcome(
  playerRating,
  opponentRating,
  result,
  kFactor = DEFAULT_K_FACTOR,
) {
  const playerDelta = getRatingDelta(
    playerRating,
    opponentRating,
    result,
    kFactor,
  )

  return {
    playerDelta,
    opponentDelta: -playerDelta,
    playerRating: playerRating + playerDelta,
    opponentRating: opponentRating - playerDelta,
  }
}

