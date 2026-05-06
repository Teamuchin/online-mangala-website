export const ACTIVE_MATCH_STORAGE_KEY = 'mangala.activeMatch'
const STORAGE_VERSION = 1

export function buildPersistedMatchSession({
  game,
  showVisualStones,
  animateMoves,
  reviewIndex,
  matchMode,
  matchToken,
  botSettings,
}) {
  return {
    version: STORAGE_VERSION,
    game,
    showVisualStones,
    animateMoves,
    reviewIndex,
    matchMode,
    matchToken,
    botSettings,
  }
}

function isValidStoredSession(session) {
  return Boolean(
    session &&
      session.version === STORAGE_VERSION &&
      session.game &&
      Array.isArray(session.game.board) &&
      session.game.players &&
      session.game.matchRecord &&
      Array.isArray(session.game.matchRecord.positions) &&
      Array.isArray(session.game.matchRecord.moves) &&
      typeof session.showVisualStones === 'boolean' &&
      typeof session.animateMoves === 'boolean' &&
      (session.matchMode === null ||
        session.matchMode === undefined ||
        typeof session.matchMode === 'string'),
  )
}

export function readPersistedMatchSession(serializedSession) {
  if (!serializedSession) {
    return null
  }

  try {
    const parsedSession = JSON.parse(serializedSession)

    return isValidStoredSession(parsedSession) ? parsedSession : null
  } catch {
    return null
  }
}
