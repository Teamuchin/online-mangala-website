const chats = new Map();
const cleanupTimers = new Map();

// 5 minutes in ms
const CLEANUP_DELAY_MS = 5 * 60 * 1000;

function getMessages(matchId) {
  if (!chats.has(matchId)) {
    return [];
  }
  return chats.get(matchId);
}

function addMessage(matchId, { senderId, username, text }) {
  if (!chats.has(matchId)) {
    chats.set(matchId, []);
  }
  const message = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    senderId,
    username,
    text,
    timestamp: new Date().toISOString(),
  };
  chats.get(matchId).push(message);
  return message;
}

function scheduleCleanup(matchId) {
  if (cleanupTimers.has(matchId)) {
    return; // Already scheduled
  }
  
  const timer = setTimeout(() => {
    chats.delete(matchId);
    cleanupTimers.delete(matchId);
    console.log(`[ChatStore] Cleaned up chat for match ${matchId}`);
  }, CLEANUP_DELAY_MS);
  
  cleanupTimers.set(matchId, timer);
}

function cancelCleanup(matchId) {
  if (cleanupTimers.has(matchId)) {
    clearTimeout(cleanupTimers.get(matchId));
    cleanupTimers.delete(matchId);
  }
}

function deleteChatImmediately(matchId) {
  chats.delete(matchId);
  cancelCleanup(matchId);
}

module.exports = {
  getMessages,
  addMessage,
  scheduleCleanup,
  cancelCleanup,
  deleteChatImmediately,
};
