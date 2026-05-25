const MATCHMAKING_MAX_STALE_MS = 2 * 60 * 1000;

const queueEntries = new Map();

function isQueueEntryStale(entry, now = Date.now()) {
  const joinedAt = typeof entry?.joinedAt === 'number' ? entry.joinedAt : 0;
  const matchedAt = typeof entry?.matchedAt === 'number' ? entry.matchedAt : 0;
  const referenceTime = matchedAt || joinedAt;

  return !entry?.userId || !referenceTime || now - referenceTime > MATCHMAKING_MAX_STALE_MS;
}

function cleanupQueueEntries(now = Date.now()) {
  for (const [userId, entry] of queueEntries.entries()) {
    if (isQueueEntryStale(entry, now)) {
      queueEntries.delete(userId);
    }
  }
}

function getQueueEntry(userId) {
  cleanupQueueEntries();
  return queueEntries.get(String(userId)) ?? null;
}

function setQueueEntry(entry) {
  queueEntries.set(String(entry.userId), entry);
}

function removeQueueEntry(userId) {
  queueEntries.delete(String(userId));
}

function consumeQueueEntry(userId) {
  const normalizedUserId = String(userId);
  const entry = queueEntries.get(normalizedUserId) ?? null;

  if (entry) {
    queueEntries.delete(normalizedUserId);
  }

  return entry;
}

function findCompatibleQueueEntry(currentEntry) {
  cleanupQueueEntries();

  for (const entry of queueEntries.values()) {
    if (
      entry.userId !== currentEntry.userId &&
      entry.status === 'searching' &&
      entry.rated === currentEntry.rated
    ) {
      return entry;
    }
  }

  return null;
}

module.exports = {
  cleanupQueueEntries,
  consumeQueueEntry,
  findCompatibleQueueEntry,
  getQueueEntry,
  removeQueueEntry,
  setQueueEntry,
};
