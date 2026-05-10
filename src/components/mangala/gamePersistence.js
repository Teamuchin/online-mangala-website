export const ACTIVE_MATCH_STORAGE_KEY = 'mangala.activeMatch'
export const ACTIVE_MATCH_UPDATED_EVENT = 'mangala:active-match-updated'
const STORAGE_VERSION = 1

function normalizeGameId(gameId) {
  if (typeof gameId !== 'string') {
    return gameId
  }

  return gameId.startsWith('game-') ? gameId.slice(5) : gameId
}

export function buildPersistedMatchSession({
  game,
  gameId,
  showVisualStones,
  animateMoves,
  reviewIndex,
  matchMode,
  botSettings,
}) {
  return {
    version: STORAGE_VERSION,
    game,
    gameId: normalizeGameId(gameId),
    showVisualStones,
    animateMoves,
    reviewIndex,
    matchMode,
    botSettings,
  }
}

function isValidStoredSession(session) {
  return Boolean(
    session &&
      session.version === STORAGE_VERSION &&
      session.game &&
      typeof session.gameId === 'string' &&
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

export function buildActiveMatchSummary(session) {
  if (!session?.gameId || !session?.matchMode) {
    return null
  }

  return {
    gameId: session.gameId,
    url: `/game/${session.gameId}`,
    matchMode: session.matchMode,
    gameStatus: session.game?.gameStatus ?? 'finished',
    isActive: session.game?.gameStatus === 'playing',
    participants: {
      bottom: session.game?.players?.bottom?.id ?? null,
      top: session.game?.players?.top?.id ?? null,
    },
  }
}

export function readPersistedMatchSession(serializedSession) {
  if (!serializedSession) {
    return null
  }

  try {
    const parsedSession = JSON.parse(serializedSession)

    if (!isValidStoredSession(parsedSession)) {
      return null
    }

    return {
      ...parsedSession,
      gameId: normalizeGameId(parsedSession.gameId),
    }
  } catch {
    return null
  }
}

export function readStoredActiveMatchSummary() {
  if (typeof window === 'undefined') {
    return null
  }

  return buildActiveMatchSummary(
    readPersistedMatchSession(window.localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY)),
  )
}

export function writePersistedMatchSession(session) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(session))
  window.dispatchEvent(
    new CustomEvent(ACTIVE_MATCH_UPDATED_EVENT, {
      detail: buildActiveMatchSummary(session),
    }),
  )
}
