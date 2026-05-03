import { useEffect, useState } from 'react'
import {
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

export function AppDataProvider({ children }) {
  const [registeredUser, setRegisteredUser] = useState(() =>
    readStoredUser(REGISTERED_USER_STORAGE_KEY, staticAppData.initialCurrentUser),
  )
  const [currentUser, setCurrentUser] = useState(() =>
    readStoredUser(CURRENT_USER_STORAGE_KEY, staticAppData.initialCurrentUser),
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
      AUTH_STATE_STORAGE_KEY,
      JSON.stringify({ isAuthenticated }),
    )
  }, [isAuthenticated])

  const value = {
    ...staticAppData,
    continueAsGuest,
    currentUser,
    isAuthenticated,
    logIn,
    logOut,
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
