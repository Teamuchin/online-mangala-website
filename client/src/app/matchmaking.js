const MATCHMAKING_QUEUE_STORAGE_KEY = 'mangala.matchmakingQueue'
const MATCHMAKING_MAX_STALE_MS = 2 * 60 * 1000

function normalizeTimestamp(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function isEntryStale(entry, now = Date.now()) {
  const joinedAt = normalizeTimestamp(entry?.joinedAt)
  const matchedAt = normalizeTimestamp(entry?.matchedAt)
  const referenceTime = matchedAt || joinedAt

  return !entry?.userId || !referenceTime || now - referenceTime > MATCHMAKING_MAX_STALE_MS
}

export function readMatchmakingQueue() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(MATCHMAKING_QUEUE_STORAGE_KEY) ?? '[]',
    )

    if (!Array.isArray(parsed)) {
      return []
    }

    const now = Date.now()

    return parsed.filter((entry) => !isEntryStale(entry, now))
  } catch {
    return []
  }
}

export function writeMatchmakingQueue(entries) {
  if (typeof window === 'undefined') {
    return
  }

  const now = Date.now()
  const nextEntries = entries.filter((entry) => !isEntryStale(entry, now))

  window.localStorage.setItem(MATCHMAKING_QUEUE_STORAGE_KEY, JSON.stringify(nextEntries))
}

export function removeQueueEntry(userId) {
  writeMatchmakingQueue(
    readMatchmakingQueue().filter((entry) => entry.userId !== userId),
  )
}

export function upsertQueueEntry(entry) {
  writeMatchmakingQueue([
    ...readMatchmakingQueue().filter((existingEntry) => existingEntry.userId !== entry.userId),
    entry,
  ])
}

export function buildQueueEntry(user, settings) {
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName ?? null,
    rating: user.elo ?? 1200,
    rated: settings.rated,
    allowBots: settings.allowBots,
    joinedAt: Date.now(),
    status: 'searching',
  }
}

export function findCompatibleHumanEntry(entries, currentEntry) {
  return (
    entries.find(
      (entry) =>
        entry.userId !== currentEntry.userId &&
        entry.status === 'searching' &&
        entry.rated === currentEntry.rated,
    ) ?? null
  )
}

export function buildQueuedPlayer(entry) {
  return {
    id: entry.userId,
    name: entry.username,
    username: entry.username,
    displayName: entry.displayName ?? undefined,
    rating: entry.rating,
    timeLeft: 300,
  }
}

export function buildHumanMatchPayload(currentEntry, opponentEntry, gameId) {
  const currentPlayer = buildQueuedPlayer(currentEntry)
  const opponentPlayer = buildQueuedPlayer(opponentEntry)
  const currentOnBottom = Math.random() < 0.5

  return {
    gameId,
    players: currentOnBottom
      ? {
          bottom: currentPlayer,
          top: opponentPlayer,
        }
      : {
          bottom: opponentPlayer,
          top: currentPlayer,
        },
  }
}

export function markHumanQueueMatch(currentEntry, opponentEntry, matchPayload) {
  const matchedAt = Date.now()
  const nextEntries = readMatchmakingQueue().map((entry) => {
    if (entry.userId !== currentEntry.userId && entry.userId !== opponentEntry.userId) {
      return entry
    }

    return {
      ...entry,
      status: 'matched',
      matchedAt,
      gameId: matchPayload.gameId,
      players: matchPayload.players,
    }
  })

  writeMatchmakingQueue(nextEntries)
}

export function getClosestBotProfile(publicProfileDirectory, rating) {
  const botProfiles = publicProfileDirectory.filter((profile) => profile.isBot)

  if (botProfiles.length === 0) {
    return null
  }

  return [...botProfiles].sort((left, right) => {
    const leftDelta = Math.abs((left.elo ?? 1200) - rating)
    const rightDelta = Math.abs((right.elo ?? 1200) - rating)

    if (leftDelta !== rightDelta) {
      return leftDelta - rightDelta
    }

    return Math.random() < 0.5 ? -1 : 1
  })[0]
}
