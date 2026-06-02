const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function normalizeToken(token = '') {
  let normalized = String(token || '').trim()

  if (normalized.toLowerCase().startsWith('bearer ')) {
    normalized = normalized.slice(7).trim()
  }

  for (let i = 0; i < 3; i += 1) {
    const unquoted = normalized.replace(/^"|"$/g, '').trim()
    if (unquoted === normalized) {
      break
    }
    normalized = unquoted
  }

  try {
    const parsed = JSON.parse(normalized)
    if (typeof parsed === 'string') {
      normalized = parsed.trim()
    }
  } catch {
    // Keep value as-is when it is not JSON.
  }

  return normalized
}

async function request(path, options = {}) {
  const token = options.token ? normalizeToken(options.token) : ''
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export function joinMatchmakingQueueRequest(payload, token) {
  return request('/api/matchmaking/join', {
    method: 'POST',
    body: payload,
    token,
  })
}

export function getMatchmakingStatusRequest(token) {
  return request('/api/matchmaking/status', {
    token,
  })
}

export function leaveMatchmakingQueueRequest(token) {
  return request('/api/matchmaking/leave', {
    method: 'DELETE',
    token,
  })
}

export function challengeBotRequest(payload, token) {
  return request('/api/matchmaking/challenge-bot', {
    method: 'POST',
    body: payload,
    token,
  })
}
