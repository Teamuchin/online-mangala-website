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
    const error = new Error(data.message || 'Request failed')
    if (data.match) {
      error.match = data.match
    }
    throw error
  }

  return data
}

export function createMatchRequest(payload, token) {
  return request('/api/matches', {
    method: 'POST',
    body: payload,
    token,
  })
}

export function getMatchByIdRequest(matchId) {
  return request(`/api/matches/${matchId}`)
}

export function submitMatchMoveRequest(matchId, pitIndex, token) {
  return request(`/api/matches/${matchId}/moves`, {
    method: 'POST',
    body: pitIndex === null || pitIndex === undefined ? {} : { pitIndex },
    token,
  })
}

export function submitMatchResignRequest(matchId, token) {
  return request(`/api/matches/${matchId}/resign`, {
    method: 'POST',
    token,
  })
}

export function getMatchesByUserIdRequest(userId) {
  return request(`/api/matches/user/${userId}`)
}

export function getActiveMatchesRequest() {
  return request('/api/matches/active')
}
