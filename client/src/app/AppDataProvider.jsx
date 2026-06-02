import { useEffect, useMemo, useState } from 'react'
import {
  ACTIVE_MATCH_UPDATED_EVENT,
  areActiveMatchSummariesEqual,
  readStoredActiveMatchSummary,
} from '../components/mangala/gamePersistence.js'
import { getMeRequest } from './authApi.js'
import {
  buildLoggedOutSessionUpdates,
  isGuestUser,
  mergeStoredAuthState,
  mergeStoredUser,
  updateUserProfile,
} from './appState.js'
import { AppDataContext, staticAppData } from './appDataContext.js'
import { buildProfileFromBackendUser } from './profileData.js'
import { getLeaderboardUsersRequest } from './userApi.js'

const AUTH_STATE_STORAGE_KEY = 'mangala.authState'
const CURRENT_USER_STORAGE_KEY = 'mangala.currentUser'
const LANGUAGE_STORAGE_KEY = 'mangala.language'

function formatMemberSince(createdAt) {
  const preferredLanguage =
    typeof window === 'undefined'
      ? 'en-US'
      : window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'tr'
        ? 'tr-TR'
        : 'en-US'

  if (!createdAt) {
    return new Intl.DateTimeFormat(preferredLanguage, {
      month: 'short',
      year: 'numeric',
    }).format(new Date('2026-05-01T00:00:00.000Z'))
  }

  const parsedDate = new Date(createdAt)

  if (Number.isNaN(parsedDate.getTime())) {
    return new Intl.DateTimeFormat(preferredLanguage, {
      month: 'short',
      year: 'numeric',
    }).format(new Date('2026-05-01T00:00:00.000Z'))
  }

  return new Intl.DateTimeFormat(preferredLanguage, {
    month: 'short',
    year: 'numeric',
  }).format(parsedDate)
}

function buildCurrentUserFromBackendUser(user, fallbackUser = staticAppData.initialCurrentUser) {
  if (!user) {
    return fallbackUser
  }

  return {
    ...fallbackUser,
    id: String(user.id),
    username: user.username,
    email: user.email ?? fallbackUser.email,
    elo: user.elo,
    isBot: user.is_bot === true,
    memberSince: formatMemberSince(user.created_at),
    createdAt: user.created_at,
  }
}

function buildPublicProfiles(users, currentUser) {
  const profilesByUsername = new Map()

  users.forEach((user) => {
    const profile = buildProfileFromBackendUser(user)

    if (String(profile.id) === String(currentUser.id)) {
      profilesByUsername.set(profile.username, {
        ...profile,
        username: currentUser.username,
      })
      return
    }

    profilesByUsername.set(profile.username, profile)
  })

  return Array.from(profilesByUsername.values())
}

function readStoredUser(storageKey, fallbackUser) {
  if (typeof window === 'undefined') {
    return fallbackUser
  }

  const storedUser = window.localStorage.getItem(storageKey)

  if (!storedUser) {
    return fallbackUser
  }

  try {
    return mergeStoredUser(fallbackUser, JSON.parse(storedUser))
  } catch {
    return fallbackUser
  }
}

export function AppDataProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() =>
    readStoredUser(CURRENT_USER_STORAGE_KEY, staticAppData.initialCurrentUser),
  )
  const [publicUsers, setPublicUsers] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    const storedAuthState = window.localStorage.getItem(AUTH_STATE_STORAGE_KEY)

    if (!storedAuthState) {
      const token = window.localStorage.getItem('mangala.authToken') ?? ''
      return Boolean(token) || isGuestUser(currentUser)
    }

    try {
      return mergeStoredAuthState(
        { isAuthenticated: false },
        JSON.parse(storedAuthState),
      ).isAuthenticated
    } catch {
      const token = window.localStorage.getItem('mangala.authToken') ?? ''
      return Boolean(token) || isGuestUser(currentUser)
    }
  })
  const [activeMatchSummary, setActiveMatchSummary] = useState(() =>
    readStoredActiveMatchSummary(),
  )

  const publicProfileDirectory = useMemo(
    () => buildPublicProfiles(publicUsers, currentUser),
    [currentUser, publicUsers],
  )

  const updateCurrentUser = (updates) => {
    setCurrentUser((existingUser) => updateUserProfile(existingUser, updates))
  }

  const refreshCurrentUser = async () => {
    const token =
      typeof window === 'undefined'
        ? ''
        : window.localStorage.getItem('mangala.authToken') ?? ''

    if (!token || !isAuthenticated || isGuestUser(currentUser)) {
      return null
    }

    const response = await getMeRequest(token)
    setCurrentUser((existingUser) =>
      buildCurrentUserFromBackendUser(response.user, existingUser),
    )

    return response.user
  }

  const logIn = (user) => {
    setCurrentUser((existingUser) => buildCurrentUserFromBackendUser(user, existingUser))
    setIsAuthenticated(true)
  }

  const registerUser = (user) => {
    setCurrentUser((existingUser) => buildCurrentUserFromBackendUser(user, existingUser))
    setIsAuthenticated(true)
  }

  const continueAsGuest = () => {
    setCurrentUser(staticAppData.guestCurrentUser)
    setIsAuthenticated(true)
  }

  const logOut = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mangala.authToken')
    }

    setCurrentUser(staticAppData.initialCurrentUser)
    setIsAuthenticated(buildLoggedOutSessionUpdates().isAuthenticated)
  }

  useEffect(() => {
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser))
  }, [currentUser])

  useEffect(() => {
    window.localStorage.setItem(
      AUTH_STATE_STORAGE_KEY,
      JSON.stringify({ isAuthenticated }),
    )
  }, [isAuthenticated])

  useEffect(() => {
    const syncActiveMatch = (event) => {
      const nextSummary =
        event?.detail !== undefined ? event.detail : readStoredActiveMatchSummary()

      setActiveMatchSummary((currentSummary) =>
        areActiveMatchSummariesEqual(currentSummary, nextSummary)
          ? currentSummary
          : nextSummary,
      )
    }

    window.addEventListener(ACTIVE_MATCH_UPDATED_EVENT, syncActiveMatch)
    window.addEventListener('storage', syncActiveMatch)

    return () => {
      window.removeEventListener(ACTIVE_MATCH_UPDATED_EVENT, syncActiveMatch)
      window.removeEventListener('storage', syncActiveMatch)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadPublicUsers = async () => {
      try {
        const users = await getLeaderboardUsersRequest()

        if (!isCancelled) {
          setPublicUsers(users)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Load public users error:', error)
        }
      }
    }

    void loadPublicUsers()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    const token =
      typeof window === 'undefined'
        ? ''
        : window.localStorage.getItem('mangala.authToken') ?? ''

    if (!token || !isAuthenticated || isGuestUser(currentUser)) {
      return undefined
    }

    const loadCurrentUser = async () => {
      try {
        const response = await getMeRequest(token)

        if (!isCancelled) {
          setCurrentUser((existingUser) =>
            buildCurrentUserFromBackendUser(response.user, existingUser),
          )
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Load current user error:', error)
        }
      }
    }

    void loadCurrentUser()

    return () => {
      isCancelled = true
    }
  }, [currentUser.email, isAuthenticated])

  const value = {
    ...staticAppData,
    activeMatchSummary,
    continueAsGuest,
    currentUser,
    isAuthenticated,
    logIn,
    logOut,
    publicProfileDirectory,
    refreshCurrentUser,
    registerUser,
    setIsAuthenticated,
    updateCurrentUser,
  }

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  )
}
