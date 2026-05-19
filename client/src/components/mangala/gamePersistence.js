export const ACTIVE_MATCH_STORAGE_KEY = 'mangala.activeMatch'
export const FINISHED_MATCHES_STORAGE_KEY = 'mangala.finishedMatches'
export const ACTIVE_MATCH_UPDATED_EVENT = 'mangala:active-match-updated'
export const MAX_FINISHED_MATCHES = 5
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
  queueSettings,
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
    queueSettings,
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

function normalizeStoredSession(session) {
  return {
    ...session,
    gameId: normalizeGameId(session.gameId),
  }
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

export function areActiveMatchSummariesEqual(left, right) {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return left === right
  }

  return (
    left.gameId === right.gameId &&
    left.url === right.url &&
    left.matchMode === right.matchMode &&
    left.gameStatus === right.gameStatus &&
    left.isActive === right.isActive &&
    left.participants?.bottom === right.participants?.bottom &&
    left.participants?.top === right.participants?.top
  )
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

    return normalizeStoredSession(parsedSession)
  } catch {
    return null
  }
}

export function readPersistedFinishedMatches(serializedMatches) {
  if (!serializedMatches) {
    return []
  }

  try {
    const parsedMatches = JSON.parse(serializedMatches)

    if (!Array.isArray(parsedMatches)) {
      return []
    }

    return parsedMatches
      .filter((session) => isValidStoredSession(session))
      .map((session) => normalizeStoredSession(session))
  } catch {
    return []
  }
}

export function upsertFinishedMatchSessions(existingSessions, nextSession) {
  return [
    normalizeStoredSession(nextSession),
    ...existingSessions.filter(
      (existingSession) => normalizeGameId(existingSession.gameId) !== normalizeGameId(nextSession.gameId),
    ),
  ].slice(0, MAX_FINISHED_MATCHES)
}

export function readStoredActiveMatchSummary() {
  if (typeof window === 'undefined') {
    return null
  }

  return buildActiveMatchSummary(
    readPersistedMatchSession(window.localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY)),
  )
}

export function readStoredMatchSessionByGameId(gameId) {
  if (typeof window === 'undefined' || typeof gameId !== 'string') {
    return null
  }

  const normalizedGameId = normalizeGameId(gameId)
  const activeSession = readPersistedMatchSession(
    window.localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY),
  )

  if (activeSession?.gameId === normalizedGameId) {
    return activeSession
  }

  return (
    readPersistedFinishedMatches(
      window.localStorage.getItem(FINISHED_MATCHES_STORAGE_KEY),
    ).find((session) => session.gameId === normalizedGameId) ?? null
  )
}

export function readStoredMatchIds() {
  if (typeof window === 'undefined') {
    return new Set()
  }

  const matchIds = new Set()
  const activeSession = readPersistedMatchSession(
    window.localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY),
  )

  if (activeSession?.gameId) {
    matchIds.add(activeSession.gameId)
  }

  readPersistedFinishedMatches(
    window.localStorage.getItem(FINISHED_MATCHES_STORAGE_KEY),
  ).forEach((session) => {
    if (session.gameId) {
      matchIds.add(session.gameId)
    }
  })

  return matchIds
}

export function createRandomGameId(existingIds = new Set()) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const bytes = new Uint8Array(8)
    globalThis.crypto.getRandomValues(bytes)
    const candidate = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')

    if (!existingIds.has(candidate)) {
      return candidate
    }
  }

  return globalThis.crypto.randomUUID().replaceAll('-', '').slice(0, 12)
}

export function writePersistedMatchSession(session) {
  if (typeof window === 'undefined') {
    return
  }

  if (session.game?.gameStatus === 'playing') {
    window.localStorage.setItem(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(session))
  } else {
    const nextFinishedMatches = upsertFinishedMatchSessions(
      readPersistedFinishedMatches(
        window.localStorage.getItem(FINISHED_MATCHES_STORAGE_KEY),
      ),
      session,
    )

    window.localStorage.setItem(
      FINISHED_MATCHES_STORAGE_KEY,
      JSON.stringify(nextFinishedMatches),
    )

    const activeSession = readPersistedMatchSession(
      window.localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY),
    )

    if (activeSession?.gameId === session.gameId) {
      window.localStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY)
    }
  }

  const activeSummary = buildActiveMatchSummary(
    readPersistedMatchSession(window.localStorage.getItem(ACTIVE_MATCH_STORAGE_KEY)),
  )
  window.dispatchEvent(
    new CustomEvent(ACTIVE_MATCH_UPDATED_EVENT, {
      detail: activeSummary,
    }),
  )
}
