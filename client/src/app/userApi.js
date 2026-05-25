const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export function getUserByUsernameRequest(username) {
  return request(`/api/users/username/${encodeURIComponent(username)}`)
}

export function getLeaderboardUsersRequest() {
  return request('/api/users')
}
