import { useEffect, useState } from 'react'
import {
  ACTIVE_MATCH_UPDATED_EVENT,
  areActiveMatchSummariesEqual,
  readStoredActiveMatchSummary,
} from '../components/mangala/gamePersistence.js'
import {
  applyRatedMatchResult,
  buildAuthenticatedSessionUpdates,
  buildLoggedOutSessionUpdates,
  isGuestUser,
  mergeStoredAuthState,
  mergeStoredUser,
  updateUserProfile,
} from './appState.js'
import { AppDataContext, staticAppData } from './appDataContext.js'

const AUTH_STATE_STORAGE_KEY = 'mangala.authState'
const CURRENT_USER_STORAGE_KEY = 'mangala.currentUser'
const PUBLIC_PROFILE_DIRECTORY_STORAGE_KEY = 'mangala.publicProfileDirectory'
const REGISTERED_USER_STORAGE_KEY = 'mangala.registeredUser'

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

function readStoredPublicProfileDirectory(fallbackProfiles) {
  if (typeof window === 'undefined') {
    return fallbackProfiles
  }

  const storedProfiles = window.localStorage.getItem(PUBLIC_PROFILE_DIRECTORY_STORAGE_KEY)

  if (!storedProfiles) {
    return fallbackProfiles
  }

  try {
    const parsedProfiles = JSON.parse(storedProfiles)

    if (!Array.isArray(parsedProfiles)) {
      return fallbackProfiles
    }

    return fallbackProfiles.map((fallbackProfile) => {
      const storedProfile = parsedProfiles.find((profile) => profile.id === fallbackProfile.id)

      return storedProfile
        ? mergeStoredUser(fallbackProfile, storedProfile)
        : fallbackProfile
    })
  } catch {
    return fallbackProfiles
  }
}

export function AppDataProvider({ children }) {
  const [registeredUser, setRegisteredUser] = useState(() =>
    readStoredUser(REGISTERED_USER_STORAGE_KEY, staticAppData.initialCurrentUser),
  )
  const [currentUser, setCurrentUser] = useState(() =>
    readStoredUser(CURRENT_USER_STORAGE_KEY, staticAppData.initialCurrentUser),
  )
  const [publicProfileDirectory, setPublicProfileDirectory] = useState(() =>
    readStoredPublicProfileDirectory(staticAppData.publicProfileDirectory),
  )
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    const storedAuthState = window.localStorage.getItem(AUTH_STATE_STORAGE_KEY)

    if (!storedAuthState) {
      return true
    }

    try {
      return mergeStoredAuthState(
        { isAuthenticated: true },
        JSON.parse(storedAuthState),
      ).isAuthenticated
    } catch {
      return true
    }
  })
  const [activeMatchSummary, setActiveMatchSummary] = useState(() =>
    readStoredActiveMatchSummary(),
  )

  const updateCurrentUser = (updates) => {
    setCurrentUser((existingUser) => updateUserProfile(existingUser, updates))

    if (!isGuestUser(currentUser)) {
      setRegisteredUser((existingUser) => updateUserProfile(existingUser, updates))
    }
  }

  const logIn = (userOverrides = {}) => {
    const session = buildAuthenticatedSessionUpdates(
      registeredUser,
      userOverrides,
    )

    setCurrentUser(session.currentUser)
    setIsAuthenticated(session.isAuthenticated)
  }

  const registerUser = (userOverrides = {}) => {
    const session = buildAuthenticatedSessionUpdates(
      registeredUser,
      userOverrides,
    )

    setRegisteredUser(session.currentUser)
    setCurrentUser(session.currentUser)
    setIsAuthenticated(session.isAuthenticated)
  }

  const continueAsGuest = () => {
    logIn(staticAppData.guestCurrentUser)
  }

  const logOut = () => {
    setIsAuthenticated(buildLoggedOutSessionUpdates().isAuthenticated)
  }

  const recordRatedMatchResult = (matchResult) => {
    setCurrentUser((existingUser) => applyRatedMatchResult(existingUser, matchResult))

    if (!isGuestUser(currentUser)) {
      setRegisteredUser((existingUser) =>
        applyRatedMatchResult(existingUser, matchResult),
      )
    }
  }

  const recordPublicProfileMatchResult = (profileId, matchResult) => {
    setPublicProfileDirectory((existingProfiles) =>
      existingProfiles.map((profile) =>
        profile.id === profileId
          ? applyRatedMatchResult(profile, matchResult)
          : profile,
      ),
    )
  }

  useEffect(() => {
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser))
  }, [currentUser])

  useEffect(() => {
    window.localStorage.setItem(
      REGISTERED_USER_STORAGE_KEY,
      JSON.stringify(registeredUser),
    )
  }, [registeredUser])

  useEffect(() => {
    window.localStorage.setItem(
      PUBLIC_PROFILE_DIRECTORY_STORAGE_KEY,
      JSON.stringify(publicProfileDirectory),
    )
  }, [publicProfileDirectory])

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

  const value = {
    ...staticAppData,
    activeMatchSummary,
    continueAsGuest,
    currentUser,
    isAuthenticated,
    logIn,
    logOut,
    publicProfileDirectory,
    recordPublicProfileMatchResult,
    recordRatedMatchResult,
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
