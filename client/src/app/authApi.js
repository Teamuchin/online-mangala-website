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

async function request(path, payload, options = {}) {
  const token = options.token ? normalizeToken(options.token) : ''
  const hasBody = payload !== undefined

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'POST',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(payload) } : {}),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export function registerRequest(payload) {
  return request('/api/auth/register', payload)
}

export function loginRequest(payload) {
  return request('/api/auth/login', payload)
}

export function guestLoginRequest() {
  return request('/api/auth/guest')
}

export function updateMeRequest(payload, token) {
  return request('/api/auth/me', payload, { method: 'PATCH', token })
}

export function getMeRequest(token) {
  return request('/api/auth/me', undefined, { method: 'GET', token })
}

export function verifyEmailRequest(payload) {
  return request('/api/auth/verify-email', payload)
}

export function resendVerificationRequest(payload) {
  return request('/api/auth/resend-verification', payload)
}

export function forgotPasswordRequest(payload) {
  return request('/api/auth/forgot-password', payload)
}

export function resetPasswordRequest(payload) {
  return request('/api/auth/reset-password', payload)
}

export function googleAuthRequest(payload) {
  return request('/api/auth/google', payload)
}

export function completeProfileRequest(payload, token) {
  return request('/api/auth/complete-profile', payload, { token })
}
